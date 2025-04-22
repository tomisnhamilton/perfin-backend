const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: String,
    email: String,
    password: String,
    items: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Item' }] // add this
});

module.exports = mongoose.model('User', userSchema);
