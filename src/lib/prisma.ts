import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../../generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL não definida. Copie .env.example para .env e configure a conexão MySQL.",
  );
}

const parsedUrl = new URL(connectionString);
if (parsedUrl.protocol !== "mysql:") {
  throw new Error("DATABASE_URL deve usar o protocolo mysql://.");
}

const database = decodeURIComponent(parsedUrl.pathname.replace(/^\/+/, ""));
if (!database) {
  throw new Error("DATABASE_URL deve informar o nome do banco de dados.");
}

const adapter = new PrismaMariaDb({
  host: parsedUrl.hostname,
  port: parsedUrl.port ? Number(parsedUrl.port) : 3306,
  user: decodeURIComponent(parsedUrl.username),
  password: decodeURIComponent(parsedUrl.password),
  database,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT ?? 5),
});

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
