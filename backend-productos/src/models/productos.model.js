import { Prisma } from '../generated/prisma/client.ts';
import db from '../config/db.js';

const productoFields = {
  id_producto: true,
  nombre_producto: true,
  categoria_producto: true,
  pvp_producto: true,
};

const updateOrNull = async (operation) => {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return null;
    }

    throw error;
  }
};

const ProductoModel = {
  async countAll() {
    return db.producto.count();
  },

  async findAll(limit, offset) {
    return db.producto.findMany({
      select: productoFields,
      orderBy: { id_producto: 'asc' },
      take: limit,
      skip: offset,
    });
  },

  async findById(id) {
    return db.producto.findUnique({
      where: { id_producto: id },
      select: productoFields,
    });
  },

  async create({ nombre_producto, categoria_producto, pvp_producto }) {
    return db.producto.create({
      data: { nombre_producto, categoria_producto, pvp_producto },
      select: productoFields,
    });
  },

  async update(id, { nombre_producto, categoria_producto, pvp_producto }) {
    return updateOrNull(() => db.producto.update({
      where: { id_producto: id },
      data: { nombre_producto, categoria_producto, pvp_producto },
      select: productoFields,
    }));
  },

  async patch(id, fields) {
    return updateOrNull(() => db.producto.update({
      where: { id_producto: id },
      data: fields,
      select: productoFields,
    }));
  },

  async delete(id) {
    const { count } = await db.producto.deleteMany({
      where: { id_producto: id },
    });
    return count > 0;
  },
};

export default ProductoModel;
