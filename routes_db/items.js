const express = require('express');
const { ObjectId } = require('mongodb');
const router = express.Router();

module.exports = (db) => {
    const collection = db.collection('items');
    const users = db.collection('users');

    // GET /api/db/items
    router.get('/', async (req, res) => {
        try {
            const userId = req.query.user_id || req.headers['x-user-id'];
            if (!userId) return res.status(400).json({ error: 'Missing user ID' });

            const results = await collection.find({ user_id: new ObjectId(userId) }).toArray();
            res.json(results);
        } catch (error) {
            console.error('Error fetching items:', error);
            res.status(500).json({ error: 'Failed to fetch items' });
        }
    });

    // POST /api/db/items
    router.post('/', async (req, res) => {
        try {
            const { item_id, access_token, user_id } = req.body;
            if (!item_id || !access_token || !user_id) {
                return res.status(400).json({ error: 'Missing fields' });
            }

            const result = await collection.insertOne({
                item_id,
                access_token,
                user_id: new ObjectId(user_id),
                updatedAt: new Date()
            });

            await users.updateOne(
                { _id: new ObjectId(user_id) },
                { $addToSet: { items: result.insertedId } }
            );

            res.status(201).json({ message: 'Item linked to user', item_id: result.insertedId });
        } catch (error) {
            console.error('Error linking item to user:', error);
            res.status(500).json({ error: 'Failed to create item' });
        }
    });

    return router;
};
