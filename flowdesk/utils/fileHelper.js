// Concepts: Node.js fs module, Streams, Non-blocking I/O
const fs = require('fs');
const path = require('path');

const logsDir = path.join(__dirname, '../logs');

// WRONG: const data = fs.readFileSync(path) — blocks event loop
// RIGHT: const data = await fs.promises.readFile(path) — non-blocking

exports.ensureLogDir = async () => {
  try {
    await fs.promises.mkdir(logsDir, { recursive: true });
  } catch (err) {
    console.error('Error creating logs directory', err);
  }
};

exports.readActivityLog = async (projectId) => {
  const filePath = path.join(logsDir, `project-${projectId}.log`);
  try {
    const data = await fs.promises.readFile(filePath, 'utf8');
    return data;
  } catch (err) {
    if (err.code === 'ENOENT') return ''; // File doesn't exist yet
    throw err;
  }
};

exports.appendActivityLog = (projectId, entry) => {
  const filePath = path.join(logsDir, `project-${projectId}.log`);
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${entry}\n`;
  
  const stream = fs.createWriteStream(filePath, { flags: 'a' });
  stream.write(logEntry);
  stream.end();
};

exports.deleteFile = async (filePath) => {
  try {
    await fs.promises.unlink(filePath);
  } catch (err) {
    if (err.code !== 'ENOENT') {
      throw err;
    }
    // Gracefully handle if file is already deleted or not found
  }
};
