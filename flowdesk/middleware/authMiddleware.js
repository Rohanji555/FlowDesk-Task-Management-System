// Concept: Authentication middleware, Role-based access
const jwtHelper = require('../utils/jwtHelper');
const User = require('../models/User');

exports.requireAuth = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  req.flash('error', 'Please log in to view that resource');
  res.redirect('/auth/login');
};

exports.requireJWT = async (req, res, next) => {
  try {
    let token;
    
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.headers.cookie) {
      // Manual simple cookie parsing in case cookie-parser is missing
      const cookies = Object.fromEntries(
        req.headers.cookie.split('; ').map(c => c.split('='))
      );
      if (cookies.jwt_token) {
        token = cookies.jwt_token;
      }
    }

    if (!token) {
      return res.status(401).json({ error: 'Not authorized to access this route' });
    }

    const decoded = jwtHelper.verifyToken(token);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Not authorized to access this route' });
  }
};

exports.requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'User role is not authorized to access this route' });
    }
    next();
  };
};
