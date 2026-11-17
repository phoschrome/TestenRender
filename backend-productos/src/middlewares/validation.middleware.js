const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;
  return str
    .replace(/[<>]/g, '')
    .replace(/['";\\]/g, '')
    .trim();
};

const validateIdParam = (req, res, next) => {
  const { id } = req.params;
  const parsedId = Number(id);

  if (!Number.isInteger(parsedId) || parsedId <= 0) {
    return res.status(400).json({
      success: false,
      error: 'El parámetro "id" debe ser un número entero positivo',
    });
  }

  req.params.id = parsedId;
  next();
};

const validateCreateProduct = (req, res, next) => {
  let { nombre_producto, categoria_producto, pvp_producto } = req.body;

  if (!nombre_producto || !categoria_producto || pvp_producto === undefined) {
    return res.status(400).json({
      success: false,
      error: 'Campos obligatorios: nombre_producto, categoria_producto, pvp_producto',
    });
  }

  nombre_producto = sanitizeString(nombre_producto);
  categoria_producto = sanitizeString(categoria_producto);
  const pvp = Number(pvp_producto);

  const regexPermitido = /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s.,#\-_()]+$/;

  if (!regexPermitido.test(nombre_producto) || !regexPermitido.test(categoria_producto)) {
    return res.status(422).json({
      success: false,
      error: 'Los campos contienen caracteres no válidos o sospechosos',
    });
  }

  if (Number.isNaN(pvp) || pvp < 0) {
    return res.status(400).json({
      success: false,
      error: 'El campo pvp_producto debe ser un número mayor o igual a cero',
    });
  }

  req.body.nombre_producto = nombre_producto;
  req.body.categoria_producto = categoria_producto;
  req.body.pvp_producto = Number(pvp.toFixed(2));

  next();
};

const validatePatchProduct = (req, res, next) => {
  const allowedKeys = ['nombre_producto', 'categoria_producto', 'pvp_producto'];
  const bodyKeys = Object.keys(req.body);

  if (bodyKeys.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Debe enviar al menos un campo para actualizar',
    });
  }

  const hasInvalidKey = bodyKeys.some((k) => !allowedKeys.includes(k));
  if (hasInvalidKey) {
    return res.status(400).json({
      success: false,
      error: 'Uno o más campos enviados no están permitidos',
    });
  }

  const regexPermitido = /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s.,#\-_()]+$/;

  if (req.body.nombre_producto !== undefined) {
    req.body.nombre_producto = sanitizeString(req.body.nombre_producto);
    if (!regexPermitido.test(req.body.nombre_producto)) {
      return res.status(422).json({ success: false, error: 'nombre_producto contiene caracteres no válidos' });
    }
  }

  if (req.body.categoria_producto !== undefined) {
    req.body.categoria_producto = sanitizeString(req.body.categoria_producto);
    if (!regexPermitido.test(req.body.categoria_producto)) {
      return res.status(422).json({ success: false, error: 'categoria_producto contiene caracteres no válidos' });
    }
  }

  if (req.body.pvp_producto !== undefined) {
    const pvp = Number(req.body.pvp_producto);
    if (Number.isNaN(pvp) || pvp < 0) {
      return res.status(400).json({ success: false, error: 'pvp_producto debe ser un número válido >= 0' });
    }
    req.body.pvp_producto = Number(pvp.toFixed(2));
  }

  next();
};

module.exports = {
  validateIdParam,
  validateCreateProduct,
  validatePatchProduct,
};
