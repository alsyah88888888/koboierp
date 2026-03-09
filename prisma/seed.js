const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    const roles = [
        { name: 'Ferza', email: 'ferza@kolaborasi.id', role: 'ADMIN', password: 'suksesfinancialfreedom2027' },
        { name: 'Admin Utama', email: 'admin@kolaborasi.id', role: 'ADMIN', password: 'kayaitupasti2027' },
        { name: 'Finance Manager', email: 'finance@kolaborasi.id', role: 'FINANCE', password: 'finance123' },
        { name: 'Purchase Officer', email: 'purchase@kolaborasi.id', role: 'PURCHASE', password: 'purchase123' },
        { name: 'Warehouse Supervisor', email: 'warehouse@kolaborasi.id', role: 'WAREHOUSE', password: 'warehouse123' },
        { name: 'Sales Manager', email: 'sales@kolaborasi.id', role: 'SALES', password: 'sales123' },
        { name: 'Admin User', email: 'admin@kola.id', role: 'ADMIN', password: 'kayaitupasti2027' },
        { name: 'Finance User', email: 'finance@kola.id', role: 'FINANCE', password: 'finance123' },
        { name: 'Purchase User', email: 'purchase@kola.id', role: 'PURCHASE', password: 'purchase123' },
        { name: 'Warehouse User', email: 'warehouse@kola.id', role: 'WAREHOUSE', password: 'warehouse123' },
        { name: 'Bu Cici', email: 'cici@kolaborasi.id', role: 'ADMIN', password: 'cici123' },
        { name: 'Sales User', email: 'sales@kola.id', role: 'SALES', password: 'sales123' },
    ];

    console.log('Seeding users...');
    for (const u of roles) {
        const hashedPassword = await bcrypt.hash(u.password, 10);
        await prisma.user.upsert({
            where: { email: u.email },
            update: {
                name: u.name,
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
        console.log(`User synced: ${u.email} (${u.role})`);
    }
    console.log('Seeding completed.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
