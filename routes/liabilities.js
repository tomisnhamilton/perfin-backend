// routes/liabilities.js
const express = require('express');
const getPlaidLiabilities = require('../plaid/liabilities');

module.exports = function(plaidClient, db) {
    const router = express.Router();
    router.post('/api/liabilities', getPlaidLiabilities(plaidClient, db));
    return router;
};
