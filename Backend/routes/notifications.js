const express = require("express");
const db = require("../db");

const router = express.Router();

/* =========================
   GET USER NOTIFICATIONS
========================= */

router.get("/:userId", (req, res) => {

    const userId = req.params.userId;

    const sql = `
        SELECT
            notification_id,
            user_id,
            message,
            status,
            created_at
        FROM notifications
        WHERE user_id = ?
        ORDER BY created_at DESC
    `;

    db.query(sql, [userId], (err, results) => {

        if (err) {
            console.error("Notifications Error:", err);

            return res.status(500).json({
                success: false,
                message: "Failed to load notifications."
            });
        }

        res.json({
            success: true,
            notifications: results
        });
    });
});


/* =========================
   MARK ONE AS READ
========================= */

router.put("/:notificationId/read", (req, res) => {

    const notificationId = req.params.notificationId;

    const sql = `
        UPDATE notifications
        SET status = 'read'
        WHERE notification_id = ?
    `;

    db.query(sql, [notificationId], (err) => {

        if (err) {
            console.error("Read Notification Error:", err);

            return res.status(500).json({
                success: false,
                message: "Failed to update notification."
            });
        }

        res.json({
            success: true,
            message: "Notification marked as read."
        });
    });
});


/* =========================
   MARK ALL AS READ
========================= */

router.put("/user/:userId/read-all", (req, res) => {

    const userId = req.params.userId;

    const sql = `
        UPDATE notifications
        SET status = 'read'
        WHERE user_id = ?
        AND status = 'unread'
    `;

    db.query(sql, [userId], (err) => {

        if (err) {
            console.error("Read All Error:", err);

            return res.status(500).json({
                success: false,
                message: "Failed to mark notifications as read."
            });
        }

        res.json({
            success: true,
            message: "All notifications marked as read."
        });
    });
});


module.exports = router;