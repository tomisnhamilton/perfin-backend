module.exports = function(plaidClient, db) {
    return async function(req, res) {
        const accessToken = req.body.access_token || req.query.access_token;

        if (!accessToken) {
            return res.status(400).json({ error: 'Missing access_token' });
        }

        try {
            const response = await plaidClient.transactionsRecurringGet({
                access_token: accessToken // ✅ fixed case
            });

            const { inflow_streams, outflow_streams } = response.data;

            await db.collection('recurring').updateOne(
                { access_token: accessToken },
                {
                    $set: {
                        inflow_streams,
                        outflow_streams,
                        updated_at: new Date()
                    }
                },
                { upsert: true }
            );

            res.json(response.data);
        } catch (err) {
            console.error('Plaid recurringTransactionsGet error:', err.response?.data || err.message || err);
            res.status(500).json({ error: 'Failed to fetch recurring transactions' });
        }
    };
};
