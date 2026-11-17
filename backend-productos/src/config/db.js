require('dotenv').config();

const { PrismaClient } = require('@prisma/client');

const resolveDatabaseUrl = () => {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;
  if (!DB_HOST || !DB_USER || !DB_NAME) {
    throw new Error('Configura DATABASE_URL o las variables DB_HOST, DB_USER y DB_NAME');
  }

  const credentials = `${encodeURIComponent(DB_USER)}:${encodeURIComponent(DB_PASSWORD || '')}`;
  const database = encodeURIComponent(DB_NAME);
  return `postgresql://${credentials}@${DB_HOST}:${DB_PORT || 5432}/${database}?schema=public`;
};

const prisma = new PrismaClient({
  datasources: {
    db: { url: resolveDatabaseUrl() },
  },
});

prisma.$on('error', (error) => {
  console.error('Error imprevisto en el cliente de base de datos:', error);
});

module.exports = prisma;
