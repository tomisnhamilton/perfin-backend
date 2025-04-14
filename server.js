// server.js
const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');
const { plaidClient } = require('./plaid/plaidClient');
const transactionsRoute = require("./routes/transactions");
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const mongoClient = new MongoClient(process.env.MONGO_URI);
const plaidLiveDBName = process.env.MONGO_DB_NAME_PLAID || 'perfin-sandbox';



// 🔁 Wait for Mongo before starting the server
mongoClient.connect().then(() => {
    // MongoDB connection
    const db = mongoClient.db(plaidLiveDBName);
    console.log(`✅ Connected to MongoDB (${plaidLiveDBName})`);

    // Serve static files
    const path = require('path');
    app.use(express.static(path.join(__dirname, 'public')));


    // Register routes here
    const createLinkTokenRoute = require('./routes/create_link_token');
    const exchangePublicTokenRoute = require('./routes/exchange_public_token')(plaidClient, db);
    const retrieveLatestTokenRoute = require('./routes/retrieve_latest_token')(db);
    const accountsRoute = require('./routes/accounts')(plaidClient, db);
    const transactionsRoute = require('./routes/transactions')(plaidClient, db);
    const balancesRoute = require('./routes/balances')(plaidClient, db);
    const institutionRoute = require('./routes/institution')(plaidClient, db);
    const liabilitiesRoute = require('./routes/liabilities')(plaidClient, db);
    const recurringRoute = require('./routes/recurring')(plaidClient, db);
    const categoriesRoute = require('./routes/categories')(plaidClient, db);


    app.use('/api/create_link_token', createLinkTokenRoute);
    app.use('/api', exchangePublicTokenRoute);
    app.use('/api', retrieveLatestTokenRoute);
    app.use(accountsRoute);
    app.use(transactionsRoute);
    app.use(balancesRoute);
    app.use(institutionRoute);
    app.use(liabilitiesRoute);
    app.use(recurringRoute);
    app.use(categoriesRoute);

    app.listen(PORT, () => {
        console.log(`🚀 Server running at http://localhost:${PORT}`);
    });

}).catch((err) => {
    console.error('❌ MongoDB connection failed:', err.message);
});
