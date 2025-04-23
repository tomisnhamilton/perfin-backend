const express = require('express');
const { ObjectId } = require('mongodb');
const router = express.Router();

module.exports = (db) => {
    const accountsCollection = db.collection('accounts');

    // GET /api/db/accounts
    router.get('/', async (req, res) => {
        try {
            const userId = req.query.user_id || (req.user && req.user.id);

            // Log the user ID for debugging
            console.log('Accounts route - User ID from request:', userId);

            let query = {};

            // Add user filtering if available
            if (userId) {
                try {
                    // Add user_id as ObjectId to query
                    query.user_id = new ObjectId(userId);
                    console.log('Accounts query with user_id:', query);
                } catch (err) {
                    console.warn('Invalid ObjectId format for user_id:', userId);
                    // If user_id is not a valid ObjectId, we'll try string comparison
                    query.user_id = userId;
                }
            }

            const accounts = await accountsCollection.find(query).toArray();
            console.log(`Found ${accounts.length} accounts for query:`, query);

            res.json(accounts);
        } catch (err) {
            console.error('Error fetching accounts:', err);
            res.status(500).json({ error: 'Failed to fetch accounts' });
        }
    });

    return router;
};