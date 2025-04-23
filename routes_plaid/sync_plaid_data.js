// routes_plaid/sync_plaid_data.js
const express = require('express');
const { ObjectId } = require('mongodb');
const router = express.Router();

module.exports = (plaidClient, db) => {
    router.post('/', async (req, res) => {
        // Get user ID from authenticated user or request body
        let userId = null;

        if (req.user) {
            userId = req.user.id;
        } else if (req.body.user_id) {
            userId = req.body.user_id;
        }

        if (!userId) {
            return res.status(400).json({ error: 'User ID is required for data sync' });
        }

        console.log(`🔄 Starting Plaid data sync for user: ${userId}`);

        try {
            // Convert userId to ObjectId
            let userIdObj;
            try {
                userIdObj = new ObjectId(userId);
            } catch (err) {
                return res.status(400).json({ error: 'Invalid user ID format' });
            }

            // Find all items (access tokens) for this user
            const items = await db.collection('items').find({ user_id: userIdObj }).toArray();

            if (items.length === 0) {
                return res.status(404).json({
                    error: 'No linked accounts found for this user',
                    message: 'User needs to connect a bank account first'
                });
            }

            console.log(`Found ${items.length} linked items for user ${userId}`);

            // Track sync results
            const results = {
                success: true,
                items: [],
                accounts: 0,
                transactions: 0,
                errors: []
            };

            // Process each item (bank connection)
            for (const item of items) {
                const itemResult = {
                    item_id: item.item_id,
                    accounts: 0,
                    transactions: 0,
                    success: false
                };

                try {
                    // 1. Fetch accounts and balances
                    console.log(`Fetching accounts for item: ${item.item_id}`);
                    const accountsResponse = await plaidClient.accountsGet({
                        access_token: item.access_token
                    });

                    const accounts = accountsResponse.data.accounts;

                    // Save accounts to database
                    if (accounts && accounts.length > 0) {
                        await db.collection('accounts').bulkWrite(
                            accounts.map(acct => ({
                                updateOne: {
                                    filter: { account_id: acct.account_id },
                                    update: {
                                        $set: {
                                            ...acct,
                                            item_id: item.item_id,
                                            user_id: userIdObj,
                                            updated_at: new Date()
                                        }
                                    },
                                    upsert: true,
                                }
                            }))
                        );

                        itemResult.accounts = accounts.length;
                        results.accounts += accounts.length;
                        console.log(`✅ Saved ${accounts.length} accounts for item ${item.item_id}`);
                    }

                    // 2. Fetch transactions
                    console.log(`Fetching transactions for item: ${item.item_id}`);
                    const now = new Date();
                    const startDate = new Date(now);
                    startDate.setMonth(now.getMonth() - 3); // 3 months of transaction history

                    const transactionsResponse = await plaidClient.transactionsGet({
                        access_token: item.access_token,
                        start_date: startDate.toISOString().split('T')[0],
                        end_date: now.toISOString().split('T')[0],
                    });

                    const transactions = transactionsResponse.data.transactions;

                    // Save transactions to database
                    if (transactions && transactions.length > 0) {
                        await db.collection('transactions').bulkWrite(
                            transactions.map(tx => ({
                                updateOne: {
                                    filter: { transaction_id: tx.transaction_id },
                                    update: {
                                        $set: {
                                            ...tx,
                                            item_id: item.item_id,
                                            user_id: userIdObj,
                                            updated_at: new Date()
                                        }
                                    },
                                    upsert: true,
                                }
                            }))
                        );

                        itemResult.transactions = transactions.length;
                        results.transactions += transactions.length;
                        console.log(`✅ Saved ${transactions.length} transactions for item ${item.item_id}`);
                    }

                    // 3. Get institution details
                    try {
                        const itemResponse = await plaidClient.itemGet({
                            access_token: item.access_token
                        });

                        const institutionId = itemResponse.data.item.institution_id;

                        if (institutionId) {
                            const institutionResponse = await plaidClient.institutionsGetById({
                                institution_id: institutionId,
                                country_codes: ['US']
                            });

                            const institution = institutionResponse.data.institution;

                            // Save institution to database
                            await db.collection('institutions').updateOne(
                                { institution_id: institution.institution_id },
                                {
                                    $set: {
                                        ...institution,
                                        user_id: userIdObj,
                                        updated_at: new Date()
                                    }
                                },
                                { upsert: true }
                            );

                            console.log(`✅ Saved institution ${institution.name} to database`);
                        }
                    } catch (instErr) {
                        console.error(`Failed to fetch institution details for item ${item.item_id}:`, instErr.message);
                        // Don't fail the whole request if institution fetch fails
                    }

                    itemResult.success = true;
                } catch (itemErr) {
                    console.error(`Error syncing item ${item.item_id}:`, itemErr.message);
                    itemResult.success = false;
                    itemResult.error = itemErr.message;
                    results.errors.push({
                        item_id: item.item_id,
                        error: itemErr.message
                    });
                }

                results.items.push(itemResult);
            }

            // Update last sync timestamp for user
            await db.collection('users').updateOne(
                { _id: userIdObj },
                {
                    $set: {
                        last_plaid_sync: new Date()
                    }
                }
            );

            // Set overall success status
            results.success = results.errors.length === 0;

            console.log(`Plaid sync completed for user ${userId}`);
            res.json(results);
        } catch (err) {
            console.error(`Error in Plaid sync for user ${userId}:`, err.message);
            res.status(500).json({
                error: 'Failed to sync Plaid data',
                message: err.message
            });
        }
    });

    return router;
};