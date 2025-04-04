const { faker } = require('@faker-js/faker');
const { ObjectId } = require('bson');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const NUM_USERS = 10;
const MONTHS_BACK = 12;
const TARGET_TRANSACTIONS = 5000;


const client = new MongoClient(process.env.MONGO_URI);
const dbName = "perfin-testbox";

(async () => {
  await client.connect();
  const db = client.db(dbName);

  // Clear existing
  await Promise.all([
    db.collection('users').deleteMany({}),
    db.collection('institutions').deleteMany({}),
    db.collection('items').deleteMany({}),
    db.collection('accounts').deleteMany({}),
    db.collection('transactions').deleteMany({})
  ]);

  const users = Array.from({ length: NUM_USERS }).map(() => ({
    _id: new ObjectId(),
    name: faker.person.fullName(),
    email: faker.internet.email(),
    createdAt: new Date()
  }));

  const institutions = Array.from({ length: NUM_USERS }).map(() => ({
    _id: new ObjectId(),
    name: faker.company.name(),
    institution_id: `ins_${faker.number.int({ min: 10000, max: 99999 })}`,
    createdAt: new Date()
  }));

  const items = users.map(user => {
    const institution = faker.helpers.arrayElement(institutions);
    return {
      _id: new ObjectId(),
      user_id: user._id,
      institution_id: institution._id,
      access_token: faker.string.uuid(),
      item_id: faker.string.uuid(),
      createdAt: new Date()
    };
  });

  const accounts = items.flatMap(item => {
    return Array.from({ length: faker.number.int({ min: 1, max: 3 }) }).map(() => ({
      _id: new ObjectId(),
      item_id: item._id,
      account_id: faker.string.uuid(),
      name: `${faker.word.adjective()} Account`,
      type: faker.helpers.arrayElement(['depository', 'credit', 'loan']),
      subtype: faker.helpers.arrayElement(['checking', 'savings', 'credit card']),
      mask: faker.number.int({ min: 1000, max: 9999 }).toString(),
      createdAt: new Date()
    }));
  });

  const transactions = accounts.flatMap(account => {
    const numTx = Math.ceil(TARGET_TRANSACTIONS / accounts.length);
    return Array.from({ length: numTx }).map(() => {
      const daysAgo = faker.number.int({ min: 0, max: MONTHS_BACK * 30 });
      const date = new Date(Date.now() - daysAgo * 86400000);
      return {
        _id: new ObjectId(),
        account_id: account._id,
        transaction_id: faker.string.uuid(),
        name: faker.company.name(),
        amount: parseFloat(faker.finance.amount({ min: 1, max: 500 })),
        category: faker.helpers.arrayElement(['Food', 'Travel', 'Utilities', 'Shopping', 'Income']),
        date: date,
        createdAt: new Date()
      };
    });
  });

  // Insert all collections
  await db.collection('users').insertMany(users);
  await db.collection('institutions').insertMany(institutions);
  await db.collection('items').insertMany(items);
  await db.collection('accounts').insertMany(accounts);
  await db.collection('transactions').insertMany(transactions);

  console.log("✅ Inserted Plaid-like test data into MongoDB!");
  await client.close();
})();

