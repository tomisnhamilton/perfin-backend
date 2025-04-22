const express = require('express');
const { ObjectId } = require('mongodb');
const router = express.Router();

module.exports = (plaidClient, db) => {
    router.post('/exchange_public_token', async (req, res) => {
        const { public_token, user_id } = req.body;
        console.log('🔁 Received public token:', public_token);

        if (!user_id) {
            return res.status(400).json({ error: 'Missing user_id in request' });
        }

        try {
            const exchangeRes = await plaidClient.itemPublicTokenExchange({ public_token });
            const access_token = exchangeRes.data.access_token;
            const item_id = exchangeRes.data.item_id;

            console.log('✅ Exchanged token:', access_token);
            console.log('🆔 Item ID:', item_id);

            // Save or update the item in the DB
            const result = await db.collection('items').updateOne(
                { item_id },
                {
                    $set: {
                        access_token,
                        item_id,
                        user_id: new ObjectId(user_id),
                        updatedAt: new Date()
                    }
                },
                { upsert: true }
            );

            // Get _id of item (if newly inserted)
            const insertedItem = await db.collection('items').findOne({ item_id });

            // Update the user document to include this item
            await db.collection('users').updateOne(
                { _id: new ObjectId(user_id) },
                { $addToSet: { items: insertedItem._id } }
            );

            res.json({ success: true, item_id });
        } catch (err) {
            console.error('❌ Token exchange failed:', err.response?.data || err.message);
            res.status(500).json({ error: 'Token exchange failed' });
        }
    });

    return router;
};
