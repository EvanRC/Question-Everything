// Import the Sequelize library to use its functionalities for the databse operations.
const Sequelize = require('sequelize');

// Creating a new instance of sequelize with database connection information
// The connection details are pulled from the enviroment variables to keep senseitive information out of the codebase.
const sequelize = new Sequelize(
    process.env.DB_NAME, // Databse name form the enviroment variable
    process.env.DB_USER, // Database user form enviroment variable 
    process.env.DB_PASSWORD, { // Databse password formt enviroment variable
        host: process.env.DB_HOST, // Databse hose from enviroment variable
        dialect: 'mysql' // Specifies the databse dialect to be used.
    });

    // Attempt to authenticate with the database using the connection details  provided
    // This is an asynchronous operation and returns a promise.
    sequelize.authenticate()
    .then(() => {
        // If the connection is successful, log a message to the console.
        console.log('A connection to the database has been successfully established!.');
    })
    .catch(err => {
        // If the connection fails, log the error to the console.
        console.error('Unable to establish connection to the database:', err);
    });
    
    // Export the sequelize instance for use in other parts of the application
    module.exports = sequelize;