const Sequelize = require('sequelize'); // importing the sequelize library to use its functionalities for database operations. 
const sequelize = require('../database');  // import the initialized Sequelize instance connected to our database.
const User = require('./user'); // Import the User model to establish the relationship connected to our database.

// Define a new model named 'Score' Using the sequelize.define method.
// This creates a table in the database if it doesn't already exist. 

const Score = sequelize.define('score', {
    // Define a 'points' column with type INTEGER 
    // 'allowNull: false' means this field is required and cannot be null
    points: {
        type: Sequelize.INTEGER,
        allowNull: false
    }, 
    // Define a 'category' column with type INTEGER
    // This could represent different types of scores or categories they belong to
    // It also is a required field

    category: {
        type: Sequelize.INTEGER,
        allowNull: false
    },

    // Define a 'difficulty' column with the type STRING.
    // This represents the difficulty level of the scored game
    // It is also a require field.
    // Note: 
    difficulty: {
        type: Sequelize.STRING,
        allowNull: false
    },
    
});

// Establishes a relationship between the Score and User.
// This adds a 'UserID' column to the Score and User.
// Each score is assossiated with a user
Score.belongsTo(User);

// Exports the score model for use in other parts of the application
// This allows other scripts to import and interact with the Score table
module.exports = Score;
