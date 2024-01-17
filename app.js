// Core dependencies
const express = require('express')
const http = require('http')
const path = require('path')
const session = require('express-session')
const { engine } = require('express-handlebars')
const socketIO = require('socket.io')
require('dotenv').config()
const bcrypt = require('bcrypt')
const saltRounds = 10
const sequelizeInstance = require('./database.js')
const User = require('./models/user.js')
const Score = require('./models/score.js')
const SequelizeStore = require('connect-session-sequelize')(session.Store)
const app = express()
const server = http.createServer(app)
const io = socketIO(server)
const PORT = process.env.PORT || 3000
const { v4: uuidv4 } = require('uuid');
let currentQuestionData = {}

let gameState = {
  isActive: false,
  currentQuestionIndex: 0,
  scores: {},
}

// Session configuration
const expressSession = session({
  secret: process.env.SESSION_SECRET,
  store: new SequelizeStore({
    db: sequelizeInstance,
  }),
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: 'auto',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
  }
});


app.use(expressSession);

io.use((socket, next) => {
  expressSession(socket.request, {}, next);
})

async function startApp() {
  try {
    // Synchronize all models with the database
    await sequelizeInstance.sync()

    // Start the server
    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`)
    })
  } catch (error) {
    console.error('Unable to connect to the database:', error)
  }
}

startApp()

async function checkAnswer(socket, userId, questionId, selectedAnswer, correctAnswer, category, difficulty) {

  if (!userId) {
    console.error('UserId is undefined');
    return { error: 'User not logged in or undefined user ID.' };

  }


  // Checks to see if the user's answer is correct
  const isCorrect = selectedAnswer === correctAnswer;
  let newScoreValue = 0; // Initialize newScore variable


  try {
    const userScore = await Score.findOne({ where: { userId: userId } });
    if (isCorrect) {
      newScoreValue = userScore ? userScore.points + 1 : 1;

      if (userScore) {
        newScoreValue = userScore.points + 1;
        // If a score record exists and the answer is correct, create a new one
        await userScore.update({ points: newScoreValue, category: category, difficulty: difficulty });

      } else {
        // Create a new score record with 1 point
        await Score.create({ UserId: userId, points: newScoreValue, category: category, difficulty: difficulty });
      }
      
    } else {

      // For incorrect answers, just return the current score if it exists 
      newScoreValue = userScore ? userScore.points : 0;
    }
    io.to(socket.id).emit('updateScore', newScoreValue);
      return { isCorrect: isCorrect, newScore: newScoreValue };
      
  } catch (error) {
    console.error('error processing answer:', error);
    return { error: 'An error occured while processing the answer.' };

  }
  

}




// Socket.IO connection handler
io.on('connection', (socket) => {
  console.log('New client connected')

  socket.on('broadcastMessage', (message) => {
    io.emit('recieveBroadcast', message) // Broadcasting to all clients
  })

  socket.on('startGame', (data) => {
    // Initialize or reset game state
    gameState = {
      isActive: true,
      currentQuestionIndex: 0,
      selectedCategory: data.category,
      difficultyLevel: data.difficulty,
      scores: {},
    }
    // Notify all clients about the game starting
    io.emit('gameStarted', { gameState })
  })

  // Handler for creating a new game room
  socket.on('createGame', () => {
    const roomId = uuidv4(); // generate a unique room id
    socket.join(roomId);
    socket.emit('gameCreated', roomId);
    console.log('Game Created with ID: ${roomId');
  });

  // Handler for joining an existing game room 
  socket.on('joinGame', (roomId) => {
    socket.join(roomId);
    io.to(roomId).emit('playerJoined', socket.id); // Notify room that a new player has joined
  });

  socket.on('submitAnswer', async (data) => {
    const { userId, questionId, selectedAnswer, correctAnswer, category, difficulty } = data; // Retrieve userId from session
     // Call checkAnswer function
    
    try {
      const result = await checkAnswer(socket, userId, questionId, selectedAnswer, correctAnswer, category, difficulty);
      console.log('UserId reveived:', userId);
      console.log('Answer recieved:', data)

      // Send feedback to the user
      socket.emit('answerResult', {
        correct: result.isCorrect,
        newScore: result.newScore,
        questionId: data.questionId,
      })

      console.log("Emitting new score:", result.newScore);

     socket.emit('updateScore', { newScore: result.newScore });



      // Update the game state
      gameState.scores[data.userId] = result.newScore

      // Determine if it's the last question
      if (gameState.currentQuestionIndex >= 11 - 1) {
        io.emit('gameEnd', { finalScores: gameState.scores })
        gameState.isActive = false // Reset game state if needed
      }
    } catch (error) {
      console.error('Error processing answer:', error)

      // For example, you can emit an error message to user
      socket.emit('error', 'An error occured processing your answer.')
    }
  })

  socket.on('disconnect', () => {
    console.log('Client disconnected')
  })
})

// Body Parser Middleware to handle JSON and URL encoded data
app.use(express.json())
app.use(express.urlencoded({ extended: false }))

// is Authenticated middleware
function isAuthenticated(req, res, next) {
  if (req.session.userId) {
    next()
  } else {
    res.status(401).send('Login required')
  }
}

// Post endpoint for registering a new User.
app.post('/register', async (req, res) => {
  try {
    // Attempt to create a new user using the model.
    // The user's information is pulled from the the request body.
    const newUser = await User.create({
      username: req.body.username,
      email: req.body.email,
      password: req.body.password,
    })
    // if successful, send back a 201 status code and a success messege.
    res.status(201).send('User created successfully!')
  } catch (error) {
    // Check to see if the error is a unique constraint error (e.g., duplicate username)
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res
        .status(400)
        .json({ error: 'Username is already in use. Please try another.' })
    }
    // For other types of erros, send a generic error message
    res
      .status(500)
      .send('There was an error creating the user. Please try again.')
  }
})

// Post endpoint for user login.
app.post('/login', async (req, res) => {
  const { username, password } = req.body
  if (!username || !password) {
    return res
      .status(400)
      .json({ message: 'Username and password are required' })
  }

  try {
    const user = await User.findOne({ where: { username } })
    if (!user) {
      // It's a good security practice not to reveal which part (username or password) was incorrect.`
      return res.status(401).json({ message: 'Invalid username or password' })
    }

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid username or password' })
    }


    // Initialize the user object in the session
    req.session.user = { Id: user.id };

    // Create a session and store user ID in the session
    req.session.user.Id = user.id;
    console.log('Successful login for user:', user.id);

    res.status(200).json({ message: 'Login successful', userId: user.id });

  } catch (err) {
    console.error('Error during login:', err)
    res.status(500).json({ message: 'Internal server error' })
  }

})

// Submit-score endpoint
app.post('/submit-score', isAuthenticated, async (req, res) => {
  try {
    // Destructure score details from requested body.
    const { score, category, difficulty, UserID } = req.body

    // Use the user ID from the session
    const userId = req.session.user.Id

    // Create a new score entry using the Score model
    const newScore = await Score.create({
      points: score,
      category: category,
      difficulty: difficulty,
      UserID: userId,
    })
    // If successful, return a 201 status code and the new score object.
    res.status(201).json(newScore)
  } catch (error) {
    // If there's an error during the score submission, log the error and send back a 500 status code with an error message.
    console.error('Error submitting score:', error)
    res.status(500).send('Error submitting score')
  }
})

// Logout endpoint
app.post('/logout', (req, res) => {
  req.session.destroy() // Destroy the user's session
  res.send('Logged out Successfully')
})

// Static files middleware
app.use(express.static(path.join(__dirname, 'public')))

// Handlebars Middleware
app.engine('handlebars', engine())
app.set('view engine', 'handlebars')
app.set('views', path.join(__dirname, 'views'))

// Home route
app.get('/', (req, res) => {
  res.render('home', { title: 'Get ready to Question Everything!' })
})
