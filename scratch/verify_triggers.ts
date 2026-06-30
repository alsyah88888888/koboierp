import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkTriggers() {
    const res = await prisma.$queryRaw`
        SELECT event_object_table, trigger_name, event_manipulation, action_statement
        FROM information_schema.triggers
        WHERE event_object_table IN ('StockMovement', 'SalesDeliveryItem', 'SalesDelivery');
    `;
    console.log("DB Triggers:");
    console.log(res);
}

checkTriggers().finally(() => prisma.$disconnect());
