const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    const name = 'Bu Cici';
    const email = 'cici@kolaborasi.id'; // Using this as the 'user' identifier
    const password = 'cici123';
    const role = 'ADMIN';

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.upsert({
        where: { email },
        update: {
            name,
            role,
            password: hashedPassword,
        },
        create: {
            name,
            email,
            role,
            password: hashedPassword,
        },
    });

    console.log(`User created/updated: ${user.email} (${user.role})`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
