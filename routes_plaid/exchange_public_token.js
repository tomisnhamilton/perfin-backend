const express = require('express');
const router = express.Router();

module.exports = (plaidClient, db) => {
    router.post('/exchange_public_token', async (req, res) => {
        const { public_token } = req.body;
        console.log('🔁 Received public token:', public_token);

        try {
            const exchangeRes = await plaidClient.itemPublicTokenExchange({ public_token });
            const access_token = exchangeRes.data.access_token;
            const item_id = exchangeRes.data.item_id;

            console.log('✅ Exchanged token:', access_token);
            console.log('🆔 Item ID:', item_id);

            // Save or update token in the DB
            await db.collection('items').updateOne(
                { item_id },
                {
                    $set: {
                        access_token,
                        item_id,
                        updatedAt: new Date()
                    }
                },
                { upsert: true }
            );

            res.json({ success: true });
        } catch (err) {
            console.error('❌ Token exchange failed:', err.response?.data || err.message);
            res.status(500).json({ error: 'Token exchange failed' });
        }
    });

    return router;
};
