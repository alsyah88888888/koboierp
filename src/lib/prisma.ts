import type { PrismaClient as PrismaClientType } from "@prisma/client";
const { PrismaClient } = (process.env.DATABASE_URL?.startsWith("file:") && !process.env.NEXT_PHASE)
  ? eval("require")("@prisma/client-sqlite")
  : require("@prisma/client");

// During build phase or if env is missing, set a dummy URL to prevent Prisma crashes
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/postgres";
}

// Global Prisma instance with a Proxy to bypass DB checks during build
const prismaClientSingleton = () => {
    // If DATABASE_URL is missing or we are in build phase, return a Proxy
    if (!process.env.DATABASE_URL || process.env.NEXT_PHASE === 'phase-production-build') {
        const dummyHandler = {
            get: () => async () => [], // Default to array for safety in .map() if possible
        };
        const modelProxy = new Proxy({
            findMany: async () => [],
            findUnique: async () => null,
            findFirst: async () => null,
            count: async () => 0,
            aggregate: async () => ({}),
            groupBy: async () => [],
        }, dummyHandler);

        return new Proxy({} as any, {
            get: (target, prop) => {
                const p = prop.toString();
                if (p === '$queryRawUnsafe' || p === '$queryRaw' || p === '$transaction') {
                    return async () => [];
                }
                return modelProxy;
            },
        }) as PrismaClientType;
    }
    return new PrismaClient();
};

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prisma ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== "production") globalThis.prisma = prisma;
