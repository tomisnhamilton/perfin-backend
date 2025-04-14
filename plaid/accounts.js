// plaid/accounts.js
module.exports = function(plaidClient, db) {
    return async function(req, res) {
        const accessToken = req.body.access_token || req.query.access_token;

        if (!accessToken) {
            return res.status(400).json({ error: 'Missing access_token' });
        }

        try {
            const response = await plaidClient.accountsGet({ access_token: accessToken });
            const accounts = response.data.accounts;

            await db.collection('accounts').bulkWrite(
                accounts.map(acct => ({
                    updateOne: {
                        filter: { account_id: acct.account_id },
                        update: { $set: acct },
                        upsert: true,
                    }
                }))
            );

            res.json(response.data);
        } catch (err) {
            console.error('Plaid accountsGet error:', err.response?.data || err.message || err);
            res.status(500).json({ error: 'Failed to fetch accounts from Plaid' });
        }
    };
};
