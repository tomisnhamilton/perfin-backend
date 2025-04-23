// routes_plaid/liabilities.js
const express = require('express');
const getPlaidLiabilities = require('../plaid/liabilities');

module.exports = function(plaidClient, db) {
    const router = express.Router();
    router.post('/', getPlaidLiabilities(plaidClient, db));
    return router;
};
