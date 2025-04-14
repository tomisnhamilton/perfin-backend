module.exports = function(plaidClient, db) {
    return async function(req, res) {
        const accessToken = req.body.access_token || req.query.access_token;

        if (!accessToken) {
            return res.status(400).json({ error: 'Missing access_token' });
        }

        try {
            const now = new Date();
            const startDate = new Date(now);
            startDate.setMonth(now.getMonth() - 3); // Look back 3 months

            const response = await plaidClient.transactionsGet({
                access_token: accessToken,
                start_date: startDate.toISOString().split('T')[0],
                end_date: now.toISOString().split('T')[0],
            });

            const transactions = response.data.transactions;

            await db.collection('transactions').bulkWrite(
                transactions.map(tx => ({
                    updateOne: {
                        filter: { transaction_id: tx.transaction_id },
                        update: { $set: { ...tx, item_id: response.data.item.item_id } },
                        upsert: true,
                    }
                }))
            );

            res.json(response.data);
        } catch (err) {
            console.error('Plaid transactionsGet error:', err.response?.data || err.message);
            res.status(500).json({ error: 'Failed to fetch transactions from Plaid' });
        }
    };
};
