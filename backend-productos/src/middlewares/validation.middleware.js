const sanitizeString = (str) => str
  .replace(/[<>]/g, '')
  .replace(/['";\\]/g, '')
  .trim();

const isProductText = (value) => {
  if (typeof value !== 'string') return false;

  const sanitizedValue = sanitizeString(value);
  const regexPermitido = /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s.,#\-_()]+$/;
  return sanitizedValue.length > 0 && regexPermitido.test(sanitizedValue);
};

const parsePrice = (value) => {
  if ((typeof value !== 'number' && typeof value !== 'string')
    || (typeof value === 'string' && value.trim() === '')) {
    return null;
  }

  const price = Number(value);
  if (!Number.isFinite(price) || price < 0 || price > 99999999.99) {
    return null;
  }

  return Number(price.toFixed(2));
};

const validateObjectBody = (req, res) => {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    res.status(400).json({
      success: false,
      error: 'El cuerpo de la solicitud debe ser un objeto JSON',
    });
    return false;
  }

  return true;
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
  if (!validateObjectBody(req, res)) return;

  let { nombre_producto, categoria_producto, pvp_producto } = req.body;

  if (nombre_producto === undefined || categoria_producto === undefined || pvp_producto === undefined) {
    return res.status(400).json({
      success: false,
      error: 'Campos obligatorios: nombre_producto, categoria_producto, pvp_producto',
    });
  }

  if (!isProductText(nombre_producto) || !isProductText(categoria_producto)) {
    return res.status(422).json({
      success: false,
      error: 'Los campos contienen caracteres no válidos o sospechosos',
    });
  }

  nombre_producto = sanitizeString(nombre_producto);
  categoria_producto = sanitizeString(categoria_producto);
  const pvp = parsePrice(pvp_producto);

  if (pvp === null) {
    return res.status(400).json({
      success: false,
      error: 'El campo pvp_producto debe ser un número mayor o igual a cero',
    });
  }

  req.body.nombre_producto = nombre_producto;
  req.body.categoria_producto = categoria_producto;
  req.body.pvp_producto = pvp;

  next();
};

const validatePatchProduct = (req, res, next) => {
  if (!validateObjectBody(req, res)) return;

  const allowedKeys = ['nombre_producto', 'categoria_producto', 'pvp_producto'];
  const bodyKeys = Object.keys(req.body);

  if (bodyKeys.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Debe enviar al menos un campo para actualizar',
    });
  }

  const hasInvalidKey = bodyKeys.some((key) => !allowedKeys.includes(key));
  if (hasInvalidKey) {
    return res.status(400).json({
      success: false,
      error: 'Uno o más campos enviados no están permitidos',
    });
  }

  if (req.body.nombre_producto !== undefined) {
    if (!isProductText(req.body.nombre_producto)) {
      return res.status(422).json({ success: false, error: 'nombre_producto contiene caracteres no válidos' });
    }
    req.body.nombre_producto = sanitizeString(req.body.nombre_producto);
  }

  if (req.body.categoria_producto !== undefined) {
    if (!isProductText(req.body.categoria_producto)) {
      return res.status(422).json({ success: false, error: 'categoria_producto contiene caracteres no válidos' });
    }
    req.body.categoria_producto = sanitizeString(req.body.categoria_producto);
  }

  if (req.body.pvp_producto !== undefined) {
    const pvp = parsePrice(req.body.pvp_producto);
    if (pvp === null) {
      return res.status(400).json({ success: false, error: 'pvp_producto debe ser un número válido >= 0' });
    }
    req.body.pvp_producto = pvp;
  }

  next();
};

export {
  validateIdParam,
  validateCreateProduct,
  validatePatchProduct,
};
