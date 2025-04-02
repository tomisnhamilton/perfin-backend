app.get('/api/transactions', async (req, res) => {
    const results = await db.collection('transactions').find().toArray();
    res.json(results);
});
