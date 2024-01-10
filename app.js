// Core dependencies
const express = require('express');
const http =  require('http');
const path = require('path');
const session = require('express-session');
const { engine } = require('express-handlebars');;
const socketIO = require('socket.io');
require('dotenv').config();
const bcrypt = require('bcrypt');
const saltRounds = 10;
const sequelizeInstance = require('./database.js');
const User = require('./models/user.js');
const Score = require('./models/score.js');
const SequelizeStore = require('connect-session-sequelize')(session.Store);

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET,
    store: new SequelizeStore({
        db: sequelizeInstance
    }),
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: 'auto',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000
    }
}));

// Body Parser Middleware to handle JSON and URL encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// isAuthenticated middleware
function isAuthenticated(req, res, next) {
    if (req.session.userId) {
        next();
    } else {
        res.status(401).send('Login required');
    }
}

// Registration endpoint
app.post('/register', async (req, res) => { 
    try {
        // Hash the user's password
        const hashedPassword = await bcrypt.hash(req.body.password, saltRounds);
        // Attempt to create a new user using the model.
        // The user's information is pulled from the the request body.
        const newUser = await User.create({
            username: req.body.username,
            email: req.body.email,
            password: hashedPassword
        });
         // if successful, send back a 201 status code and a success messge.
        res.status(201).send('User created successfully!');

    } catch (error) {
      
        // Check to see if the error is a unique constraint error (e.g., duplicate username)
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({error: 'Username is already in use. Please try another.'});
        }
        // For other types of erros, send a generic error message
        res.status(500).send('There was an error creating the user. Please try again.');
    
    }
});

// Post endpoint for user login.
app.post('/login', async (req, res) => {
    try { 
        // Attempt to find the user by username.
        const user = await User.findOne({where: { username: req.body.username} });
        // If no user is found, return a 401 status code and a 'not found' message.
        if (!user) {
            return res.status(401).send('User not found');
        }

        // Compare the request password with the user's stored hashed password.
        const match = await bcrypt.compare(req.body.password, user.password);
        // If passwords matc, return a 200 status code and a success message.
        if (match) {
            req.session.userId = user.id // store the user's id in the session
            res.status(200).json({ message: 'Login successful!', userID: user.id });
        } else {
            // If passwrods don't match, return a 401 status code and an error message.
            res.status(401).send('incorrect password, access denied');
        }
    } catch (error) {
        // IF there's an error during the login process, log the error and send back a 500 status code with an error message.
        console.error("Error logging in:", error);
        res.status(500).send('Error logging in');
    }
});

// Submit-score endpoint
app.post('/submit-score', isAuthenticated, async (req, res) => {
    try {
        // Destructure score details from requested body.
        const { score, category, difficulty, UserID } = req.body;

        // Use the user ID from the session
        const userId = req.session.userId;

        // Create a new score entry using the Score model
        const newScore = await Score.create({
            points: score,
            category: category,
            difficulty: difficulty,
            UserID: userid
        });
        // If successful, return a 201 status code and the new score object.
        res.status(201).json(newScore);
    } catch (error) {
        // If there's an error during the score submission, log the error and send back a 500 status code with an error message.
        console.error('Error submitting score:', error);
        res.status(500).send('Error submitting score');
    }
});

// Logout endpoint
app.post('/logout', (req, res) => {
    req.session.destroy(); // Destroy the user's session
    res.send('Logged out Successfully');
})

// Static files middleware
app.use(express.static(path.join(__dirname, 'public')));

// Handlebars Middleware
app.engine('handlebars', engine());
app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'views'))

// Home route
app.get('/', (req, res) => {
    res.render('home', { title: 'Get ready to Question Everything!'});
});

// Quiz route
app.get('/quiz', (req, res) => {
    res.render('quiz', { quizData });
});

// Socket.IO connection
io.on('connection', (socket) => {
    console.log('New client connected');

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});