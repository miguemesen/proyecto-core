import oracledb from 'oracledb';

const tweetTable = 'TWEETS';

const getTweets = async () => {
  const query = `SELECT * FROM ${tweetTable}`;
  const result = await oracledb.execute(query);
  return result.rows;
};

const getTweetById = async (id) => {
  const query = `SELECT * FROM ${tweetTable} WHERE ID = :id`;
  const result = await oracledb.execute(query, [id]);
  return result.rows[0];
};

const createTweet = async (tweet) => {
  const query = `INSERT INTO ${tweetTable} (CONTENT, USER_ID) VALUES (:content, :userId) RETURNING *`;
  const result = await oracledb.execute(query, [tweet.content, tweet.userId]);
  return result.rows[0];
};

const likeTweet = async (tweetId, userId) => {
  const query = `INSERT INTO LIKES (TWEET_ID, USER_ID) VALUES (:tweetId, :userId)`;
  await oracledb.execute(query, [tweetId, userId]);
};

export { getTweets, getTweetById, createTweet, likeTweet };