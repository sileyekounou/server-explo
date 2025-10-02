import { authService } from "#modules/auth/auth.service";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

class AuthController {
  // ========================================
  // INSCRIPTION
  // ========================================
  async signUp(req, res) {
    try {
      const { email, password, firstName, lastName, phone } = req.body;

      if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({
          success: false,
          message: "Email, mot de passe, prénom et nom requis",
        });
      }

      const result = await authService.signUp({
        email,
        password,
        firstName,
        lastName,
        phone,
      });

      res.status(201).json({
        success: true,
        message: "Inscription réussie. Vérifiez votre email.",
        user: result.user,
      });
    } catch (error) {
      console.error("❌ Erreur sign-up:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Erreur lors de l'inscription",
      });
    }
  }

  // ========================================
  // CONNEXION
  // ========================================
  // async signIn(req, res) {
  //   try {
  //     const { email, password } = req.body;

  //     if (!email || !password) {
  //       return res.status(400).json({
  //         success: false,
  //         message: "Email et mot de passe requis",
  //       });
  //     }

  //     const ip = req.headers["x-forwarded-for"]?.split(",")[0] || req.ip;
  //     const userAgent = req.headers["user-agent"] || "Unknown";

  //     const result = await authService.signIn({
  //       email,
  //       password,
  //       ip,
  //       userAgent,
  //       headers: req.headers,
  //     });

  //     res.status(200).json({
  //       success: true,
  //       message: "Connexion réussie",
  //       user: result.user,
  //       session: result.session,
  //     });
  //   } catch (error) {
  //     res.status(401).json({
  //       success: false,
  //       message: error.message || "Email ou mot de passe incorrect",
  //     });
  //   }
  // }

  // Dans auth.controller.js

async signIn(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email et mot de passe requis",
      });
    }

    const ip = req.headers["x-forwarded-for"]?.split(",")[0] || req.ip;
    const userAgent = req.headers["user-agent"] || "Unknown";

    const result = await authService.signIn({
      email,
      password,
      ip,
      userAgent,
      headers: req.headers,
    });

    // 🔥 Définir manuellement le cookie de session
    res.cookie("auth.session_token", result.sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 jours
      path: "/",
    });

    res.status(200).json({
      success: true,
      message: "Connexion réussie",
      user: result.user,
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: error.message || "Email ou mot de passe incorrect",
    });
  }
}

  // ========================================
  // DÉCONNEXION
  // ========================================
  async signOut(req, res) {
    try {
      const sessionToken = req.cookies?.["auth.session_token"];

      if (sessionToken) {
        // 🔥 Appeler le service avec le sessionToken
        await authService.signOut(sessionToken);
      }

      // Supprimer le cookie
      res.clearCookie("auth.session_token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
      });

      res.status(200).json({
        success: true,
        message: "Déconnexion réussie",
      });
    } catch (error) {
      console.error("Erreur signOut:", error);
      
      // Toujours supprimer le cookie
      res.clearCookie("auth.session_token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
      });
      
      res.status(200).json({
        success: true,
        message: "Déconnexion réussie",
      });
    }
  }
  async getSession(req, res) {
    try {
      const session = await authService.getSession(req.headers);

      if (!session) {
        return res.status(401).json({
          success: false,
          message: "Non authentifié",
        });
      }

      res.status(200).json({
        success: true,
        session,
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        message: "Session invalide",
      });
    }
  }

  // ========================================
  // PROFIL UTILISATEUR
  // ========================================
  async getMe(req, res) {
    try {
      const user = await authService.getUserProfile(req.user.id);

      res.status(200).json({
        success: true,
        user,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Erreur lors de la récupération du profil",
      });
    }
  }

  // ========================================
  // VÉRIFICATION EMAIL
  // ========================================
  async verifyEmail(req, res) {
    try {
      const { token } = req.query;

      if (!token) {
        return res.status(400).json({
          success: false,
          message: "Token manquant",
        });
      }

      await authService.verifyEmail(token);

      res.status(200).json({
        success: true,
        message: "Email vérifié avec succès",
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  // ========================================
  // OTP - GÉNÉRATION
  // ========================================
  async generateOTP(req, res) {
    try {
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "userId requis",
        });
      }

      await authService.generateOTP(userId);

      res.status(200).json({
        success: true,
        message: "OTP généré et envoyé",
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  // ========================================
  // OTP - VÉRIFICATION
  // ========================================
  async verifyOTP(req, res) {
    try {
      const { userId, otp } = req.body;

      if (!userId || !otp) {
        return res.status(400).json({
          success: false,
          message: "userId et otp requis",
        });
      }

      await authService.verifyOTP(userId, otp);

      res.status(200).json({
        success: true,
        message: "OTP vérifié avec succès",
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  // ========================================
  // RESET PASSWORD - DEMANDE
  // ========================================
  async requestPasswordReset(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Email requis",
        });
      }

      await authService.requestPasswordReset(email);

      // Réponse générique pour la sécurité
      res.status(200).json({
        success: true,
        message: "Si cet email existe, un lien de réinitialisation a été envoyé",
      });
    } catch (error) {
      // Toujours renvoyer le même message
      res.status(200).json({
        success: true,
        message: "Si cet email existe, un lien de réinitialisation a été envoyé",
      });
    }
  }

  // ========================================
  // RESET PASSWORD - CONFIRMATION
  // ========================================
  async resetPassword(req, res) {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({
          success: false,
          message: "Token et nouveau mot de passe requis",
        });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({
          success: false,
          message: "Le mot de passe doit contenir au moins 8 caractères",
        });
      }

      await authService.resetPassword(token, newPassword);

      res.status(200).json({
        success: true,
        message: "Mot de passe réinitialisé avec succès",
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
};


export const authController = new AuthController();