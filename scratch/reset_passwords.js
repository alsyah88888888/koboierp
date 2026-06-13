const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
    const defaultPassword = 'password123';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
    
    await prisma.user.updateMany({
        where: { email: { in: ['ferza@kolaborasi.id', 'rian@kolaborasi.id'] } },
        data: { password: hashedPassword }
    });
    console.log("Passwords reset successfully");
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
