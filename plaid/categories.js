// plaid/categories.js
module.exports = function(plaidClient, db) {
    return async function(req, res) {
        try {
            const response = await plaidClient.categoriesGet({});

            await db.collection('categories').deleteMany({});
            await db.collection('categories').insertMany(response.data.categories);

            res.json({ count: response.data.categories.length });
        } catch (err) {
            console.error('Plaid categoriesGet error:', err.response?.data || err.message || err);
            res.status(500).json({ error: 'Failed to fetch categories from Plaid' });
        }
    };
};
