const express = require('express');
const router = express.Router();

module.exports = (db) => {
    const collection = db.collection('categories');

    // GET /api/db/categories
    router.get('/', async (req, res) => {
        try {
            const userId = req.query.user_id;
            const query = userId ? { user_id: userId } : {};

            const results = await collection.find(query).toArray();
            res.json(results);
        } catch (error) {
            console.error('Error fetching categories:', error);
            res.status(500).json({ error: 'Failed to fetch categories' });
        }
    });

    return router;
};
