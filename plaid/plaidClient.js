// plaid/plaidClient.js
const { Configuration, PlaidApi, PlaidEnvironments } = require('plaid');
require('dotenv').config(); // load .env vars

const config = new Configuration({
    basePath: PlaidEnvironments[process.env.PLAID_ENV || 'sandbox'],
    baseOptions: {
        headers: {
            'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
            'PLAID-SECRET': process.env.PLAID_SECRET,
        },
    },
});

const plaidClient = new PlaidApi(config);

module.exports = { plaidClient };
