// plaid/balances.js
module.exports = function(plaidClient, db) {
    return async function(req, res) {
        const accessToken = req.body.access_token || req.query.access_token;

        if (!accessToken) {
            return res.status(400).json({ error: 'Missing access_token' });
        }

        try {
            const response = await plaidClient.accountsBalanceGet({ access_token: accessToken });
            const accounts = response.data.accounts;

            await db.collection('balances').bulkWrite(
                accounts.map(account => ({
                    updateOne: {
                        filter: { account_id: account.account_id },
                        update: { $set: { ...account } },
                        upsert: true
                    }
                }))
            );

            res.json(response.data);
        } catch (err) {
            console.error('Plaid balancesGet error:', err.response?.data || err.message || err);
            res.status(500).json({ error: 'Failed to fetch balances from Plaid' });
        }
    };
};
