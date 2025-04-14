// plaid/institution.js
module.exports = function(plaidClient, db) {
    return async function(req, res) {
        const accessToken = req.body.access_token || req.query.access_token;

        if (!accessToken) {
            return res.status(400).json({ error: 'Missing access_token' });
        }

        try {
            // Step 1: Get item info to extract institution_id
            const itemResponse = await plaidClient.itemGet({ access_token: accessToken });
            const institutionId = itemResponse.data.item.institution_id;

            if (!institutionId) {
                return res.status(404).json({ error: 'No institution_id found for item.' });
            }

            // Step 2: Get institution details
            const institutionResponse = await plaidClient.institutionsGetById({
                institution_id: institutionId,
                country_codes: ['US']
            });

            const institution = institutionResponse.data.institution;

            // Save to MongoDB
            await db.collection('institutions').updateOne(
                { institution_id: institution.institution_id },
                { $set: institution },
                { upsert: true }
            );

            res.json(institution);
        } catch (err) {
            console.error('Plaid institution fetch error:', err.response?.data || err.message || err);
            res.status(500).json({ error: 'Failed to fetch institution from Plaid' });
        }
    };
};
