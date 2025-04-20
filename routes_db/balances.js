const express = require('express');
const router = express.Router();

module.exports = (db) => {
    const collection = db.collection('balances');

    // GET /api/db/balances
    router.get('/', async (req, res) => {
        try {
            const userId = req.query.user_id;
            const query = userId ? { user_id: userId } : {};

            const results = await collection.find(query).toArray();
            res.json(results);
        } catch (error) {
            console.error('Error fetching balances:', error);
            res.status(500).json({ error: 'Failed to fetch balances' });
        }
    });

    return router;
};
