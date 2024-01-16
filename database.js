// Import the Sequelize library to use its functionalities for the database operations.
const Sequelize = require('sequelize');
let sequelize;
// Creating a new instance of sequelize with database connection information
// The connection details are pulled from the enviroment variables to keep senseitive information out of the codebase.
if (process.env.JAWSDB_URL) {
    sequelize = new Sequelize(process.env.JAWSDB_URL)

} else {
        sequelize = new Sequelize(
        process.env.DB_NAME, // Databse name form the enviroment variable
        process.env.DB_USER, // Database user form enviroment variable 
        process.env.DB_PASSWORD, { // Databse password formt enviroment variable
            host: process.env.DB_HOST, // Databse hose from enviroment variable
            dialect: 'mysql', // Specifies the databse dialect to be used.
            port: 3306
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
}
    
    
    
    // Export the sequelize instance for use in other parts of the application
    module.exports = sequelize;