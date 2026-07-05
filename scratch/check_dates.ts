const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDates() {
    const minDate = await prisma.salesDelivery.aggregate({ _min: { date: true }});
    const maxDate = await prisma.salesDelivery.aggregate({ _max: { date: true }});
    console.log("Min date:", minDate._min.date);
    console.log("Max date:", maxDate._max.date);
}

checkDates().finally(() => prisma.$disconnect());
