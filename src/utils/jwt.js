import jwt from 'jsonwebtoken'
import createError from 'http-errors'
import dotenv from 'dotenv'

dotenv.config();

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
const ACCESS_TOKEN_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN;
const RESET_TOKEN = process.env.RESET_TOKEN;
const RESET_TOKEN_EXPIRES_IN = process.env.RESET_TOKEN_EXPIRES_IN;


// Génère un access token signé
export const signAccessToken = (payload) => {
  return new Promise((resolve, reject) => {
    jwt.sign(payload, ACCESS_TOKEN_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES_IN }, (err, token) => {
      if (err) return reject(createError.InternalServerError());
      resolve(token);
    });
  });
};

// Middleware pour vérifier l'access token
// const verifyAccessToken = (req, res, next) => {
//   try {
//     const authHeader = req.headers['authorization'];
//     if (!authHeader) return next(createError.Unauthorized("Authorization manquante"));

//     const token = authHeader.split(' ')[1];
//     if (!token) return next(createError.Unauthorized("Token manquant"));

//     jwt.verify(token, ACCESS_TOKEN_SECRET, (err, payload) => {
//       if (err) {
//         if (err.name === "TokenExpiredError") return next(createError.Unauthorized("Token expiré"));
//         if (err.name === "JsonWebTokenError") return next(createError.Unauthorized("Token invalide"));
//         return next(createError.InternalServerError("Erreur lors de la vérification du token"));
//       }
//       req.user = payload;
//       next();
//     });
//   } catch (err) {
//     console.error("Erreur dans verifyAccessToken:", err.message);
//     return next(createError.InternalServerError("Erreur interne serveur"));
//   }
// };

// jwt.js
export const verifyAccessToken = (token) => {
  return new Promise((resolve, reject) => {
    jwt.verify(token, ACCESS_TOKEN_SECRET, (err, payload) => {
      if (err) {
        if (err.name === "TokenExpiredError") return reject(createError.Unauthorized("Token expiré"));
        if (err.name === "JsonWebTokenError") return reject(createError.Unauthorized("Token invalide"));
        return reject(createError.InternalServerError());
      }
      resolve(payload);
    });
  });
};

// Génère un refresh token
export const signRefreshToken = (payload) => {
  return new Promise((resolve, reject) => {
    jwt.sign(payload, REFRESH_TOKEN_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN }, (err, token) => {
      if (err) return reject(createError.InternalServerError());
      resolve(token);
    });
  });
};

// Vérifie un refresh token
export const verifyRefreshToken = (token) => {
  return new Promise((resolve, reject) => {
    if (!token) return reject(createError.Unauthorized("Token requis"));

    jwt.verify(token, REFRESH_TOKEN_SECRET, (err, payload) => {
      if (err) {
        if (err.name === "TokenExpiredError") return reject(createError.Unauthorized("Token expiré"));
        if (err.name === "JsonWebTokenError") return reject(createError.Unauthorized("Token invalide"));
        return reject(createError.InternalServerError("Erreur lors de la vérification du refresh token"));
      }
      resolve(payload);
    });
  });
};

// Génère un reset token
export const generateResetToken = (email) => {
  return new Promise((resolve, reject) => {
    jwt.sign(email, RESET_TOKEN, { expiresIn: RESET_TOKEN_EXPIRES_IN }, (err, token) => {
      if (err) return reject(createError.InternalServerError("Erreur lors de la génération du reset token"));
      resolve(token);
    });
  });
};

// Vérifie un reset token
export const verifyResetToken = (token) => {
  return new Promise((resolve, reject) => {
    if (!token) return reject(createError.Unauthorized("Token requis"));

    jwt.verify(token, RESET_TOKEN, (err, payload) => {
      if (err) {
        if (err.name === "TokenExpiredError") return reject(createError.Unauthorized("Token expiré"));
        if (err.name === "JsonWebTokenError") return reject(createError.Unauthorized("Token invalide"));
        return reject(createError.InternalServerError("Erreur lors de la vérification du reset token"));
      }
      resolve(payload);
    });
  });
};