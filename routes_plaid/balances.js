// routes_plaid/balances.js
const express = require('express');
const getPlaidBalances = require('../plaid/balances');

module.exports = function(plaidClient, db) {
    const router = express.Router();
    router.post('/api/balances', getPlaidBalances(plaidClient, db));
    return router;
};
