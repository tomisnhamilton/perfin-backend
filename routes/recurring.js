// routes/recurring.js
const express = require('express');
const getPlaidRecurring = require('../plaid/recurring');

module.exports = function(plaidClient, db) {
    const router = express.Router();
    router.post('/api/recurring', getPlaidRecurring(plaidClient, db));
    return router;
};
