// Express 4 doesn't catch a rejected promise from an async route handler --
// left alone, that means no response is ever sent and the client just hangs
// waiting, instead of getting the 500 the error-handling middleware in
// index.js would produce. Wrap every async handler with this.
export const asyncRoute = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
