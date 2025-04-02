// server.js
const express = require('express');
const cors = require('cors');
const { Configuration, PlaidApi, PlaidEnvironments } = require('plaid');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const mongoClient = new MongoClient(process.env.MONGO_URI);

// Plaid setup
const configuration = new Configuration({
    basePath: PlaidEnvironments.sandbox,
    baseOptions: {
        headers: {
            'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
            'PLAID-SECRET': process.env.PLAID_SECRET,
        },
    },
});
const plaidClient = new PlaidApi(configuration);

// 🔁 Wait for Mongo before starting the server
mongoClient.connect().then(() => {
    const db = mongoClient.db('perfin');
    console.log('✅ Connected to MongoDB');

    // ✅ Register routes here
    const createLinkTokenRoute = require('./routes/create_link_token')(plaidClient);
    const exchangePublicTokenRoute = require('./routes/exchange_public_token')(plaidClient, db);
    const retrieveLatestTokenRoute = require('./routes/retrieve_latest_token')(db);

    app.use('/api', createLinkTokenRoute);
    app.use('/api', exchangePublicTokenRoute);
    app.use('/api', retrieveLatestTokenRoute);

    app.listen(PORT, () => {
        console.log(`🚀 Server running at http://localhost:${PORT}`);
    });
}).catch((err) => {
    console.error('❌ MongoDB connection failed:', err.message);
});
