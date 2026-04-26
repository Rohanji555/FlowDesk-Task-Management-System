// Concept: RESTful API, Route parameters, Query parameters, res.json
const Task = require('../models/Task');
const Notification = require('../models/Notification');
const { asyncHandler, AppError } = require('../utils/asyncHandler');
const { Transform } = require('stream');
const { getIO } = require('../config/socket');

exports.getAllTasks = asyncHandler(async (req, res, next) => {
  const { status, priority, assignedTo, project, page = 1, limit = 10 } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (assignedTo) filter.assignedTo = assignedTo;
  if (project) filter.project = project;

  const skip = (page - 1) * limit;

  const tasks = await Task.find(filter)
    .populate('assignedTo', 'name avatar')
    .populate('project', 'name color')
    .skip(skip)
    .limit(parseInt(limit))
    .sort('-createdAt');

  const total = await Task.countDocuments(filter);

  res.status(200).json({
    success: true,
    data: tasks,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / limit)
    },
    message: 'Tasks retrieved successfully'
  });
});

exports.getTask = asyncHandler(async (req, res, next) => {
  const task = await Task.findById(req.params.id)
    .populate('assignedTo', 'name avatar')
    .populate('project', 'name color')
    .populate('comments.user', 'name avatar')
    .populate('createdBy', 'name');

  if (!task) {
    return next(new AppError('Task not found', 404));
  }

  res.status(200).json({
    success: true,
    data: task,
    pagination: {},
    message: 'Task retrieved successfully'
  });
});

exports.createTask = asyncHandler(async (req, res, next) => {
  req.body.createdBy = req.user._id;
  
  const task = await Task.create(req.body);
  
  const io = getIO();
  if (task.project) {
    io.to('project:' + task.project).emit('task:created', task);
  } else {
    io.emit('task:created', task);
  }

  if (task.assignedTo && task.assignedTo.toString() !== req.user._id.toString()) {
    const notification = await Notification.create({
      user: task.assignedTo,
      message: `You were assigned a new task: ${task.title}`,
      type: 'task',
      link: `/tasks/${task._id}`
    });
    io.to(task.assignedTo.toString()).emit('notification:new', notification);
  }

  res.status(201).json({
    success: true,
    data: task,
    pagination: {},
    message: 'Task created successfully'
  });
});

exports.updateTask = asyncHandler(async (req, res, next) => {
  const task = await Task.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  if (!task) {
    return next(new AppError('Task not found', 404));
  }

  const io = getIO();
  if (task.project) {
    io.to('project:' + task.project).emit('task:updated', task);
  }

  if (task.assignedTo && task.assignedTo.toString() !== req.user._id.toString()) {
    const notification = await Notification.create({
      user: task.assignedTo,
      message: `Task updated: ${task.title}`,
      type: 'task',
      link: `/tasks/${task._id}`
    });
    io.to(task.assignedTo.toString()).emit('notification:new', notification);
  }

  res.status(200).json({
    success: true,
    data: task,
    pagination: {},
    message: 'Task updated successfully'
  });
});

exports.deleteTask = asyncHandler(async (req, res, next) => {
  const task = await Task.findByIdAndDelete(req.params.id);

  if (!task) {
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

  const task = await Task.findByIdAndUpdate(
    req.params.id, 
    { status }, 
    { new: true, runValidators: true }
  );

  if (!task) {
    return next(new AppError('Task not found', 404));
  }

  const io = getIO();
  if (task.project) {
    io.to('project:' + task.project).emit('task:updated', task);
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

  const task = await Task.findByIdAndUpdate(
    req.params.id,
    { $push: { comments: { user: req.user._id, text } } },
    { new: true }
  ).populate('comments.user', 'name avatar');

  if (!task) {
    return next(new AppError('Task not found', 404));
  }

  const io = getIO();
  if (task.project) {
    io.to('project:' + task.project).emit('comment:added', task);
  } else {
    io.to('task:' + task._id).emit('comment:added', task);
  }

  if (task.assignedTo && task.assignedTo.toString() !== req.user._id.toString()) {
    const notification = await Notification.create({
      user: task.assignedTo,
      message: `${req.user.name} commented on your task: ${task.title}`,
      type: 'mention',
      link: `/tasks/${task._id}`
    });
    io.to(task.assignedTo.toString()).emit('notification:new', notification);
  }

  res.status(200).json({
    success: true,
    data: task,
    pagination: {},
    message: 'Comment added successfully'
  });
});

exports.exportTasksCSV = asyncHandler(async (req, res, next) => {
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="tasks.csv"');

  res.write('ID,Title,Status,Priority,DueDate\n');

  const transformStream = new Transform({
    objectMode: true,
    transform(doc, encoding, callback) {
      const id = doc._id.toString();
      const title = `"${doc.title.replace(/"/g, '""')}"`;
      const status = doc.status;
      const priority = doc.priority;
      const dueDate = doc.dueDate ? doc.dueDate.toISOString() : '';
      
      const row = `${id},${title},${status},${priority},${dueDate}\n`;
      callback(null, row);
    }
  });

  Task.find().cursor()
    .pipe(transformStream)
    .pipe(res)
    .on('error', (err) => {
      next(new AppError('Export failed', 500));
    });
});
