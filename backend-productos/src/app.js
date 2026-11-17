import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import packageJson from '../package.json' with { type: 'json' };
import db from './config/db.js';
import productosRoutes from './routes/productos.routes.js';
import responseIntegrityHash from './middlewares/hash.middleware.js';
import errorHandler from './middlewares/errorHandler.middleware.js';

const app = express();
const PORT = process.env.PORT || 5051;
const allowedOrigins = (process.env.CORS_ORIGINS
  || 'https://phoschrome.github.io,http://localhost:5500,http://127.0.0.1:5500')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: '1mb' }));
app.use(responseIntegrityHash);

app.get('/health', async (req, res, next) => {
  try {
    await db.$queryRaw`SELECT 1`;
    return res.status(200).json({
      success: true,
      status: 'ok',
      version: packageJson.version,
    });
  } catch (error) {
    return next(error);
  }
});

app.use('/api/productos', productosRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Ruta ${req.originalUrl} no encontrada en el servidor`,
  });
});

app.use(errorHandler);

export default app;

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  app.listen(PORT, () => {
    console.log(`Servidor activo en el puerto ${PORT}`);
    console.log(`Endpoints base: http://localhost:${PORT}/api/productos`);
  });
}
