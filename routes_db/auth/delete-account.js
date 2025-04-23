// routes_db/auth/delete-account.js
const express = require('express');
const { ObjectId } = require('mongodb');
const router = express.Router();
const jwt = require('jsonwebtoken');

module.exports = (db, JWT_SECRET) => {
    router.post('/', async (req, res) => {
        try {
            // Verify the user is authenticated
            const authHeader = req.headers['authorization'];
            const token = authHeader && authHeader.split(' ')[1];

            if (!token) {
                return res.status(401).json({ error: 'Authentication required' });
            }

            // Verify token
            let user;
            try {
                user = jwt.verify(token, JWT_SECRET);
            } catch (err) {
                return res.status(403).json({ error: 'Invalid or expired token' });
            }

            if (!user || !user.id) {
                return res.status(403).json({ error: 'Invalid user in token' });
            }

            const userId = new ObjectId(user.id);

            // Optional: Require password confirmation for extra security
            if (req.body.requirePassword) {
                const { password } = req.body;
                if (!password) {
                    return res.status(400).json({ error: 'Password confirmation required' });
                }

                // Verify password
                const userRecord = await db.collection('users').findOne({ _id: userId });
                if (!userRecord) {
                    return res.status(404).json({ error: 'User not found' });
                }

                const bcrypt = require('bcrypt');
                const isMatch = await bcrypt.compare(password, userRecord.password);
                if (!isMatch) {
                    return res.status(401).json({ error: 'Incorrect password' });
                }
            }

            console.log(`Processing account deletion for user: ${userId}`);

            // 1. Get user items (Plaid connections)
            const userItems = await db.collection('items').find({ user_id: userId }).toArray();
            const itemIds = userItems.map(item => item.item_id);

            console.log(`Found ${userItems.length} items to delete for user ${userId}`);

            // 2. Delete all user financial data
            const operations = [
                // Delete financial data
                db.collection('transactions').deleteMany({ user_id: userId }),
                db.collection('accounts').deleteMany({ user_id: userId }),
                db.collection('items').deleteMany({ user_id: userId }),
                db.collection('balances').deleteMany({ user_id: userId }),
                db.collection('recurring').deleteMany({ user_id: userId }),
                db.collection('institutions').deleteMany({ user_id: userId }),
                // Finally, delete the user
                db.collection('users').deleteOne({ _id: userId })
            ];

            // Execute all delete operations
            await Promise.all(operations);

            console.log(`Successfully deleted user ${userId} and all associated data`);

            res.json({ success: true, message: 'Account and all data successfully deleted' });
        } catch (err) {
            console.error('Error deleting account:', err);
            res.status(500).json({ error: 'Failed to delete account', details: err.message });
        }
    });

    return router;
};