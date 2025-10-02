import express from "express";
import {
  requireAuthWithRenewal,
  requireRole,
  requirePermission,
  requireEmailVerified,
} from "#middlewares/auth.middleware";

const router = express.Router();

// Routes avec renouvellement automatique
router.get("/profile", requireAuthWithRenewal, (req, res) => {
  res.json({
    success: true,
    user: req.user,
  });
});

router.post(
  "/premium-feature",
  requireAuthWithRenewal,
  requireEmailVerified,
  (req, res) => {
    res.json({
      success: true,
      message: "Accès à la fonctionnalité premium",
    });
  }
);

router.get(
  "/admin/dashboard",
  requireAuthWithRenewal,
  requireRole("admin"),
  (req, res) => {
    res.json({
      success: true,
      message: "Bienvenue dans le dashboard admin",
    });
  }
);

export default router;