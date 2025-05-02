// routes_db/institutions.js - Updated version
const express = require('express');
const { ObjectId } = require('mongodb');
const router = express.Router();

module.exports = (db) => {
    const institutionsCollection = db.collection('institutions');
    const itemsCollection = db.collection('items');

    // GET /api/db/institutions
    router.get('/', async (req, res) => {
        try {
            const userId = req.query.user_id || (req.user && req.user.id);

            let query = {};

            // If userId is provided, use it to find all items belonging to this user
            if (userId) {
                try {
                    const userIdObj = new ObjectId(userId);

                    // Find all items for this user
                    const userItems = await itemsCollection.find({
                        user_id: userIdObj
                    }).toArray();

                    // Extract the item_ids to filter institutions
                    const itemIds = userItems.map(item => item.item_id);

                    if (itemIds.length > 0) {
                        // Find institutions where at least one of user's items is in the item_ids array
                        query = { item_ids: { $in: itemIds } };
                    } else {
                        console.log('No items found for user:', userId);
                        return res.json([]); // No items, so no institutions
                    }
                } catch (err) {
                    console.warn('Invalid ObjectId format for user_id:', userId);
                    return res.status(400).json({ error: 'Invalid user ID format' });
                }
            }

            const institutions = await institutionsCollection.find(query).toArray();
            console.log(`Found ${institutions.length} institutions for query`);

            res.json(institutions);
        } catch (error) {
            console.error('Error fetching institutions:', error);
            res.status(500).json({ error: 'Failed to fetch institutions' });
        }
    });

    return router;
};