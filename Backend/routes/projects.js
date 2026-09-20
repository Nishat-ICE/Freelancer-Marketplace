const express = require("express");
const db = require("../db");

const router = express.Router();


/* =========================
   GET ALL PROJECTS
========================= */

router.get("/", (req, res) => {

    const sql = `
        SELECT
            p.project_id,
            p.client_id,
            p.category_id,
            p.title,
            p.description,
            p.budget,
            p.deadline,
            p.status,
            p.created_at,

            u.name AS client_name,

            c.category_name

        FROM projects p

        JOIN users u
            ON p.client_id = u.user_id

        LEFT JOIN categories c
            ON p.category_id = c.category_id

        ORDER BY p.created_at DESC
    `;

    db.query(sql, (err, results) => {

        if (err) {

            console.error(err);

            return res.status(500).json({
                success: false,
                message:
                    "Failed to load projects."
            });
        }

        res.json({
            success: true,
            projects: results
        });

    });

});


/* =========================
   GET MY PROJECTS
========================= */

router.get("/my/:userId", (req, res) => {

    const userId = req.params.userId;

    const sql = `
        SELECT
            p.project_id,
            p.client_id,
            p.category_id,
            p.title,
            p.description,
            p.budget,
            p.deadline,
            p.status,
            p.created_at,

            u.name AS client_name,

            c.category_name

        FROM projects p

        JOIN users u
            ON p.client_id = u.user_id

        LEFT JOIN categories c
            ON p.category_id = c.category_id

        WHERE p.client_id = ?

        ORDER BY p.created_at DESC
    `;

    db.query(sql, [userId], (err, results) => {

        if (err) {

            console.error(err);

            return res.status(500).json({
                success: false,
                message:
                    "Failed to load your projects."
            });
        }

        res.json({
            success: true,
            projects: results
        });

    });

});


/* =========================
   CREATE PROJECT
========================= */

router.post("/", (req, res) => {

    const {
        client_id,
        category_id,
        title,
        description,
        budget,
        deadline
    } = req.body;


    if (
        !client_id ||
        !title ||
        !description ||
        !budget ||
        !deadline
    ) {

        return res.status(400).json({
            success: false,
            message:
                "All project fields are required."
        });
    }


    /* Check client */

    const userSql = `
        SELECT
            user_id,
            role
        FROM users
        WHERE user_id = ?
    `;


    db.query(
        userSql,
        [client_id],
        (err, users) => {

            if (err) {

                console.error(err);

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
                        "User not found."
                });
            }


            if (users[0].role !== "client") {

                return res.status(403).json({
                    success: false,
                    message:
                        "Only clients can create projects."
                });
            }


            const sql = `
                INSERT INTO projects
                (
                    client_id,
                    category_id,
                    title,
                    description,
                    budget,
                    deadline
                )
                VALUES (?, ?, ?, ?, ?, ?)
            `;


            db.query(
                sql,
                [
                    client_id,
                    category_id || null,
                    title,
                    description,
                    budget,
                    deadline
                ],
                (err, result) => {

                    if (err) {

                        console.error(err);

                        return res.status(500).json({
                            success: false,
                            message:
                                "Failed to create project."
                        });
                    }


                    res.status(201).json({

                        success: true,

                        message:
                            "Project created successfully!",

                        projectId:
                            result.insertId

                    });

                }
            );

        }
    );

});


/* =========================
   COMPLETE PROJECT
========================= */

router.put(
    "/:projectId/complete",
    (req, res) => {

        const projectId =
            req.params.projectId;

        const { user_id } = req.body;


        if (!user_id) {

            return res.status(400).json({
                success: false,
                message:
                    "User ID is required."
            });
        }


        const checkSql = `
            SELECT
                p.project_id,
                p.client_id,
                p.status,

                c.contract_id,
                c.freelancer_id

            FROM projects p

            LEFT JOIN contracts c
                ON p.project_id = c.project_id

            WHERE p.project_id = ?
        `;


        db.query(
            checkSql,
            [projectId],
            (err, results) => {

                if (err) {

                    console.error(err);

                    return res.status(500).json({
                        success: false,
                        message:
                            "Database error."
                    });
                }


                if (results.length === 0) {

                    return res.status(404).json({
                        success: false,
                        message:
                            "Project not found."
                    });
                }


                const project =
                    results[0];


                /* Only participants */

                if (
                    Number(user_id)
                    !== Number(project.client_id)
                    &&
                    Number(user_id)
                    !== Number(project.freelancer_id)
                ) {

                    return res.status(403).json({
                        success: false,
                        message:
                            "You are not part of this project."
                    });
                }


                if (
                    project.status !== "assigned"
                    &&
                    project.status !== "in_progress"
                ) {

                    return res.status(400).json({
                        success: false,
                        message:
                            "This project cannot be completed now."
                    });
                }


                /* Complete project */

                const updateProject = `
                    UPDATE projects
                    SET status = 'completed'
                    WHERE project_id = ?
                `;


                db.query(
                    updateProject,
                    [projectId],
                    (err) => {

                        if (err) {

                            console.error(err);

                            return res.status(500).json({
                                success: false,
                                message:
                                    "Failed to complete project."
                            });
                        }


                        /* Complete contract */

                        if (
                            project.contract_id
                        ) {

                            const updateContract = `
                                UPDATE contracts
                                SET status = 'completed'
                                WHERE contract_id = ?
                            `;


                            db.query(
                                updateContract,
                                [
                                    project.contract_id
                                ],
                                (err) => {

                                    if (err) {

                                        console.error(
                                            err
                                        );

                                    }

                                    createCompletionNotifications(
                                        project,
                                        res
                                    );

                                }
                            );

                        } else {

                            createCompletionNotifications(
                                project,
                                res
                            );

                        }

                    }
                );

            }
        );

    }
);


/* =========================
   COMPLETION NOTIFICATIONS
========================= */

function createCompletionNotifications(
    project,
    res
) {

    const message =
        "Project has been completed. You can now leave a review.";


    const users = [
        project.client_id,
        project.freelancer_id
    ];


    const sql = `
        INSERT INTO notifications
        (
            user_id,
            message,
            status
        )
        VALUES (?, ?, 'unread')
    `;


    let done = 0;


    users.forEach(userId => {

        if (!userId) {

            done++;

            return;

        }


        db.query(
            sql,
            [userId, message],
            (err) => {

                if (err) {

                    console.error(
                        "Notification Error:",
                        err
                    );

                }


                done++;


                if (
                    done === users.length
                ) {

                    res.json({

                        success: true,

                        message:
                            "Project completed successfully!"

                    });

                }

            }
        );

    });

}


module.exports = router;