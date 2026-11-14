

const mysql = require("mysql2/promise");
require("dotenv").config();

const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10
});

// Test database connection
db.getConnection()
    .then(connection => {
        console.log("MySQL database connected successfully!");
        connection.release();
    })
    .catch(error => {
        console.log("MySQL connection failed:", error.message);
    });

module.exports = db;
