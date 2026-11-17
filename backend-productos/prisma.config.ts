import 'dotenv/config';
import { defineConfig } from 'prisma/config';

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

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: resolveDatabaseUrl(),
  },
});
