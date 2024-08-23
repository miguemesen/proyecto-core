const oracledb = require('oracledb');

// Define your Oracle DB configuration
const config = {
  user: 'estudiante',
  password: 'estudiante',
  connectString: 'localhost/ORCLCDB'
};

// Create and export the connection pool
let pool;

async function initialize() {
  try {
    pool = await oracledb.createPool(config);
    console.log('Oracle DB connection pool created.');
  } catch (err) {
    console.error('Error creating Oracle DB connection pool:', err);
    process.exit(1); // Exit process if unable to connect
  }
}

function getPool() {
  if (!pool) {
    throw new Error('Database pool is not initialized.');
  }
  return pool;
}

// Initialize pool
initialize();

module.exports = {
  getConnection: async function() {
    return await getPool().getConnection();
  }
};