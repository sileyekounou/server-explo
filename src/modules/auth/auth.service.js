import auth from "#config/auth";
import { authUtils } from "#utils/auth.utilis";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

class AuthService {
  // ========================================
  // INSCRIPTION
  // ========================================
  async signUp({ email, password, firstName, lastName, phone }) {
    // Vérifier si l'utilisateur existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new Error("Cet email est déjà utilisé");
    }

    // Créer l'utilisateur via Better-auth
    const result = await auth.api.signUpEmail({
      body: { email, password, firstName, lastName, phone },
      headers: {},
    });

    // Générer token de vérification email
    if (result.user) {
      const token = await authUtils.generateEmailVerificationToken(result.user.id);

      // TODO: Envoyer l'email de vérification
      // await emailService.sendVerificationEmail(result.user.email, token);

      if (process.env.NODE_ENV === "development") {
        console.log(`✉️  Token de vérification pour ${result.user.email}:`);
        console.log(`${process.env.VERIFY_MAIL_URL}${token}`);
      }
    }

    return result;
  }

  // ========================================
  // CONNEXION
  // ========================================
  async signIn({ email, password, ip, userAgent, headers }) {
    // Vérifier si le compte est verrouillé
    const isLocked = await authUtils.isAccountLocked(email);
    if (isLocked) {
      throw new Error("Compte temporairement verrouillé. Réessayez plus tard.");
    }

    try {
      // Tentative de connexion
      const result = await auth.api.signInEmail({
        body: { email, password },
        headers,
      });
      console.log("Un souciiiiiiiis: ", result)

      // Connexion réussie
      if (result.user) {
        await prisma.user.update({
          where: { id: result.user.id },
          data: {
            lastLogin: new Date(),
            lastLoginIP: ip,
            loginAttempts: 0,
            lockUntil: null,
          },
        });

        // Mettre à jour la session avec l'IP et user agent
        if (result.token) {
          await prisma.session.updateMany({
            where: {
              userId: result.user.id,
              sessionToken: result.session.sessionToken,
            },
            data: {
              ipAddress: ip,
              userAgent: userAgent,
            },
          });
        } else {
          console.log("Un souciiiiiiiis: ", result.session)
        }

        // if (result.token) {
        //   await prisma.session.updateMany({
        //     where: {
        //       sessionToken: result.token,
        //       userId: result.user.id,
        //     },
        //     data: {
        //       ipAddress: ip,
        //       userAgent: userAgent,
        //     },
        //   });
        // }

      }

      console.log("Result:", result)

      return result;
    } catch (error) {
      // Gérer tentative échouée
      await authUtils.handleFailedLogin(email);
      throw error;
    }
  }

  // ========================================
  // DÉCONNEXION
  // ========================================
  async signOut(headers) {
    await auth.api.signOut({ headers });
  }

  // ========================================
  // SESSION
  // ========================================
  async getSession(headers) {
    const session = await auth.api.getSession({ headers });
    return session;
  }

  // ========================================
  // PROFIL UTILISATEUR
  // ========================================
  async getUserProfile(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        emailVerified: true,
        isActive: true,
        createdAt: true,
        lastLogin: true,
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new Error("Utilisateur introuvable");
    }

    return user;
  }

  // ========================================
  // VÉRIFICATION EMAIL
  // ========================================
  async verifyEmail(token) {
    await authUtils.verifyEmail(token);
  }

  // ========================================
  // OTP
  // ========================================
  async generateOTP(userId) {
    const otp = await authUtils.generateOTP(userId);

    // TODO: Envoyer OTP par email/SMS
    // const user = await prisma.user.findUnique({ where: { id: userId } });
    // await smsService.sendOTP(user.phone, otp);

    if (process.env.NODE_ENV === "development") {
      console.log(`🔐 OTP généré pour user ${userId}: ${otp}`);
    }

    return otp;
  }

  async verifyOTP(userId, otp) {
    await authUtils.verifyOTP(userId, otp);
  }

  // ========================================
  // RESET PASSWORD
  // ========================================
  async requestPasswordReset(email) {
    const token = await authUtils.generatePasswordResetToken(email);

    // TODO: Envoyer email de reset
    // await emailService.sendPasswordReset(email, token);

    if (process.env.NODE_ENV === "development") {
      console.log(`🔑 Reset token pour ${email}:`);
      console.log(`http://localhost:3000/reset-password?token=${token}`);
    }

    return token;
  }

  async resetPassword(token, newPassword) {
    await authUtils.resetPasswordWithToken(token, newPassword);
  }
};


export const authService = new AuthService();