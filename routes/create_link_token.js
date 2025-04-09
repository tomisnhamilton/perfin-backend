// routes/create_link_token.js
const express = require('express');
const router = express.Router();
const { plaidClient } = require('../plaid/plaidClient'); // Adjust path if needed

router.get('/', async (req, res) => {
    try {
        const userId = 'demo-user-001'; // Replace with dynamic ID later

        const response = await plaidClient.linkTokenCreate({
            user: { client_user_id: userId },
            client_name: 'Perfin',
            products: ['transactions'],
            country_codes: ['US'],
            language: 'en',
            redirect_uri: process.env.PLAID_REDIRECT_URI || undefined
        });

        res.json({ link_token: response.data.link_token });
    } catch (error) {
        console.error('Error creating link token:', error);
        res.status(500).json({ error: 'Failed to create link token' });
    }
});

module.exports = router;
