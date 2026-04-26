const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { requireAuth } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware'); // Assuming this exists from previous prompt

router.get('/profile', requireAuth, (req, res) => {
    res.render('profile/index', { pageTitle: 'Profile' });
});

router.put('/users/me', requireAuth, async (req, res, next) => {
    try {
        const { name, department } = req.body;
        await User.findByIdAndUpdate(req.user._id, { name, department });
        req.flash('success', 'Profile updated successfully');
        res.redirect('/profile');
    } catch (error) {
        next(error);
    }
});

router.post('/users/me/avatar', requireAuth, upload.uploadSingle, async (req, res, next) => {
    try {
        if (!req.file) {
            req.flash('error', 'Please select a file');
            return res.redirect('/profile');
        }
        await User.findByIdAndUpdate(req.user._id, { avatar: `/uploads/${req.file.filename}` });
        req.flash('success', 'Avatar updated successfully');
        res.redirect('/profile');
    } catch (error) {
        next(error);
    }
});

module.exports = router;
