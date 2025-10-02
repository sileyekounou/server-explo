// src/middlewares/auth.middleware.js

import auth from "#config/auth";
import { PrismaClient } from "@prisma/client";
import { renewSession } from "#middlewares/session-renewal.middleware";

const prisma = new PrismaClient();

// ========================================
// MIDDLEWARE D'AUTHENTIFICATION
// ========================================

export const requireAuth = async (req, res, next) => {
  try {
    const sessionToken = req.cookies?.["auth.session_token"];

    if (!sessionToken) {
      return res.status(401).json({
        success: false,
        message: "Authentification requise",
      });
    }

    const session = await prisma.session.findUnique({
      where: { sessionToken },
      include: { user: true },
    });

    if (!session || !session.user) {
      return res.status(401).json({
        success: false,
        message: "Session invalide",
      });
    }

    // Vérifier si la session est expirée
    if (new Date(session.expires) < new Date()) {
      // Supprimer la session expirée
      await prisma.session.delete({
        where: { id: session.id }
      });

      // Supprimer le cookie
      res.clearCookie("auth.session_token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
      });

      return res.status(401).json({
        success: false,
        message: "Session expirée",
      });
    }

    // Vérifier si le compte est actif
    if (!session.user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Compte désactivé",
      });
    }

    // Attacher user et session à la requête
    req.user = session.user;
    req.session = session;

    // 🔥 Passer au middleware de renouvellement
    next();
  } catch (error) {
    console.error("❌ Erreur middleware auth:", error);
    res.status(401).json({
      success: false,
      message: "Session invalide",
    });
  }
};

// ========================================
// COMBINAISON : AUTH + RENOUVELLEMENT
// ========================================

/**
 * Middleware combiné : authentification + renouvellement automatique
 * Utilise ce middleware pour protéger les routes
 */
export const requireAuthWithRenewal = [requireAuth, renewSession];

// ========================================
// AUTRES MIDDLEWARES (inchangés)
// ========================================

export const requireRole = (...roles) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Authentification requise",
        });
      }

      const userRoles = await prisma.userRole.findMany({
        where: { userId: req.user.id },
        include: { role: true },
      });

      const hasRole = userRoles.some((ur) => roles.includes(ur.role.name));

      if (!hasRole) {
        return res.status(403).json({
          success: false,
          message: "Permissions insuffisantes",
        });
      }

      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Erreur de vérification des permissions",
      });
    }
  };
};

export const requirePermission = (resource, action) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Authentification requise",
        });
      }

      const userRoles = await prisma.userRole.findMany({
        where: { userId: req.user.id },
        include: { role: true },
      });

      const hasPermission = userRoles.some((ur) => {
        const permissions = ur.role.permissions;
        return permissions?.[resource]?.includes(action);
      });

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: `Permission refusée: ${resource}.${action}`,
        });
      }

      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Erreur de vérification des permissions",
      });
    }
  };
};

export const requireEmailVerified = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentification requise",
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { emailVerified: true },
    });

    if (!user || !user.emailVerified) {
      return res.status(403).json({
        success: false,
        message: "Email non vérifié",
      });
    }

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur de vérification",
    });
  }
};