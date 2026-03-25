import { PrismaClient } from "@prisma/client";

const prismaClientSingleton = () => {
  // During build phase, provide a dummy URL if DATABASE_URL is missing to avoid crashing static analysis
  if (process.env.NEXT_PHASE === 'phase-production-build' && !process.env.DATABASE_URL) {
    return new PrismaClient({
      datasources: {
        db: {
          url: "postgresql://postgres:postgres@localhost:5432/postgres" 
        }
      }
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
