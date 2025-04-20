// server.js
const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');
const { plaidClient } = require('./plaid/plaidClient');
const transactionsRoute = require("./routes_plaid/transactions");
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


    // Register routes_plaid here
    const createLinkTokenRoute = require('./routes_plaid/create_link_token');
    const exchangePublicTokenRoute = require('./routes_plaid/exchange_public_token')(plaidClient, db);
    const retrieveLatestTokenRoute = require('./routes_plaid/retrieve_latest_token')(db);
    const accountsRoute = require('./routes_plaid/accounts')(plaidClient, db);
    const transactionsRoute = require('./routes_plaid/transactions')(plaidClient, db);
    const balancesRoute = require('./routes_plaid/balances')(plaidClient, db);
    const institutionRoute = require('./routes_plaid/institution')(plaidClient, db);
    const liabilitiesRoute = require('./routes_plaid/liabilities')(plaidClient, db);
    const recurringRoute = require('./routes_plaid/recurring')(plaidClient, db);
    const categoriesRoute = require('./routes_plaid/categories')(plaidClient, db);

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


    // Register db routes
    const transactionsDbRoutes = require('./routes_db/transactions')(db);
    const groupedDbRoutes = require('./routes_db/category')(db);
    const balancesDbRoutes = require('./routes_db/balances')(db);
    const accountsDbRoutes = require('./routes_db/accounts')(db);
    const institutionsDbRoutes = require('./routes_db/institutions')(db);
    const itemsDbRoutes = require('./routes_db/items')(db);
    const liabilitiesDbRoutes = require('./routes_db/liabilities')(db);
    const recurringDbRoutes = require('./routes_db/recurring')(db);
    const categoriesDbRoutes = require('./routes_db/category')(db);
    const transactionsByCategoryDbRoutes = require('./routes_db/category')(db);

    app.use('/api/db/transactions', transactionsDbRoutes);
    app.use('/api/db/transactions/by-group', groupedDbRoutes);
    app.use('/api/db/transactions/by-category', transactionsByCategoryDbRoutes);
    app.use('/api/db/balances', balancesDbRoutes);
    app.use('/api/db/accounts', accountsDbRoutes);
    app.use('/api/db/institutions', institutionsDbRoutes);
    app.use('/api/db/items', itemsDbRoutes);
    app.use('/api/db/liabilities', liabilitiesDbRoutes);
    app.use('/api/db/recurring', recurringDbRoutes);
    app.use('/api/db/categories', categoriesDbRoutes);


    app.listen(PORT, () => {
        console.log(`🚀 Server running at http://localhost:${PORT}`);
    });

}).catch((err) => {
    console.error('❌ MongoDB connection failed:', err.message);
});
