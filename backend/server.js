
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const db = require("./config/db");

const authRoutes = require("./routes/auth");
const skillRoutes = require("./routes/skills");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/skills", skillRoutes);

// Home route
app.get("/", (req, res) => {
    res.send("Welcome to Skill Swap API!");
});

// Database health check
app.get("/api/health", async (req, res) => {
    try {
        await db.query("SELECT 1");

        res.json({
            message: "Skill Swap API is working!",
            database: "Connected successfully!"
        });

    } catch (error) {
        console.error("Database error:", error.message);

        res.status(500).json({
            message: "Database connection failed",
            error: error.message
        });
    }
});

// Start server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
