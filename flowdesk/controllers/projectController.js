const { prisma, mapIdToUnderscoreId } = require('../config/prisma');
const { asyncHandler, AppError } = require('../utils/asyncHandler');

exports.getAllProjects = asyncHandler(async (req, res, next) => {
  const rawProjects = await prisma.project.findMany({
    include: {
      manager: { select: { id: true, name: true, email: true, avatar: true } },
      members: {
        include: {
          user: { select: { id: true, name: true, email: true, avatar: true } }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  const projects = mapIdToUnderscoreId(rawProjects);

  res.status(200).json({
    success: true,
    data: projects,
    pagination: {},
    message: 'Projects retrieved successfully'
  });
});

exports.getProject = asyncHandler(async (req, res, next) => {
  const rawProject = await prisma.project.findUnique({
    where: { id: parseInt(req.params.id) },
    include: {
      manager: { select: { id: true, name: true, email: true, avatar: true } },
      members: {
        include: {
          user: { select: { id: true, name: true, email: true, avatar: true } }
        }
      }
    }
  });

  if (!rawProject) return next(new AppError('Project not found', 404));

  const project = mapIdToUnderscoreId(rawProject);

  res.status(200).json({
    success: true,
    data: project,
    pagination: {},
    message: 'Project retrieved successfully'
  });
});

exports.createProject = asyncHandler(async (req, res, next) => {
  const rawProject = await prisma.project.create({
    data: {
      name: req.body.name,
      description: req.body.description,
      color: req.body.color || '#4F46E5',
      status: req.body.status || 'active',
      deadline: req.body.deadline ? new Date(req.body.deadline) : null,
      managerId: req.body.manager ? parseInt(req.body.manager) : null,
      createdById: req.user.id
    }
  });

  const project = mapIdToUnderscoreId(rawProject);

  res.status(201).json({
    success: true,
    data: project,
    pagination: {},
    message: 'Project created successfully'
  });
});

exports.updateProject = asyncHandler(async (req, res, next) => {
  const rawProject = await prisma.project.update({
    where: { id: parseInt(req.params.id) },
    data: {
      name: req.body.name,
      description: req.body.description,
      color: req.body.color,
      status: req.body.status,
      deadline: req.body.deadline ? new Date(req.body.deadline) : undefined,
      managerId: req.body.manager ? parseInt(req.body.manager) : undefined
    }
  });

  if (!rawProject) return next(new AppError('Project not found', 404));

  const project = mapIdToUnderscoreId(rawProject);

  res.status(200).json({
    success: true,
    data: project,
    pagination: {},
    message: 'Project updated successfully'
  });
});

exports.deleteProject = asyncHandler(async (req, res, next) => {
  try {
    await prisma.project.delete({
      where: { id: parseInt(req.params.id) }
    });
  } catch (err) {
    return next(new AppError('Project not found', 404));
  }

  res.status(200).json({
    success: true,
    data: null,
    pagination: {},
    message: 'Project deleted successfully'
  });
});

exports.addMember = asyncHandler(async (req, res, next) => {
  const { user, role } = req.body;
  
  if (!user) return next(new AppError('User ID is required', 400));

  const projectId = parseInt(req.params.id);
  const userId = parseInt(user);

  // Check if member already exists
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
        role: role || 'member'
      }
    });
  } else if (role) {
    await prisma.projectMember.update({
      where: {
        projectId_userId: {
          projectId,
          userId
        }
      },
      data: {
        role
      }
    });
  }

  const rawProject = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      members: {
        include: {
          user: { select: { id: true, name: true, email: true, avatar: true } }
        }
      }
    }
  });

  if (!rawProject) return next(new AppError('Project not found', 404));

  const project = mapIdToUnderscoreId(rawProject);

  res.status(200).json({
    success: true,
    data: project,
    pagination: {},
    message: 'Member added successfully'
  });
});
