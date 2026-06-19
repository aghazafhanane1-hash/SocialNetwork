const express = require('express');
const router = express.Router();
const { User } = require('../models');
const { verifyToken } = require('../middleware/auth.middleware');
const { createKeycloakUser, updateKeycloakUser, deleteKeycloakUser } = require('../config/keycloak');

// POST /api/users - Register/Create a user (Public endpoint to allow registration)
router.post('/', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ message: 'Veuillez remplir tous les champs (pseudo, email, mot de passe).' });
  }

  try {
    // Check if user already exists locally
    const existingUser = await User.findOne({
      where: {
        [require('sequelize').Op.or]: [{ username }, { email }]
      }
    });

    if (existingUser) {
      return res.status(400).json({ message: 'Ce pseudo ou cet email est déjà utilisé.' });
    }

    // 1. Create in Keycloak
    console.log(`Creating user '${username}' in Keycloak...`);
    const keycloakId = await createKeycloakUser(username, email, password);
    console.log(`User created in Keycloak with ID: ${keycloakId}`);

    // 2. Create in Local PostgreSQL Database
    const newUser = await User.create({
      username,
      email,
      keycloakId
    });

    res.status(201).json({
      message: 'Utilisateur créé avec succès !',
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        keycloakId: newUser.keycloakId
      }
    });
  } catch (error) {
    console.error('Registration Error:', error.message);
    res.status(500).json({ message: error.message || 'Une erreur est survenue lors de l\'inscription.' });
  }
});

// GET /api/users - Get all users (Protected)
router.get('/', verifyToken, async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'username', 'email', 'keycloakId', 'createdAt']
    });
    res.json(users);
  } catch (error) {
    console.error('Fetch Users Error:', error.message);
    res.status(500).json({ message: 'Erreur lors de la récupération des utilisateurs.' });
  }
});

// GET /api/users/:id - Get user by ID (Protected)
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: ['id', 'username', 'email', 'keycloakId', 'createdAt']
    });
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }
    res.json(user);
  } catch (error) {
    console.error('Fetch User Detail Error:', error.message);
    res.status(500).json({ message: 'Erreur lors de la récupération de l\'utilisateur.' });
  }
});

// PUT /api/users/:id - Update user (Protected)
router.put('/:id', verifyToken, async (req, res) => {
  const { username, email, password } = req.body;
  const userId = req.params.id;

  try {
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }

    // Optional fields logic
    const updatedUsername = username || user.username;
    const updatedEmail = email || user.email;

    // 1. Update in Keycloak
    console.log(`Updating user ID '${user.keycloakId}' in Keycloak...`);
    await updateKeycloakUser(user.keycloakId, updatedUsername, updatedEmail, password);

    // 2. Update locally
    user.username = updatedUsername;
    user.email = updatedEmail;
    await user.save();

    res.json({
      message: 'Utilisateur mis à jour avec succès.',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        keycloakId: user.keycloakId
      }
    });
  } catch (error) {
    console.error('Update User Error:', error.message);
    res.status(500).json({ message: error.message || 'Erreur lors de la mise à jour.' });
  }
});

// DELETE /api/users/:id - Delete user (Protected)
router.delete('/:id', verifyToken, async (req, res) => {
  const userId = req.params.id;

  try {
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }

    // 1. Delete in Keycloak
    console.log(`Deleting user ID '${user.keycloakId}' from Keycloak...`);
    await deleteKeycloakUser(user.keycloakId);

    // 2. Delete locally
    await user.destroy();
    console.log(`User deleted locally: ID ${userId}`);

    res.json({ message: 'Utilisateur supprimé avec succès.' });
  } catch (error) {
    console.error('Delete User Error:', error.message);
    res.status(500).json({ message: error.message || 'Erreur lors de la suppression.' });
  }
});

module.exports = router;
