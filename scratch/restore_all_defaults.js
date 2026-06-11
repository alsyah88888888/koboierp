const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const DEFAULT_PERMISSIONS = {
  ADMIN: [
    "DASHBOARD", "FINANCE", "PURCHASE", "PURCHASE_REQUEST", "SALES", 
    "TRACKING", "OPERATIONAL", "WAREHOUSE", "ACCOUNTING", "REPORTS", 
    "TAX", "MASTER", "SETTINGS"
  ],
  FINANCE: [
    "DASHBOARD", "FINANCE", "OPERATIONAL", "ACCOUNTING", "REPORTS", 
    "TAX", "TRACKING"
  ],
  PURCHASE: [
    "DASHBOARD", "PURCHASE", "PURCHASE_REQUEST", "WAREHOUSE", "MASTER", "TRACKING"
  ],
  SALES: [
    "DASHBOARD", "SALES", "PURCHASE", "OPERATIONAL", "TRACKING"
  ],
  WAREHOUSE: [
    "DASHBOARD", "WAREHOUSE", "TRACKING"
  ],
  USER: [
    "DASHBOARD"
  ]
};

async function main() {
  const users = await prisma.user.findMany();

  console.log("Restoring all default permissions based on user roles...");
  
  for (const user of users) {
    const role = user.role ? user.role.toUpperCase() : "USER";
    const defaults = DEFAULT_PERMISSIONS[role] || DEFAULT_PERMISSIONS.USER;

    let currentPermissions = [];
    try {
      currentPermissions = user.permissions ? JSON.parse(user.permissions) : [];
    } catch (e) {
      currentPermissions = [];
    }

    if (!Array.isArray(currentPermissions)) {
      currentPermissions = [];
    }

    // Merge current permissions with defaults (ensure no duplicates)
    const merged = Array.from(new Set([...currentPermissions, ...defaults]));

    // Check if permissions actually changed
    const isDifferent = JSON.stringify(merged.sort()) !== JSON.stringify(currentPermissions.sort());

    if (isDifferent) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          permissions: JSON.stringify(merged)
        }
      });
      console.log(`Updated user ${user.name} (${user.email}) [Role: ${role}]:`);
      console.log(`  Before: ${JSON.stringify(currentPermissions)}`);
      console.log(`  After : ${JSON.stringify(merged)}`);
    } else {
      console.log(`Skipped user ${user.name} (${user.email}) [Role: ${role}] - Permissions already correct.`);
    }
  }

  console.log("Database update completed.");
}

main()
  .catch(e => {
    console.error("Error executing restore script:", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
