const express = require("express");
const db = require("../db");

const router = express.Router();


/* =====================================================
   DASHBOARD STATISTICS
===================================================== */

router.get("/:userId", (req, res) => {

    const userId = req.params.userId;

    const userSql = `
        SELECT user_id, name, email, role
        FROM users
        WHERE user_id = ?
    `;

    db.query(userSql, [userId], (err, users) => {

        if (err) {
            console.error(err);

            return res.status(500).json({
                success: false,
                message: "Database error."
            });
        }

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        const user = users[0];

        /* ================= CLIENT ================= */

        if (user.role === "client") {

            const sql = `
                SELECT

                (
                    SELECT COUNT(*)
                    FROM projects
                    WHERE client_id = ?
                ) AS total_projects,

                (
                    SELECT COUNT(*)
                    FROM projects
                    WHERE client_id = ?
                    AND status = 'open'
                ) AS open_projects,

                (
                    SELECT COUNT(*)
                    FROM projects
                    WHERE client_id = ?
                    AND status = 'completed'
                ) AS completed_projects,

                (
                    SELECT COUNT(*)
                    FROM bids b
                    JOIN projects p
                    ON b.project_id = p.project_id
                    WHERE p.client_id = ?
                ) AS total_bids
            `;

            db.query(
                sql,
                [
                    userId,
                    userId,
                    userId,
                    userId
                ],
                (err, stats) => {

                    if (err) {
                        console.error(err);

                        return res.status(500).json({
                            success: false,
                            message: "Failed to load dashboard."
                        });
                    }

                    res.json({
                        success: true,
                        user,
                        stats: stats[0]
                    });
                }
            );

            return;
        }


        /* ================= FREELANCER ================= */

        if (user.role === "freelancer") {

            const sql = `
                SELECT

                (
                    SELECT COUNT(*)
                    FROM bids
                    WHERE freelancer_id = ?
                ) AS total_bids,

                (
                    SELECT COUNT(*)
                    FROM bids
                    WHERE freelancer_id = ?
                    AND status = 'pending'
                ) AS pending_bids,

                (
                    SELECT COUNT(*)
                    FROM bids
                    WHERE freelancer_id = ?
                    AND status = 'accepted'
                ) AS accepted_bids,

                (
                    SELECT COUNT(*)
                    FROM contracts
                    WHERE freelancer_id = ?
                    AND status = 'completed'
                ) AS completed_projects
            `;

            db.query(
                sql,
                [
                    userId,
                    userId,
                    userId,
                    userId
                ],
                (err, stats) => {

                    if (err) {
                        console.error(err);

                        return res.status(500).json({
                            success: false,
                            message: "Failed to load dashboard."
                        });
                    }

                    res.json({
                        success: true,
                        user,
                        stats: stats[0]
                    });
                }
            );

            return;
        }


        /* ================= ADMIN ================= */

        const sql = `
            SELECT

            (
                SELECT COUNT(*)
                FROM users
            ) AS total_users,

            (
                SELECT COUNT(*)
                FROM projects
            ) AS total_projects,

            (
                SELECT COUNT(*)
                FROM bids
            ) AS total_bids,

            (
                SELECT COUNT(*)
                FROM contracts
            ) AS total_contracts
        `;

        db.query(sql, (err, stats) => {

            if (err) {
                console.error(err);

                return res.status(500).json({
                    success: false,
                    message: "Failed to load dashboard."
                });
            }

            res.json({
                success: true,
                user,
                stats: stats[0]
            });
        });

    });

});


module.exports = router;