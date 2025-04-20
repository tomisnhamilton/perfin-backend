const express = require('express');
const router = express.Router();
const { plaidClient } = require('../plaid/plaidClient');


const redirect_uri =
    process.env.NODE_ENV === 'production'
        ? process.env.PLAID_REDIRECT_URI_PROD
        : process.env.PLAID_REDIRECT_URI_DEV;

router.post('/', async (req, res) => {
    try {
        const response = await plaidClient.linkTokenCreate({
            user: {
                client_user_id: req.body.userId || 'demo-user-id',
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
