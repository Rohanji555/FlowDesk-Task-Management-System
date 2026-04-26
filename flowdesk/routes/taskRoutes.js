const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const Project = require('../models/Project');
const User = require('../models/User');
const { requireAuth } = require('../middleware/authMiddleware');
const { uploadMultiple } = require('../middleware/uploadMiddleware');

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const { project, priority, page = 1, limit = 10 } = req.query;
    const filter = {};
    if (project) filter.project = project;
    if (priority) filter.priority = priority;
    
    const skip = (page - 1) * limit;

    const tasks = await Task.find(filter)
      .populate('project', 'name color')
      .populate('assignedTo', 'name avatar')
      .skip(skip)
      .limit(parseInt(limit))
      .sort('-createdAt');
      
    const total = await Task.countDocuments(filter);
    const pagination = {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / limit)
    };
    
    const projects = await Project.find();
    
    res.render('tasks/index', {
      pageTitle: 'Tasks',
      tasks,
      projects,
      query: req.query,
      pagination
    });
  } catch (err) {
    next(err);
  }
});

router.get('/new', async (req, res, next) => {
  try {
    const projects = await Project.find();
    const users = await User.find();
    res.render('tasks/new', { pageTitle: 'New Task', projects, users });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    req.body.createdBy = req.user._id;
    await Task.create(req.body);
    req.flash('success', 'Task created successfully!');
    res.redirect('/tasks');
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('project')
      .populate('assignedTo')
      .populate('comments.user');
    if (!task) {
      req.flash('error', 'Task not found');
      return res.redirect('/tasks');
    }
    res.render('tasks/show', { pageTitle: task.title, task });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/edit', async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    const projects = await Project.find();
    const users = await User.find();
    res.render('tasks/edit', { pageTitle: 'Edit Task', task, projects, users });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    await Task.findByIdAndUpdate(req.params.id, req.body, { runValidators: true });
    req.flash('success', 'Task updated');
    res.redirect(`/tasks/${req.params.id}`);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await Task.findByIdAndDelete(req.params.id);
    req.flash('success', 'Task deleted');
    res.redirect('/tasks');
  } catch (err) {
    next(err);
  }
});

router.post('/:id/attachments', uploadMultiple, async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      req.flash('error', 'Please upload at least one file.');
      return res.redirect(`/tasks/${req.params.id}`);
    }
    
    const attachments = req.files.map(f => ({
      filename: f.filename,
      originalName: f.originalname,
      path: f.path
    }));
    await Task.findByIdAndUpdate(req.params.id, { $push: { attachments: { $each: attachments } } });
    req.flash('success', 'Attachments added');
    res.redirect(`/tasks/${req.params.id}`);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/comment', async (req, res, next) => {
  try {
    if (!req.body.text) {
      req.flash('error', 'Comment cannot be empty.');
      return res.redirect(`/tasks/${req.params.id}`);
    }
    await Task.findByIdAndUpdate(req.params.id, {
      $push: { comments: { user: req.user._id, text: req.body.text } }
    });
    req.flash('success', 'Comment added');
    res.redirect(`/tasks/${req.params.id}`);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
