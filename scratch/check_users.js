const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({ 
        where: { email: { in: ['andi@kolaborasi.id', 'rian@kolaborasi.id', 'ferza@kolaborasi.id'] } } 
    });
    console.log("Users:", users);
}
main().finally(() => prisma.$disconnect());
