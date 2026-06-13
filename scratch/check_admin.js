const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const user = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    console.log("Admin User:", user);
}
main().finally(() => prisma.$disconnect());
