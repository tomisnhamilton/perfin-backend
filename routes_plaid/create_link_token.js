// routes_plaid/create_link_token.js
const express = require('express');
const router = express.Router();
const { plaidClient } = require('../plaid/plaidClient');

const redirect_uri =
    process.env.NODE_ENV === 'production'
        ? process.env.PLAID_REDIRECT_URI_PROD
        : process.env.PLAID_REDIRECT_URI_DEV;

router.post('/', async (req, res) => {
    try {
        // Get user ID from authenticated user or from request body
        let clientUserId = 'demo-user-id';

        if (req.user) {
            // Use authenticated user's ID if available
            clientUserId = req.user.id;
            console.log('🔐 Using authenticated user ID for Plaid:', clientUserId);
        } else if (req.body.userId) {
            // Fallback to request body user ID
            clientUserId = req.body.userId;
            console.log('📝 Using request body user ID for Plaid:', clientUserId);
        }

        console.log('Creating link token for user:', clientUserId);

        const response = await plaidClient.linkTokenCreate({
            user: {
                client_user_id: clientUserId,
            },
            client_name: 'Perfin App',
            products: ['transactions', 'auth', 'liabilities'],
            country_codes: ['US'],
            language: 'en',
            redirect_uri,
        });

        res.json({ link_token: response.data.link_token });
    } catch (err) {
        console.error('Error creating link token:', err);
        res.status(500).send('Failed to create link token');
    }
});

module.exports = router;