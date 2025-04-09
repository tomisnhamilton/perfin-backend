// server.js
const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');
const { plaidClient } = require('./plaid/plaidClient');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const mongoClient = new MongoClient(process.env.MONGO_URI);


// 🔁 Wait for Mongo before starting the server
mongoClient.connect().then(() => {
    const db = mongoClient.db('perfin-testbox');
    console.log('✅ Connected to MongoDB');

    // Register routes here
    const createLinkTokenRoute = require('./routes/create_link_token');
    const exchangePublicTokenRoute = require('./routes/exchange_public_token')(plaidClient, db);
    const retrieveLatestTokenRoute = require('./routes/retrieve_latest_token')(db);

    app.use('/api/create_link_token', createLinkTokenRoute);
    app.use('/api', exchangePublicTokenRoute);
    app.use('/api', retrieveLatestTokenRoute);

    app.listen(PORT, () => {
        console.log(`🚀 Server running at http://localhost:${PORT}`);
    });
}).catch((err) => {
    console.error('❌ MongoDB connection failed:', err.message);
});
