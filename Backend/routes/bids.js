const express = require("express");
const db = require("../db");

const router = express.Router();


/* =====================================================
   GET ALL BIDS OF A PROJECT
===================================================== */

router.get("/project/:projectId", (req, res) => {

    const projectId = req.params.projectId;

    const sql = `
        SELECT 
            b.bid_id,
            b.project_id,
            b.freelancer_id,
            b.bid_amount,
            b.proposal,
            b.status,
            b.bid_date,
            u.name AS freelancer_name,
            u.email AS freelancer_email
        FROM bids b
        JOIN users u
            ON b.freelancer_id = u.user_id
        WHERE b.project_id = ?
        ORDER BY b.bid_date DESC
    `;

    db.query(sql, [projectId], (err, results) => {

        if (err) {

            console.error(
                "Get Project Bids Error:",
                err
            );

            return res.status(500).json({
                success: false,
                message: "Failed to load bids."
            });

        }

        res.json({
            success: true,
            bids: results
        });

    });

});



/* =====================================================
   GET MY BIDS
===================================================== */

router.get("/my/:userId", (req, res) => {

    const userId = req.params.userId;

    const sql = `
        SELECT
            b.bid_id,
            b.project_id,
            b.freelancer_id,
            b.bid_amount,
            b.proposal,
            b.status,
            b.bid_date,

            p.title AS project_title,
            p.description AS project_description,
            p.budget AS project_budget,
            p.deadline,
            p.status AS project_status,

            u.name AS client_name,

            c.category_name

        FROM bids b

        JOIN projects p
            ON b.project_id = p.project_id

        JOIN users u
            ON p.client_id = u.user_id

        LEFT JOIN categories c
            ON p.category_id = c.category_id

        WHERE b.freelancer_id = ?

        ORDER BY b.bid_date DESC
    `;

    db.query(sql, [userId], (err, results) => {

        if (err) {

            console.error(
                "My Bids Error:",
                err
            );

            return res.status(500).json({
                success: false,
                message: "Failed to load your bids."
            });

        }

        res.json({
            success: true,
            bids: results
        });

    });

});



/* =====================================================
   PLACE BID
===================================================== */

router.post("/", (req, res) => {

    const {
        project_id,
        freelancer_id,
        bid_amount,
        proposal
    } = req.body;


    /* =================================================
       VALIDATION
    ================================================= */

    if (
        !project_id ||
        !freelancer_id ||
        !bid_amount ||
        !proposal
    ) {

        return res.status(400).json({
            success: false,
            message: "All bid fields are required."
        });

    }



    /* =================================================
       CHECK FREELANCER
    ================================================= */

    const freelancerSql = `
        SELECT
            user_id,
            name,
            role
        FROM users
        WHERE user_id = ?
    `;

    db.query(
        freelancerSql,
        [freelancer_id],
        (err, freelancerResults) => {

            if (err) {

                console.error(
                    "Freelancer Check Error:",
                    err
                );

                return res.status(500).json({
                    success: false,
                    message: "Database error."
                });

            }


            if (freelancerResults.length === 0) {

                return res.status(404).json({
                    success: false,
                    message: "Freelancer not found."
                });

            }


            const freelancer =
                freelancerResults[0];


            if (freelancer.role !== "freelancer") {

                return res.status(403).json({
                    success: false,
                    message: "Only freelancers can place bids."
                });

            }



            /* =================================================
               CHECK PROJECT
            ================================================= */

            const projectSql = `
                SELECT
                    project_id,
                    client_id,
                    title,
                    status
                FROM projects
                WHERE project_id = ?
            `;

            db.query(
                projectSql,
                [project_id],
                (err, projects) => {

                    if (err) {

                        console.error(
                            "Project Check Error:",
                            err
                        );

                        return res.status(500).json({
                            success: false,
                            message: "Database error."
                        });

                    }


                    if (projects.length === 0) {

                        return res.status(404).json({
                            success: false,
                            message: "Project not found."
                        });

                    }


                    const project =
                        projects[0];



                    /* =================================================
                       CHECK PROJECT STATUS
                    ================================================= */

                    if (project.status !== "open") {

                        return res.status(400).json({
                            success: false,
                            message:
                                "This project is no longer open for bidding."
                        });

                    }



                    /* =================================================
                       CLIENT CANNOT BID ON OWN PROJECT
                    ================================================= */

                    if (
                        Number(project.client_id) ===
                        Number(freelancer_id)
                    ) {

                        return res.status(400).json({
                            success: false,
                            message:
                                "You cannot bid on your own project."
                        });

                    }



                    /* =================================================
                       CHECK DUPLICATE BID
                    ================================================= */

                    const duplicateSql = `
                        SELECT
                            bid_id
                        FROM bids
                        WHERE project_id = ?
                        AND freelancer_id = ?
                    `;

                    db.query(
                        duplicateSql,
                        [
                            project_id,
                            freelancer_id
                        ],
                        (err, existing) => {

                            if (err) {

                                console.error(
                                    "Duplicate Bid Check Error:",
                                    err
                                );

                                return res.status(500).json({
                                    success: false,
                                    message: "Database error."
                                });

                            }


                            if (existing.length > 0) {

                                return res.status(400).json({
                                    success: false,
                                    message:
                                        "You have already placed a bid on this project."
                                });

                            }



                            /* =================================================
                               INSERT BID
                            ================================================= */

                            const insertSql = `
                                INSERT INTO bids
                                (
                                    project_id,
                                    freelancer_id,
                                    bid_amount,
                                    proposal
                                )
                                VALUES (?, ?, ?, ?)
                            `;

                            db.query(
                                insertSql,
                                [
                                    project_id,
                                    freelancer_id,
                                    bid_amount,
                                    proposal
                                ],
                                (err, result) => {

                                    if (err) {

                                        console.error(
                                            "Insert Bid Error:",
                                            err
                                        );

                                        return res.status(500).json({
                                            success: false,
                                            message:
                                                "Failed to place bid."
                                        });

                                    }



                                    /* =================================================
                                       NOTIFICATION TO CLIENT
                                    ================================================= */

                                    const notificationSql = `
                                        INSERT INTO notifications
                                        (
                                            user_id,
                                            message,
                                            status
                                        )
                                        VALUES (?, ?, 'unread')
                                    `;


                                    /*
                                      Notification now includes:

                                      - Freelancer name
                                      - Bid amount
                                      - Project title
                                    */

                                    const notificationMessage =
                                        `🔔 ${freelancer.name} placed a bid of $${bid_amount} on your project "${project.title}".`;


                                    db.query(
                                        notificationSql,
                                        [
                                            project.client_id,
                                            notificationMessage
                                        ],
                                        (notificationErr) => {

                                            if (notificationErr) {

                                                console.error(
                                                    "Notification Error:",
                                                    notificationErr
                                                );

                                            }


                                            /* =================================================
                                               FINAL RESPONSE
                                            ================================================= */

                                            res.status(201).json({
                                                success: true,
                                                message:
                                                    "Bid placed successfully!",
                                                bidId:
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

        }
    );

});


module.exports = router;