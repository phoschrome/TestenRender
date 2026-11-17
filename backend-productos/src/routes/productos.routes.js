import { Router } from 'express';
import productosController from '../controllers/productos.controller.js';
import paginate from '../middlewares/pagination.middleware.js';
import {
  validateIdParam,
  validateCreateProduct,
  validatePatchProduct,
} from '../middlewares/validation.middleware.js';

const router = Router();

router.get('/', paginate, productosController.getAll);
router.get('/:id', validateIdParam, productosController.getById);
router.post('/', validateCreateProduct, productosController.create);
router.put('/:id', validateIdParam, validateCreateProduct, productosController.update);
router.patch('/:id', validateIdParam, validatePatchProduct, productosController.patch);
router.delete('/:id', validateIdParam, productosController.delete);

export default router;
