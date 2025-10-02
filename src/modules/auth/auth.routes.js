import express from "express";
import { authController } from "#modules/auth/auth.controller";
import { requireAuth, requireAuthWithRenewal } from "#middlewares/auth.middleware";

const router = express.Router();

// ========================================
// ROUTES PUBLIQUES
// ========================================

// Inscription
router.post("/sign-up", authController.signUp);

// Connexion
router.post("/sign-in", authController.signIn);

// Déconnexion
router.post("/sign-out", authController.signOut);

// Récupérer la session
router.get("/session", authController.getSession);

// Vérification email
router.get("/verify-email", authController.verifyEmail);

// Reset password - demande
router.post("/password/reset-request", authController.requestPasswordReset);

// Reset password - confirmation
router.post("/password/reset", authController.resetPassword);

// OTP - génération
router.post("/otp/generate", authController.generateOTP);

// OTP - vérification
router.post("/otp/verify", authController.verifyOTP);

// ========================================
// ROUTES PROTÉGÉES
// ========================================

// Profil utilisateur connecté
router.get("/me", requireAuth, authController.getMe);
// router.get("/me", requireAuthWithRenewal, authController.getMe);

export default router;
