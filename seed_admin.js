const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
    const email = 'admin@kola.id';
    const password = 'admin123'; // Temporary password
    const hashedPassword = await bcrypt.hash(password, 10);

    console.log(`Creating admin user: ${email}...`);
    
    const user = await prisma.user.upsert({
        where: { email: email },
        update: {
            password: hashedPassword,
            role: 'ADMIN'
        },
        create: {
            name: 'Super Admin',
            email: email,
            password: hashedPassword,
            role: 'ADMIN'
        }
    });

    console.log('[OK] Admin user created successfully!');
    console.log('Credentials:');
    console.log(`- Email: ${email}`);
    console.log(`- Password: ${password}`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
