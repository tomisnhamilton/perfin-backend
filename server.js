// server.js
const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');
const { plaidClient } = require('./plaid/plaidClient');
const jwt = require('jsonwebtoken'); // Add this
const transactionsRoute = require("./routes_plaid/transactions");
const authRegister = require("./routes_db/auth/register");
const authLogin = require("./routes_db/auth/login");
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'; // Add this

app.use(cors());
app.use(express.json());

// Add authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return next(); // Allow requests without token, but user won't be authenticated

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return next(); // Allow the request to continue, but user won't be authenticated
        req.user = user;
        next();
    });
};

// Use the middleware
app.use(authenticateToken);

const mongoClient = new MongoClient(process.env.MONGO_URI);
const plaidLiveDBName = process.env.MONGO_DB_NAME_PLAID || 'perfin-sandbox';
const mongoose = require('mongoose');
const deleteAccountRoute = require("./routes_db/auth/delete-account");

// 🔁 Wait for Mongo before starting the server
mongoClient.connect().then(() => {
    // MongoDB connection
    const db = mongoClient.db(plaidLiveDBName);
    console.log(`Connected to MongoDB (${plaidLiveDBName})`);

    mongoose.connect(process.env.MONGO_URI, {
        dbName: plaidLiveDBName
    }).then(() => {
        console.log("Mongoose using DB:", mongoose.connection.name);
    }).catch((err) => {
        console.error("❌ Mongoose connection failed:", err.message);
    });

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
    const syncPlaidDataRoute = require('./routes_plaid/sync_plaid_data');


    app.use('/api/create_link_token', createLinkTokenRoute);
    app.use('/api/exchange_public_token', exchangePublicTokenRoute);
    app.use('/api/retrieve_latest_token', retrieveLatestTokenRoute);
    app.use(accountsRoute);
    app.use(transactionsRoute);
    app.use(balancesRoute);
    app.use(institutionRoute);
    app.use(liabilitiesRoute);
    app.use(recurringRoute);
    app.use(categoriesRoute);
    app.use('/api/sync_plaid_data', syncPlaidDataRoute(plaidClient, db));

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
    const authRegister = require('./routes_db/auth/register');
    const authLogin = require('./routes_db/auth/login')(JWT_SECRET); // Pass JWT_SECRET
    const validateUser = require('./routes_db/auth/validate')(db);
    const deleteAccountRoute = require('./routes_db/auth/delete-account');



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
    app.use('/api/db/auth/register', authRegister);
    app.use('/api/db/auth/login', authLogin);
    app.use('/api/db/auth/validate', validateUser);
    app.use('/api/db/auth/delete-account', deleteAccountRoute(db, JWT_SECRET));

    // User profile route to get current user
    app.get('/api/db/user/profile', async (req, res) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        try {
            const user = await db.collection('users').findOne(
                { _id: new mongoose.Types.ObjectId(req.user.id) },
                { projection: { password: 0 } } // Don't return password
            );

            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            res.json(user);
        } catch (err) {
            console.error('Error fetching user profile:', err);
            res.status(500).json({ error: 'Server error' });
        }
    });

    // Health check endpoint
    app.get('/health', (req, res) => {
        res.status(200).send('Server is running');
    });

    // Test the Plaid HTML page accessibility
    app.get('/test-html', (req, res) => {
        res.status(200).send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Plaid HTML Test</title>
        </head>
        <body>
            <h1>Plaid HTML Test Page</h1>
            <p>If you can see this, your HTML is being served correctly.</p>
        </body>
        </html>
    `);
    });

    app.listen(PORT, () => {
        console.log(`🚀 Server running at http://localhost:${PORT}`);
    });

}).catch((err) => {
    console.error('❌ MongoDB connection failed:', err.message);
});