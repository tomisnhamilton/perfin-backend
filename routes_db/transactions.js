const express = require('express');
const { ObjectId } = require('mongodb');
const router = express.Router();

module.exports = (db) => {
    const transactionsCollection = db.collection('transactions');

    // GET /api/db/transactions
    router.get('/', async (req, res) => {
        try {
            const { item_id, account_id, startDate, endDate, limit } = req.query;
            const userId = req.query.user_id || (req.user && req.user.id);

            // Log the user ID for debugging
            console.log('Transactions route - User ID from request:', userId);

            const query = {};

            // Add user filtering if available
            if (userId) {
                try {
                    // Add user_id as ObjectId to query
                    query.user_id = new ObjectId(userId);
                    console.log('Transactions query with user_id:', userId);
                } catch (err) {
                    console.warn('Invalid ObjectId format for user_id:', userId);
                    // If user_id is not a valid ObjectId, we'll try string comparison
                    query.user_id = userId;
                }
            }

            // Add other filters
            if (item_id) query.item_id = item_id;
            if (account_id) query.account_id = account_id;
            if (startDate || endDate) {
                query.date = {};
                if (startDate) query.date.$gte = startDate;
                if (endDate) query.date.$lte = endDate;
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