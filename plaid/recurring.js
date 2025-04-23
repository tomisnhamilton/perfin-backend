// plaid/recurring.js - Fixed version with proper amount handling
const { ObjectId } = require('mongodb');

module.exports = function(plaidClient, db) {
    return async function(req, res) {
        console.log("Recurring transactions endpoint called");

        // Extract access token from request
        const accessToken = req.body.access_token || req.query.access_token;
        const userId = req.body.user_id || req.query.user_id;

        if (!accessToken) {
            console.error('❌ Missing access_token in recurring transactions request');
            return res.status(400).json({ error: 'Missing access_token' });
        }

        try {
            console.log(`Fetching recurring transactions from Plaid for access token: ${accessToken.substring(0, 10)}...`);

            // Call Plaid API to get recurring transactions
            const response = await plaidClient.transactionsRecurringGet({
                access_token: accessToken
            });

            console.log('Plaid recurring transactions response received');

            // Log response structure for debugging
            console.log('Recurring transaction structure sample:',
                response.data.inflow_streams?.[0] ?
                    JSON.stringify(response.data.inflow_streams[0], null, 2) :
                    'No inflow streams',
                response.data.outflow_streams?.[0] ?
                    JSON.stringify(response.data.outflow_streams[0], null, 2) :
                    'No outflow streams'
            );

            // Extract data from response
            const inflow_streams = response.data.inflow_streams || [];
            const outflow_streams = response.data.outflow_streams || [];

            // Make sure we're correctly capturing average amount
            const processed_inflow = inflow_streams.map(stream => {
                // Ensure amount is being properly accessed
                const amount = stream.average_amount || 0;
                console.log(`Inflow stream: ${stream.description}, amount: ${amount}`);
                return {
                    ...stream,
                    average_amount: amount
                };
            });

            const processed_outflow = outflow_streams.map(stream => {
                // Ensure amount is being properly accessed
                const amount = stream.average_amount || 0;
                console.log(`Outflow stream: ${stream.description}, amount: ${amount}`);
                return {
                    ...stream,
                    average_amount: amount
                };
            });

            // Prepare the user ID as ObjectId if provided
            let userIdObj = null;
            if (userId) {
                try {
                    userIdObj = new ObjectId(userId);
                    console.log(`Using user ID: ${userId} for recurring transactions`);
                } catch (err) {
                    console.warn(`Invalid ObjectId format for user_id: ${userId}`);
                }
            }

            // Create or update the recurring transactions document
            const result = await db.collection('recurring').updateOne(
                { access_token: accessToken }, // Find by access token
                {
                    $set: {
                        inflow_streams: processed_inflow,
                        outflow_streams: processed_outflow,
                        item_id: req.body.item_id, // Include if available
                        user_id: userIdObj, // Include if available
                        updated_at: new Date()
                    }
                },
                { upsert: true } // Create if it doesn't exist
            );

            console.log('Recurring transactions saved to database:', {
                matched: result.matchedCount,
                modified: result.modifiedCount,
                upserted: result.upsertedCount,
                inflow_count: processed_inflow.length,
                outflow_count: processed_outflow.length
            });

            // Return the data to the client
            res.json({
                inflow_streams: processed_inflow,
                outflow_streams: processed_outflow,
                count: {
                    inflow: processed_inflow.length,
                    outflow: processed_outflow.length
                }
            });
        } catch (err) {
            // Detailed error logging
            console.error('❌ Plaid recurring transactions error:');
            if (err.response && err.response.data) {
                console.error('Plaid API error:', err.response.data);
            } else {
                console.error('Error details:', err.message || err);
            }

            // Send appropriate error response
            res.status(500).json({
                error: 'Failed to fetch recurring transactions',
                message: err.message || 'Unknown error'
            });
        }
    };
};