// routes_plaid/exchange_public_token.js
const express = require('express');
const { ObjectId } = require('mongodb');
const router = express.Router();

module.exports = (plaidClient, db) => {
    router.post('/', async (req, res) => {
        const { public_token, user_id } = req.body;
        console.log('🔁 Received public token:', public_token);
        console.log('👤 User ID from request:', user_id);

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

            // Create the item document first
            const itemData = {
                access_token,
                item_id,
                updatedAt: new Date()
            };

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

            // If we have a user_id, associate the item with the user
            if (user_id) {
                // For demo-user-id, create a default user if it doesn't exist
                if (user_id === 'demo-user-id') {
                    console.log('🧪 Using demo user');
                    await db.collection('users').updateOne(
                        { username: 'demo' },
                        {
                            $set: {
                                username: 'demo',
                                email: 'demo@example.com',
                                createdAt: new Date()
                            },
                            $addToSet: { items: insertedItem._id }
                        },
                        { upsert: true }
                    );

                    console.log('✅ Updated demo user with new item');
                } else {
                    // Try to match either a string ID or an ObjectId
                    try {
                        let query;

                        // Check if the user_id is a valid ObjectId
                        if (user_id.match(/^[0-9a-fA-F]{24}$/)) {
                            query = { _id: new ObjectId(user_id) };
                        } else {
                            query = { username: user_id };
                        }

                        console.log('🔄 Updating user document with item reference...');
                        const updateResult = await db.collection('users').updateOne(
                            query,
                            { $addToSet: { items: insertedItem._id } }
                        );

                        console.log('✅ User update result:', updateResult.matchedCount, updateResult.modifiedCount);

                        // If no user was found, let's log that but not fail the request
                        if (updateResult.matchedCount === 0) {
                            console.log('⚠️ No user found with ID:', user_id);
                        }
                    } catch (userErr) {
                        console.error('⚠️ Error updating user document:', userErr.message);
                        // Don't fail the whole request if user update fails
                    }
                }
            }

            res.json({ success: true, item_id, item_db_id: insertedItem._id });
        } catch (err) {
            console.error('❌ Token exchange failed:', err.message, err.stack);
            res.status(500).json({ error: 'Token exchange failed' });
        }
    });

    return router;
};