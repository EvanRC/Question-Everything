const Sequelize = require('sequelize');

// Creating a new instance of sequelize with DB info
const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD, {
        host: process.env.DB_HOST,
        dialect: 'mysql'
    });

    sequelize.authenticate()
    .then(() => {
        console.log('A connection to the database has been successfully established!.');
    })
    .catch(err => {
        console.error('Unable to establish connection to the database:', err);
    });
    
    module.exports = sequelize;