// Concept: Passport.js, bcrypt, JWT, Sessions, Cookies
const express = require('express');
const router = express.Router();
const passport = require('passport');
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');

const postLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: 'Too many requests from this IP, please try again after 15 minutes'
});

router.get('/login', authController.showLogin);
router.post('/login', postLimiter, passport.authenticate('local', {
  failureRedirect: '/auth/login',
  failureFlash: true
}), authController.login);

router.get('/register', authController.showRegister);
router.post('/register', postLimiter, authController.register);

router.get('/logout', authController.logout);

router.get('/forgot-password', authController.showForgotPassword);
router.post('/forgot-password', postLimiter, authController.forgotPassword);

router.post('/reset-password', postLimiter, authController.resetPassword);

module.exports = router;
