import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

export const authUtils = {
  // ========================================
  // GESTION OTP
  // ========================================

  /**
   * Génère un code OTP à 6 chiffres
   */
  async generateOTP(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });

    if (!user) {
      throw new Error("Utilisateur introuvable");
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await prisma.user.update({
      where: { id: userId },
      data: {
        otpCode: otp,
        otpExpires: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
        otpAttempts: 0,
        otpLocked: false,
      },
    });

    return otp;
  },

  /**
   * Vérifie un code OTP
   */
  async verifyOTP(userId, candidateOtp) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error("Utilisateur introuvable");
    }

    // Vérifier verrouillage OTP
    if (user.otpLocked && user.otpLockedUntil && new Date(user.otpLockedUntil) > new Date()) {
      const minutesLeft = Math.ceil((new Date(user.otpLockedUntil) - new Date()) / 60000);
      throw new Error(`OTP verrouillé. Réessayez dans ${minutesLeft} minutes.`);
    }

    // Vérifier expiration
    if (!user.otpCode || !user.otpExpires || new Date(user.otpExpires) < new Date()) {
      throw new Error("OTP expiré ou inexistant");
    }

    // Vérifier le code
    if (user.otpCode !== candidateOtp) {
      const newAttempts = user.otpAttempts + 1;

      if (newAttempts >= 5) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            otpAttempts: newAttempts,
            otpLocked: true,
            otpLockedUntil: new Date(Date.now() + 30 * 60 * 1000), // 30min
            otpCode: null, // Invalider le code
          },
        });
        throw new Error("Trop de tentatives. OTP verrouillé pour 30 minutes.");
      }

      await prisma.user.update({
        where: { id: userId },
        data: { otpAttempts: newAttempts },
      });

      throw new Error(`OTP incorrect. ${5 - newAttempts} tentative(s) restante(s).`);
    }

    // OTP valide - réinitialiser
    await prisma.user.update({
      where: { id: userId },
      data: {
        otpCode: null,
        otpExpires: null,
        otpAttempts: 0,
        otpLocked: false,
        otpLockedUntil: null,
      },
    });

    return true;
  },

  // ========================================
  // GESTION TENTATIVES DE CONNEXION
  // ========================================

  /**
   * Gère les échecs de connexion
   */
  async handleFailedLogin(email) {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, loginAttempts: true },
    });

    if (!user) {
      // Ne pas révéler que l'email n'existe pas
      return;
    }

    const newAttempts = user.loginAttempts + 1;
    const updateData = {
      loginAttempts: newAttempts,
    };

    // Verrouiller après 5 tentatives
    if (newAttempts >= 5) {
      updateData.lockUntil = new Date(Date.now() + 30 * 60 * 1000); // 30min
    }

    await prisma.user.update({
      where: { id: user.id },
      data: updateData,
    });
  },

  /**
   * Vérifie si le compte est verrouillé
   */
  async isAccountLocked(email) {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { lockUntil: true },
    });

    if (!user || !user.lockUntil) {
      return false;
    }

    if (new Date(user.lockUntil) > new Date()) {
      return true;
    }

    // Déverrouiller automatiquement si le temps est écoulé
    await prisma.user.update({
      where: { email },
      data: {
        lockUntil: null,
        loginAttempts: 0,
      },
    });

    return false;
  },

  /**
   * Réinitialise les tentatives de connexion (après succès)
   */
  async resetLoginAttempts(userId) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        loginAttempts: 0,
        lockUntil: null,
      },
    });
  },

  // ========================================
  // RESET MOT DE PASSE
  // ========================================

  /**
   * Génère un token de reset password
   */
  async generatePasswordResetToken(email) {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (!user) {
      // Sécurité : ne pas révéler si l'email existe
      // Mais lever l'erreur quand même pour la gestion
      throw new Error("Si cet email existe, un lien de réinitialisation a été envoyé");
    }

    const token = crypto.randomBytes(32).toString("hex");

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: token,
        passwordResetExpires: new Date(Date.now() + 10 * 60 * 1000), // 10min
      },
    });

    return token;
  },

  /**
   * Vérifie et utilise le token de reset
   */
  async resetPasswordWithToken(token, newPassword) {
    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpires: {
          gt: new Date(),
        },
      },
      include: {
        accounts: {
          where: {
            provider: "credential",
          },
        },
      },
    });

    if (!user) {
      throw new Error("Token invalide ou expiré");
    }

    // Trouver le compte credential
    const credentialAccount = user.accounts.find((acc) => acc.provider === "credential");

    if (!credentialAccount) {
      throw new Error("Compte credential introuvable");
    }

    // IMPORTANT : Hasher le mot de passe manuellement
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Mettre à jour le password dans Account
    await prisma.account.update({
      where: { id: credentialAccount.id },
      data: {
        password: hashedPassword,
      },
    });

    // Réinitialiser les tokens et tentatives
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: null,
        passwordResetExpires: null,
        loginAttempts: 0,
        lockUntil: null,
      },
    });

    return true;
  },

  // ========================================
  // VÉRIFICATION EMAIL
  // ========================================

  /**
   * Génère un token de vérification email
   */
  async generateEmailVerificationToken(userId) {
    const token = crypto.randomBytes(32).toString("hex");

    await prisma.user.update({
      where: { id: userId },
      data: {
        emailVerificationToken: token,
        emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
      },
    });

    return token;
  },

  /**
   * Vérifie l'email avec le token
   */
  async verifyEmail(token) {
    const user = await prisma.user.findFirst({
      where: {
        emailVerificationToken: token,
        emailVerificationExpires: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      throw new Error("Token de vérification invalide ou expiré");
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
      },
    });

    return true;
  },

  // ========================================
  // HELPERS
  // ========================================

  /**
   * Récupère l'IP réelle derrière un proxy
   */
  getRealIP(req) {
    const forwarded = req.headers["x-forwarded-for"];
    if (forwarded) {
      return forwarded.split(",")[0].trim();
    }
    return req.ip || req.connection.remoteAddress;
  },

  /**
   * Récupère le user agent
   */
  getUserAgent(req) {
    return req.headers["user-agent"] || "Unknown";
  },
};