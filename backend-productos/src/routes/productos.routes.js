const { Router } = require('express');
const productosController = require('../controllers/productos.controller');
const paginate = require('../middlewares/pagination.middleware');
const {
  validateIdParam,
  validateCreateProduct,
  validatePatchProduct,
} = require('../middlewares/validation.middleware');

const router = Router();

router.get('/', paginate, productosController.getAll);
router.get('/:id', validateIdParam, productosController.getById);
router.post('/', validateCreateProduct, productosController.create);
router.put('/:id', validateIdParam, validateCreateProduct, productosController.update);
router.patch('/:id', validateIdParam, validatePatchProduct, productosController.patch);
router.delete('/:id', validateIdParam, productosController.delete);

module.exports = router;
