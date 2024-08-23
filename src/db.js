const oracledb = require('oracledb');

let pool;

async function initialize() {
  pool = await oracledb.createPool({
    user: 'your_username',
    password: 'your_password',
    connectString: 'your_connect_string'
  });
}

async function close() {
  await pool.close(0);
}

async function query(sql, binds = [], options = {}) {
  let conn;

  try {
    conn = await pool.getConnection();
    const result = await conn.execute(sql, binds, { ...options, outFormat: oracledb.OUT_FORMAT_OBJECT });
    return result;
  } catch (err) {
    console.error(err);
    throw err;
  } finally {
    if (conn) {
      try {
        await conn.close();
      } catch (err) {
        console.error(err);
      }
    }
  }
}

module.exports = {
  initialize,
  close,
  query,
};