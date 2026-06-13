const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
    const defaultPassword = 'password123';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
    
    const allPermissions = JSON.stringify([
        "ACCOUNTING", "DASHBOARD", "FINANCE", "MASTER", 
        "OPERATIONAL", "PURCHASE", "PURCHASE_REQUEST", 
        "REPORTS", "SALES", "SETTINGS", "TAX", "TRACKING", "WAREHOUSE"
    ]);

    const usersToUpsert = [
        { email: 'andi@kolaborasi.id', name: 'Andi' },
        { email: 'ferza@kolaborasi.id', name: 'Ferza' },
        { email: 'rian@kolaborasi.id', name: 'Riansyah' }
    ];

    for (const u of usersToUpsert) {
        const user = await prisma.user.upsert({
            where: { email: u.email },
            update: {
                role: 'ADMIN',
                permissions: allPermissions
            },
            create: {
                email: u.email,
                name: u.name,
                role: 'ADMIN',
                password: hashedPassword,
                permissions: allPermissions
            }
        });
        console.log(`Ensured ADMIN access for: ${user.email}`);
    }
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
