const { prisma, mapIdToUnderscoreId } = require('../config/prisma');

exports.getDashboard = async (req, res, next) => {
  try {
    const totalTasks = await prisma.task.count();
    
    const startOfDay = new Date(); startOfDay.setHours(0,0,0,0);
    const endOfDay = new Date(); endOfDay.setHours(23,59,59,999);
    
    const dueToday = await prisma.task.count({
      where: {
        dueDate: { gte: startOfDay, lte: endOfDay },
        NOT: { status: 'done' }
      }
    });
    
    const overdue = await prisma.task.count({
      where: {
        dueDate: { lt: new Date() },
        NOT: { status: 'done' }
      }
    });
    
    // completed this week
    const startOfWeek = new Date(); startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0,0,0,0);
    const completed = await prisma.task.count({
      where: {
        status: 'done',
        updatedAt: { gte: startOfWeek }
      }
    });

    const stats = { totalTasks, dueToday, overdue, completed };

    const rawRecentTasks = await prisma.task.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 10,
      include: {
        project: { select: { id: true, name: true, color: true } },
        assignedTo: { select: { id: true, name: true, avatar: true } }
      }
    });
        
    const rawMyTasks = await prisma.task.findMany({
      where: {
        assignedToId: req.user.id,
        NOT: { status: 'done' }
      },
      take: 5,
      include: {
        project: { select: { id: true, name: true, color: true } }
      }
    });

    const recentTasks = mapIdToUnderscoreId(rawRecentTasks);
    const myTasks = mapIdToUnderscoreId(rawMyTasks);

    res.render('dashboard/index', {
      pageTitle: 'Dashboard',
      stats,
      recentTasks,
      myTasks
    });
  } catch (err) {
    next(err);
  }
};
