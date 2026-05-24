require('dotenv').config();
const { prisma } = require('../config/prisma');
const bcrypt = require('bcryptjs');

const seedDB = async () => {
  try {
    console.log('PostgreSQL Connected via Prisma for Seeding...');

    // Clear DB in order of constraints
    await prisma.notification.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.attachment.deleteMany();
    await prisma.task.deleteMany();
    await prisma.projectMember.deleteMany();
    await prisma.project.deleteMany();
    await prisma.user.deleteMany();
    console.log('Tables cleared');

    const salt = await bcrypt.genSalt(12);
    const hashedPasswordAdmin = await bcrypt.hash('Admin@123', salt);
    const hashedPasswordManager = await bcrypt.hash('Manager@123', salt);
    const hashedPasswordEmployee = await bcrypt.hash('Employee@123', salt);

    // Create Users
    const admin = await prisma.user.create({
      data: {
        name: 'Admin User',
        email: 'admin@flowdesk.com',
        password: hashedPasswordAdmin,
        role: 'admin',
        department: 'Engineering'
      }
    });

    const manager = await prisma.user.create({
      data: {
        name: 'Manager User',
        email: 'manager@flowdesk.com',
        password: hashedPasswordManager,
        role: 'manager',
        department: 'Product'
      }
    });

    const employee = await prisma.user.create({
      data: {
        name: 'Employee User',
        email: 'employee@flowdesk.com',
        password: hashedPasswordEmployee,
        role: 'employee',
        department: 'Design'
      }
    });
    console.log('Users created');

    // Create Projects
    const project1 = await prisma.project.create({
      data: {
        name: 'Website Redesign',
        description: 'Overhaul the corporate website to modern standards.',
        color: '#4F46E5',
        createdById: admin.id,
        managerId: manager.id
      }
    });

    // Add members
    await prisma.projectMember.createMany({
      data: [
        { projectId: project1.id, userId: admin.id, role: 'member' },
        { projectId: project1.id, userId: manager.id, role: 'manager' },
        { projectId: project1.id, userId: employee.id, role: 'member' }
      ]
    });

    const project2 = await prisma.project.create({
      data: {
        name: 'Mobile App MVP',
        description: 'First version of the mobile app for iOS and Android.',
        color: '#059669',
        createdById: manager.id,
        managerId: manager.id
      }
    });

    await prisma.projectMember.createMany({
      data: [
        { projectId: project2.id, userId: manager.id, role: 'manager' },
        { projectId: project2.id, userId: employee.id, role: 'member' }
      ]
    });
    console.log('Projects created');

    // Create Tasks
    await prisma.task.create({
      data: {
        title: 'Design Wireframes',
        description: 'Create initial wireframes for homepage.',
        status: 'done',
        priority: 'high',
        assignedToId: employee.id,
        projectId: project1.id,
        dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        createdById: manager.id,
        comments: {
          create: [{ userId: manager.id, text: 'Looks great!' }]
        }
      }
    });

    await prisma.task.create({
      data: {
        title: 'Setup Database',
        description: 'Configure MongoDB collections.',
        status: 'todo',
        priority: 'critical',
        assignedToId: manager.id,
        projectId: project1.id,
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        createdById: admin.id
      }
    });

    await prisma.task.create({
      data: {
        title: 'Create Login API',
        description: 'JWT based login API endpoint.',
        status: 'in_progress',
        priority: 'medium',
        assignedToId: employee.id,
        projectId: project2.id,
        dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // Overdue
        createdById: manager.id
      }
    });

    await prisma.task.create({
      data: {
        title: 'Setup CI/CD pipeline',
        description: 'GitHub actions setup.',
        status: 'review',
        priority: 'high',
        assignedToId: manager.id,
        projectId: project2.id,
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        createdById: admin.id,
        comments: {
          create: [{ userId: employee.id, text: 'I fixed the build error.' }]
        }
      }
    });

    await prisma.task.create({
      data: {
        title: 'Write User Docs',
        description: 'Draft the initial onboarding manual.',
        status: 'todo',
        priority: 'low',
        assignedToId: employee.id,
        projectId: project1.id,
        dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        createdById: manager.id
      }
    });

    await prisma.task.create({
      data: {
        title: 'Fix Navigation Bug',
        description: "Mobile menu doesn't open on Safari.",
        status: 'in_progress',
        priority: 'high',
        assignedToId: employee.id,
        projectId: project1.id,
        dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
        createdById: manager.id
      }
    });

    await prisma.task.create({
      data: {
        title: 'App Icon Design',
        description: 'Design the launcher icon.',
        status: 'done',
        priority: 'medium',
        assignedToId: employee.id,
        projectId: project2.id,
        dueDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        createdById: manager.id
      }
    });

    await prisma.task.create({
      data: {
        title: 'Push Notifications Integration',
        description: 'Firebase integration for notifications.',
        status: 'review',
        priority: 'critical',
        assignedToId: manager.id,
        projectId: project2.id,
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        createdById: admin.id
      }
    });

    await prisma.task.create({
      data: {
        title: 'Update Terms of Service',
        description: 'Legal review required.',
        status: 'todo',
        priority: 'low',
        assignedToId: manager.id,
        projectId: project1.id,
        dueDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
        createdById: admin.id
      }
    });

    await prisma.task.create({
      data: {
        title: 'Optimize Images',
        description: 'Run all assets through image compressor.',
        status: 'in_progress',
        priority: 'low',
        assignedToId: employee.id,
        projectId: project1.id,
        dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // Overdue
        createdById: manager.id
      }
    });

    console.log('Tasks created');
    console.log('PostgreSQL Data Seeded Successfully!');
    process.exit(0);
  } catch (err) {
    console.error(`Error during seeding: ${err.message}`);
    process.exit(1);
  }
};

seedDB();
