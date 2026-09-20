const express = require("express");
const db = require("../db");

const router = express.Router();


// ========================================
// GET PROFILE
// ========================================

router.get("/:userId", (req, res) => {

    const userId = req.params.userId;

    const sql = `
        SELECT
            u.user_id,
            u.name,
            u.email,
            u.role,
            u.created_at,

            p.profile_id,
            p.skills,
            p.experience,
            p.rating,
            p.bio

        FROM users u

        LEFT JOIN profiles p
            ON u.user_id = p.user_id

        WHERE u.user_id = ?
    `;

    db.query(sql, [userId], (err, results) => {

        if (err) {

            console.error("Profile Error:", err);

            return res.status(500).json({
                success: false,
                message: "Failed to load profile."
            });

        }

        if (results.length === 0) {

            return res.status(404).json({
                success: false,
                message: "User not found."
            });

        }

        res.json({
            success: true,
            profile: results[0]
        });

    });

});


// ========================================
// CREATE / UPDATE PROFILE
// ========================================

router.put("/:userId", (req, res) => {

    const userId = req.params.userId;

    const {
        name,
        skills,
        experience,
        bio
    } = req.body;


    if (!name || !name.trim()) {

        return res.status(400).json({
            success: false,
            message: "Name is required."
        });

    }


    // Update user name
    const userSql = `
        UPDATE users
        SET name = ?
        WHERE user_id = ?
    `;

    db.query(
        userSql,
        [name.trim(), userId],
        (err) => {

            if (err) {

                console.error(err);

                return res.status(500).json({
                    success: false,
                    message: "Failed to update user."
                });

            }


            // Check whether profile exists
            const checkSql = `
                SELECT profile_id
                FROM profiles
                WHERE user_id = ?
            `;

            db.query(
                checkSql,
                [userId],
                (err, results) => {

                    if (err) {

                        console.error(err);

                        return res.status(500).json({
                            success: false,
                            message: "Database error."
                        });

                    }


                    // ========================================
                    // UPDATE EXISTING PROFILE
                    // ========================================

                    if (results.length > 0) {

                        const updateSql = `
                            UPDATE profiles
                            SET
                                skills = ?,
                                experience = ?,
                                bio = ?
                            WHERE user_id = ?
                        `;

                        db.query(
                            updateSql,
                            [
                                skills || null,
                                experience || null,
                                bio || null,
                                userId
                            ],
                            (err) => {

                                if (err) {

                                    console.error(err);

                                    return res.status(500).json({
                                        success: false,
                                        message:
                                            "Failed to update profile."
                                    });

                                }

                                res.json({
                                    success: true,
                                    message:
                                        "Profile updated successfully!"
                                });

                            }
                        );

                    }

                    // ========================================
                    // CREATE NEW PROFILE
                    // ========================================

                    else {

                        const insertSql = `
                            INSERT INTO profiles
                            (
                                user_id,
                                skills,
                                experience,
                                bio
                            )
                            VALUES (?, ?, ?, ?)
                        `;

                        db.query(
                            insertSql,
                            [
                                userId,
                                skills || null,
                                experience || null,
                                bio || null
                            ],
                            (err) => {

                                if (err) {

                                    console.error(err);

                                    return res.status(500).json({
                                        success: false,
                                        message:
                                            "Failed to create profile."
                                    });

                                }

                                res.json({
                                    success: true,
                                    message:
                                        "Profile updated successfully!"
                                });

                            }
                        );

                    }

                }
            );

        }
    );

});


module.exports = router;