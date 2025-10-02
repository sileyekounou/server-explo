import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Début du seeding...");

  // Créer les rôles par défaut
  const roles = [
    {
      name: "admin",
      description: "Administrateur système",
      permissions: {
        users: ["create", "read", "update", "delete"],
        roles: ["create", "read", "update", "delete"],
        settings: ["read", "update"],
      },
    },
    {
      name: "user",
      description: "Utilisateur standard",
      permissions: {
        profile: ["read", "update"],
      },
    },
    {
      name: "moderator",
      description: "Modérateur",
      permissions: {
        users: ["read", "update"],
        content: ["read", "update", "delete"],
      },
    },
  ];

  for (const roleData of roles) {
    const role = await prisma.role.upsert({
      where: { name: roleData.name },
      update: roleData,
      create: roleData,
    });
    console.log(`✅ Rôle créé/mis à jour: ${role.name}`);
  }

  console.log("✨ Seeding terminé!");
}

main()
  .catch((e) => {
    console.error("❌ Erreur lors du seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });