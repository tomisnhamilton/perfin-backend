// routes_db/recurring.js - Updated route
const express = require('express');
const { ObjectId } = require('mongodb');
const router = express.Router();

module.exports = (db) => {
    // GET /api/db/recurring
    router.get('/', async (req, res) => {
        try {
            const userId = req.query.user_id || (req.user && req.user.id);

            // Log the user ID for debugging
            console.log('Recurring route - User ID from request:', userId);

            let query = {};

            // Add user filtering if available
            if (userId) {
                try {
                    // Add user_id as ObjectId to query
                    query.user_id = new ObjectId(userId);
                    console.log('Recurring query with user_id:', query);
                } catch (err) {
                    console.warn('Invalid ObjectId format for user_id:', userId);
                    // If user_id is not a valid ObjectId, try string comparison
                    query.user_id = userId;
                }
            }

            // Get all recurring transactions for this user
            const recurring = await db.collection('recurring').find(query).toArray();
            console.log(`Found ${recurring.length} recurring records for user`);

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