const mongoose = require('mongoose');

const portfolioSchema = new mongoose.Schema({
    portfolio_id: String,
    user_id: Number,
    name: String,
    total_value: Number,
    status: Boolean,
    properties: [String]
});

const Portfolio = mongoose.model('Portfolio', portfolioSchema);

module.exports = Portfolio;
