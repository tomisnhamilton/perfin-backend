// plaid/webhookSim.js
const plaidClient = require('./plaidClient');

module.exports = async (req, res) => {
    const { access_token } = req.body;

    try {
        await plaidClient.sandboxItemFireWebhook({
            access_token,
            webhook_type: 'TRANSACTIONS',
            webhook_code: 'DEFAULT_UPDATE',
        });
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to simulate webhook' });
    }
};
