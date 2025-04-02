const express = require('express');
const router = express.Router();

module.exports = (plaidClient, db) => {
    router.post('/exchange_public_token', async (req, res) => {
        const { public_token } = req.body;
        console.log('🔁 Received public token:', public_token);

        try {
            const exchangeRes = await plaidClient.itemPublicTokenExchange({ public_token });
            const access_token = exchangeRes.data.access_token;
            console.log('✅ Exchanged token:', access_token);

            if (db) {
                await db.collection('plaid_tokens').insertOne({
                    public_token,
                    access_token,
                    createdAt: new Date(),
                });
                console.log('📦 Stored public_token in DB');
            }

            res.json({ success: true });
        } catch (error) {
            console.error('❌ Exchange failed:', error.message);
            res.status(500).json({ error: 'Exchange failed' });
        }
    });

    return router;
};
