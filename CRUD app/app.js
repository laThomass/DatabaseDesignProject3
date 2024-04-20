const express = require('express');
const mongoose = require('mongoose');
const Portfolio = require('./models/Portfolio');
const app = express();
const port = 3000;

const redis = require('redis');
const redisClient = redis.createClient({
    host: 'localhost',
    port: 6379
});
redisClient.on('error', (err) => console.log('Redis Client Error', err));
redisClient.connect();

app.use(express.static('public'));
app.use(express.json());

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/project2', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

// Define models
const User = mongoose.model('User', new mongoose.Schema({
    first_name: String,
    last_name: String,
    email: String
}));

// Root endpoint
app.get('/', (req, res) => res.send('Welcome to the User Management API!'));

// User endpoints
app.post('/users', async (req, res) => {
    console.log("Received user data:", req.body);
    const newUser = new User(req.body);
    try {
        const user = await newUser.save();
        res.status(201).json(user);
    } catch (err) {
        console.error("Error creating user:", err);
        res.status(400).json({ message: "Error creating user", error: err.toString() });
    }
    
});


app.get('/users', async (req, res) => {
    try {
        const users = await User.find();
        res.json(users);
    } catch (err) {
        res.status(500).json(err);
    }
});

app.get('/users/:id', async (req, res) => {
    const cacheKey = `user:${req.params.id}`;
    try {
        let user = await redisClient.hGetAll(cacheKey);
        if (Object.keys(user).length) {
            console.log('Retrieving from cache');
            return res.json(user);
        }
        user = await User.findById(req.params.id);
        if (!user) {
            res.status(404).send('User not found');
        } else {
            await redisClient.hSet(cacheKey, user.toObject());
            res.json(user);
        }
    } catch (err) {
        res.status(500).json(err);
    }
});

app.put('/users/:id', async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!user) {
            res.status(404).send('User not found');
        } else {
            await redisClient.del(`user:${req.params.id}`);
            res.json(user);
        }
    } catch (err) {
        res.status(400).json(err);
    }
});

app.delete('/users/:id', async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) {
            res.status(404).send('User not found');
        } else {
            await redisClient.del(`user:${req.params.id}`);
            res.send({ message: 'User deleted successfully' });
        }
    } catch (err) {
        res.status(500).json(err);
    }
});

// Fetch portfolios by user_id
app.get('/portfolios/user/:userId', async (req, res) => {
    const cacheKey = `portfolio:${req.params.userId}`;  // Define a unique key for caching
    try {
        // Try to get the portfolio data from Redis first
        let portfolios = await redisClient.get(cacheKey);
        if (portfolios) {
            console.log('Retrieving portfolios from cache');
            return res.json(JSON.parse(portfolios));  // Parse and return the cached data
        }

        // If not in cache, fetch from MongoDB
        portfolios = await Portfolio.find({ user_id: req.params.userId });
        if (portfolios.length === 0) {
            res.status(404).json({message: 'No portfolios found for this user. Please add a new portfolio.', canCreate: true});
        } else {
            await redisClient.set(cacheKey, JSON.stringify(portfolios), 'EX', 3600); 
            res.json(portfolios);  
        }
    } catch (err) {
        console.error('Error retrieving portfolios:', err);
        res.status(500).send({ message: "Error retrieving portfolios", error: err });
    }
});




app.put('/portfolios/:portfolioId', async (req, res) => {
    try {
        const portfolio = await Portfolio.findOneAndUpdate({ portfolio_id: req.params.portfolioId }, req.body, { new: true });
        if (!portfolio) {
            return res.status(404).send({ message: 'Portfolio not found' });
        } else {
            // Invalidate the cache after updating
            const cacheKey = `portfolio:${portfolio.user_id}`;
            await redisClient.del(cacheKey);
            res.json(portfolio);
        }
    } catch (err) {
        console.error('Error updating portfolio:', err);
        res.status(500).send({ message: 'Error updating portfolio', error: err });
    }
});

// Fetch a single portfolio by portfolio_id
app.get('/portfolios/:portfolioId', (req, res) => {
    Portfolio.findOne({ portfolio_id: req.params.portfolioId })
        .then(portfolio => {
            if (!portfolio) {
                res.status(404).send('Portfolio not found');
            } else {
                res.json(portfolio);
            }
        })
        .catch(err => res.status(500).send({ message: "Error retrieving portfolio", error: err }));
});

// Assuming Portfolio model is already defined and imported

// Create a new portfolio for a user
app.post('/portfolios', (req, res) => {
    const newPortfolio = new Portfolio({
        user_id: req.body.user_id,  
        name: req.body.name,
        total_value: req.body.total_value || 0, 
        status: req.body.status || false,  
        properties: req.body.properties || []  
    });

    newPortfolio.save()
        .then(portfolio => res.status(201).json(portfolio))
        .catch(err => res.status(400).json({ message: "Error creating portfolio", error: err }));
});

function generateUserId() {
    const min = 9999;
    const max = 9999999;
    return 'user' + Math.floor(Math.random() * (max - min + 1)) + min;
}

// Start the server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
