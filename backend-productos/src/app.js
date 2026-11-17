require('dotenv').config();

const express = require('express');
const productosRoutes = require('./routes/productos.routes');
const responseIntegrityHash = require('./middlewares/hash.middleware');
const errorHandler = require('./middlewares/errorHandler.middleware');

const app = express();
const cors = require('cors'); app.use(cors());
const PORT = process.env.PORT || 5051;

app.use(express.json({ limit: '1mb' }));
app.use(responseIntegrityHash);

app.use('/api/productos', productosRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Ruta ${req.originalUrl} no encontrada en el servidor`,
  });
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Servidor activo en el puerto ${PORT}`);
  console.log(`Endpoints base: http://localhost:${PORT}/api/productos`);
});
