const express = require('express');
const serverless = require('serverless-http');
const db = require('./db');
const app = express();
const router = express.Router();
const oracledb = require('oracledb');


app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware to handle CORS
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  next();
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  let connection;
  try {
    connection = await db.getConnection();
    const query = 'SELECT * FROM users WHERE username = :username';
    const result = await connection.execute(query, [username], { outFormat: oracledb.OUT_FORMAT_OBJECT });

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const user = result.rows[0];

    if (password !== user.PASSWORD) { // Use column name in uppercase
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    res.json({ message: 'Login successful', user_id: user.USER_ID });
  } catch (error) {
    console.error('Error login: ', error);
    res.status(500).json({ message: 'Internal server error' });
  } finally {
    if (connection) {
      await connection.close();
    }
  }
});

router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  let connection;

  try {
    connection = await db.getConnection();

    const query = `
      INSERT INTO users (username, email, password, following, followers) 
      VALUES (:username, :email, :password, SYS.ODCINUMBERLIST(), SYS.ODCINUMBERLIST())
      RETURNING user_id INTO :user_id`;

    const result = await connection.execute(query, {
      username,
      email,
      password,
      user_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
    });

    await connection.commit(); // Ensure to commit the transaction
    res.json({ message: 'Register successful', user_id: result.outBinds.user_id[0] });
  } catch (error) {
    console.error('Error register: ', error);
    res.status(500).json({ message: 'Internal server error' });
  } finally {
    if (connection) {
      await connection.close();
    }
  }
});

router.post('/createPost', async (req, res) => {
  const { paragraph, user_id } = req.body;

  if (!paragraph || !user_id) {
    return res.status(400).json({ error: 'Paragraph and user_id are required.' });
  }

  let connection;

  try {
    connection = await db.getConnection();
    const result = await connection.execute(
      `INSERT INTO tweets (paragraph, user_id) VALUES (:paragraph, :user_id)`,
      [paragraph, user_id],
      { autoCommit: true } // Automatically commit the transaction
    );

    res.status(201).json({ message: 'Tweet created successfully.', tweet_id: result.lastRowid });
  } catch (err) {
    console.error('Error inserting tweet:', err);
    res.status(500).json({ error: 'An error occurred while creating the tweet.' });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error('Error closing connection:', err);
      }
    }
  }
});

router.get('/getMyFeed', async (req, res) => {
  const { user_id } = req.query;
  let connection;
  try {
    connection = await db.getConnection();
    const query = `SELECT t.tweet_id, t.paragraph, t.tweet_date, t.user_id, 
             u.username, u.email
      FROM tweets t
      JOIN users u ON u.user_id = t.user_id
      WHERE t.user_id = :user_id 
      OR u.user_id IN (
        SELECT COLUMN_VALUE
        FROM TABLE(
          CAST(
            (SELECT following
             FROM users
             WHERE user_id = :user_id) AS SYS.ODCINUMBERLIST
          )
        )
      )
      ORDER BY t.tweet_date DESC`;

    const result = await connection.execute(query, [user_id,user_id], { outFormat: oracledb.OUT_FORMAT_OBJECT });
    return res.json(result.rows);
  } catch (error) {
    console.error('Error getMyFeed: ', error);
    res.status(500).json({ message: 'Internal server error' });
  } finally {
    if (connection) {
      await connection.close();
    }
  }
});

router.patch('/addFollower', async (req, res) => {
  const { user_id, new_follower_id } = req.body;
  let connection;
  try {
    connection = await db.getConnection();
    const query = `UPDATE users
                   SET followers = SYS.ODCINUMBERLIST(:new_follower_id) 
                   WHERE user_id = :user_id`;

    await connection.execute(query, [new_follower_id, user_id]);
    return res.json({ message: 'Follower added successfully' });
  } catch (error) {
    console.error('Error addFollower: ', error);
    res.status(500).json({ message: 'Internal server error' });
  } finally {
    if (connection) {
      await connection.close();
    }
  }
});

router.patch('/removeFollower', async (req, res) => {
  const { user_id, follower_id_to_remove } = req.body;

  if (!user_id || !follower_id_to_remove) {
    return res.status(400).json({ message: 'User ID and follower ID are required' });
  }

  let connection;

  try {
    connection = await db.getConnection();

    const query = `
      DECLARE
        v_followers SYS.ODCINUMBERLIST := SYS.ODCINUMBERLIST();
        v_new_followers SYS.ODCINUMBERLIST := SYS.ODCINUMBERLIST();
      BEGIN
        -- Fetch existing followers
        SELECT followers INTO v_followers
        FROM users
        WHERE user_id = :user_id;

        -- Remove the follower if present
        FOR i IN 1 .. v_followers.COUNT LOOP
          IF v_followers(i) != :follower_id_to_remove THEN
            v_new_followers.EXTEND;
            v_new_followers(v_new_followers.COUNT) := v_followers(i);
          END IF;
        END LOOP;

        -- Update the users table with the new followers list
        UPDATE users
        SET followers = v_new_followers
        WHERE user_id = :user_id;
      END;
    `;

    await connection.execute(query, [user_id, follower_id_to_remove], { autoCommit: true });

    return res.json({ message: 'Follower removed successfully' });
  } catch (error) {
    console.error('Error removeFollower: ', error);
    res.status(500).json({ message: 'Internal server error' });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (closeError) {
        console.error('Error closing connection: ', closeError);
      }
    }
  }
});

router.patch('/addFollowing', async (req, res) => {
  const { user_id, new_following_id } = req.body;

  if (!user_id || !new_following_id) {
    return res.status(400).json({ message: 'User ID and new following ID are required' });
  }

  let connection;

  try {
    connection = await db.getConnection();

    // Use PL/SQL block to handle list manipulation
    const query = `
      DECLARE
        v_following SYS.ODCINUMBERLIST := SYS.ODCINUMBERLIST();
        v_new_following SYS.ODCINUMBERLIST := SYS.ODCINUMBERLIST();
      BEGIN
        -- Fetch existing following list
        SELECT following INTO v_following
        FROM users
        WHERE user_id = :user_id;

        -- Add new following ID to the list
        v_new_following := v_following;
        v_new_following.EXTEND;
        v_new_following(v_new_following.COUNT) := :new_following_id;

        -- Update the users table with the new following list
        UPDATE users
        SET following = v_new_following
        WHERE user_id = :user_id;
      END;
    `;

    await connection.execute(query, [user_id, new_following_id], { autoCommit: true });

    return res.json({ message: 'Following added successfully' });
  } catch (error) {
    console.error('Error addFollowing: ', error);
    res.status(500).json({ message: 'Internal server error' });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (closeError) {
        console.error('Error closing connection: ', closeError);
      }
    }
  }
});

router.patch('/removeFollowing', async (req, res) => {
  const { user_id, following_id_to_remove } = req.body;

  if (!user_id || !following_id_to_remove) {
    return res.status(400).json({ message: 'User ID and following ID are required' });
  }

  let connection;

  try {
    connection = await db.getConnection();

    // Use PL/SQL block to handle list manipulation
    const query = `
      DECLARE
        v_following SYS.ODCINUMBERLIST := SYS.ODCINUMBERLIST();
        v_new_following SYS.ODCINUMBERLIST := SYS.ODCINUMBERLIST();
      BEGIN
        -- Fetch existing following list
        SELECT following INTO v_following
        FROM users
        WHERE user_id = :user_id;

        -- Remove the following user if present
        FOR i IN 1 .. v_following.COUNT LOOP
          IF v_following(i) != :following_id_to_remove THEN
            v_new_following.EXTEND;
            v_new_following(v_new_following.COUNT) := v_following(i);
          END IF;
        END LOOP;

        -- Update the users table with the new following list
        UPDATE users
        SET following = v_new_following
        WHERE user_id = :user_id;
      END;
    `;

    await connection.execute(query, [user_id, following_id_to_remove], { autoCommit: true });

    return res.json({ message: 'Following removed successfully' });
  } catch (error) {
    console.error('Error removeFollowing: ', error);
    res.status(500).json({ message: 'Internal server error' });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (closeError) {
        console.error('Error closing connection: ', closeError);
      }
    }
  }
});

router.get('/getTweetsById', async (req, res) => {
  const { user_id } = req.query;
  let connection;
  try {
    connection = await db.getConnection();
    const query = `SELECT tweets.tweet_id, tweets.paragraph, tweets.tweet_date, tweets.user_id, users.username, users.email, users.user_id
                   FROM tweets
                   JOIN users ON users.user_id = tweets.user_id
                   WHERE tweets.user_id = :user_id
                   ORDER BY tweets.tweet_date DESC`;

    const result = await connection.execute(query, [user_id], { outFormat: oracledb.OUT_FORMAT_OBJECT });
    return res.json(result.rows);
  } catch (error) {
    console.error('Error getTweetsById: ', error);
    res.status(500).json({ message: 'Internal server error' });
  } finally {
    if (connection) {
      await connection.close();
    }
  }
});

router.get('/getProfileById', async (req, res) => {
  const { user_id } = req.query;

  if (!user_id) {
    return res.status(400).json({ message: 'User ID is required' });
  }

  let connection;

  try {
    connection = await db.getConnection();

    // Query to get the user profile with following and followers IDs
    const query = `
      SELECT u.user_id, u.username, u.email,
             (SELECT LISTAGG(user_id, ',') WITHIN GROUP (ORDER BY user_id)
              FROM users
              WHERE user_id IN (
                SELECT COLUMN_VALUE FROM TABLE(u.following)
              )
             ) AS following_ids,
             (SELECT LISTAGG(user_id, ',') WITHIN GROUP (ORDER BY user_id)
              FROM users
              WHERE user_id IN (
                SELECT COLUMN_VALUE FROM TABLE(u.followers)
              )
             ) AS followers_ids
      FROM users u
      WHERE u.user_id = :user_id`;

    const result = await connection.execute(query, [user_id], { outFormat: oracledb.OUT_FORMAT_OBJECT });

    if (result.rows.length > 0) {
      const profile = result.rows[0];

      // Convert comma-separated lists to arrays
      profile.following_ids = profile.following_ids ? profile.following_ids.split(',').map(id => parseInt(id, 10)) : [];
      profile.followers_ids = profile.followers_ids ? profile.followers_ids.split(',').map(id => parseInt(id, 10)) : [];

      return res.json(profile);
    } else {
      return res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error('Error getUserProfile: ', error);
    res.status(500).json({ message: 'Internal server error' });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (closeError) {
        console.error('Error closing connection: ', closeError);
      }
    }
  }
});

router.get('/searchUser', async (req, res) => {
  const { search } = req.query;
  let connection;
  try {
    connection = await db.getConnection();
    const query = `SELECT * FROM users WHERE username LIKE :search`;
    const result = await connection.execute(query, [`%${search}%`], { outFormat: oracledb.OUT_FORMAT_OBJECT });
    return res.json(result.rows);
  } catch (error) {
    console.error('Error searchUser: ', error);
    res.status(500).json({ message: 'Internal server error' });
  } finally {
    if (connection) {
      await connection.close();
    }
  }
});

router.get('/getMyFollow', async (req, res) => {
  const { user_id } = req.query;
  let connection;
  try {
    connection = await db.getConnection();
    const query = `SELECT following, followers FROM users WHERE user_id = :user_id`;
    const result = await connection.execute(query, [user_id], { outFormat: oracledb.OUT_FORMAT_OBJECT });
    res.json(result.rows);
  } catch (error) {
    console.error('Error getMyFollow: ', error);
    res.status(500).json({ message: 'Internal server error' });
  } finally {
    if (connection) {
      await connection.close();
    }
  }
});

app.use('/', router);
app.listen(3002, () => console.log('Server listening on port 3002'));

module.exports.handler = serverless(app);