const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const User = require('../models/User');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const projects = await Project.find().populate('members.user', 'name avatar');
    res.render('projects/index', { pageTitle: 'Projects', projects });
  } catch (err) {
    next(err);
  }
});

router.get('/new', requireRole('admin', 'manager'), async (req, res, next) => {
  try {
    res.render('projects/new', { pageTitle: 'New Project' });
  } catch (err) {
    next(err);
  }
});

router.post('/', requireRole('admin', 'manager'), async (req, res, next) => {
  try {
    await Project.create(req.body);
    req.flash('success', 'Project created');
    res.redirect('/projects');
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id).populate('members.user', 'name avatar');
    if (!project) {
      req.flash('error', 'Project not found');
      return res.redirect('/projects');
    }
    
    const Task = require('../models/Task');
    const tasks = await Task.find({ project: project._id }).populate('assignedTo');
    
    res.render('projects/show', { pageTitle: project.name, project, tasks });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', requireRole('admin', 'manager'), async (req, res, next) => {
  try {
    await Project.findByIdAndUpdate(req.params.id, req.body);
    req.flash('success', 'Project updated');
    res.redirect(`/projects/${req.params.id}`);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireRole('admin'), async (req, res, next) => {
  try {
    await Project.findByIdAndDelete(req.params.id);
    req.flash('success', 'Project deleted');
    res.redirect('/projects');
  } catch (err) {
    next(err);
  }
});

router.post('/:id/members', requireRole('admin', 'manager'), async (req, res, next) => {
  try {
    await Project.findByIdAndUpdate(req.params.id, {
      $addToSet: { members: { user: req.body.userId, role: req.body.role || 'member' } }
    });
    req.flash('success', 'Member added');
    res.redirect(`/projects/${req.params.id}`);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
