const express = require('express');
const router = express.Router();
const { prisma, mapIdToUnderscoreId } = require('../config/prisma');
const { requireAuth } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.get('/profile', requireAuth, (req, res) => {
    res.render('profile/index', { pageTitle: 'Profile' });
});

router.put('/users/me', requireAuth, async (req, res, next) => {
    try {
        const { name, department } = req.body;
        const rawUser = await prisma.user.update({
            where: { id: req.user.id },
            data: { name, department }
        });
        
        // Update passport session user object so the changes are reflected on the next request
        req.user = mapIdToUnderscoreId(rawUser);
        
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
        
        // Dynamically use Cloudinary URL or local file path
        const imageUrl = (req.file.path.startsWith('http://') || req.file.path.startsWith('https://'))
            ? req.file.path
            : `/uploads/${req.file.filename}`;

        const rawUser = await prisma.user.update({
            where: { id: req.user.id },
            data: { avatar: imageUrl }
        });
        
        // Update passport session user object so the changes are reflected on the next request
        req.user = mapIdToUnderscoreId(rawUser);
        
        req.flash('success', 'Avatar updated successfully');
        res.redirect('/profile');
    } catch (error) {
        next(error);
    }
});

module.exports = router;
