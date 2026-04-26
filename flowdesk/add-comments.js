const fs = require('fs');
const files = {
  'server.js': '// Concepts: HTTP module, Node.js fundamentals, Client-server architecture',
  'app.js': '// Concepts: Express.js, Middleware stack, Static files, Template engine',
  'config/db.js': '// Concepts: MongoDB, Mongoose, NoSQL database integration',
  'models/User.js': '// Concepts: Mongoose schema, bcrypt, pre-save hooks',
  'config/passport.js': '// Concepts: Passport.js, Authentication strategies',
  'utils/jwtHelper.js': '// Concepts: JWT, Token-based authentication',
  'config/socket.js': '// Concepts: Socket.io, Real-time communication, Full-duplex',
  'utils/fileHelper.js': '// Concepts: Node.js fs module, Streams, Non-blocking I/O'
};
Object.entries(files).forEach(([file, comment]) => {
  try {
    let content = fs.readFileSync(file, 'utf8');
    if (!content.includes(comment)) {
      content = content.replace(/\/\/ Concept: .*\n/g, '');
      fs.writeFileSync(file, comment + '\n' + content);
      console.log(`Updated ${file}`);
    } else {
      console.log(`Already has comment ${file}`);
    }
  } catch(e) {
    console.log(`Error updating ${file}:`, e.message);
  }
});
