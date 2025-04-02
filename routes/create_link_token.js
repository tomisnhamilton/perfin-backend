// routes/create_link_token.js
const express = require('express');
const router = express.Router();

module.exports = (plaidClient) => {
    router.get('/create_link_token', async (req, res) => {
        try {
            const response = await plaidClient.linkTokenCreate({
                user: { client_user_id: 'user-id-123' }, // TODO: dynamically set user ID later
                client_name: 'perfin',
                products: ['transactions'],
                country_codes: ['US'],
                language: 'en',
                redirect_uri: 'perfin://plaid/oauth'
            });

            res.json({ link_token: response.data.link_token });
        } catch (error) {
            console.error('❌ Error creating link token:', error.message);
            res.status(500).json({ error: 'Failed to create link token' });
        }
    });

    return router;
};
