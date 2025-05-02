// migration/update_data_structure.js

const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

const mongoURI = process.env.MONGO_URI;
const dbName = process.env.MONGO_DB_NAME_PLAID || 'perfin-sandbox';

// Function to migrate the database structure
async function migrateDataStructure() {
    const client = new MongoClient(mongoURI);

    try {
        await client.connect();
        console.log('Connected to MongoDB');

        const db = client.db(dbName);

        // Get all items
        const items = await db.collection('items').find({}).toArray();
        console.log(`Found ${items.length} items to process`);

        // Map of user_id to their items
        const userItems = {};

        // Build mapping of user_id to item_ids
        items.forEach(item => {
            if (item.user_id) {
                const userId = item.user_id.toString();
                if (!userItems[userId]) {
                    userItems[userId] = [];
                }
                userItems[userId].push(item.item_id);
            }
        });

        // Process collections to update structure
        const collections = [
            'accounts',
            'transactions',
            'recurring',
            'balances',
            'institutions'
        ];

        for (const collectionName of collections) {
            console.log(`Processing ${collectionName} collection...`);
            const collection = db.collection(collectionName);

            // Find all documents with user_id
            const docsWithUserId = await collection.find({ user_id: { $exists: true } }).toArray();
            console.log(`Found ${docsWithUserId.length} ${collectionName} with user_id`);

            // Process in batches to avoid memory issues
            const batchSize = 100;
            for (let i = 0; i < docsWithUserId.length; i += batchSize) {
                const batch = docsWithUserId.slice(i, i + batchSize);

                // Bulk operations for this batch
                const bulkOps = [];

                for (const doc of batch) {
                    if (!doc.user_id) continue;

                    const userId = doc.user_id.toString();
                    const itemIds = userItems[userId] || [];

                    // If document already has item_id, just remove user_id
                    if (doc.item_id) {
                        bulkOps.push({
                            updateOne: {
                                filter: { _id: doc._id },
                                update: { $unset: { user_id: "" } }
                            }
                        });
                    }
                    // If document doesn't have item_id but user has items
                    else if (itemIds.length > 0) {
                        // Just use the first item ID for now - ideally we'd have more logic here
                        bulkOps.push({
                            updateOne: {
                                filter: { _id: doc._id },
                                update: {
                                    $set: { item_id: itemIds[0] },
                                    $unset: { user_id: "" }
                                }
                            }
                        });
                    }
                }

                if (bulkOps.length > 0) {
                    const result = await collection.bulkWrite(bulkOps);
                    console.log(`Updated ${result.modifiedCount} documents in ${collectionName}`);
                }
            }
        }

        console.log('Migration completed successfully');
    } catch (err) {
        console.error('Error during migration:', err);
    } finally {
        await client.close();
        console.log('Disconnected from MongoDB');
    }
}

// Run the migration
migrateDataStructure().catch(console.error);