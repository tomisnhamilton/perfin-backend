// plaid/balances.js - Fixed version with better error handling
const { ObjectId } = require('mongodb');

module.exports = function(plaidClient, db) {
    return async function(req, res) {
        console.log("Balance endpoint called");

        // Extract access token from request
        const accessToken = req.body.access_token || req.query.access_token;
        const userId = req.body.user_id || req.query.user_id;

        if (!accessToken) {
            console.error('❌ Missing access_token in balances request');
            return res.status(400).json({ error: 'Missing access_token' });
        }

        try {
            console.log(`Fetching balances from Plaid for access token: ${accessToken.substring(0, 10)}...`);

            // Call Plaid API to get balances
            const response = await plaidClient.accountsBalanceGet({
                access_token: accessToken
            });

            console.log('Plaid balances response received');

            // Extract accounts with balance information
            const accounts = response.data.accounts;

            // Prepare the user ID as ObjectId if provided
            let userIdObj = null;
            if (userId) {
                try {
                    userIdObj = new ObjectId(userId);
                    console.log(`Using user ID: ${userId} for balances`);
                } catch (err) {
                    console.warn(`Invalid ObjectId format for user_id: ${userId}`);
                }
            }

            // Create a timestamp for this balance snapshot
            const timestamp = new Date();

            // Create bulk write operations for each account
            if (accounts && accounts.length > 0) {
                const bulkOps = accounts.map(account => ({
                    updateOne: {
                        filter: { account_id: account.account_id },
                        update: {
                            $set: {
                                ...account,
                                user_id: userIdObj,
                                item_id: response.data.item.item_id,
                                updated_at: timestamp
                            }
                        },
                        upsert: true
                    }
                }));

                // Execute bulk write
                const result = await db.collection('balances').bulkWrite(bulkOps);

                console.log('Account balances saved to database:', {
                    matched: result.matchedCount,
                    modified: result.modifiedCount,
                    upserted: result.upsertedCount
                });

                // Also store historical balance data
                const historyOps = accounts.map(account => ({
                    insertOne: {
                        document: {
                            account_id: account.account_id,
                            balances: account.balances,
                            date: timestamp.toISOString().split('T')[0],
                            timestamp: timestamp,
                            user_id: userIdObj,
                            item_id: response.data.item.item_id
                        }
                    }
                }));

                await db.collection('balance_history').bulkWrite(historyOps);
                console.log(`Added ${accounts.length} entries to balance history`);
            }

            // Return the data to the client
            res.json({
                accounts: accounts || [],
                item: response.data.item,
                request_id: response.data.request_id
            });
        } catch (err) {
            // Detailed error logging
            console.error('❌ Plaid balances error:');
            if (err.response && err.response.data) {
                console.error('Plaid API error:', err.response.data);
            } else {
                console.error('Error details:', err.message || err);
            }

            // Send appropriate error response
            res.status(500).json({
                error: 'Failed to fetch balances from Plaid',
                message: err.message || 'Unknown error'
            });
        }
    };
};