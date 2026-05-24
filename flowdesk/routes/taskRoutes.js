const express = require('express');
const router = express.Router();
const { prisma, mapIdToUnderscoreId } = require('../config/prisma');
const { requireAuth } = require('../middleware/authMiddleware');
const { uploadMultiple } = require('../middleware/uploadMiddleware');

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const { project, priority, page = 1, limit = 10 } = req.query;
    const filter = {};
    if (project) filter.projectId = parseInt(project);
    if (priority) filter.priority = priority;
    
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    const rawTasks = await prisma.task.findMany({
      where: filter,
      include: {
        project: { select: { id: true, name: true, color: true } },
        assignedTo: { select: { id: true, name: true, avatar: true } }
      },
      skip,
      take: limitNum,
      orderBy: { createdAt: 'desc' }
    });
      
    const total = await prisma.task.count({ where: filter });
    const pagination = {
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum)
    };
    
    const rawProjects = await prisma.project.findMany();
    
    const tasks = mapIdToUnderscoreId(rawTasks);
    const projects = mapIdToUnderscoreId(rawProjects);

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
    const rawProjects = await prisma.project.findMany();
    const rawUsers = await prisma.user.findMany();
    
    const projects = mapIdToUnderscoreId(rawProjects);
    const users = mapIdToUnderscoreId(rawUsers);

    res.render('tasks/new', { pageTitle: 'New Task', projects, users });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    await prisma.task.create({
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

    req.flash('success', 'Task created successfully!');
    res.redirect('/tasks');
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const taskId = parseInt(req.params.id);
    const rawTask = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        project: true,
        assignedTo: true,
        comments: {
          include: { user: true },
          orderBy: { createdAt: 'asc' }
        },
        attachments: true
      }
    });

    if (!rawTask) {
      req.flash('error', 'Task not found');
      return res.redirect('/tasks');
    }

    const task = mapIdToUnderscoreId(rawTask);

    res.render('tasks/show', { pageTitle: task.title, task });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/edit', async (req, res, next) => {
  try {
    const taskId = parseInt(req.params.id);
    const rawTask = await prisma.task.findUnique({
      where: { id: taskId }
    });
    if (!rawTask) {
      req.flash('error', 'Task not found');
      return res.redirect('/tasks');
    }

    const rawProjects = await prisma.project.findMany();
    const rawUsers = await prisma.user.findMany();
    
    const task = mapIdToUnderscoreId(rawTask);
    const projects = mapIdToUnderscoreId(rawProjects);
    const users = mapIdToUnderscoreId(rawUsers);

    res.render('tasks/edit', { pageTitle: 'Edit Task', task, projects, users });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const taskId = parseInt(req.params.id);
    await prisma.task.update({
      where: { id: taskId },
      data: {
        title: req.body.title,
        description: req.body.description,
        status: req.body.status,
        priority: req.body.priority,
        assignedToId: req.body.assignedTo ? parseInt(req.body.assignedTo) : null,
        projectId: req.body.project ? parseInt(req.body.project) : null,
        dueDate: req.body.dueDate ? new Date(req.body.dueDate) : null
      }
    });

    req.flash('success', 'Task updated');
    res.redirect(`/tasks/${taskId}`);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const taskId = parseInt(req.params.id);
    await prisma.task.delete({
      where: { id: taskId }
    });
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
    
    const taskId = parseInt(req.params.id);
    const attachments = req.files.map(f => {
      const isCloud = f.path.startsWith('http://') || f.path.startsWith('https://');
      return {
        taskId,
        filename: f.originalname || f.filename,
        originalName: f.originalname,
        path: isCloud ? f.path : `/uploads/${f.filename}`
      };
    });
    
    await prisma.attachment.createMany({
      data: attachments
    });

    req.flash('success', 'Attachments added');
    res.redirect(`/tasks/${taskId}`);
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
    const taskId = parseInt(req.params.id);
    
    await prisma.comment.create({
      data: {
        taskId,
        userId: req.user.id,
        text: req.body.text
      }
    });

    req.flash('success', 'Comment added');
    res.redirect(`/tasks/${taskId}`);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
