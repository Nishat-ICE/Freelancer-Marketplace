const express = require("express");
const db = require("../db");

const router = express.Router();


/* =========================
   GET MY CONTRACTS
========================= */

router.get("/my/:userId", (req, res) => {

    const userId = req.params.userId;

    const sql = `
        SELECT
            c.contract_id,
            c.project_id,
            c.freelancer_id,
            c.start_date,
            c.end_date,
            c.payment_amount,
            c.status,
            c.created_at,

            p.title AS project_title,
            p.description AS project_description,
            p.client_id,

            client.name AS client_name,
            client.email AS client_email,

            freelancer.name AS freelancer_name,
            freelancer.email AS freelancer_email

        FROM contracts c

        JOIN projects p
            ON c.project_id = p.project_id

        JOIN users client
            ON p.client_id = client.user_id

        JOIN users freelancer
            ON c.freelancer_id = freelancer.user_id

        WHERE p.client_id = ?
           OR c.freelancer_id = ?

        ORDER BY c.created_at DESC
    `;


    db.query(
        sql,
        [userId, userId],
        (err, results) => {

            if (err) {

                console.error(
                    "Contracts Error:",
                    err
                );

                return res.status(500).json({
                    success: false,
                    message:
                        "Failed to load contracts."
                });
            }


            res.json({
                success: true,
                contracts: results
            });

        }
    );
});


/* =========================
   ACCEPT BID + CREATE CONTRACT
========================= */

router.post("/accept-bid", (req, res) => {

    const {
        bid_id,
        client_id,
        start_date,
        end_date
    } = req.body;


    if (!bid_id || !client_id) {

        return res.status(400).json({
            success: false,
            message:
                "Bid ID and Client ID are required."
        });
    }


    /* Get bid */

    const bidSql = `
        SELECT
            b.bid_id,
            b.project_id,
            b.freelancer_id,
            b.bid_amount,
            b.status AS bid_status,

            p.client_id,
            p.title AS project_title,
            p.status AS project_status

        FROM bids b

        JOIN projects p
            ON b.project_id = p.project_id

        WHERE b.bid_id = ?
    `;


    db.query(
        bidSql,
        [bid_id],
        (err, results) => {

            if (err) {

                console.error(err);

                return res.status(500).json({
                    success: false,
                    message: "Database error."
                });
            }


            if (results.length === 0) {

                return res.status(404).json({
                    success: false,
                    message: "Bid not found."
                });
            }


            const bid = results[0];


            /* Check owner */

            if (
                Number(bid.client_id)
                !== Number(client_id)
            ) {

                return res.status(403).json({
                    success: false,
                    message:
                        "You can only accept bids for your own projects."
                });
            }


            /* Check bid */

            if (bid.bid_status !== "pending") {

                return res.status(400).json({
                    success: false,
                    message:
                        "This bid has already been processed."
                });
            }


            /* Check project */

            if (bid.project_status !== "open") {

                return res.status(400).json({
                    success: false,
                    message:
                        "This project is no longer open."
                });
            }


            /* Create contract */

            const contractSql = `
                INSERT INTO contracts
                (
                    project_id,
                    freelancer_id,
                    start_date,
                    end_date,
                    payment_amount,
                    status
                )
                VALUES (?, ?, ?, ?, ?, 'active')
            `;


            db.query(
                contractSql,
                [
                    bid.project_id,
                    bid.freelancer_id,
                    start_date || null,
                    end_date || null,
                    bid.bid_amount
                ],
                (err, contractResult) => {

                    if (err) {

                        console.error(
                            "Contract Creation Error:",
                            err
                        );

                        return res.status(500).json({
                            success: false,
                            message:
                                "Failed to create contract."
                        });
                    }


                    const contractId =
                        contractResult.insertId;


                    /* Accept bid */

                    const acceptSql = `
                        UPDATE bids
                        SET status = 'accepted'
                        WHERE bid_id = ?
                    `;


                    db.query(
                        acceptSql,
                        [bid_id],
                        (err) => {

                            if (err) {

                                return res.status(500).json({
                                    success: false,
                                    message:
                                        "Contract created but bid update failed."
                                });
                            }


                            /* Reject other bids */

                            const rejectSql = `
                                UPDATE bids
                                SET status = 'rejected'
                                WHERE project_id = ?
                                AND bid_id != ?
                                AND status = 'pending'
                            `;


                            db.query(
                                rejectSql,
                                [
                                    bid.project_id,
                                    bid_id
                                ],
                                (err) => {

                                    if (err) {

                                        console.error(
                                            "Reject Other Bids Error:",
                                            err
                                        );
                                    }


                                    /* Update project */

                                    const projectSql = `
                                        UPDATE projects
                                        SET status = 'assigned'
                                        WHERE project_id = ?
                                    `;


                                    db.query(
                                        projectSql,
                                        [bid.project_id],
                                        (err) => {

                                            if (err) {

                                                console.error(
                                                    "Project Update Error:",
                                                    err
                                                );

                                                return res.status(500).json({
                                                    success: false,
                                                    message:
                                                        "Contract created but project update failed."
                                                });
                                            }


                                            /* =========================
                                               NOTIFY FREELANCER
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


                                            const notificationMessage =
                                                `Your bid for "${bid.project_title}" has been accepted. A contract has been created.`;


                                            db.query(
                                                notificationSql,
                                                [
                                                    bid.freelancer_id,
                                                    notificationMessage
                                                ],
                                                (notificationError) => {

                                                    if (notificationError) {

                                                        console.error(
                                                            "Notification Error:",
                                                            notificationError
                                                        );

                                                    }


                                                    res.status(201).json({

                                                        success: true,

                                                        message:
                                                            "Bid accepted and contract created successfully!",

                                                        contractId:
                                                            contractId

                                                    });

                                                }
                                            );

                                        }
                                    );

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