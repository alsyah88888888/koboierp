const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    const roles = [
        { name: 'Admin User', email: 'admin@kola.id', role: 'ADMIN', password: 'admin123' },
        { name: 'Finance User', email: 'finance@kola.id', role: 'FINANCE', password: 'finance123' },
        { name: 'Purchase User', email: 'purchase@kola.id', role: 'PURCHASE', password: 'purchase123' },
        { name: 'Warehouse User', email: 'warehouse@kola.id', role: 'WAREHOUSE', password: 'warehouse123' },
    ];

    for (const u of roles) {
        const hashedPassword = await bcrypt.hash(u.password, 10);
        await prisma.user.upsert({
            where: { email: u.email },
            update: {
                role: u.role,
                password: hashedPassword,
            },
            create: {
                name: u.name,
                email: u.email,
                role: u.role,
                password: hashedPassword,
            },
        });
        console.log(`User seeded: ${u.email}`);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
