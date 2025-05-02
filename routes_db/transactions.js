// Modified version of routes_db/transactions.js
const express = require('express');
const { ObjectId } = require('mongodb');
const router = express.Router();

module.exports = (db) => {
    const transactionsCollection = db.collection('transactions');
    const itemsCollection = db.collection('items');

    // GET /api/db/transactions
    router.get('/', async (req, res) => {
        try {
            const { item_id, account_id, startDate, endDate, limit } = req.query;
            const userId = req.query.user_id || (req.user && req.user.id);

            let query = {};

            // Add filters for direct parameters
            if (item_id) query.item_id = item_id;
            if (account_id) query.account_id = account_id;
            if (startDate || endDate) {
                query.date = {};
                if (startDate) query.date.$gte = startDate;
                if (endDate) query.date.$lte = endDate;
            }

            // If userId is provided, use it to find all items belonging to this user
            if (userId) {
                try {
                    const userIdObj = new ObjectId(userId);

                    // Find all items for this user
                    const userItems = await itemsCollection.find({
                        user_id: userIdObj
                    }).toArray();

                    // Extract the item_ids to filter transactions
                    const itemIds = userItems.map(item => item.item_id);

                    if (itemIds.length > 0) {
                        // Add item_id filter for transactions
                        query.item_id = { $in: itemIds };
                    } else {
                        console.log('No items found for user:', userId);
                        return res.json([]); // No items, so no transactions
                    }
                } catch (err) {
                    console.warn('Invalid ObjectId format for user_id:', userId);
                    return res.status(400).json({ error: 'Invalid user ID format' });
                }
            }

            const options = {
                sort: { date: -1 },
                limit: limit ? parseInt(limit) : 100,
            };

            console.log('Transactions query:', JSON.stringify(query));
            const transactions = await transactionsCollection.find(query, options).toArray();
            console.log(`Found ${transactions.length} transactions for query`);

            res.json(transactions);
        } catch (error) {
            console.error('Error fetching transactions from DB:', error);
            res.status(500).json({ error: 'Failed to fetch transactions' });
        }
    });

    return router;
};