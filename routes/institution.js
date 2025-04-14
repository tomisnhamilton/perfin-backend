// routes/institution.js
const express = require('express');
const getPlaidInstitution = require('../plaid/institution');

module.exports = function(plaidClient, db) {
    const router = express.Router();
    router.post('/api/institution', getPlaidInstitution(plaidClient, db));
    return router;
};
