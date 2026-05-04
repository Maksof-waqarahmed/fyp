import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../prisma/generated/prisma/client";

if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is missing");
}

const globalForPrisma = global as unknown as {
    prisma: PrismaClient | undefined;
};

function makeClient() {
    const adapter = new PrismaPg({
        connectionString: process.env.DATABASE_URL,
    });
    return new PrismaClient({ adapter });
}

// Cache the client in BOTH dev and prod to avoid:
//   • Neon cold-start latency on every HMR reload (dev)
//   • Connection pool exhaustion on serverless (prod)
const prisma = globalForPrisma.prisma ?? makeClient();

if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = prisma;
}

export default prisma;
