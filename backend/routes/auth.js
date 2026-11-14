

const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../config/db");

const router = express.Router();

// ===============================
// USER REGISTRATION
// ===============================
router.post("/register", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Check empty fields
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Please fill all fields"
            });
        }

        // Check password length
        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: "Password must contain at least 8 characters"
            });
        }

        // Check existing email
        const [existingUser] = await db.execute(
            "SELECT id FROM users WHERE email = ?",
            [email.trim()]
        );

        if (existingUser.length > 0) {
            return res.status(409).json({
                success: false,
                message: "Email already registered"
            });
        }

        // Encrypt password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Store user in MySQL database
        const [result] = await db.execute(
            "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
            [name.trim(), email.trim(), hashedPassword]
        );

        // Confirm database insertion
        console.log("New user saved successfully. User ID:", result.insertId);

        return res.status(201).json({
            success: true,
            message: "Registration successful!",
            userId: result.insertId
        });

    } catch (error) {
        console.error("REGISTRATION ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Registration failed",
            error: error.message
        });
    }
});


// ===============================
// USER LOGIN
// ===============================
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Please enter email and password"
            });
        }

        // Find user
        const [users] = await db.execute(
            "SELECT * FROM users WHERE email = ?",
            [email.trim()]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: "User not found"
            });
        }

        const user = users[0];

        // Verify password
        const validPassword = await bcrypt.compare(
            password,
            user.password
        );

        if (!validPassword) {
            return res.status(401).json({
                success: false,
                message: "Invalid password"
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            {
                id: user.id,
                email: user.email
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1d"
            }
        );

        console.log("User login successful:", user.email);

        return res.status(200).json({
            success: true,
            message: "Login successful!",
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            }
        });

    } catch (error) {
        console.error("LOGIN ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Login failed",
            error: error.message
        });
    }
});

module.exports = router;
