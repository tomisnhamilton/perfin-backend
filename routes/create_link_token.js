// routes/create_link_token.js
const express = require('express');
const router = express.Router();
const { plaidClient } = require('../plaid/plaidClient'); // Adjust path if needed

router.get('/', async (req, res) => {
    try {
        const userId = 'demo-user-001'; // Replace with dynamic ID later

        console.log('Creating link token in Web Only mode');

        // Create the config object WITHOUT redirect_uri
        const config = {
            user: { client_user_id: userId },
            client_name: 'Perfin',
            products: ['transactions'],
            country_codes: ['US'],
            language: 'en',
        };

        // Log the config to verify no redirect_uri is included
        console.log('Link token config:', JSON.stringify(config));

        const response = await plaidClient.linkTokenCreate(config);
        console.log('Link token created successfully');

        res.json({ link_token: response.data.link_token });
    } catch (error) {
        console.error('Error creating link token:', error.response?.data || error.message);

        res.status(500).json({
            error: 'Failed to create link token',
            details: error.response?.data || error.message
        });
    }
});

module.exports = router;