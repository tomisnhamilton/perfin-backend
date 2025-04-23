// routes_db/auth/login.js
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken'); // Add this
const User = require('../../models/User');

module.exports = (JWT_SECRET) => {
    const router = express.Router();

    router.post('/', async (req, res) => {
        const { email, password } = req.body;
        if (!email || !password)
            return res.status(400).json({ error: 'Missing email or password' });

        try {
            const user = await User.findOne({ email });
            if (!user) return res.status(401).json({ error: 'Invalid credentials' });

            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

            // Generate JWT
            const token = jwt.sign(
                { id: user._id, email: user.email, username: user.username },
                JWT_SECRET,
                { expiresIn: '7d' }
            );

            res.status(200).json({
                message: 'Login successful',
                token,
                user: { id: user._id, username: user.username, email: user.email }
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Server error during login' });
        }
    });

    return router;
};