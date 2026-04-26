const Task = require('../models/Task');
const User = require('../models/User');

exports.getDashboard = async (req, res, next) => {
  try {
    const totalTasks = await Task.countDocuments();
    
    const startOfDay = new Date(); startOfDay.setHours(0,0,0,0);
    const endOfDay = new Date(); endOfDay.setHours(23,59,59,999);
    const dueToday = await Task.countDocuments({ dueDate: { $gte: startOfDay, $lte: endOfDay }, status: { $ne: 'done' } });
    
    const overdue = await Task.countDocuments({ dueDate: { $lt: new Date() }, status: { $ne: 'done' } });
    
    // completed this week
    const startOfWeek = new Date(); startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const completed = await Task.countDocuments({ status: 'done', updatedAt: { $gte: startOfWeek } });

    const stats = { totalTasks, dueToday, overdue, completed };

    const recentTasks = await Task.find()
        .sort('-updatedAt')
        .limit(10)
        .populate('project', 'name color')
        .populate('assignedTo', 'name avatar');
        
    const myTasks = await Task.find({ assignedTo: req.user._id, status: { $ne: 'done' } })
        .limit(5)
        .populate('project', 'name color');

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
