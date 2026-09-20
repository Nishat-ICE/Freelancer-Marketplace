const express = require("express");
const db = require("../db");

const router = express.Router();


/* =========================
   GET RECEIVED REVIEWS
========================= */

router.get("/user/:userId", (req, res) => {

    const userId = req.params.userId;

    const sql = `
        SELECT
            r.review_id,
            r.rating,
            r.comment,
            r.review_date,
            r.project_id,

            reviewer.name AS reviewer_name,

            p.title AS project_title

        FROM reviews r

        JOIN users reviewer
            ON r.reviewer_id = reviewer.user_id

        LEFT JOIN projects p
            ON r.project_id = p.project_id

        WHERE r.reviewed_id = ?

        ORDER BY r.review_date DESC
    `;


    db.query(
        sql,
        [userId],
        (err, results) => {

            if (err) {

                console.error(err);

                return res.status(500).json({
                    success: false,
                    message:
                        "Failed to load reviews."
                });
            }


            res.json({
                success: true,
                reviews: results
            });

        }
    );

});


/* =========================
   GET RATING
========================= */

router.get(
    "/rating/:userId",
    (req, res) => {

        const userId =
            req.params.userId;


        const sql = `
            SELECT
                COUNT(*) AS total_reviews,
                COALESCE(
                    AVG(rating),
                    0
                ) AS average_rating

            FROM reviews

            WHERE reviewed_id = ?
        `;


        db.query(
            sql,
            [userId],
            (err, results) => {

                if (err) {

                    console.error(err);

                    return res.status(500).json({
                        success: false,
                        message:
                            "Failed to calculate rating."
                    });
                }


                res.json({

                    success: true,

                    rating:
                        results[0]

                });

            }
        );

    }
);


/* =========================
   ADD REVIEW
========================= */

router.post("/", (req, res) => {

    const {
        reviewer_id,
        reviewed_id,
        project_id,
        rating,
        comment
    } = req.body;


    if (
        !reviewer_id ||
        !reviewed_id ||
        !project_id ||
        !rating
    ) {

        return res.status(400).json({
            success: false,
            message:
                "All review fields are required."
        });
    }


    if (
        Number(reviewer_id)
        === Number(reviewed_id)
    ) {

        return res.status(400).json({
            success: false,
            message:
                "You cannot review yourself."
        });
    }


    const numericRating =
        Number(rating);


    if (
        numericRating < 1
        ||
        numericRating > 5
    ) {

        return res.status(400).json({
            success: false,
            message:
                "Rating must be between 1 and 5."
        });
    }


    /* =========================
       VERIFY CONTRACT
    ========================= */

    const contractSql = `
        SELECT
            c.contract_id,
            c.freelancer_id,
            p.client_id,
            p.status AS project_status,
            c.status AS contract_status

        FROM contracts c

        JOIN projects p
            ON c.project_id = p.project_id

        WHERE c.project_id = ?

        AND (
            (
                p.client_id = ?
                AND c.freelancer_id = ?
            )

            OR

            (
                p.client_id = ?
                AND c.freelancer_id = ?
            )
        )
    `;


    db.query(
        contractSql,
        [
            project_id,

            reviewer_id,
            reviewed_id,

            reviewed_id,
            reviewer_id
        ],
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

                return res.status(403).json({
                    success: false,
                    message:
                        "You are not a participant of this project."
                });
            }


            const contract =
                results[0];


            if (
                contract.project_status
                !== "completed"
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Reviews are available only after project completion."
                });
            }


            /* =========================
               DUPLICATE CHECK
            ========================= */

            const duplicateSql = `
                SELECT review_id

                FROM reviews

                WHERE reviewer_id = ?
                AND reviewed_id = ?
                AND project_id = ?
            `;


            db.query(
                duplicateSql,
                [
                    reviewer_id,
                    reviewed_id,
                    project_id
                ],
                (err, existing) => {

                    if (err) {

                        console.error(err);

                        return res.status(500).json({
                            success: false,
                            message:
                                "Database error."
                        });
                    }


                    if (
                        existing.length > 0
                    ) {

                        return res.status(409).json({
                            success: false,
                            message:
                                "You have already reviewed this user for this project."
                        });
                    }


                    /* =========================
                       INSERT REVIEW
                    ========================= */

                    const insertSql = `
                        INSERT INTO reviews
                        (
                            reviewer_id,
                            reviewed_id,
                            project_id,
                            rating,
                            comment
                        )
                        VALUES (?, ?, ?, ?, ?)
                    `;


                    db.query(
                        insertSql,
                        [
                            reviewer_id,
                            reviewed_id,
                            project_id,
                            numericRating,
                            comment || null
                        ],
                        (err, result) => {

                            if (err) {

                                console.error(err);

                                return res.status(500).json({
                                    success: false,
                                    message:
                                        "Failed to submit review."
                                });
                            }


                            /* Update profile rating */

                            const updateRatingSql = `
                                UPDATE profiles

                                SET rating = (

                                    SELECT COALESCE(
                                        AVG(rating),
                                        0
                                    )

                                    FROM reviews

                                    WHERE reviewed_id = ?

                                )

                                WHERE user_id = ?
                            `;


                            db.query(
                                updateRatingSql,
                                [
                                    reviewed_id,
                                    reviewed_id
                                ],
                                (ratingError) => {

                                    if (
                                        ratingError
                                    ) {

                                        console.error(
                                            ratingError
                                        );

                                    }


                                    /* Notification */

                                    const notificationSql = `
                                        INSERT INTO notifications
                                        (
                                            user_id,
                                            message,
                                            status
                                        )
                                        VALUES (?, ?, 'unread')
                                    `;


                                    db.query(
                                        notificationSql,
                                        [
                                            reviewed_id,

                                            `You received a ${numericRating}-star review.`
                                        ],
                                        () => {

                                            res.status(201).json({

                                                success: true,

                                                message:
                                                    "Review submitted successfully!",

                                                reviewId:
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