const express = require('express');
const router = express.Router();
const { prisma, mapIdToUnderscoreId } = require('../config/prisma');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const rawProjects = await prisma.project.findMany({
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, avatar: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    const projects = mapIdToUnderscoreId(rawProjects);
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
    const rawProject = await prisma.project.create({
      data: {
        name: req.body.name,
        description: req.body.description,
        color: req.body.color || '#4F46E5',
        deadline: req.body.deadline ? new Date(req.body.deadline) : null,
        createdById: req.user.id
      }
    });

    // Automatically add creator as project member
    await prisma.projectMember.create({
      data: {
        projectId: rawProject.id,
        userId: req.user.id,
        role: req.user.role === 'admin' ? 'admin' : 'manager'
      }
    });

    req.flash('success', 'Project created');
    res.redirect('/projects');
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const projectId = parseInt(req.params.id);
    const rawProject = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, avatar: true } }
          }
        }
      }
    });
    if (!rawProject) {
      req.flash('error', 'Project not found');
      return res.redirect('/projects');
    }
    
    const rawTasks = await prisma.task.findMany({
      where: { projectId: projectId },
      include: {
        assignedTo: { select: { id: true, name: true, avatar: true } }
      }
    });
    
    const project = mapIdToUnderscoreId(rawProject);
    const tasks = mapIdToUnderscoreId(rawTasks);
    
    res.render('projects/show', { pageTitle: project.name, project, tasks });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', requireRole('admin', 'manager'), async (req, res, next) => {
  try {
    const projectId = parseInt(req.params.id);
    await prisma.project.update({
      where: { id: projectId },
      data: {
        name: req.body.name,
        description: req.body.description,
        color: req.body.color,
        status: req.body.status,
        deadline: req.body.deadline ? new Date(req.body.deadline) : undefined
      }
    });
    req.flash('success', 'Project updated');
    res.redirect(`/projects/${projectId}`);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const projectId = parseInt(req.params.id);
    await prisma.project.delete({
      where: { id: projectId }
    });
    req.flash('success', 'Project deleted');
    res.redirect('/projects');
  } catch (err) {
    next(err);
  }
});

router.post('/:id/members', requireRole('admin', 'manager'), async (req, res, next) => {
  try {
    const projectId = parseInt(req.params.id);
    const userId = parseInt(req.body.userId);

    const existingMember = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId
        }
      }
    });

    if (!existingMember) {
      await prisma.projectMember.create({
        data: {
          projectId,
          userId,
          role: req.body.role || 'member'
        }
      });
    }

    req.flash('success', 'Member added');
    res.redirect(`/projects/${projectId}`);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
