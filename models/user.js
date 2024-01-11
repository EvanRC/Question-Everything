const Sequelize = require('sequelize'); // Import the Sequelize library for the database operations.
const sequelize = require('../database'); // Import the initialized Sequelize instance connected to our database. 
const bcrypt = require('bcrypt'); // Import bcrypt for password hashing. this provides added security by converting passwords into hashed strings.
const saltRounds = 10; // Define the number of hash rounds the algorithim will execute, making it harder to guess the hash.

// Defines a new model named 'User' using sequelize.define method
const User = sequelize.define('user', {
    // Define a 'username' column with type STRING.
    // 'allowNull: false' means this field is required and cannot be null.
    // 'unique: true' ensures that no two users can have the same username
    username: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
    },
     // Define a 'password' column with type STRING.
    // This will store the hashed password for each user.
    // 'allowNull: false' makes this a required field.
    password: {
        type: Sequelize.STRING,
        allowNull: false,
    },
    // Define an 'email' column with type STRING.
    // 'allowNull: false' means this field is required.
    // 'unique: true' ensures that no two users can have the same email.
    // The 'validate' property ensures the email entered is in a valid format.
    email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true
        }
    },
});

// Hook that runs before a User instance is created.
// This function uses bcrypt to hash the user's password
User.beforeCreate((user, options) => {
    return bcrypt.hash(user.password, saltRounds)
    .then(hashedPassword => {
        user.password = hashedPassword;
    });
});

// Hook that runs before a User instance is updated.
// This functions checks to if the password field has been changed.
// If it has, it hashes the new password before saving
User.beforeUpdate((user, options) => {
    if (user.changed('password')) {
        return bcrypt.hash(user.password, saltRounds)
        .then(hashedPassword => {
            // Replaces the plain-text password with the hashed one.
            user.password = hashedPassword;
        });
    }
});

// exports the User model for use in other parts of the application
module.exports = User;