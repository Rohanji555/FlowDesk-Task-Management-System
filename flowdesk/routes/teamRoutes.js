const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { requireAuth } = require('../middleware/authMiddleware');

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const teamMembers = await User.find().select('-password').sort({ role: 1, name: 1 });
    res.render('team/index', { pageTitle: 'Team Directory', teamMembers });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
