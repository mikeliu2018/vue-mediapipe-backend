const { MongoClient } = require("mongodb");
// Replace the uri string with your connection string.
// const uri = "mongodb+srv://<user>:<password>@<cluster-url>?retryWrites=true&w=majority";
const mongodb_scheme = process.env.MONGODB_SCHEME;
const mongodb_user = process.env.MONGODB_USER;
const mongodb_password = process.env.MONGODB_PASSWORD;
const mongodb_host = process.env.MONGODB_HOST;
const mongodb_port = process.env.MONGODB_PORT;
const mongodb_db = process.env.MONGODB_DB;
const uri = `${mongodb_scheme}://${mongodb_user}:${mongodb_password}@${mongodb_host}:${mongodb_port}/${mongodb_db}?retryWrites=true&w=majority`;

module.exports = {
  async record_pose_landmarks (json) {
    const client = new MongoClient(uri);
    try {
      // insert to Mongo
      const database = client.db('mediapipe-app');
      const pose_landmarks = database.collection('pose_landmarks');
      const result = await pose_landmarks.insertOne(json);
      // console.log("result", result);
      return result;    
    } finally {
      await client.close();
    }
  }    
}
