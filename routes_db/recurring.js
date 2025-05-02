// Modified version of routes_db/recurring.js
const express = require('express');
const { ObjectId } = require('mongodb');
const router = express.Router();

module.exports = (db) => {
    const recurringCollection = db.collection('recurring');
    const itemsCollection = db.collection('items');

    // GET /api/db/recurring
    router.get('/', async (req, res) => {
        try {
            const userId = req.query.user_id || (req.user && req.user.id);

            // Log the user ID for debugging
            console.log('Recurring route - User ID from request:', userId);

            let query = {};

            // If userId is provided, use it to find all items belonging to this user
            if (userId) {
                try {
                    const userIdObj = new ObjectId(userId);

                    // Find all items for this user
                    const userItems = await itemsCollection.find({
                        user_id: userIdObj
                    }).toArray();

                    // Extract the item_ids to filter recurring transactions
                    const itemIds = userItems.map(item => item.item_id);

                    if (itemIds.length > 0) {
                        // Add item_id filter for recurring transactions
                        query.item_id = { $in: itemIds };
                    } else {
                        console.log('No items found for user:', userId);
                        // Return empty structure for no recurring transactions
                        return res.json({
                            inflow_streams: [],
                            outflow_streams: []
                        });
                    }
                } catch (err) {
                    console.warn('Invalid ObjectId format for user_id:', userId);
                    return res.status(400).json({ error: 'Invalid user ID format' });
                }
            }

            // Get all recurring transactions that match the query
            const recurring = await recurringCollection.find(query).toArray();
            console.log(`Found ${recurring.length} recurring records`);

            // If we have results, process them
            if (recurring && recurring.length > 0) {
                // Combine all inflow and outflow streams from all items
                let combinedResult = {
                    inflow_streams: [],
                    outflow_streams: []
                };

                // Merge streams from all items
                recurring.forEach(item => {
                    if (item.inflow_streams && Array.isArray(item.inflow_streams)) {
                        combinedResult.inflow_streams = [
                            ...combinedResult.inflow_streams,
                            ...item.inflow_streams
                        ];
                    }

                    if (item.outflow_streams && Array.isArray(item.outflow_streams)) {
                        combinedResult.outflow_streams = [
                            ...combinedResult.outflow_streams,
                            ...item.outflow_streams
                        ];
                    }
                });

                console.log(`Returning combined recurring data with ${combinedResult.inflow_streams.length} inflows and ${combinedResult.outflow_streams.length} outflows`);

                // Return combined result
                res.json(combinedResult);
            } else {
                // Return empty result if no data found
                console.log('No recurring data found');
                res.json({
                    inflow_streams: [],
                    outflow_streams: []
                });
            }
        } catch (error) {
            console.error('Error fetching recurring transactions:', error);
            res.status(500).json({ error: 'Failed to fetch recurring transactions' });
        }
    });

    return router;
};