const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: {
      role: {
        in: ["ADMIN", "FINANCE"]
      }
    }
  });

  console.log("Restoring REPORTS permission for ADMIN and FINANCE users...");
  
  for (const user of users) {
    let permissions = [];
    try {
      permissions = user.permissions ? JSON.parse(user.permissions) : [];
    } catch (e) {
      permissions = [];
    }

    if (!Array.isArray(permissions)) {
      permissions = [];
    }

    if (!permissions.includes("REPORTS")) {
      permissions.push("REPORTS");
      
      await prisma.user.update({
        where: { id: user.id },
        data: {
          permissions: JSON.stringify(permissions)
        }
      });
      console.log(`Updated user: ${user.name} (${user.email}) - Added REPORTS permission`);
    } else {
      console.log(`Skipped user: ${user.name} (${user.email}) - Already has REPORTS permission`);
    }
  }

  console.log("Restoration completed successfully.");
}

main()
  .catch(e => {
    console.error("Error running restoration script:", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
