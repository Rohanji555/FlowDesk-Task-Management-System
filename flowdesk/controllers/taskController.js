const { prisma, mapIdToUnderscoreId } = require('../config/prisma');
const { asyncHandler, AppError } = require('../utils/asyncHandler');
const { getIO } = require('../config/socket');

exports.getAllTasks = asyncHandler(async (req, res, next) => {
  const { status, priority, assignedTo, project, page = 1, limit = 10 } = req.query;
  const where = {};
  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (assignedTo) where.assignedToId = parseInt(assignedTo);
  if (project) where.projectId = parseInt(project);

  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 10;
  const skip = (pageNum - 1) * limitNum;

  const rawTasks = await prisma.task.findMany({
    where,
    skip,
    take: limitNum,
    include: {
      assignedTo: { select: { id: true, name: true, avatar: true } },
      project: { select: { id: true, name: true, color: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  const tasks = mapIdToUnderscoreId(rawTasks);
  const total = await prisma.task.count({ where });

  res.status(200).json({
    success: true,
    data: tasks,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum)
    },
    message: 'Tasks retrieved successfully'
  });
});

exports.getTask = asyncHandler(async (req, res, next) => {
  const rawTask = await prisma.task.findUnique({
    where: { id: parseInt(req.params.id) },
    include: {
      assignedTo: { select: { id: true, name: true, avatar: true } },
      project: { select: { id: true, name: true, color: true } },
      createdBy: { select: { id: true, name: true } },
      comments: {
        include: {
          user: { select: { id: true, name: true, avatar: true } }
        },
        orderBy: { createdAt: 'asc' }
      },
      attachments: true
    }
  });

  if (!rawTask) {
    return next(new AppError('Task not found', 404));
  }

  const task = mapIdToUnderscoreId(rawTask);

  res.status(200).json({
    success: true,
    data: task,
    pagination: {},
    message: 'Task retrieved successfully'
  });
});

exports.createTask = asyncHandler(async (req, res, next) => {
  const rawTask = await prisma.task.create({
    data: {
      title: req.body.title,
      description: req.body.description,
      status: req.body.status || 'todo',
      priority: req.body.priority || 'medium',
      assignedToId: req.body.assignedTo ? parseInt(req.body.assignedTo) : null,
      projectId: req.body.project ? parseInt(req.body.project) : null,
      dueDate: req.body.dueDate ? new Date(req.body.dueDate) : null,
      tags: req.body.tags ? (Array.isArray(req.body.tags) ? req.body.tags : [req.body.tags]) : [],
      createdById: req.user.id
    }
  });
  
  const task = mapIdToUnderscoreId(rawTask);
  const io = getIO();
  
  if (task.projectId) {
    io.to('project:' + task.projectId).emit('task:created', task);
  } else {
    io.emit('task:created', task);
  }

  if (task.assignedToId && task.assignedToId !== req.user.id) {
    const rawNotification = await prisma.notification.create({
      data: {
        userId: task.assignedToId,
        message: `You were assigned a new task: ${task.title}`,
        type: 'task_assigned',
        link: `/tasks/${task.id}`
      }
    });
    const notification = mapIdToUnderscoreId(rawNotification);
    io.to(task.assignedToId.toString()).emit('notification:new', notification);
  }

  res.status(201).json({
    success: true,
    data: task,
    pagination: {},
    message: 'Task created successfully'
  });
});

exports.updateTask = asyncHandler(async (req, res, next) => {
  const taskId = parseInt(req.params.id);
  const rawTask = await prisma.task.update({
    where: { id: taskId },
    data: {
      title: req.body.title,
      description: req.body.description,
      status: req.body.status,
      priority: req.body.priority,
      assignedToId: req.body.assignedTo !== undefined ? (req.body.assignedTo ? parseInt(req.body.assignedTo) : null) : undefined,
      projectId: req.body.project !== undefined ? (req.body.project ? parseInt(req.body.project) : null) : undefined,
      dueDate: req.body.dueDate !== undefined ? (req.body.dueDate ? new Date(req.body.dueDate) : null) : undefined,
      tags: req.body.tags ? (Array.isArray(req.body.tags) ? req.body.tags : [req.body.tags]) : undefined
    }
  });

  if (!rawTask) {
    return next(new AppError('Task not found', 404));
  }

  const task = mapIdToUnderscoreId(rawTask);
  const io = getIO();

  if (task.projectId) {
    io.to('project:' + task.projectId).emit('task:updated', task);
  }

  if (task.assignedToId && task.assignedToId !== req.user.id) {
    const rawNotification = await prisma.notification.create({
      data: {
        userId: task.assignedToId,
        message: `Task updated: ${task.title}`,
        type: 'task_assigned',
        link: `/tasks/${task.id}`
      }
    });
    const notification = mapIdToUnderscoreId(rawNotification);
    io.to(task.assignedToId.toString()).emit('notification:new', notification);
  }

  res.status(200).json({
    success: true,
    data: task,
    pagination: {},
    message: 'Task updated successfully'
  });
});

exports.deleteTask = asyncHandler(async (req, res, next) => {
  try {
    await prisma.task.delete({
      where: { id: parseInt(req.params.id) }
    });
  } catch (err) {
    return next(new AppError('Task not found', 404));
  }

  res.status(200).json({
    success: true,
    data: null,
    pagination: {},
    message: 'Task deleted successfully'
  });
});

exports.updateTaskStatus = asyncHandler(async (req, res, next) => {
  const { status } = req.body;
  if (!status) return next(new AppError('Please provide a status', 400));

  const rawTask = await prisma.task.update({
    where: { id: parseInt(req.params.id) },
    data: { status }
  });

  if (!rawTask) {
    return next(new AppError('Task not found', 404));
  }

  const task = mapIdToUnderscoreId(rawTask);
  const io = getIO();
  if (task.projectId) {
    io.to('project:' + task.projectId).emit('task:updated', task);
  }

  res.status(200).json({
    success: true,
    data: task,
    pagination: {},
    message: 'Task status updated successfully'
  });
});

exports.addComment = asyncHandler(async (req, res, next) => {
  const { text } = req.body;
  if (!text) return next(new AppError('Comment text is required', 400));

  const taskId = parseInt(req.params.id);

  await prisma.comment.create({
    data: {
      taskId,
      userId: req.user.id,
      text
    }
  });

  const rawTask = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      assignedTo: true,
      comments: {
        include: {
          user: { select: { id: true, name: true, avatar: true } }
        },
        orderBy: { createdAt: 'asc' }
      }
    }
  });

  if (!rawTask) {
    return next(new AppError('Task not found', 404));
  }

  const task = mapIdToUnderscoreId(rawTask);
  const io = getIO();

  if (task.projectId) {
    io.to('project:' + task.projectId).emit('comment:added', task);
  } else {
    io.to('task:' + task.id).emit('comment:added', task);
  }

  if (task.assignedToId && task.assignedToId !== req.user.id) {
    const rawNotification = await prisma.notification.create({
      data: {
        userId: task.assignedToId,
        message: `${req.user.name} commented on your task: ${task.title}`,
        type: 'comment_added',
        link: `/tasks/${task.id}`
      }
    });
    const notification = mapIdToUnderscoreId(rawNotification);
    io.to(task.assignedToId.toString()).emit('notification:new', notification);
  }

  res.status(200).json({
    success: true,
    data: task,
    pagination: {},
    message: 'Comment added successfully'
  });
});

exports.exportTasksCSV = asyncHandler(async (req, res, next) => {
  try {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="tasks.csv"');

    res.write('ID,Title,Status,Priority,DueDate\n');

    const tasks = await prisma.task.findMany();
    for (const doc of tasks) {
      const id = doc.id.toString();
      const title = `"${doc.title.replace(/"/g, '""')}"`;
      const status = doc.status;
      const priority = doc.priority;
      const dueDate = doc.dueDate ? doc.dueDate.toISOString() : '';
      
      res.write(`${id},${title},${status},${priority},${dueDate}\n`);
    }
    res.end();
  } catch (err) {
    next(new AppError('Export failed', 500));
  }
});
