import { PrismaClient } from "@prisma/client";

const prismaClientSingleton = () => {
    // If we are in build phase, return a Proxy to prevent DB connection errors
    if (process.env.NEXT_PHASE === 'phase-production-build') {
        const dummyHandler = {
            get: () => async () => [],
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
                if (p === "$queryRawUnsafe" || p === "$queryRaw" || p === "$transaction") {
                    return async () => [];
                }
                return modelProxy;
            },
        });
    }
    return new PrismaClient();
};

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prisma ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== "production") globalThis.prisma = prisma;
