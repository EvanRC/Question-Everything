// Core dependencies
const express = require('express');
const http =  require('http');
const path = require('path');

// Session and authentication 
const session = require('express-session');

// Database and ORM
const sequelize = require('sequelize');
const sequelizeStore = require('connect-session-sequelize')(session.Store);

// Template Engine
const exphbs = require('express-handlebars');

// Real-time communication
const socketIo = require('socket.io');

// Enviroment variables 
require('dotenv').config();

// Initialize Express app and HTTP server 
const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
const io = socketIo(server);

// Setting up Sequalize with MySQL
const sequelize = new sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_USER, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST,
    dialect: 'mysql',
    logging: false
});

// Session configuration
app.use(session({
    secret: 'super secret',
    store: new sequelize.SequelizeStore({
        db: sequelize
    }),
    resave: false,
    saveUninitialized: false,
    cookie: {}
}));

// Body Parser Middleware to handle JSON and URL encoed data
app.use(express.json());
app.use(express.urlencoded({ extende: false }));

// Static files middleware (for CSS, JS, Images, etc.)
app.use(express.static(path.join(__dirname, 'public')));

// Handlebars Middleware 
app.engine('handlebars', exphbs());
app.set('view engine', 'handlebars');

// Define routes 
app.get('/', (req, res) => {
    res.render('home', { title: 'Get ready to Question Everthing!'});
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