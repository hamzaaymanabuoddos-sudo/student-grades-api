// An error we THROW ON PURPOSE with an HTTP status code attached.
// The central error middleware turns it into a JSON response.
class AppError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}
module.exports = AppError;
