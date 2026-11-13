import { PrismaClient } from "@prisma/client";

function buildDatabaseUrl(rawUrl?: string): string | undefined {
    if (!rawUrl) return rawUrl;
    if (!rawUrl.includes("pooler.supabase.com")) return rawUrl;

    // Use Supabase Transaction Pooler (port 6543) with pgbouncer=true and resilient timeouts
    // to prevent Session Mode (port 5432) connection exhaustion.
    let url = rawUrl.replace(":5432/", ":6543/");
    url = url.replace(/connect_timeout=\d+/g, "connect_timeout=30");
    url = url.replace(/pool_timeout=\d+/g, "pool_timeout=30");
    if (!url.includes("pgbouncer=true")) {
        url += (url.includes("?") ? "&" : "?") + "pgbouncer=true";
    }
    return url;
}

// Prevent multiple instances of Prisma Client in development & production
const prismaClientSingleton = () => {
    return new PrismaClient({
        log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
        datasources: {
            db: {
                url: buildDatabaseUrl(process.env.DATABASE_URL)
            }
        }
    });
};

declare global {
    var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prisma ?? prismaClientSingleton();

export default prisma;

globalThis.prisma = prisma;

export const getPrisma = () => prisma;
