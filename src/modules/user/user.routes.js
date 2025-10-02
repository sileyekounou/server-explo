import express from "express";
import {
  requireAuth,
  requireRole,
  requirePermission,
  requireEmailVerified,
} from "#middlewares/auth.middleware";

const router = express.Router();

// ========================================
// EXEMPLES D'UTILISATION DES MIDDLEWARES
// ========================================

// Route protégée simple
router.get("/profile", requireAuth, (req, res) => {
  res.json({
    success: true,
    user: req.user,
  });
});

// Route nécessitant un email vérifié
router.post(
  "/premium-feature",
  requireAuth,
  requireEmailVerified,
  (req, res) => {
    res.json({
      success: true,
      message: "Accès à la fonctionnalité premium",
    });
  }
);

// Route réservée aux admins
router.get(
  "/admin/dashboard",
  requireAuth,
  requireRole("admin"),
  (req, res) => {
    res.json({
      success: true,
      message: "Bienvenue dans le dashboard admin",
    });
  }
);

// Route accessible aux admins OU modérateurs
router.get(
  "/moderation",
  requireAuth,
  requireRole("admin", "moderator"),
  (req, res) => {
    res.json({
      success: true,
      message: "Panel de modération",
    });
  }
);

// Route avec permission spécifique
router.delete(
  "/users/:id",
  requireAuth,
  requirePermission("users", "delete"),
  (req, res) => {
    res.json({
      success: true,
      message: `Utilisateur ${req.params.id} supprimé`,
    });
  }
);

// Route avec permissions multiples
router.put(
  "/settings/security",
  requireAuth,
  requirePermission("settings", "update"),
  (req, res) => {
    res.json({
      success: true,
      message: "Paramètres de sécurité mis à jour",
    });
  }
);

// Combinaison de middlewares
router.post(
  "/admin/users/create",
  requireAuth,
  requireEmailVerified,
  requireRole("admin"),
  requirePermission("users", "create"),
  (req, res) => {
    res.json({
      success: true,
      message: "Utilisateur créé par l'admin",
    });
  }
);

export default router;
