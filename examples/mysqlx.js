const mysqlx = require('@mysql/xdevapi');

module.exports = {
  async record_pose_landmarks(json) {
    // insert to MySQL with X protocol
    mysqlx.getSession({
      schema: process.env.MYSQL_DATABASE,
      password: process.env.MYSQL_PASSWORD,
      user: process.env.MYSQL_USER,
      host: process.env.MYSQL_HOST,
      port: process.env.MYSQL_X_PORT,
    })
      .then(async (session) => {
        const schema = session.getSchema(process.env.MYSQL_DATABASE);
        return await schema.existsInDatabase().then(async (exists) => {
          if (exists) {
            return schema;
          }
          return await session.createSchema(process.env.MYSQL_DATABASE);
        })
          .then(async (schema) => {
            return await schema.createCollection("pose_landmarks", { reuseExisting: true });
          })
          .then(async (collection) => {
            return await collection.add([{ timesteamp: json.timesteamp, poseLandmarks: json.poseLandmarks }])
              .execute()
              .then(async () => {
                return await collection.find()
                  .fields('timesteamp', 'poseLandmarks')
                  .execute();
              })
              .then(res => {
                console.log(res.fetchOne()); // { name: 'foo', age: 42 }
              })
          })          
          .finally(() => {
            session.close();
          });
      })
  }
};