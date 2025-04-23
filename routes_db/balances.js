// routes_db/balances.js - Fixed version
const express = require('express');
const { ObjectId } = require('mongodb');
const router = express.Router();

module.exports = (db) => {
    const balancesCollection = db.collection('balances');
    const historyCollection = db.collection('balance_history');

    // GET /api/db/balances
    router.get('/', async (req, res) => {
        try {
            const userId = req.query.user_id;
            console.log('DB balances route - User ID from request:', userId);

            let query = {};

            // Add user filtering if available
            if (userId) {
                try {
                    // Add user_id as ObjectId to query
                    query.user_id = new ObjectId(userId);
                    console.log('Balances query with user_id:', query);
                } catch (err) {
                    console.warn('Invalid ObjectId format for user_id:', userId);
                    // If user_id is not a valid ObjectId, we'll try string comparison
                    query.user_id = userId;
                }
            }

            // Try to get historical data first
            const historyResults = await historyCollection
                .find(query)
                .sort({ timestamp: -1 })
                .limit(30) // Get last 30 entries
                .toArray();

            if (historyResults && historyResults.length > 0) {
                console.log(`Found ${historyResults.length} balance history entries`);
                return res.json(historyResults);
            }

            // Fall back to current balances if no history
            const currentBalances = await balancesCollection.find(query).toArray();

            if (currentBalances && currentBalances.length > 0) {
                console.log(`Found ${currentBalances.length} current balance entries`);

                // Transform current balances to match history format
                const formattedBalances = currentBalances.map(balance => ({
                    account_id: balance.account_id,
                    balances: balance.balances,
                    date: balance.updated_at ? new Date(balance.updated_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                    timestamp: balance.updated_at || new Date(),
                    user_id: balance.user_id,
                    item_id: balance.item_id
                }));

                return res.json(formattedBalances);
            }

            // No data found
            console.log('No balance data found for query');
            res.json([]);
        } catch (error) {
            console.error('Error fetching balances from DB:', error);
            res.status(500).json({ error: 'Failed to fetch balances' });
        }
    });

    return router;
};