
const mysql = require("mysql2/promise");

const fs = require("fs");
const path = require("path");

const config = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT || 4000),
    waitForConnections: true,
    connectionLimit: 10,
};

if (process.env.DB_CA_CERT) {
    config.ssl = {
        ca: process.env.DB_CA_CERT.replace(/\\n/g, "\n"),
        rejectUnauthorized: true
    };
}

const db = mysql.createPool(config);

module.exports = db;
