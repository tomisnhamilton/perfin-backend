const express = require('express');
const getPlaidTransactions = require('../plaid/transactions');

module.exports = function(plaidClient, db) {
    const router = express.Router();
    router.post('/api/transactions', getPlaidTransactions(plaidClient, db));
    return router; // ✅ MUST return the router!
};
