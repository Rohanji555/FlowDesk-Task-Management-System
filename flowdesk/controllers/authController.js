// Concept: express-session, connect-mongo, Cookies, Flash messages
const User = require('../models/User');
const jwtHelper = require('../utils/jwtHelper');
const jwt = require('jsonwebtoken');

exports.showLogin = (req, res) => {
  res.render('auth/login', { layout: false });
};

exports.showRegister = (req, res) => {
  res.render('auth/register', { layout: false });
};

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      req.flash('error', 'Email is already registered');
      return res.redirect('/auth/register');
    }

    const newUser = new User({
      name,
      email: email.toLowerCase(),
      password
    });

    await newUser.save();
    
    req.flash('success', 'Registration successful. You can now log in');
    res.redirect('/auth/login');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Server error during registration');
    res.redirect('/auth/register');
  }
};

exports.login = (req, res) => {
  const token = jwtHelper.generateToken(req.user._id);
  
  res.cookie('jwt_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  res.cookie('user_role', req.user.role, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  res.redirect('/dashboard');
};

exports.logout = (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    res.clearCookie('jwt_token');
    res.clearCookie('user_role');
    req.flash('success', 'You have been logged out');
    res.redirect('/auth/login');
  });
};

exports.showForgotPassword = (req, res) => {
  res.render('auth/forgot-password', { layout: false });
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      req.flash('error', 'No account with that email found');
      return res.redirect('/auth/forgot-password');
    }

    const resetToken = jwt.sign(
      { email: user.email }, 
      process.env.JWT_SECRET, 
      { expiresIn: '15m' }
    );

    const resetLink = `${process.env.CLIENT_URL}/auth/reset-password?token=${resetToken}`;
    console.log('\n=== PASSWORD RESET LINK ===');
    console.log(resetLink);
    console.log('===========================\n');

    req.flash('success', 'Password reset link sent to your email (check console)');
    res.redirect('/auth/login');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Error processing request');
    res.redirect('/auth/forgot-password');
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      req.flash('error', 'Invalid request');
      return res.redirect('/auth/login');
    }

    const decoded = jwtHelper.verifyToken(token);
    
    const user = await User.findOne({ email: decoded.email });
    if (!user) {
      req.flash('error', 'User not found');
      return res.redirect('/auth/login');
    }

    user.password = newPassword;
    await user.save();

    req.flash('success', 'Password has been updated. You can now log in.');
    res.redirect('/auth/login');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Token is invalid or has expired');
    res.redirect('/auth/forgot-password');
  }
};
