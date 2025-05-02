// Modified version of routes_db/accounts.js
const express = require('express');
const { ObjectId } = require('mongodb');
const router = express.Router();

module.exports = (db) => {
    const accountsCollection = db.collection('accounts');
    const itemsCollection = db.collection('items');

    // GET /api/db/accounts
    router.get('/', async (req, res) => {
        try {
            const userId = req.query.user_id || (req.user && req.user.id);

            // Log the user ID for debugging
            console.log('Accounts route - User ID from request:', userId);

            let query = {};

            // If userId is provided, use it to find all items belonging to this user
            if (userId) {
                try {
                    const userIdObj = new ObjectId(userId);

                    // Find all items for this user
                    const userItems = await itemsCollection.find({
                        user_id: userIdObj
                    }).toArray();

                    // Extract the item_ids to filter accounts
                    const itemIds = userItems.map(item => item.item_id);

                    if (itemIds.length > 0) {
                        // Add item_id filter for accounts
                        query.item_id = { $in: itemIds };
                    } else {
                        console.log('No items found for user:', userId);
                        return res.json([]); // No items, so no accounts
                    }
                } catch (err) {
                    console.warn('Invalid ObjectId format for user_id:', userId);
                    return res.status(400).json({ error: 'Invalid user ID format' });
                }
            }

            console.log('Accounts query:', query);
            const accounts = await accountsCollection.find(query).toArray();
            console.log(`Found ${accounts.length} accounts for query`);

            res.json(accounts);
        } catch (err) {
            console.error('Error fetching accounts:', err);
            res.status(500).json({ error: 'Failed to fetch accounts' });
        }
    });

    return router;
};