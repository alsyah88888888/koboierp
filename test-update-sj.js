const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { updateSalesDelivery } = require('./src/lib/services/sales-service.ts');
