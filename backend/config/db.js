
const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const dbConfig = {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 4000),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,

    ssl: {
        ca: fs.readFileSync(
            path.resolve(__dirname, "..", process.env.DB_CA_PATH || "ca.pem")
        )
    },

    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

const db = mysql.createPool(dbConfig);

async function testConnection() {
    try {
        const connection = await db.getConnection();
        console.log("TiDB database connected successfully!");
        connection.release();
    } catch (error) {
        console.error("TiDB connection failed:", error.message);
    }
}

testConnection();

module.exports = db;
