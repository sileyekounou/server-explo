import auth from "#config/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ========================================
// MIDDLEWARE D'AUTHENTIFICATION
// ========================================

export const requireAuth = async (req, res, next) => {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session || !session.user) {
      return res.status(401).json({
        success: false,
        message: "Authentification requise",
      });
    }

    // Vérifier si le compte est actif
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isActive: true },
    });

    if (!user || !user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Compte désactivé",
      });
    }

    req.user = session.user;
    req.session = session.session;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: "Session invalide",
    });
  }
};

// export const requireAuth = async (req, res, next) => {
//   try {
//     const token =
//       req.headers.authorization?.split(" ")[1] || req.cookies?.authToken;

//     console.log("Token",token)

//     if (!token) {
//       return res
//         .status(401)
//         .json({ success: false, message: "Authentification requise" });
//     }

//     // Récupérer la session depuis Prisma
//     const session = await prisma.session.findUnique({
//       where: { sessionToken: token },
//       include: { user: true },
//     });

//     if (!session || !session.user) {
//       return res
//         .status(401)
//         .json({ success: false, message: "Session invalide" });
//     }

//     // Vérifier si le compte est actif
//     if (!session.user.isActive) {
//       return res
//         .status(403)
//         .json({ success: false, message: "Compte désactivé" });
//     }

//     req.user = session.user;
//     req.session = session;
//     next();
//   } catch (error) {
//     res.status(401).json({ success: false, message: "Session invalide" });
//   }
// };

// ========================================
// MIDDLEWARE DE VÉRIFICATION DE RÔLE
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

// ========================================
// MIDDLEWARE DE VÉRIFICATION DE PERMISSION
// ========================================

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

// ========================================
// MIDDLEWARE DE VÉRIFICATION EMAIL
// ========================================

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
