// Core dependencies
const express = require('express');
const http = require('http');
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
const PORT = process.env.PORT || 3000;

let currentQuestionData = {};

let gameState = {
    isActive: false,
    currentQuestionIndex: 0,
    scores: {}
};

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

async function startApp() {
    try {
        // Synchronize all models with the database
        await sequelizeInstance.sync();

        // Start the server
        server.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Unable to connect to the database:', error);
    }
}

startApp()

async function checkAnswer(userId, questionId, selectedAnswer, correctAnswer) {
    // Checks to see if the user's answer is correct
    const isCorrect = selectedAnswer === correctAnswer;

    let newScoreValue = 0; // Initialize newScore variable

    if (isCorrect) {
        // Find the user's current score in the database 
        const userScore = await Score.findOne({ where: { UserId: userId } });

        if (userScore) {
            // If a score record exists, increment it
            newScoreValue = userScore.points + 1; // Increment by 1 
            await userScore.update({ points: newScoreValue })
        } else {
            // If no score record exists, create a new one 
            await Score.create({
                UserId: userId,
                points: 1, // Starting with 1 point for the first correct answer 
            });
            newScoreValue = 1; // Starting score 
        }
    }

    // Return whether the answer was correct and the new score
    return { isCorrect: isCorrect, newScore: newScoreValue };
}

// Socket.IO connection handler
io.on('connection', (socket) => {
    console.log('New client connected');

    socket.on('broadcastMessage', (message) => {
        io.emit('recieveBroadcast', message); // Broadcasting to all clients
    });

    socket.on('startGame', (data) => {

        // Initialize or reset game state
        gameState = {
            isActive: true,
            currentQuestionIndex: 0,
            selectedCategory: data.category,
            difficultyLevel: data.diffficulty,
            scores: {}
        };
        // Notify all clients about the game starting
        io.emit('gameStarted', { gameState });
    })

    socket.on('submitAnswer', async (data) => {
        try {
            console.log('Answer recieved:', data);

            // Validate the answer and update the score
            const result = checkAnswer(data.userId, data.questionId, data.selectedAnswer, data.correctAnswer);

            // Send feedback to the user
            socket.emit('answerResult', {
                correct: result.isCorrect,
                newScore: result.newScore,
                questionId: data.questionId
            });

            // Update the game state
            gameState.scores[data.userId] = result.newScore;

            // Determine if it's the last question
            if (gameState.currentQuestionIndex >= 11 - 1) {
                io.emit('gameEnd', { finalScores: gameState.scores });
                gameState.isActive = false; // Reset game state if needed
           
            }

            // Emit the result to the client 
            socket.emit('answerResult', {
                correct: result.isCorrect,
                newScore: result.newScore,
                questionId: data.questionId
            });

        } catch (error) {
            console.error('Error processing answer:', error);

            // For example, you can emit an error message to user 
            socket.emit('error', 'An error occured processing your answer.');
        }

    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});




// is Authenticated middleware
function isAuthenticated(req, res, next) {
    if (req.session.userId) {
        next();
    } else {
        res.status(401).send('Login required');
    }
}

// Post endpoint for registering a new User.
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
            return res.status(400).json({ error: 'Username is already in use. Please try another.' });
        }
        // For other types of erros, send a generic error message
        res.status(500).send('There was an error creating the user. Please try again.');

    }
});

// Post endpoint for user login.
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await User.findOne({ where: { username } });

        // Logging statements for debugging
        console.log('Fetched user from database:', user);
        console.log('Plaintext password from request:', password);
        console.log('Hashed password from database:', user.password);

        if (!user) {
            return res.status(401).json({ message: 'Invalid username or password' });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        // Logging statement for debugging
        console.log('Password comparison result:', isMatch);

        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid username or password' });
        }

        // ... rest of the login logic (session management, etc.)
    } catch (err) {
        console.error('Error during login:', err);
        res.status(500).json({ message: 'Internal server error' });
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
    res.render('home', { title: 'Get ready to Question Everything!' });
});

// // Start the server
// const PORT = process.env.PORT || 3000;
// server.listen(PORT, () => {
//     console.log(`Server is running on port ${PORT}`);
// });