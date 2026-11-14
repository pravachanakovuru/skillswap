
const express = require("express");
const jwt = require("jsonwebtoken");
const db = require("../config/db");

const router = express.Router();

// =====================================
// VERIFY LOGIN TOKEN
// =====================================

const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            message: "Please login first"
        });
    }

    try {
        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.userId = decoded.id;
        next();

    } catch (error) {
        return res.status(401).json({
            message: "Invalid or expired token"
        });
    }
};


// =====================================
// HOME PAGE - REGISTERED SKILLS BY CATEGORY
// PUBLIC API - NO LOGIN REQUIRED
// =====================================

router.get("/categories", async (req, res) => {
    try {
        const [skills] = await db.execute(
            `SELECT DISTINCT
                sc.category,
                s.skill_name,
                us.skill_type
             FROM user_skills us
             JOIN skills s
                ON us.skill_id = s.id
             JOIN skill_catalog sc
                ON LOWER(TRIM(sc.skill_name)) =
                   LOWER(TRIM(s.skill_name))
             WHERE sc.category IS NOT NULL
               AND TRIM(sc.category) != ''
             ORDER BY sc.category, s.skill_name`
        );

        res.json(skills);

    } catch (error) {
        console.error("CATEGORY SKILLS ERROR:", error);

        res.status(500).json({
            message: "Unable to fetch category skills",
            error: error.message
        });
    }
});


// =====================================
// GET MY SKILLS
// =====================================

router.get("/", verifyToken, async (req, res) => {
    try {
        const [skills] = await db.execute(
            `SELECT
                us.id AS userSkillId,
                s.id AS skillId,
                s.skill_name,
                s.skill_type,
                s.description,
                sc.category,
                us.teaching_mode,
                us.skill_level
             FROM user_skills us
             JOIN skills s ON us.skill_id = s.id
             LEFT JOIN skill_catalog sc
                ON LOWER(TRIM(sc.skill_name)) =
                   LOWER(TRIM(s.skill_name))
             WHERE us.user_id = ?
             ORDER BY us.id DESC`,
            [req.userId]
        );

        res.json(skills);

    } catch (error) {
        console.error("GET SKILLS ERROR:", error);

        res.status(500).json({
            message: "Unable to fetch skills",
            error: error.message
        });
    }
});


// =====================================
// ADD NEW SKILL
// =====================================

router.post("/", verifyToken, async (req, res) => {
    const {
        skill_name,
        skill_type,
        description,
        teaching_mode,
        skill_level
    } = req.body;

    if (!skill_name || !skill_type) {
        return res.status(400).json({
            message: "Please enter skill name and type"
        });
    }

    if (!["Teach", "Learn"].includes(skill_type)) {
        return res.status(400).json({
            message: "Invalid skill type"
        });
    }

    const validLevels = [
        "BEGINNER",
        "INTERMEDIATE",
        "ADVANCED"
    ];

    const validModes = ["FREE", "EXCHANGE"];

    const level = (skill_level || "BEGINNER").toUpperCase();
    const mode = (teaching_mode || "FREE").toUpperCase();

    if (!validLevels.includes(level)) {
        return res.status(400).json({
            message: "Invalid skill level"
        });
    }

    if (skill_type === "Teach" && !validModes.includes(mode)) {
        return res.status(400).json({
            message: "Invalid teaching mode"
        });
    }

    let connection;

    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        const [skillResult] = await connection.execute(
            `INSERT INTO skills
             (user_id, skill_name, skill_type, description)
             VALUES (?, ?, ?, ?)`,
            [
                req.userId,
                skill_name.trim(),
                skill_type,
                description || null
            ]
        );

        const skillId = skillResult.insertId;

        await connection.execute(
            `INSERT INTO user_skills
             (user_id, skill_id, skill_type, teaching_mode, skill_level)
             VALUES (?, ?, ?, ?, ?)`,
            [
                req.userId,
                skillId,
                skill_type.toUpperCase(),
                skill_type === "Teach" ? mode : "FREE",
                level
            ]
        );

        await connection.commit();

        res.status(201).json({
            message: "Skill added successfully!",
            skillId
        });

    } catch (error) {
        if (connection) await connection.rollback();

        console.error("ADD SKILL ERROR:", error);

        res.status(500).json({
            message: "Failed to add skill",
            error: error.message
        });

    } finally {
        if (connection) connection.release();
    }
});


// =====================================
// SMART SEARCH
// =====================================

const searchTeachingSkills = async (req, res) => {
    try {
        const q = (req.query.q || "").trim();
        const category = (req.query.category || "").trim();
        const level = (req.query.level || "").trim().toUpperCase();

        const validLevels = [
            "",
            "BEGINNER",
            "INTERMEDIATE",
            "ADVANCED"
        ];

        if (!validLevels.includes(level)) {
            return res.status(400).json({
                message: "Invalid skill level"
            });
        }

        const searchTerm = `%${q}%`;

        const [skills] = await db.execute(
            `SELECT
                us.id AS userSkillId,
                s.id AS skillId,
                s.skill_name,
                s.description,
                sc.category,
                us.skill_level,
                us.teaching_mode,
                u.id AS teacher_id,
                u.name AS teacher_name
             FROM user_skills us
             JOIN skills s
                ON us.skill_id = s.id
             JOIN users u
                ON us.user_id = u.id
             LEFT JOIN skill_catalog sc
                ON LOWER(TRIM(sc.skill_name)) =
                   LOWER(TRIM(s.skill_name))
             WHERE us.skill_type = 'TEACH'
               AND us.user_id != ?
               AND (? = '' OR s.skill_name LIKE ?)
               AND (? = '' OR sc.category = ?)
               AND (? = '' OR us.skill_level = ?)
             ORDER BY us.id DESC`,
            [
                req.userId,
                q,
                searchTerm,
                category,
                category,
                level,
                level
            ]
        );

        res.json(skills);

    } catch (error) {
        console.error("SMART SEARCH ERROR:", error);

        res.status(500).json({
            message: "Failed to search skills",
            error: error.message
        });
    }
};


// =====================================
// EXPLORE OTHER USERS' SKILLS
// =====================================

router.get("/explore", verifyToken, searchTeachingSkills);


// =====================================
// SEARCH ROUTE
// =====================================

router.get("/search", verifyToken, searchTeachingSkills);


// =====================================
// SEND LEARNING REQUEST
// =====================================

router.post("/request", verifyToken, async (req, res) => {
    try {
        const {
            skill_id,
            description,
            learning_level,
            preferred_mode
        } = req.body;

        if (!skill_id) {
            return res.status(400).json({
                message: "Skill ID is required"
            });
        }

        const validModes = [
            "ONLINE",
            "IN_PERSON",
            "EITHER"
        ];

        const mode = (preferred_mode || "EITHER").toUpperCase();

        if (!validModes.includes(mode)) {
            return res.status(400).json({
                message: "Invalid preferred mode"
            });
        }

        const [teacherSkill] = await db.execute(
            `SELECT
                us.id,
                us.user_id AS teacher_id
             FROM user_skills us
             WHERE us.skill_id = ?
               AND us.skill_type = 'TEACH'
               AND us.user_id != ?`,
            [skill_id, req.userId]
        );

        if (teacherSkill.length === 0) {
            return res.status(404).json({
                message: "Teacher skill not found"
            });
        }

        const [existing] = await db.execute(
            `SELECT id
             FROM learning_requests
             WHERE learner_id = ?
               AND skill_id = ?
               AND status IN ('OPEN', 'ACCEPTED', 'MATCHED')`,
            [req.userId, skill_id]
        );

        if (existing.length > 0) {
            return res.status(409).json({
                message: "You already have an active request for this skill"
            });
        }

        const [result] = await db.execute(
            `INSERT INTO learning_requests
             (learner_id, skill_id, description,
              learning_level, preferred_mode)
             VALUES (?, ?, ?, ?, ?)`,
            [
                req.userId,
                skill_id,
                description || "I want to learn this skill.",
                learning_level || "BEGINNER",
                mode
            ]
        );

        res.status(201).json({
            message: "Learning request sent successfully!",
            requestId: result.insertId
        });

    } catch (error) {
        console.error("SEND REQUEST ERROR:", error);

        res.status(500).json({
            message: "Failed to send request",
            error: error.message
        });
    }
});


// =====================================
// MY SENT REQUESTS
// =====================================

router.get("/requests/sent", verifyToken, async (req, res) => {
    try {
        const [requests] = await db.execute(
            `SELECT
                lr.id AS requestId,
                lr.skill_id,
                s.skill_name,
                s.description AS skill_description,
                lr.description AS request_description,
                lr.learning_level,
                lr.preferred_mode,
                lr.status,
                lr.created_at,
                u.name AS teacher_name,
                u.id AS teacher_id
             FROM learning_requests lr
             JOIN skills s ON lr.skill_id = s.id
             JOIN users u ON s.user_id = u.id
             WHERE lr.learner_id = ?
             ORDER BY lr.created_at DESC`,
            [req.userId]
        );

        res.json(requests);

    } catch (error) {
        console.error("SENT REQUESTS ERROR:", error);

        res.status(500).json({
            message: "Unable to load your requests",
            error: error.message
        });
    }
});


// =====================================
// INCOMING REQUESTS
// =====================================

 // =====================================
 // INCOMING REQUESTS - TEACHER DASHBOARD
 // =====================================

router.get("/requests/received", verifyToken, async (req, res) => {
    try {
        const teacherId = Number(req.userId);

        console.log("Logged-in Teacher ID:", teacherId);

        const [requests] = await db.execute(
            `SELECT
                lr.id AS requestId,
                lr.learner_id,
                lr.skill_id,
                lr.description,
                lr.learning_level,
                lr.preferred_mode,
                lr.status,
                lr.created_at,

                s.skill_name,
                s.user_id AS teacher_id,

                u.id AS student_id,
                u.name AS learner_name

            FROM learning_requests lr

            INNER JOIN skills s
                ON lr.skill_id = s.id

            INNER JOIN users u
                ON lr.learner_id = u.id

            WHERE s.user_id = ?
              AND s.skill_type = 'Teach'

            ORDER BY lr.created_at DESC`,
            [teacherId]
        );

        console.log("Requests found:", requests.length);

        // Return an array to maintain compatibility
        // with a frontend expecting an array.
        res.status(200).json(requests);

    } catch (error) {
        console.error("INCOMING REQUEST ERROR:", error);

        res.status(500).json({
            message: "Unable to load incoming requests",
            error: error.message
        });
    }
});


// =====================================
// ACCEPT OR REJECT REQUEST
// =====================================

router.put("/requests/:id/respond", verifyToken, async (req, res) => {
    try {
        const requestId = Number(req.params.id);
        const { action } = req.body;

        if (!Number.isInteger(requestId) || requestId <= 0) {
            return res.status(400).json({
                message: "Invalid request ID"
            });
        }

        if (!["ACCEPTED", "REJECTED"].includes(action)) {
            return res.status(400).json({
                message: "Action must be ACCEPTED or REJECTED"
            });
        }

        const [requests] = await db.execute(
            `SELECT
                lr.id,
                lr.status,
                s.user_id AS teacher_id
             FROM learning_requests lr
             JOIN skills s ON lr.skill_id = s.id
             WHERE lr.id = ?`,
            [requestId]
        );

        if (requests.length === 0) {
            return res.status(404).json({
                message: "Learning request not found"
            });
        }

        const request = requests[0];

        if (Number(request.teacher_id) !== Number(req.userId)) {
            return res.status(403).json({
                message: "You are not allowed to respond to this request"
            });
        }

        if (request.status !== "OPEN") {
            return res.status(400).json({
                message: "This request has already been processed"
            });
        }

        const [result] = await db.execute(
            `UPDATE learning_requests
             SET status = ?
             WHERE id = ? AND status = 'OPEN'`,
            [action, requestId]
        );

        if (result.affectedRows === 0) {
            return res.status(409).json({
                message: "Request was already processed"
            });
        }

        res.json({
            message: action === "ACCEPTED"
                ? "Learning request accepted!"
                : "Learning request rejected!",
            status: action
        });

    } catch (error) {
        console.error("RESPOND REQUEST ERROR:", error);

        res.status(500).json({
            message: "Unable to respond to request",
            error: error.message
        });
    }
});


// =====================================
// MY CONNECTIONS
// =====================================

router.get("/connections", verifyToken, async (req, res) => {
    try {
        const [connections] = await db.execute(
            `SELECT
                lr.id AS requestId,
                lr.skill_id,
                s.skill_name,
                lr.created_at,
                learner.id AS learner_id,
                learner.name AS learner_name,
                teacher.id AS teacher_id,
                teacher.name AS teacher_name,
                CASE
                    WHEN lr.learner_id = ?
                    THEN 'LEARNER'
                    ELSE 'TEACHER'
                END AS my_role
             FROM learning_requests lr
             JOIN skills s ON lr.skill_id = s.id
             JOIN users learner ON lr.learner_id = learner.id
             JOIN users teacher ON s.user_id = teacher.id
             WHERE lr.status = 'ACCEPTED'
               AND (
                    lr.learner_id = ?
                    OR s.user_id = ?
               )
             ORDER BY lr.created_at DESC`,
            [req.userId, req.userId, req.userId]
        );

        res.json(connections);

    } catch (error) {
        console.error("CONNECTIONS ERROR:", error);

        res.status(500).json({
            message: "Unable to load connections",
            error: error.message
        });
    }
});


// =====================================
// GET ALL OTHER STUDENT PROFILES
// =====================================

router.get("/profiles", verifyToken, async (req, res) => {
    try {
        const [rows] = await db.execute(
            `SELECT
                u.id AS user_id,
                u.name AS student_name,
                s.skill_name,
                us.skill_type
             FROM users u
             LEFT JOIN user_skills us
                ON u.id = us.user_id
             LEFT JOIN skills s
                ON us.skill_id = s.id
             WHERE u.id != ?
             ORDER BY u.name`,
            [req.userId]
        );

        const studentsMap = {};

        rows.forEach((row) => {
            if (!studentsMap[row.user_id]) {
                studentsMap[row.user_id] = {
                    user_id: row.user_id,
                    student_name: row.student_name,
                    teach_skills: [],
                    learn_skills: []
                };
            }

            if (row.skill_name && row.skill_type === "TEACH") {
                studentsMap[row.user_id].teach_skills.push(
                    row.skill_name
                );
            }

            if (row.skill_name && row.skill_type === "LEARN") {
                studentsMap[row.user_id].learn_skills.push(
                    row.skill_name
                );
            }
        });

        res.json(Object.values(studentsMap));

    } catch (error) {
        console.error("STUDENT PROFILES ERROR:", error);

        res.status(500).json({
            message: "Unable to load student profiles",
            error: error.message
        });
    }
});


// =====================================
// DELETE MY SKILL
// =====================================

router.delete("/:id", verifyToken, async (req, res) => {
    let connection;

    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        const [rows] = await connection.execute(
            `SELECT skill_id
             FROM user_skills
             WHERE id = ? AND user_id = ?`,
            [req.params.id, req.userId]
        );

        if (rows.length === 0) {
            await connection.rollback();

            return res.status(404).json({
                message: "Skill not found"
            });
        }

        const skillId = rows[0].skill_id;

        const [requests] = await connection.execute(
            `SELECT id
             FROM learning_requests
             WHERE skill_id = ?
             LIMIT 1`,
            [skillId]
        );

        await connection.execute(
            `DELETE FROM user_skills
             WHERE id = ? AND user_id = ?`,
            [req.params.id, req.userId]
        );

        if (requests.length === 0) {
            await connection.execute(
                `DELETE FROM skills
                 WHERE id = ? AND user_id = ?`,
                [skillId, req.userId]
            );
        }

        await connection.commit();

        res.json({
            message: "Skill deleted successfully!"
        });

    } catch (error) {
        if (connection) await connection.rollback();

        console.error("DELETE SKILL ERROR:", error);

        res.status(500).json({
            message: "Failed to delete skill",
            error: error.message
        });

    } finally {
        if (connection) connection.release();
    }
});


module.exports = router;
