// routes/retrieve_latest_token.js
const express = require('express');
const router = express.Router();

module.exports = (db) => {
    router.get('/retrieve_latest_token', async (req, res) => {
        try {
            if (!db) {
                console.error('❌ MongoDB not connected');
                return res.status(500).json({ error: 'Database not connected' });
            }

            const latest = await db
                .collection('plaid_tokens')
                .find({})
                .sort({ createdAt: -1 })
                .limit(1)
                .toArray();

            if (latest.length === 0) {
                return res.status(404).json({ error: 'No tokens found' });
            }

            const { public_token } = latest[0];
            console.log('✅ Retrieved latest public token');
            res.json({ public_token });
        } catch (error) {
            console.error('❌ Error retrieving public token:', error.message);
            res.status(500).json({ error: 'Failed to retrieve token' });
        }
    });

    return router;
};
