import ProductoModel from '../models/productos.model.js';

const productosController = {
  async getAll(req, res, next) {
    try {
      const { page, limit, offset } = req.pagination;
      const [totalRecords, items] = await Promise.all([
        ProductoModel.countAll(),
        ProductoModel.findAll(limit, offset),
      ]);

      const totalPages = Math.ceil(totalRecords / limit);

      return res.status(200).json({
        success: true,
        data: items,
        pagination: {
          currentPage: page,
          pageSize: limit,
          totalRecords,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const producto = await ProductoModel.findById(id);

      if (!producto) {
        return res.status(404).json({
          success: false,
          error: `Producto con id ${id} no encontrado`,
        });
      }

      return res.status(200).json({
        success: true,
        data: producto,
      });
    } catch (error) {
      next(error);
    }
  },

  async create(req, res, next) {
    try {
      const nuevoProducto = await ProductoModel.create(req.body);
      return res.status(201).json({
        success: true,
        message: 'Producto creado exitosamente',
        data: nuevoProducto,
      });
    } catch (error) {
      next(error);
    }
  },

  async update(req, res, next) {
    try {
      const { id } = req.params;
      const productoActualizado = await ProductoModel.update(id, req.body);

      if (!productoActualizado) {
        return res.status(404).json({
          success: false,
          error: `Producto con id ${id} no existe para ser actualizado`,
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Producto actualizado completamente',
        data: productoActualizado,
      });
    } catch (error) {
      next(error);
    }
  },

  async patch(req, res, next) {
    try {
      const { id } = req.params;
      const productoModificado = await ProductoModel.patch(id, req.body);

      if (!productoModificado) {
        return res.status(404).json({
          success: false,
          error: `Producto con id ${id} no existe para ser modificado`,
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Producto modificado parcialmente',
        data: productoModificado,
      });
    } catch (error) {
      next(error);
    }
  },

  async delete(req, res, next) {
    try {
      const { id } = req.params;
      const eliminado = await ProductoModel.delete(id);

      if (!eliminado) {
        return res.status(404).json({
          success: false,
          error: `Producto con id ${id} no encontrado para eliminar`,
        });
      }

      return res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
};

export default productosController;
