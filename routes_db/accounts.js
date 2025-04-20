const express = require('express');
const router = express.Router();

module.exports = (db) => {
    const accountsCollection = db.collection('accounts');

    // GET /api/db/accounts
    router.get('/', async (req, res) => {
        try {
            const accounts = await accountsCollection.find({}).toArray();
            res.json(accounts);
        } catch (err) {
            console.error('Error fetching accounts:', err);
            res.status(500).json({ error: 'Failed to fetch accounts' });
        }
    });

    return router;
};
