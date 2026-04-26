// Concept: Error-handling middleware, Express error flow
const { AppError } = require('../utils/asyncHandler');

exports.notFound = (req, res, next) => {
  next(new AppError(`Route ${req.originalUrl} not found`, 404));
};

exports.globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';
  
  let error = { ...err };
  error.message = err.message;
  error.name = err.name;

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = `Resource not found`;
    error = new AppError(message, 404);
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    error = new AppError(message, 400);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = new AppError(message, 400);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = new AppError('Invalid token. Please log in again!', 401);
  }
  if (err.name === 'TokenExpiredError') {
    error = new AppError('Your token has expired! Please log in again.', 401);
  }

  // Response logic
  if (req.path.startsWith('/api') || req.originalUrl.startsWith('/api')) {
    // API Response
    const response = {
      success: false,
      message: error.message,
      data: {},
      pagination: {}
    };
    if (process.env.NODE_ENV === 'development') {
      response.error = error;
      response.stack = err.stack;
    }
    return res.status(error.statusCode || 500).json(response);
  } else {
    // SSR Response
    if (process.env.NODE_ENV === 'development') {
      console.error('ERROR 💥', err);
    }
    
    // Handle 404 explicitly
    if (error.statusCode === 404) {
      return res.status(404).render('404');
    }

    // For specific views error handling, usually we flash and redirect
    req.flash('error', error.message || 'Something went wrong. Please try again.');
    
    // redirect back or to /dashboard if referrer not present
    const referer = req.get('Referrer');
    if (referer) {
      res.redirect(referer);
    } else {
      res.redirect('/dashboard');
    }
  }
};
