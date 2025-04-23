const express = require('express');
const getPlaidAccounts = require('../plaid/accounts');

module.exports = function(plaidClient, db) {
    const router = express.Router();
    router.post('/', getPlaidAccounts(plaidClient, db));
    return router;
};
