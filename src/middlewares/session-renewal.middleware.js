import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Middleware de renouvellement automatique de session
 * Renouvelle la session si elle expire dans moins de 24h
 */
// export const renewSession = async (req, res, next) => {
//   try {
//     // Vérifier si une session existe déjà (définie par requireAuth)
//     if (!req.session) {
//       return next();
//     }

//     const session = req.session;
//     const sessionToken = req.cookies?.["auth.session_token"];

//     if (!sessionToken) {
//       return next();
//     }

//     // Calculer si la session expire dans moins de 24h
//     const oneDayFromNow = new Date(Date.now() + 24 * 60 * 60 * 1000);
//     const sessionExpires = new Date(session.expires);

//     // Si la session expire dans moins de 24h, la renouveler
//     if (sessionExpires < oneDayFromNow) {
//       const newExpiration = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // +7 jours

//       // Mettre à jour la session dans la DB
//       await prisma.session.update({
//         where: { id: session.id },
//         data: {
//           expires: newExpiration,
//           updatedAt: new Date(),
//         },
//       });

//       // Mettre à jour le cookie avec la nouvelle expiration
//       res.cookie("auth.session_token", sessionToken, {
//         httpOnly: true,
//         secure: process.env.NODE_ENV === "production",
//         sameSite: "lax",
//         maxAge: 7 * 24 * 60 * 60 * 1000, // 7 jours en millisecondes
//         path: "/",
//       });

//       // Mettre à jour l'objet session dans la requête
//       req.session.expires = newExpiration;

//       if (process.env.NODE_ENV === "development") {
//         console.log(`🔄 Session renouvelée pour user ${req.user.email} jusqu'à ${newExpiration.toISOString()}`);
//       }
//     }

//     next();
//   } catch (error) {
//     console.error("❌ Erreur renouvellement session:", error);
//     // Ne pas bloquer la requête en cas d'erreur
//     next();
//   }
// };

// Version améliorée du middleware avec config .env

export const renewSession = async (req, res, next) => {
  try {
    if (!req.session) {
      return next();
    }

    const session = req.session;
    const sessionToken = req.cookies?.["auth.session_token"];

    if (!sessionToken) {
      return next();
    }

    // 🔥 Config depuis .env
    const sessionDurationDays = parseInt(process.env.SESSION_DURATION_DAYS || "7");
    const renewalThresholdHours = parseInt(process.env.SESSION_RENEWAL_THRESHOLD_HOURS || "24");

    const renewalThreshold = new Date(Date.now() + renewalThresholdHours * 60 * 60 * 1000);
    const sessionExpires = new Date(session.expires);

    if (sessionExpires < renewalThreshold) {
      const newExpiration = new Date(Date.now() + sessionDurationDays * 24 * 60 * 60 * 1000);

      await prisma.session.update({
        where: { id: session.id },
        data: {
          expires: newExpiration,
          updatedAt: new Date(),
        },
      });

      res.cookie("auth.session_token", sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: sessionDurationDays * 24 * 60 * 60 * 1000,
        path: "/",
      });

      req.session.expires = newExpiration;

      if (process.env.NODE_ENV === "development") {
        console.log(`🔄 Session renouvelée pour ${req.user.email} jusqu'à ${newExpiration.toISOString()}`);
      }
    }

    next();
  } catch (error) {
    console.error("❌ Erreur renouvellement session:", error);
    next();
  }
};
