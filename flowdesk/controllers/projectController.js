// Concept: RESTful API, Route parameters, Query parameters, res.json
const Project = require('../models/Project');
const { asyncHandler, AppError } = require('../utils/asyncHandler');

exports.getAllProjects = asyncHandler(async (req, res, next) => {
  const projects = await Project.find()
    .populate('manager', 'name email avatar')
    .populate('members.user', 'name email avatar')
    .sort('-createdAt');

  res.status(200).json({
    success: true,
    data: projects,
    pagination: {},
    message: 'Projects retrieved successfully'
  });
});

exports.getProject = asyncHandler(async (req, res, next) => {
  const project = await Project.findById(req.params.id)
    .populate('manager', 'name email avatar')
    .populate('members.user', 'name email avatar');

  if (!project) return next(new AppError('Project not found', 404));

  res.status(200).json({
    success: true,
    data: project,
    pagination: {},
    message: 'Project retrieved successfully'
  });
});

exports.createProject = asyncHandler(async (req, res, next) => {
  req.body.createdBy = req.user._id;
  const project = await Project.create(req.body);

  res.status(201).json({
    success: true,
    data: project,
    pagination: {},
    message: 'Project created successfully'
  });
});

exports.updateProject = asyncHandler(async (req, res, next) => {
  const project = await Project.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  if (!project) return next(new AppError('Project not found', 404));

  res.status(200).json({
    success: true,
    data: project,
    pagination: {},
    message: 'Project updated successfully'
  });
});

exports.deleteProject = asyncHandler(async (req, res, next) => {
  const project = await Project.findByIdAndDelete(req.params.id);

  if (!project) return next(new AppError('Project not found', 404));

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

  const project = await Project.findByIdAndUpdate(
    req.params.id,
    { $addToSet: { members: { user, role: role || 'member' } } },
    { new: true }
  ).populate('members.user', 'name email avatar');

  if (!project) return next(new AppError('Project not found', 404));

  res.status(200).json({
    success: true,
    data: project,
    pagination: {},
    message: 'Member added successfully'
  });
});
