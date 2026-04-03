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
  var prismaInstance: undefined | ReturnType<typeof prismaClientSingleton>;
}

export function getPrisma() {
    if (typeof window !== "undefined") return {} as any; // Safety for client evaluation
    if (!globalThis.prismaInstance) {
        globalThis.prismaInstance = prismaClientSingleton();
    }
    return globalThis.prismaInstance;
}

export default getPrisma;

