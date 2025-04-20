// routes_plaid/categories.js
const express = require('express');
const getPlaidCategories = require('../plaid/categories');

module.exports = function(plaidClient, db) {
    const router = express.Router();
    router.post('/api/categories', getPlaidCategories(plaidClient, db));
    return router;
};
