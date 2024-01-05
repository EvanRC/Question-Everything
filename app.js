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