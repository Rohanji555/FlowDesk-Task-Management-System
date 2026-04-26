// Concept: RESTful API, Route parameters, Query parameters, res.json
const express = require('express');
const router = express.Router();
const passport = require('passport');

const taskController = require('../controllers/taskController');
const projectController = require('../controllers/projectController');
const { requireJWT, requireRole } = require('../middleware/authMiddleware');
const jwtHelper = require('../utils/jwtHelper');
const User = require('../models/User');

// --- AUTHENTICATION (API specific) ---
router.post('/auth/login', (req, res, next) => {
  passport.authenticate('local', { session: false }, (err, user, info) => {
    if (err) return next(err);
    if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials', data: {}, pagination: {} });
    
    const token = jwtHelper.generateToken(user._id);
    res.status(200).json({
      success: true,
      data: { token, user: { id: user._id, name: user.name, email: user.email, role: user.role } },
      message: 'Login successful',
      pagination: {}
    });
  })(req, res, next);
});

// Protect all routes below this middleware
router.use(requireJWT);

// --- TASKS ---
router.get('/tasks/export/csv', taskController.exportTasksCSV);
router.route('/tasks')
  .get(taskController.getAllTasks)
  .post(taskController.createTask);

router.route('/tasks/:id')
  .get(taskController.getTask)
  .put(taskController.updateTask)
  .delete(taskController.deleteTask);

router.patch('/tasks/:id/status', taskController.updateTaskStatus);
router.post('/tasks/:id/comment', taskController.addComment);

// --- PROJECTS ---
router.route('/projects')
  .get(projectController.getAllProjects)
  .post(projectController.createProject);

router.route('/projects/:id')
  .get(projectController.getProject)
  .put(projectController.updateProject)
  .delete(projectController.deleteProject);

router.post('/projects/:id/members', projectController.addMember);

// --- USERS ---
router.get('/users/me', async (req, res, next) => {
  try {
    res.status(200).json({ success: true, data: req.user, message: 'User retrieved', pagination: {} });
  } catch (err) {
    next(err);
  }
});

router.put('/users/me', async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(req.user._id, req.body, { new: true, runValidators: true });
    res.status(200).json({ success: true, data: user, message: 'User updated', pagination: {} });
  } catch (err) {
    next(err);
  }
});

router.get('/users', requireRole('admin'), async (req, res, next) => {
  try {
    const users = await User.find();
    res.status(200).json({ success: true, data: users, message: 'Users retrieved', pagination: {} });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
