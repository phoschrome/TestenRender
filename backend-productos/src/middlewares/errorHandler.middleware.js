const errorHandler = (err, req, res, next) => {
  console.error('[Error Tracker]:', err);

  const requestedStatus = err.statusCode || err.status;
  const status = Number.isInteger(requestedStatus) && requestedStatus >= 400 && requestedStatus < 500
    ? requestedStatus
    : 500;
  const message = status === 500
    ? 'Error interno del servidor'
    : err.message || 'Solicitud no válida';

  res.status(status).json({
    success: false,
    status,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

export default errorHandler;
