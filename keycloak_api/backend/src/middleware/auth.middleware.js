const jwt = require('jsonwebtoken');
const jwksRsa = require('jwks-rsa');
require('dotenv').config();

const KEYCLOAK_SERVER_URL = process.env.KEYCLOAK_SERVER_URL || 'http://keycloak:8080';
const REALM = process.env.KEYCLOAK_REALM || 'social-network';

const jwksUri = `${KEYCLOAK_SERVER_URL}/realms/${REALM}/protocol/openid-connect/certs`;

console.log('JWT JWKS URI configured:', jwksUri);

const client = jwksRsa({
  jwksUri: jwksUri,
  cache: true,
  rateLimit: true,
  jwksRequestsPerMinute: 10,
  timeout: 30000
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, function (err, key) {
    if (err) {
      console.error('Error fetching signing key from JWKS:', err);
      return callback(err);
    }
    const signingKey = key.getPublicKey() || key.rsaPublicKey;
    callback(null, signingKey);
  });
}

function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Non authentifié. Token manquant.' });
  }

  const token = authHeader.split(' ')[1];

  jwt.verify(token, getKey, {
  }, (err, decoded) => {
    if (err) {
      console.error('Token verification failed:', err.message);
      return res.status(401).json({ message: 'Session expirée ou token invalide.' });
    }

    req.user = {
      keycloakId: decoded.sub,
      username: decoded.preferred_username,
      email: decoded.email,
      roles: decoded.realm_access ? decoded.realm_access.roles : []
    };

    next();
  });
}

module.exports = {
  verifyToken
};
