import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.ts';

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

const adapter = new PrismaPg({
  connectionString: resolveDatabaseUrl(),
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

const db = new PrismaClient({ adapter });

export default db;
