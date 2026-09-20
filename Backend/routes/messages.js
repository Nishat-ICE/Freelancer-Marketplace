const express = require("express");
const db = require("../db");

const router = express.Router();


/* =========================
   GET CONTACTS
========================= */

router.get("/users/:userId", (req, res) => {

    const userId = req.params.userId;

    const sql = `
        SELECT
            user_id,
            name,
            email,
            role
        FROM users
        WHERE user_id != ?
        AND role != 'admin'
        ORDER BY name ASC
    `;

    db.query(
        sql,
        [userId],
        (err, results) => {

            if (err) {

                console.error(
                    "Contacts Error:",
                    err
                );

                return res.status(500).json({
                    success: false,
                    message:
                        "Failed to load contacts."
                });
            }

            res.json({
                success: true,
                users: results
            });

        }
    );
});


/* =========================
   GET CONVERSATION
========================= */

router.get(
    "/conversation/:userId/:otherUserId",
    (req, res) => {

        const userId =
            req.params.userId;

        const otherUserId =
            req.params.otherUserId;

        const sql = `
            SELECT
                m.message_id,
                m.sender_id,
                m.receiver_id,
                m.project_id,
                m.message_text,
                m.sent_time,

                sender.name AS sender_name,
                receiver.name AS receiver_name

            FROM messages m

            JOIN users sender
                ON m.sender_id = sender.user_id

            JOIN users receiver
                ON m.receiver_id = receiver.user_id

            WHERE
                (
                    m.sender_id = ?
                    AND
                    m.receiver_id = ?
                )

                OR

                (
                    m.sender_id = ?
                    AND
                    m.receiver_id = ?
                )

            ORDER BY m.sent_time ASC
        `;

        db.query(
            sql,
            [
                userId,
                otherUserId,
                otherUserId,
                userId
            ],
            (err, results) => {

                if (err) {

                    console.error(
                        "Conversation Error:",
                        err
                    );

                    return res.status(500).json({
                        success: false,
                        message:
                            "Failed to load conversation."
                    });
                }

                res.json({
                    success: true,
                    messages: results
                });

            }
        );
    }
);


/* =========================
   SEND MESSAGE
========================= */

router.post("/", (req, res) => {

    const {
        sender_id,
        receiver_id,
        project_id,
        message_text
    } = req.body;


    /* =========================
       VALIDATION
    ========================= */

    if (
        !sender_id ||
        !receiver_id ||
        !message_text ||
        !message_text.trim()
    ) {

        return res.status(400).json({
            success: false,
            message:
                "Message cannot be empty."
        });
    }


    /* =========================
       CHECK SELF MESSAGE
    ========================= */

    if (
        Number(sender_id) ===
        Number(receiver_id)
    ) {

        return res.status(400).json({
            success: false,
            message:
                "You cannot message yourself."
        });
    }


    /* =========================
       GET SENDER INFORMATION
    ========================= */

    const senderSql = `
        SELECT
            user_id,
            name,
            role
        FROM users
        WHERE user_id = ?
    `;


    db.query(
        senderSql,
        [sender_id],
        (err, senders) => {

            if (err) {

                console.error(
                    "Sender Check Error:",
                    err
                );

                return res.status(500).json({
                    success: false,
                    message:
                        "Database error."
                });
            }


            if (senders.length === 0) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Sender not found."
                });
            }


            const sender =
                senders[0];


            /* =========================
               CHECK RECEIVER
            ========================= */

            const userSql = `
                SELECT
                    user_id,
                    name
                FROM users
                WHERE user_id = ?
            `;


            db.query(
                userSql,
                [receiver_id],
                (err, users) => {

                    if (err) {

                        console.error(
                            "Receiver Check Error:",
                            err
                        );

                        return res.status(500).json({
                            success: false,
                            message:
                                "Database error."
                        });
                    }


                    if (users.length === 0) {

                        return res.status(404).json({
                            success: false,
                            message:
                                "Receiver not found."
                        });
                    }


                    /* =========================
                       INSERT MESSAGE
                    ========================= */

                    const messageSql = `
                        INSERT INTO messages
                        (
                            sender_id,
                            receiver_id,
                            project_id,
                            message_text
                        )
                        VALUES (?, ?, ?, ?)
                    `;


                    db.query(
                        messageSql,
                        [
                            sender_id,
                            receiver_id,
                            project_id || null,
                            message_text.trim()
                        ],
                        (err, result) => {

                            if (err) {

                                console.error(
                                    "Send Message Error:",
                                    err
                                );

                                return res.status(500).json({
                                    success: false,
                                    message:
                                        "Failed to send message."
                                });
                            }


                            /* =========================
                               CREATE NOTIFICATION
                            ========================= */

                            const notificationSql = `
                                INSERT INTO notifications
                                (
                                    user_id,
                                    message,
                                    status
                                )
                                VALUES (?, ?, 'unread')
                            `;

console.log("🔥 NEW MESSAGE NOTIFICATION CODE RUNNING:", sender.name);
                            const notificationMessage =
                                `💬 ${sender.name} sent you a new message.`;


                            db.query(
                                notificationSql,
                                [
                                    receiver_id,
                                    notificationMessage
                                ],
                                (notificationError) => {

                                    if (notificationError) {

                                        console.error(
                                            "Notification Error:",
                                            notificationError
                                        );

                                    }


                                    /* =========================
                                       FINAL RESPONSE
                                    ========================= */

                                    res.status(201).json({

                                        success: true,

                                        message:
                                            "Message sent successfully!",

                                        messageId:
                                            result.insertId

                                    });

                                }
                            );

                        }
                    );

                }
            );

        }
    );

});


module.exports = router;