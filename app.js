// Core dependencies
const express = require('express');
const http =  require('http');
const path = require('path');

// Enviroment variables 
require('dotenv').config();

// Session and authentication 
const session = require('express-session');

// Database and ORM
const sequelizeInstance = require('./database.js');
const User = require('./models/user.js');
const Score = require('./models/score.js');
const SequelizeStore = require('connect-session-sequelize')(session.Store);

// Template Engine
const { engine } = require('express-handlebars');

// Real-time communication
const socketIO = require('socket.io');

// Initialize Express app and HTTP server 
const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
const io = socketIO(server);

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET,
    store: new SequelizeStore({
        db: sequelizeInstance
    }),
    resave: false,
    saveUninitialized: false,
    cookie: {}
}));

// Body Parser Middleware to handle JSON and URL encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Post endpoint for registering a new User.
app.post('./register', async (req, res) => { 
    try {
        // Attempt to create a new user using the model.
        // The user's information is pulled from the the request body.
        const newUser = await User.create({
            username: req.body.username,
            email: req.body.email,
            password: req.body.password
        });
         // if successful, send back a 201 status code and a success messge.
        req.statusCode(201).send('User created successfully!');
    } catch (error) {
        // If there's an error during the user creation, log the error and send a back a 400 status code with an error message
        console.error("Error creating user:", error);
        res.status(400).send('Error creating user');
    }
});

// post endpoint for user login.
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
            res.status(200).send('Login successful!');
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

// Post endpoint for submitting a score.
app.post('/submit-score', async (req, res) => {
    try {
        // Destructure score details from requested body.
        const { score, category, difficulty, UserID } = req.body;

        // Attempt to find the user by their primary key (UserID).

        const user = await User.findByPk(userID);
        // If no user is found, return a 404 status code and a 'not found message'.
        if(!user) {
            return res.status(404).send('User not found');
        }

        // Create a new score entry using the Score model
        const newScore = await Score.create({
            points: score,
            category: category,
            difficulty: difficulty,
            UserID: user.id
        });
        // If successful, return a 201 status code and the new score object.
        res.status(201).json(newScore);
    } catch (error) {
        // If there's an error during the score submission, log the error and send back a 500 status code with an error message.
        console.error('Error submitting score:', error);
        res.status(500).send('Error submitting score');
    }
});

// Static files middleware (for CSS, JS, Images, etc.)
app.use(express.static(path.join(__dirname, 'public')));

// Handlebars Middleware 
app.engine('handlebars', engine());
app.set('view engine', 'handlebars');

// Define routes 
app.get('/', (req, res) => {
    res.render('home', { title: 'Get ready to Question Everything!'});
});

// Socket.IO connection
io.on('connection', (socket) => {
    console.log('New client connected');

    socket.on('disconnect', () => {
        console.log(' Client disconnected');
    });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});