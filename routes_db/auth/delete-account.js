// routes_db/auth/delete-account.js - Updated version
const express = require('express');
const { ObjectId } = require('mongodb');
const router = express.Router();

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
                const jwt = require('jsonwebtoken');
                user = jwt.verify(token, JWT_SECRET);
            } catch (err) {
                return res.status(403).json({ error: 'Invalid or expired token' });
            }

            if (!user || !user.id) {
                return res.status(403).json({ error: 'Invalid user in token' });
            }

            const userId = new ObjectId(user.id);
            console.log(`Processing account deletion for user: ${userId}`);

            // 1. First, get all items (Plaid connections) belonging to this user
            const userItems = await db.collection('items').find({ user_id: userId }).toArray();
            const itemIds = userItems.map(item => item.item_id);

            console.log(`Found ${userItems.length} items to delete for user ${userId}`);

            if (itemIds.length > 0) {
                // 2. Delete all data related to these items
                await Promise.all([
                    db.collection('transactions').deleteMany({ item_id: { $in: itemIds } }),
                    db.collection('accounts').deleteMany({ item_id: { $in: itemIds } }),
                    db.collection('balances').deleteMany({ item_id: { $in: itemIds } }),
                    db.collection('recurring').deleteMany({ item_id: { $in: itemIds } })
                ]);

                console.log(`Deleted all financial data for items: ${itemIds.join(', ')}`);

                // 3. Handle institutions specially - we need to update the itemIds array
                for (const itemId of itemIds) {
                    // Find institutions linked to this item
                    const institutions = await db.collection('institutions').find({
                        $or: [
                            { item_id: itemId },
                            { item_ids: itemId }
                        ]
                    }).toArray();

                    for (const institution of institutions) {
                        if (institution.item_id === itemId) {
                            // If using the old single item_id field
                            await db.collection('institutions').deleteOne({ _id: institution._id });
                            console.log(`Deleted institution ${institution.name} with single item_id: ${itemId}`);
                        } else if (institution.item_ids && institution.item_ids.includes(itemId)) {
                            // If using the new item_ids array
                            if (institution.item_ids.length <= 1) {
                                // If this is the only item, delete the institution
                                await db.collection('institutions').deleteOne({ _id: institution._id });
                                console.log(`Deleted institution ${institution.name} with only item: ${itemId}`);
                            } else {
                                // Otherwise, remove this item from the array
                                await db.collection('institutions').updateOne(
                                    { _id: institution._id },
                                    { $pull: { item_ids: itemId } }
                                );
                                console.log(`Removed item ${itemId} from institution ${institution.name}`);
                            }
                        }
                    }
                }
            }

            // 4. Delete items collection entries
            await db.collection('items').deleteMany({ user_id: userId });

            // 5. Finally, delete the user
            await db.collection('users').deleteOne({ _id: userId });

            console.log(`Successfully deleted user ${userId} and all associated data`);

            res.json({ success: true, message: 'Account and all data successfully deleted' });
        } catch (err) {
            console.error('Error deleting account:', err);
            res.status(500).json({ error: 'Failed to delete account', details: err.message });
        }
    });

    return router;
};