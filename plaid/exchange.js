// plaid/exchange.js
const plaidClient = require('./plaidClient');

module.exports = (db) => async (req, res) => {
    const { public_token } = req.body;

    try {
        const { data } = await plaidClient.itemPublicTokenExchange({ public_token });
        const access_token = data.access_token;

        const tx = await plaidClient.transactionsGet({
            access_token,
            start_date: '2023-01-01',
            end_date: '2023-12-31',
        });

        await db.collection('transactions').insertMany(tx.data.transactions);
        res.json({ success: true, access_token });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Token exchange failed' });
    }
};
