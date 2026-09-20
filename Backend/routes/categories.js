const express = require("express");
const db = require("../db");

const router = express.Router();


/* GET ALL CATEGORIES */

router.get("/", (req, res) => {

    const sql = `
        SELECT
            category_id,
            category_name
        FROM categories
        ORDER BY category_name ASC
    `;

    db.query(sql, (err, results) => {

        if (err) {
            console.error("Category Error:", err);

            return res.status(500).json({
                success: false,
                message: "Failed to load categories."
            });
        }

        res.json({
            success: true,
            categories: results
        });

    });

});


module.exports = router;