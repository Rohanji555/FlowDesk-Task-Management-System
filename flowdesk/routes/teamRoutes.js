const express = require('express');
const router = express.Router();
const { prisma, mapIdToUnderscoreId } = require('../config/prisma');
const { requireAuth } = require('../middleware/authMiddleware');

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const rawTeamMembers = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        department: true,
        isActive: true,
        lastSeen: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: [
        { role: 'asc' },
        { name: 'asc' }
      ]
    });
    const teamMembers = mapIdToUnderscoreId(rawTeamMembers);
    res.render('team/index', { pageTitle: 'Team Directory', teamMembers });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
