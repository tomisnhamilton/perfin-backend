// routes_plaid/exchange_public_token.js - Corrected version
const express = require('express');
const { ObjectId } = require('mongodb');

module.exports = function(plaidClient, db) {
    const router = express.Router();

    router.post('/', async (req, res) => {
        const { public_token } = req.body;
        console.log('🔁 Received public token:', public_token);

        // Get user ID from authenticated user or from request body
        let userId = null;

        if (req.user) {
            // Use authenticated user's ID if available
            userId = req.user.id;
            console.log('🔐 Using authenticated user ID:', userId);
        } else if (req.body.user_id) {
            // Fallback to request body user ID
            userId = req.body.user_id;
            console.log('📝 Using request body user ID:', userId);
        }

        console.log('👤 User ID for item association:', userId);

        if (!public_token) {
            console.error('❌ Missing public_token in request');
            return res.status(400).json({ error: 'Missing public_token in request' });
        }

        try {
            // Exchange the public token for an access token
            console.log('📤 Exchanging public_token with Plaid API...');
            const exchangeResponse = await plaidClient.itemPublicTokenExchange({
                public_token
            });

            console.log('📥 Exchange response received from Plaid');

            const access_token = exchangeResponse.data.access_token;
            const item_id = exchangeResponse.data.item_id;

            console.log('✅ Exchanged token:', access_token);
            console.log('🆔 Item ID:', item_id);

            // Create the item document
            const itemData = {
                access_token,
                item_id,
                updatedAt: new Date()
            };

            // If we have a user ID, associate the item with that user
            if (userId && userId !== 'demo-user-id') {
                try {
                    // Add user_id to itemData
                    itemData.user_id = new ObjectId(userId);
                } catch (err) {
                    console.warn('⚠️ Invalid ObjectId format for user_id:', userId);
                    // We'll continue without the user_id in this case
                }
            }

            console.log('💾 Saving item to database...');
            const result = await db.collection('items').updateOne(
                { item_id },
                { $set: itemData },
                { upsert: true }
            );

            console.log('💾 Item saved successfully:', result.acknowledged);

            // Get the item's ObjectId
            const insertedItem = await db.collection('items').findOne({ item_id });

            if (!insertedItem) {
                console.error('❌ Could not find the inserted item');
                return res.status(500).json({ error: 'Item creation failed' });
            }

            // Associate the item with the user in the users collection
            if (userId) {
                try {
                    let userIdObj;

                    // Check if the user_id is a valid ObjectId
                    if (userId.match(/^[0-9a-fA-F]{24}$/)) {
                        userIdObj = new ObjectId(userId);
                    } else {
                        // If it's not a valid ObjectId, try to find by username
                        const userByName = await db.collection('users').findOne({ username: userId });
                        if (userByName) {
                            userIdObj = userByName._id;
                        } else {
                            console.log('⚠️ Could not find user with username:', userId);
                            userIdObj = new ObjectId(userId);
                        }
                    }

                    console.log('🔄 Updating user document with item reference...');
                    const updateResult = await db.collection('users').updateOne(
                        { _id: userIdObj },
                        { $addToSet: { items: insertedItem._id } }
                    );

                    console.log('✅ User update result:', updateResult.matchedCount, updateResult.modifiedCount);
                } catch (userErr) {
                    console.error('⚠️ Error updating user document:', userErr.message);
                }
            }

            // Initialize Plaid data fetching immediately
            try {
                console.log('🔄 Fetching initial data from Plaid...');

                // 1. Fetch accounts and balances
                const accountsResponse = await plaidClient.accountsGet({ access_token });
                const accounts = accountsResponse.data.accounts;

                // Save accounts to database - ONLY link to item_id, not user_id
                if (accounts && accounts.length > 0) {
                    await db.collection('accounts').bulkWrite(
                        accounts.map(acct => ({
                            updateOne: {
                                filter: { account_id: acct.account_id },
                                update: {
                                    $set: {
                                        ...acct,
                                        item_id: item_id,
                                        updated_at: new Date()
                                    }
                                },
                                upsert: true,
                            }
                        }))
                    );

                    console.log(`✅ Saved ${accounts.length} accounts to database`);
                }

                // 2. Fetch transactions
                const now = new Date();
                const startDate = new Date(now);
                startDate.setMonth(now.getMonth() - 3); // 3 months of transaction history

                const transactionsResponse = await plaidClient.transactionsGet({
                    access_token,
                    start_date: startDate.toISOString().split('T')[0],
                    end_date: now.toISOString().split('T')[0],
                });

                const transactions = transactionsResponse.data.transactions;

                // Save transactions to database - ONLY link to item_id, not user_id
                if (transactions && transactions.length > 0) {
                    await db.collection('transactions').bulkWrite(
                        transactions.map(tx => ({
                            updateOne: {
                                filter: { transaction_id: tx.transaction_id },
                                update: {
                                    $set: {
                                        ...tx,
                                        item_id: item_id,
                                        updated_at: new Date()
                                    }
                                },
                                upsert: true,
                            }
                        }))
                    );

                    console.log(`✅ Saved ${transactions.length} transactions to database`);
                }

                // 3. Get institution details
                try {
                    const itemResponse = await plaidClient.itemGet({ access_token });
                    const institutionId = itemResponse.data.item.institution_id;

                    if (institutionId) {
                        const institutionResponse = await plaidClient.institutionsGetById({
                            institution_id: institutionId,
                            country_codes: ['US']
                        });

                        const institution = institutionResponse.data.institution;

                        // Check if this institution already exists
                        const existingInstitution = await db.collection('institutions').findOne({
                            institution_id: institution.institution_id
                        });

                        if (existingInstitution) {
                            // Update existing institution to add this item_id to the array
                            await db.collection('institutions').updateOne(
                                { institution_id: institution.institution_id },
                                {
                                    $set: {
                                        ...institution,
                                        updated_at: new Date()
                                    },
                                    $addToSet: { item_ids: item_id }
                                }
                            );
                            console.log(`Added item ${item_id} to existing institution ${institution.name}`);
                        } else {
                            // Create new institution with item_ids array
                            await db.collection('institutions').insertOne({
                                ...institution,
                                item_ids: [item_id],
                                updated_at: new Date()
                            });
                            console.log(`Created new institution ${institution.name} with item ${item_id}`);
                        }
                    }
                } catch (instErr) {
                    console.error('Failed to fetch institution details:', instErr.message);
                }
            } catch (dataErr) {
                console.error('Error fetching initial Plaid data:', dataErr.message);
            }

            res.json({
                success: true,
                item_id,
                item_db_id: insertedItem._id,
                user_id: userId
            });
        } catch (err) {
            console.error('❌ Token exchange failed:', err.message, err.stack);
            res.status(500).json({ error: 'Token exchange failed' });
        }
    });

    return router;
};