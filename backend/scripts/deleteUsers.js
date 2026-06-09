const { MongoClient } = require('mongodb');

const MONGODB_URI = 'mongodb+srv://shreyas777999_db_user:w6sR7zMWIlSbGFbL@facility.iendyxs.mongodb.net/facility_portal';
const emailsToDelete = [
  'shwetha.s@transcendgroup.org',
  'siddharth.kt@transcendgroup.org'
];

async function main() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  console.log('Connected to MongoDB');

  const db = client.db('facility_portal');
  const users = db.collection('users');

  const result = await users.deleteMany({ email: { $in: emailsToDelete } });
  console.log(`Deleted ${result.deletedCount} user(s):`, emailsToDelete);

  await client.close();
}

main().catch(console.error);
