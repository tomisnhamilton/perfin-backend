// routes_plaid/recurring.js
const express = require('express');
const getPlaidRecurring = require('../plaid/recurring');

module.exports = function(plaidClient, db) {
    const router = express.Router();
    router.post('/', getPlaidRecurring(plaidClient, db));
    return router;
};
