import oracledb from 'oracledb';

const userTable = 'USERS';

const getUserByUsername = async (username) => {
  const query = `SELECT * FROM ${userTable} WHERE USERNAME = :username`;
  const result = await oracledb.execute(query, [username]);
  return result.rows[0];
};

const getUserById = async (id) => {
  const query = `SELECT * FROM ${userTable} WHERE ID = :id`;
  const result = await oracledb.execute(query, [id]);
  return result.rows[0];
};

const createUser = async (user) => {
  const query = `INSERT INTO ${userTable} (USERNAME, EMAIL, PASSWORD, PROFILE_PICTURE, BIO) VALUES (:username, :email, :password, :profilePicture, :bio) RETURNING *`;
  const result = await oracledb.execute(query, [
    user.username,
    user.email,
    user.password,
    user.profilePicture,
    user.bio,
  ]);
  return result.rows[0];
};

export { getUserByUsername, getUserById, createUser };