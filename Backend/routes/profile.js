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
            p.bio,
            p.profile_photo

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
        bio,
        profile_photo
    } = req.body;


    // ========================================
    // VALIDATE NAME
    // ========================================

    if (!name || !name.trim()) {

        return res.status(400).json({
            success: false,
            message: "Name is required."
        });

    }


    // ========================================
    // VALIDATE PHOTO SIZE
    // ========================================

    if (
        profile_photo &&
        profile_photo.length > 5 * 1024 * 1024
    ) {

        return res.status(400).json({
            success: false,
            message:
                "Profile photo is too large. Please choose a smaller image."
        });

    }


    // ========================================
    // UPDATE USER NAME
    // ========================================

    const userSql = `
        UPDATE users
        SET name = ?
        WHERE user_id = ?
    `;

    db.query(
        userSql,
        [
            name.trim(),
            userId
        ],
        (err) => {

            if (err) {

                console.error(
                    "Update User Error:",
                    err
                );

                return res.status(500).json({
                    success: false,
                    message:
                        "Failed to update user."
                });

            }


            // ========================================
            // CHECK IF PROFILE EXISTS
            // ========================================

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

                        console.error(
                            "Check Profile Error:",
                            err
                        );

                        return res.status(500).json({
                            success: false,
                            message:
                                "Database error."
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
                                bio = ?,
                                profile_photo = ?
                            WHERE user_id = ?
                        `;

                        db.query(
                            updateSql,
                            [
                                skills || null,

                                experience !== undefined
                                    ? experience
                                    : null,

                                bio || null,

                                profile_photo || null,

                                userId
                            ],
                            (err) => {

                                if (err) {

                                    console.error(
                                        "Update Profile Error:",
                                        err
                                    );

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
                                bio,
                                profile_photo
                            )
                            VALUES (?, ?, ?, ?, ?)
                        `;

                        db.query(
                            insertSql,
                            [
                                userId,

                                skills || null,

                                experience !== undefined
                                    ? experience
                                    : null,

                                bio || null,

                                profile_photo || null
                            ],
                            (err) => {

                                if (err) {

                                    console.error(
                                        "Create Profile Error:",
                                        err
                                    );

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