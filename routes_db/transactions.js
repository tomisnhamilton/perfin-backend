const express = require('express');
const router = express.Router();

module.exports = (db) => {
    const transactionsCollection = db.collection('transactions');

    // GET /api/db/transactions
    router.get('/', async (req, res) => {
        try {
            const { item_id, account_id, startDate, endDate, limit } = req.query;

            const query = {};
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

            const transactions = await transactionsCollection.find(query, options).toArray();
            res.json(transactions);
        } catch (error) {
            console.error('Error fetching transactions from DB:', error);
            res.status(500).json({ error: 'Failed to fetch transactions' });
        }
    });

    return router;
};
