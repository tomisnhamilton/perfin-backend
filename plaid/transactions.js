// plaid/transactions.js
module.exports = (db) => async (req, res) => {
    const tx = await db.collection('transactions').find().toArray();
    res.json(tx);
};
