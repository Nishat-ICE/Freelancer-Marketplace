const express = require("express");
const bcrypt = require("bcryptjs");
const db = require("../db");

const router = express.Router();


// =====================================================
// REGISTER
// =====================================================

router.post("/register", async (req, res) => {

    const {
        name,
        email,
        password,
        role
    } = req.body;


    if (!name || !email || !password || !role) {

        return res.status(400).json({
            success: false,
            message: "All fields are required."
        });

    }


    try {

        // Check existing email

        const checkSql = `
            SELECT user_id
            FROM users
            WHERE email = ?
        `;

        db.query(
            checkSql,
            [email],
            async (err, users) => {

                if (err) {

                    console.error(err);

                    return res.status(500).json({
                        success: false,
                        message: "Database error."
                    });

                }


                if (users.length > 0) {

                    return res.status(400).json({
                        success: false,
                        message: "Email already exists."
                    });

                }


                // Hash password

                const hashedPassword =
                    await bcrypt.hash(password, 10);


                const insertSql = `
                    INSERT INTO users
                    (name, email, password, role)
                    VALUES (?, ?, ?, ?)
                `;


                db.query(
                    insertSql,
                    [
                        name,
                        email,
                        hashedPassword,
                        role
                    ],
                    (err, result) => {

                        if (err) {

                            console.error(err);

                            return res.status(500).json({
                                success: false,
                                message:
                                    "Failed to create account."
                            });

                        }


                        res.status(201).json({

                            success: true,

                            message:
                                "Registration successful!",

                            user: {
                                user_id:
                                    result.insertId,

                                name: name,

                                email: email,

                                role: role
                            }

                        });

                    }
                );

            }
        );

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Server error."
        });

    }

});


// =====================================================
// LOGIN
// =====================================================

router.post("/login", (req, res) => {

    const {
        email,
        password
    } = req.body;


    if (!email || !password) {

        return res.status(400).json({
            success: false,
            message: "Email and password are required."
        });

    }


    const sql = `
        SELECT
            user_id,
            name,
            email,
            password,
            role
        FROM users
        WHERE email = ?
    `;


    db.query(
        sql,
        [email],
        async (err, users) => {

            if (err) {

                console.error(
                    "Login database error:",
                    err
                );

                return res.status(500).json({
                    success: false,
                    message:
                        "Could not connect to server."
                });

            }


            if (users.length === 0) {

                return res.status(401).json({
                    success: false,
                    message:
                        "Invalid email or password."
                });

            }


            const user = users[0];

            let passwordMatch = false;


            // =================================================
            // Check bcrypt password
            // =================================================

            try {

                passwordMatch =
                    await bcrypt.compare(
                        password,
                        user.password
                    );

            } catch (error) {

                passwordMatch = false;

            }


            // =================================================
            // Support old plain-text passwords
            // =================================================

            if (!passwordMatch) {

                if (
                    password === user.password
                ) {

                    passwordMatch = true;

                    // Upgrade old password
                    // to bcrypt automatically

                    const newHash =
                        await bcrypt.hash(
                            password,
                            10
                        );


                    db.query(
                        `
                        UPDATE users
                        SET password = ?
                        WHERE user_id = ?
                        `,
                        [
                            newHash,
                            user.user_id
                        ],
                        (updateErr) => {

                            if (updateErr) {

                                console.error(
                                    "Password upgrade error:",
                                    updateErr
                                );

                            }

                        }
                    );

                }

            }


            // =================================================
            // Invalid password
            // =================================================

            if (!passwordMatch) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Invalid email or password."

                });

            }


            // Don't send password to frontend

            delete user.password;


            // =================================================
            // Successful login
            // =================================================

            res.json({

                success: true,

                message:
                    "Login successful!",

                user: user

            });

        }
    );

});


module.exports = router;