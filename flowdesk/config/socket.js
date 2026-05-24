// Concepts: Socket.io, Real-time communication, Full-duplex
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { prisma, mapIdToUnderscoreId } = require('./prisma');

let io;

module.exports = {
  init: (server) => {
    io = new Server(server, { cors: { origin: '*' } });
    
    io.use(async (socket, next) => {
      try {
        let token = socket.handshake.auth.token;
        if (!token && socket.handshake.headers.cookie) {
          const cookies = Object.fromEntries(
            socket.handshake.headers.cookie.split('; ').map(c => c.split('='))
          );
          token = cookies.jwt_token;
        }

        if (!token) return next(new Error('Authentication error: No token provided'));

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const rawUser = await prisma.user.findUnique({
          where: { id: parseInt(decoded.id) }
        });
        
        if (!rawUser) return next(new Error('Authentication error: User not found'));

        const user = mapIdToUnderscoreId(rawUser);
        socket.data.user = user;
        next();
      } catch (err) {
        next(new Error('Authentication error'));
      }
    });

    io.on('connection', (socket) => {
      const user = socket.data.user;
      
      // Personal room
      socket.join(user._id.toString());
      
      // Emit online status
      io.emit('user:online', { userId: user._id, name: user.name });

      socket.on('join:project', (projectId) => {
        socket.join('project:' + projectId);
      });

      socket.on('join:task', (taskId) => {
        socket.join('task:' + taskId);
      });

      socket.on('task:statusChange', async ({ taskId, newStatus }) => {
        try {
          const rawTask = await prisma.task.update({
            where: { id: parseInt(taskId) },
            data: { status: newStatus }
          });
          const task = mapIdToUnderscoreId(rawTask);
          if (task) {
            io.to('project:' + task.projectId).emit('task:updated', task);
          }
        } catch (err) {
          console.error('Socket task:statusChange error', err);
        }
      });

      socket.on('typing:start', (taskId) => {
        socket.to('task:' + taskId).emit('typing:start', { userId: user._id, name: user.name });
      });

      socket.on('typing:stop', (taskId) => {
        socket.to('task:' + taskId).emit('typing:stop', { userId: user._id, name: user.name });
      });

      socket.on('disconnect', () => {
        io.emit('user:offline', { userId: user._id, name: user.name });
      });
    });

    return io;
  },
  getIO: () => {
    if (!io) throw new Error('Socket.io not initialized');
    return io;
  }
};
