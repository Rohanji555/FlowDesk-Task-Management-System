const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Recursively map `id` properties to virtual `_id` fields for absolute EJS compatibility
function mapIdToUnderscoreId(obj, visited = new WeakSet()) {
  if (!obj || typeof obj !== 'object') return obj;
  
  // Date objects should be preserved as-is
  if (obj instanceof Date) return obj;

  if (visited.has(obj)) return obj;

  if (Array.isArray(obj)) {
    return obj.map(item => mapIdToUnderscoreId(item, visited));
  }

  visited.add(obj);

  const newObj = {};
  
  // Copy all keys
  for (const key of Object.keys(obj)) {
    newObj[key] = mapIdToUnderscoreId(obj[key], visited);
  }

  // If 'id' is present, expose it as '_id' for Mongoose-compatibility in views
  if ('id' in obj && obj.id !== undefined && obj.id !== null) {
    newObj._id = obj.id;
  }

  return newObj;
}

module.exports = {
  prisma,
  mapIdToUnderscoreId
};
