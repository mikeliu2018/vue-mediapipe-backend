const { OAuth2Client } = require('google-auth-library');
const { PrismaClient } = require('@prisma/client');
const mysqlx = require('@mysql/xdevapi');
const uuid = require('uuid');
require('dotenv').config();

async function addUser(prisma, user) {
  return await prisma.users.create({data: user});
};

async function getUser(prisma, account_source_type, account_source_id) {  
  return await prisma.users.findUnique({ 
    where: {
      account_source_type_account_source_id: {
        account_source_type: account_source_type,
        account_source_id: account_source_id
      }
    }
  });
};

async function verifyIdToken(idToken, clientId) {
  const client = new OAuth2Client(clientId);
  const ticket = await client.verifyIdToken({
    idToken: idToken,
    audience: clientId,  // Specify the CLIENT_ID of the app that accesses the backend
    // Or, if multiple clients access the backend:
    //[CLIENT_ID_1, CLIENT_ID_2, CLIENT_ID_3]
  });
  
  // console.log('ticket', ticket);
  const payload = ticket.getPayload();  

  // If request specified a G Suite domain:
  // const domain = payload['hd'];
  return payload;
};

module.exports.getUser = getUser;

module.exports.LoginWithGoogle = async (prisma, req) => {
  console.log('req.body', req.body);    
  const payload = await verifyIdToken(req.body.idToken, req.body.clientId);

  console.log('payload', payload);

  const account_source_type = 'google';
  const account_source_id = payload['sub'];
  const account_source_email = payload['email'];
  const account_source_name = payload['name'];
  const account_source_picture = payload['picture'];
  
  let user = await getUser(prisma, account_source_type, account_source_id);
  let result;

  if (user === null) {
    user = {
      uuid: uuid.v4(),
      account_source_type: account_source_type,
      account_source_id: account_source_id,
      account_source_email: account_source_email,
      account_source_name: account_source_name,
      account_source_picture: account_source_picture
    };        
    const addUserResult = addUser(prisma, user);
    console.log('addUserResult', addUserResult);
    result = addUserResult;
  } else {
    console.log('getUserResult', user);
    result = user;
  }    

  return result;
};

module.exports.UserLoginHistory = async (session, json) => {

  const schema = session.getSchema(process.env.MYSQL_DATABASE);
  const exists = await schema.existsInDatabase();

  if (!exists) {
    await session.createSchema(process.env.MYSQL_DATABASE);    
  }
  const collection = await schema.createCollection("user_login_history", { reuseExisting: true });
  const addResult = await collection.add([json]).execute();
  const addRowId = addResult.getGeneratedIds();
  console.log('addResult.getGeneratedIds(): %s', addRowId);

  const result = (await collection.find(`_id == '${addRowId}'`).execute()).fetchOne();

  return result;
};
