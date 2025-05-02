class ErrorResponse extends Error {
    constructor(message, statusCode) {
      super(message);
      this.statusCode = statusCode;
      this.isOperational = true; // Mark as operational error
      Error.captureStackTrace(this, this.constructor);
    }
  }
  
  module.exports = ErrorResponse;