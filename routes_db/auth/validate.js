// routes_db/auth/validate.js
const express = require('express');
const { ObjectId } = require('mongodb');

module.exports = (db) => {
    const router = express.Router();

    router.get('/:id', async (req, res) => {
        try {
            const user = await db.collection('users').findOne({ _id: new ObjectId(req.params.id) });
            res.json({ valid: !!user });
        } catch (err) {
            console.error('Validation error:', err);
            res.status(500).json({ error: 'Validation check failed' });
        }
    });

    return router;
};
