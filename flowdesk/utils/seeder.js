require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Project = require('../models/Project');
const Task = require('../models/Task');
const Notification = require('../models/Notification');

const seedDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected for Seeding...');

    // Clear DB
    await User.deleteMany();
    await Project.deleteMany();
    await Task.deleteMany();
    await Notification.deleteMany();
    console.log('Collections cleared');

    // Create Users
    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@flowdesk.com',
      password: 'Admin@123',
      role: 'admin',
      department: 'Engineering'
    });

    const manager = await User.create({
      name: 'Manager User',
      email: 'manager@flowdesk.com',
      password: 'Manager@123',
      role: 'manager',
      department: 'Product'
    });

    const employee = await User.create({
      name: 'Employee User',
      email: 'employee@flowdesk.com',
      password: 'Employee@123',
      role: 'employee',
      department: 'Design'
    });
    console.log('Users created');

    // Create Projects
    const project1 = await Project.create({
      name: 'Website Redesign',
      description: 'Overhaul the corporate website to modern standards.',
      color: '#4F46E5',
      members: [
        { user: admin._id, role: 'member' },
        { user: manager._id, role: 'manager' },
        { user: employee._id, role: 'member' }
      ]
    });

    const project2 = await Project.create({
      name: 'Mobile App MVP',
      description: 'First version of the mobile app for iOS and Android.',
      color: '#059669',
      members: [
        { user: manager._id, role: 'manager' },
        { user: employee._id, role: 'member' }
      ]
    });
    console.log('Projects created');

    // Create Tasks
    const tasksData = [
      {
        title: 'Design Wireframes',
        description: 'Create initial wireframes for homepage.',
        status: 'done',
        priority: 'high',
        assignedTo: employee._id,
        project: project1._id,
        dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        createdBy: manager._id,
        comments: [{ user: manager._id, text: 'Looks great!' }]
      },
      {
        title: 'Setup Database',
        description: 'Configure MongoDB collections.',
        status: 'todo',
        priority: 'critical',
        assignedTo: manager._id,
        project: project1._id,
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        createdBy: admin._id
      },
      {
        title: 'Create Login API',
        description: 'JWT based login API endpoint.',
        status: 'in-progress',
        priority: 'medium',
        assignedTo: employee._id,
        project: project2._id,
        dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // Overdue
        createdBy: manager._id
      },
      {
        title: 'Setup CI/CD pipeline',
        description: 'GitHub actions setup.',
        status: 'review',
        priority: 'high',
        assignedTo: manager._id,
        project: project2._id,
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        createdBy: admin._id,
        comments: [{ user: employee._id, text: 'I fixed the build error.' }]
      },
      {
        title: 'Write User Docs',
        description: 'Draft the initial onboarding manual.',
        status: 'todo',
        priority: 'low',
        assignedTo: employee._id,
        project: project1._id,
        dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        createdBy: manager._id
      },
      {
        title: 'Fix Navigation Bug',
        description: 'Mobile menu doesn\'t open on Safari.',
        status: 'in-progress',
        priority: 'high',
        assignedTo: employee._id,
        project: project1._id,
        dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
        createdBy: manager._id
      },
      {
        title: 'App Icon Design',
        description: 'Design the launcher icon.',
        status: 'done',
        priority: 'medium',
        assignedTo: employee._id,
        project: project2._id,
        dueDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        createdBy: manager._id
      },
      {
        title: 'Push Notifications Integration',
        description: 'Firebase integration for notifications.',
        status: 'review',
        priority: 'critical',
        assignedTo: manager._id,
        project: project2._id,
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        createdBy: admin._id
      },
      {
        title: 'Update Terms of Service',
        description: 'Legal review required.',
        status: 'todo',
        priority: 'low',
        assignedTo: manager._id,
        project: project1._id,
        dueDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
        createdBy: admin._id
      },
      {
        title: 'Optimize Images',
        description: 'Run all assets through image compressor.',
        status: 'in-progress',
        priority: 'low',
        assignedTo: employee._id,
        project: project1._id,
        dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // Overdue
        createdBy: manager._id
      }
    ];

    await Task.insertMany(tasksData);
    console.log('Tasks created');

    console.log('Data Imported Successfully!');
    process.exit();
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
};

seedDB();
