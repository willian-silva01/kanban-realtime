// =============================================
// Wrapper para Async/Await em Controllers
// =============================================

/**
 * Envolve uma função async do controller para capturar
 * erros automaticamente e passar para o error handler.
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = asyncHandler;
