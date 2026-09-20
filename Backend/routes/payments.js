const express = require("express");
const db = require("../db");

const router = express.Router();


// ========================================
// GET MY PAYMENTS
// ========================================

router.get("/my/:userId", (req, res) => {

    const userId = req.params.userId;

    const sql = `
        SELECT
            pay.payment_id,
            pay.payment_date,
            pay.amount,
            pay.method,
            pay.status,

            c.contract_id,
            c.project_id,
            c.freelancer_id,
            c.start_date,
            c.end_date,
            c.payment_amount,
            c.status AS contract_status,

            p.title AS project_title,
            p.client_id,

            client.name AS client_name,
            freelancer.name AS freelancer_name

        FROM payments pay

        JOIN contracts c
            ON pay.contract_id = c.contract_id

        JOIN projects p
            ON c.project_id = p.project_id

        JOIN users client
            ON p.client_id = client.user_id

        JOIN users freelancer
            ON c.freelancer_id = freelancer.user_id

        WHERE
            p.client_id = ?
            OR c.freelancer_id = ?

        ORDER BY pay.payment_date DESC
    `;

    db.query(
        sql,
        [userId, userId],
        (err, results) => {

            if (err) {
                console.error("Payments Error:", err);

                return res.status(500).json({
                    success: false,
                    message: "Failed to load payments."
                });
            }

            res.json({
                success: true,
                payments: results
            });
        }
    );
});


// ========================================
// GET PAYMENT SUMMARY
// ========================================

router.get("/summary/:userId", (req, res) => {

    const userId = req.params.userId;

    const sql = `
        SELECT

            COUNT(pay.payment_id) AS total_payments,

            COALESCE(
                SUM(
                    CASE
                        WHEN pay.status = 'paid'
                        THEN pay.amount
                        ELSE 0
                    END
                ),
                0
            ) AS total_paid,

            COALESCE(
                SUM(
                    CASE
                        WHEN pay.status = 'pending'
                        THEN pay.amount
                        ELSE 0
                    END
                ),
                0
            ) AS total_pending

        FROM payments pay

        JOIN contracts c
            ON pay.contract_id = c.contract_id

        JOIN projects p
            ON c.project_id = p.project_id

        WHERE
            p.client_id = ?
            OR c.freelancer_id = ?
    `;

    db.query(
        sql,
        [userId, userId],
        (err, results) => {

            if (err) {
                console.error(
                    "Payment Summary Error:",
                    err
                );

                return res.status(500).json({
                    success: false,
                    message: "Failed to load payment summary."
                });
            }

            res.json({
                success: true,
                summary: results[0]
            });
        }
    );
});


// ========================================
// GET ACTIVE CONTRACTS
// ========================================

router.get("/contracts/:userId", (req, res) => {

    const userId = req.params.userId;

    const sql = `
        SELECT
            c.contract_id,
            c.project_id,
            c.freelancer_id,
            c.payment_amount,
            c.status AS contract_status,

            p.title AS project_title,
            p.client_id,

            client.name AS client_name,
            freelancer.name AS freelancer_name

        FROM contracts c

        JOIN projects p
            ON c.project_id = p.project_id

        JOIN users client
            ON p.client_id = client.user_id

        JOIN users freelancer
            ON c.freelancer_id = freelancer.user_id

        WHERE
            c.status = 'active'
            AND (
                p.client_id = ?
                OR c.freelancer_id = ?
            )

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
                    message: "Failed to load contracts."
                });
            }

            res.json({
                success: true,
                contracts: results
            });
        }
    );
});


// ========================================
// CREATE PAYMENT
// ========================================

router.post("/", (req, res) => {

    const {
        user_id,
        contract_id,
        amount,
        method
    } = req.body;


    // ----------------------------------------
    // BASIC VALIDATION
    // ----------------------------------------

    if (
        !user_id ||
        !contract_id ||
        amount === undefined ||
        amount === null ||
        !method
    ) {

        return res.status(400).json({
            success: false,
            message:
                "User, contract, amount and payment method are required."
        });
    }


    const paymentAmount = Number(amount);


    if (
        isNaN(paymentAmount) ||
        paymentAmount <= 0
    ) {

        return res.status(400).json({
            success: false,
            message: "Payment amount must be greater than 0."
        });
    }


    // ----------------------------------------
    // VALID PAYMENT METHODS
    // ----------------------------------------

    const validMethods = [
        "card",
        "bkash",
        "bank",
        "cash"
    ];


    if (!validMethods.includes(method)) {

        return res.status(400).json({
            success: false,
            message: "Invalid payment method."
        });
    }


    // ----------------------------------------
    // CHECK CONTRACT + USER
    // ----------------------------------------

    const contractSql = `
        SELECT
            c.contract_id,
            c.project_id,
            c.freelancer_id,
            c.payment_amount,
            c.status AS contract_status,

            p.client_id,
            p.title AS project_title

        FROM contracts c

        JOIN projects p
            ON c.project_id = p.project_id

        WHERE c.contract_id = ?
    `;


    db.query(
        contractSql,
        [contract_id],
        (err, contracts) => {

            if (err) {

                console.error(
                    "Contract Check Error:",
                    err
                );

                return res.status(500).json({
                    success: false,
                    message: "Database error."
                });
            }


            if (contracts.length === 0) {

                return res.status(404).json({
                    success: false,
                    message: "Contract not found."
                });
            }


            const contract = contracts[0];


            // ----------------------------------------
            // USER AUTHORIZATION
            // ----------------------------------------

            if (
                Number(contract.client_id) !== Number(user_id) &&
                Number(contract.freelancer_id) !== Number(user_id)
            ) {

                return res.status(403).json({
                    success: false,
                    message:
                        "You are not authorized to make payment for this contract."
                });
            }


            // ----------------------------------------
            // CONTRACT STATUS
            // ----------------------------------------

            if (contract.contract_status !== "active") {

                return res.status(400).json({
                    success: false,
                    message:
                        "Payment can only be made for an active contract."
                });
            }


            // ----------------------------------------
            // CHECK PAYMENT AMOUNT
            // ----------------------------------------

            const contractAmount =
                Number(contract.payment_amount || 0);


            if (
                contractAmount > 0 &&
                paymentAmount > contractAmount
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        `Payment cannot exceed the contract amount of $${contractAmount.toFixed(2)}.`
                });
            }


            // ----------------------------------------
            // INSERT PAYMENT
            // ----------------------------------------

            const insertSql = `
                INSERT INTO payments
                (
                    contract_id,
                    amount,
                    method,
                    status
                )
                VALUES (?, ?, ?, 'paid')
            `;


            db.query(
                insertSql,
                [
                    contract_id,
                    paymentAmount,
                    method
                ],
                (err, result) => {

                    if (err) {

                        console.error(
                            "Create Payment Error:",
                            err
                        );

                        return res.status(500).json({
                            success: false,
                            message:
                                "Payment failed."
                        });
                    }


                    // ----------------------------------------
                    // NOTIFICATION
                    // ----------------------------------------

                    const receiverId =
                        Number(contract.client_id) === Number(user_id)
                            ? contract.freelancer_id
                            : contract.client_id;


                    const notificationMessage =
                        `Payment of $${paymentAmount.toFixed(2)} was recorded for project "${contract.project_title}".`;


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
                            receiverId,
                            notificationMessage
                        ],
                        (notificationError) => {

                            if (notificationError) {
                                console.error(
                                    "Payment Notification Error:",
                                    notificationError
                                );
                            }


                            return res.status(201).json({
                                success: true,
                                message:
                                    "Payment recorded successfully!",
                                paymentId:
                                    result.insertId
                            });
                        }
                    );
                }
            );
        }
    );
});


module.exports = router;