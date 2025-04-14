// plaid/liabilities.js
module.exports = function(plaidClient, db) {
    return async function(req, res) {
        const accessToken = req.body.access_token || req.query.access_token;

        if (!accessToken) {
            return res.status(400).json({ error: 'Missing access_token' });
        }

        try {
            const response = await plaidClient.liabilitiesGet({ access_token: accessToken });
            const { liabilities, accounts } = response.data;

            // Store all liabilities in one collection by type
            await db.collection('liabilities').updateOne(
                { item_id: response.data.item.item_id },
                {
                    $set: {
                        accounts,
                        credit: liabilities.credit || [],
                        student: liabilities.student || [],
                        mortgage: liabilities.mortgage || [],
                    }
                },
                { upsert: true }
            );

            res.json(response.data);
        } catch (err) {
            console.error('Plaid liabilitiesGet error:', err.response?.data || err.message || err);
            res.status(500).json({ error: 'Failed to fetch liabilities from Plaid' });
        }
    };
};
