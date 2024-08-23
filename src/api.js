const express = require('express');
const serverless = require('serverless-http');
const pool = require('./db');
const app = express();
const router = express.Router();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Login Route
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const query = 'SELECT * FROM users WHERE username = :username';
    const result = await pool.query(query, [username]);

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const user = result.rows[0];

    if (password !== user.PASSWORD) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    res.json({ message: 'Login successful', user_id: user.USER_ID });
  } catch (error) {
    console.log('print: error: ', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Register Route
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  try {
    const query = `INSERT INTO users (username, email, password, following, followers)
                   VALUES (:username, :email, :password, EMPTY_BLOB(), EMPTY_BLOB())
                   RETURNING user_id INTO :user_id`;
    const result = await pool.query(query, {
      username, email, password, user_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
    });

    res.json({ message: 'Register successful', user_id: result.outBinds.user_id[0] });
  } catch (error) {
    console.log('print: error: ', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create Post Route
router.post('/createPost', async (req, res) => {
  const { paragraph, user_id } = req.body;

  try {
    const query = `INSERT INTO tweets (paragraph, user_id) VALUES (:paragraph, :user_id)`;
    await pool.query(query, { paragraph, user_id });
    res.json({ message: 'Tweet created successfully' });
  } catch (error) {
    console.log('print: error: ', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get My Feed Route
router.get('/getMyFeed', async (req, res) => {
  const { user_id } = req.query;

  try {
    const query = `SELECT tweets.tweet_id, tweets.paragraph, tweets.date, tweets.user_id, users.username, users.email
                   FROM tweets
                   JOIN users ON users.user_id = tweets.user_id
                   WHERE tweets.user_id = :user_id
                   OR users.user_id IN (SELECT column_value FROM TABLE(CAST((SELECT following FROM users WHERE user_id = :user_id) AS SYS.ODCINUMBERLIST)))
                   ORDER BY tweets.date DESC`;

    const result = await pool.query(query, { user_id });
    res.json(result.rows);
  } catch (error) {
    console.log('print: error: ', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Add Follower Route
router.patch('/addFollower', async (req, res) => {
  const { user_id, new_follower_id } = req.body;

  try {
    const query = `UPDATE users
                   SET followers = SYS.ODCINUMBERLIST(SYS.ODCINUMBERLIST(followers), :new_follower_id)
                   WHERE user_id = :user_id`;

    await pool.query(query, { new_follower_id, user_id });
    res.json({ message: 'Follower added successfully' });
  } catch (error) {
    console.log('print: error: ', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Remove Follower Route
router.patch('/removeFollower', async (req, res) => {
  const { user_id, remove_follower_id } = req.body;

  try {
    const query = `UPDATE users
                   SET followers = SYS.ODCINUMBERLIST(SYS.ODCINUMBERLIST(followers) - :remove_follower_id)
                   WHERE user_id = :user_id`;

    await pool.query(query, { remove_follower_id, user_id });
    res.json({ message: 'Follower removed successfully' });
  } catch (error) {
    console.log('print: error: ', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Add Following Route
router.patch('/addFollowing', async (req, res) => {
  const { user_id, new_following_id } = req.body;

  try {
    const query = `UPDATE users
                   SET following = SYS.ODCINUMBERLIST(SYS.ODCINUMBERLIST(following), :new_following_id)
                   WHERE user_id = :user_id`;

    await pool.query(query, { new_following_id, user_id });
    res.json({ message: 'Following added successfully' });
  } catch (error) {
    console.log('print: error: ', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Remove Following Route
router.patch('/removeFollowing', async (req, res) => {
  const { user_id, remove_following_id } = req.body;

  try {
    const query = `UPDATE users
                   SET following = SYS.ODCINUMBERLIST(SYS.ODCINUMBERLIST(following) - :remove_following_id)
                   WHERE user_id = :user_id`;

    await pool.query(query, { remove_following_id, user_id });
    res.json({ message: 'Following removed successfully' });
  } catch (error) {
    console.log('print: error: ', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get Tweets by User ID Route
router.get('/getTweetsById', async (req, res) => {
  const { user_id } = req.query;

  try {
    const query = `SELECT tweets.tweet_id, tweets.paragraph, tweets.date, tweets.user_id, users.username, users.email
                   FROM tweets
                   JOIN users ON users.user_id = tweets.user_id
                   WHERE tweets.user_id = :user_id
                   ORDER BY tweets.date DESC`;

    const result = await pool.query(query, { user_id });
    res.json(result.rows);
  } catch (error) {
    console.log('print: error: ', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get Profile by User ID Route
router.get('/getProfileById', async (req, res) => {
  const { user_id } = req.query;

  try {
    const query = `SELECT u.user_id, u.username, u.email, u.password, u.following, u.followers,
                          (SELECT LISTAGG(uf.username, ', ') WITHIN GROUP (ORDER BY uf.username)
                           FROM users uf WHERE uf.user_id IN (SELECT column_value FROM TABLE(CAST(u.following AS SYS.ODCINUMBERLIST)))) AS following_usernames,
                          (SELECT LISTAGG(ur.username, ', ') WITHIN GROUP (ORDER BY ur.username)
                           FROM users ur WHERE ur.user_id IN (SELECT column_value FROM TABLE(CAST(u.followers AS SYS.ODCINUMBERLIST)))) AS followers_usernames
                   FROM users u
                   WHERE u.user_id = :user_id`;

    const result = await pool.query(query, { user_id });
    res.json(result.rows);
  } catch (error) {
    console.log('print: error: ', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Search User Route
router.get('/searchUser', async (req, res) => {
  const { search } = req.query;

  try {
    const query = `SELECT * FROM users WHERE username LIKE '%' || :search || '%'`;
    const result = await pool.query(query, { search });
    res.json(result.rows);
  } catch (error) {
    console.log('print: error: ', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get My Follow Route
router.get('/getMyFollow', async (req, res) => {
  const { user_id } = req.query;

  try {
    const query = `SELECT following, followers FROM users WHERE user_id = :user_id`;
    const result = await pool.query(query, { user_id });
    res.json(result.rows);
  } catch (error) {
    console.log('print: error: ', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.use('/', router);
app.listen(3002, () => console.log('server listening'));

module.exports.handler = serverless(app);