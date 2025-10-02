import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const cleanupExpiredSessions = async () => {
  try {
    const result = await prisma.session.deleteMany({
      where: {
        expires: {
          lt: new Date(), // Supprimer toutes les sessions expirées
        },
      },
    });

    console.log(`🧹 ${result.count} sessions expirées supprimées`);
    return result.count;
  } catch (error) {
    console.error("❌ Erreur cleanup sessions:", error);
  }
};