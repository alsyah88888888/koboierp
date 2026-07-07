const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { calculateProductTraceabilityInternal } = require('./src/lib/services/report-service.ts');

// We have to use ts-node to run report-service.ts
