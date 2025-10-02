import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  // ========================================
  // CONFIGURATION EMAIL & PASSWORD
  // ========================================
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Tu gères manuellement
    minPasswordLength: 8,
    maxPasswordLength: 128,
    
    // IMPORTANT : Spécifier où stocker le password
    async onSignUp(data) {
      // Better-auth va gérer le hash automatiquement
      return data;
    },

    // Validation custom du mot de passe
    passwordValidation: (password) => {
      const hasUpperCase = /[A-Z]/.test(password);
      const hasLowerCase = /[a-z]/.test(password);
      const hasNumbers = /\d/.test(password);
      const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

      if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
        return {
          valid: false,
          message:
            "Mot de passe faible : majuscules, minuscules, chiffres et caractères spéciaux requis",
        };
      }
      return { valid: true };
    },
  },

  // ========================================
  // CONFIGURATION SESSION
  // ========================================
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 jours
    updateAge: 60 * 60 * 24, // Renouvellement quotidien
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // Cache 5 minutes
    },
    fields: {
    token: "sessionToken",
    expiresAt: "expires",
    ipAddress: "ipAddress",
    userAgent: "userAgent",
  },
  },

  // ========================================
  // CHAMPS USER CUSTOM
  // ========================================
  user: {
    additionalFields: {
      firstName: {
        type: "string",
        required: true,
        input: true,
      },
      lastName: {
        type: "string",
        required: true,
        input: true,
      },
      phone: {
        type: "string",
        required: false,
        input: true,
      },
      isActive: {
        type: "boolean",
        required: false,
        defaultValue: true,
      },
      loginAttempts: {
        type: "number",
        required: false,
        defaultValue: 0,
      },
      lockUntil: {
        type: "date",
        required: false,
      },
      lastLogin: {
        type: "date",
        required: false,
      },
      lastLoginIP: {
        type: "string",
        required: false,
      },
      otpCode: {
        type: "string",
        required: false,
      },
      otpExpires: {
        type: "date",
        required: false,
      },
      otpAttempts: {
        type: "number",
        required: false,
        defaultValue: 0,
      },
      otpLocked: {
        type: "boolean",
        required: false,
        defaultValue: false,
      },
      otpLockedUntil: {
        type: "date",
        required: false,
      },
      passwordResetToken: {
        type: "string",
        required: false,
      },
      passwordResetExpires: {
        type: "date",
        required: false,
      },
      emailVerificationToken: {
        type: "string",
        required: false,
      },
      emailVerificationExpires: {
        type: "date",
        required: false,
      },
    },
  },

  // ========================================
  // RATE LIMITING
  // ========================================
  rateLimit: {
    enabled: true,
    window: 60, // 1 minute
    max: 10, // 10 requêtes max
  },

  // ========================================
  // MAPPING ACCOUNT (IMPORTANT)
  // ========================================
  account: {
    fields: {
      // Better-auth envoie "accountId" -> ta colonne "providerAccountId"
      accountId: "providerAccountId",
      
      // Better-auth envoie "providerId" -> ta colonne "provider"
      providerId: "provider",
    },
  },

  // ========================================
  // SÉCURITÉ AVANCÉE
  // ========================================
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
    cookiePrefix: "auth",
    crossSubDomainCookies: {
      enabled: false,
    },
  },
});

export default auth;