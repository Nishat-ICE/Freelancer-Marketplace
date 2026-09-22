const mysql = require("mysql2");
require("dotenv").config();


/* =========================
   MYSQL DATABASE CONNECTION
========================= */

const db = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,

    ssl: {
        rejectUnauthorized: false
    },

    charset: "utf8mb4",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});


/* =========================
   TEST DATABASE CONNECTION
========================= */

db.getConnection((err, connection) => {

    if (err) {

        console.error(
            "❌ MySQL Connection Failed!"
        );

        console.error(
            err.message
        );

        return;
    }


    console.log(
        "✅ MySQL Database Connected Successfully!"
    );


    connection.release();

});


/* =========================
   EXPORT DATABASE
========================= */

module.exports = db;