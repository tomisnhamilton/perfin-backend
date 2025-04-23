// routes_plaid/institution.js
const express = require('express');
const getPlaidInstitution = require('../plaid/institution');

module.exports = function(plaidClient, db) {
    const router = express.Router();
    router.post('/', getPlaidInstitution(plaidClient, db));
    return router;
};
