const express = require("express");
const cors = require("cors");
const path = require("path");

const db = require("./db");
const dashboardRoutes = require("./routes/dashboard");
const categoryRoutes = require("./routes/categories");
const authRoutes = require("./routes/auth");
const projectRoutes = require("./routes/projects");
const bidRoutes = require("./routes/bids");
const messageRoutes = require("./routes/messages");
const profileRoutes = require("./routes/profile");
const paymentRoutes = require("./routes/payments");
const contractRoutes = require("./routes/contracts");
const notificationRoutes = require("./routes/notifications");
const reviewRoutes = require("./routes/reviews");

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/categories", categoryRoutes);
/* Serve Frontend */
app.use(
    express.static(
        path.join(__dirname, "../Frontend")
    )
);


/* =========================
   API ROUTES
========================= */

app.use("/api/auth", authRoutes);

app.use("/api/projects", projectRoutes);

app.use("/api/bids", bidRoutes);

app.use("/api/messages", messageRoutes);

app.use("/api/profile", profileRoutes);

app.use("/api/payments", paymentRoutes);

app.use("/api/contracts", contractRoutes);

app.use("/api/notifications", notificationRoutes);

app.use("/api/reviews", reviewRoutes);


/* =========================
   HOME
========================= */

app.get("/", (req, res) => {

    res.sendFile(
        path.join(
            __dirname,
            "../Frontend/index.html"
        )
    );

});


/* =========================
   DATABASE TEST
========================= */

app.get("/api/test-db", (req, res) => {

    db.query(
        "SELECT 1 AS test",
        (err, result) => {

            if (err) {

                console.error(
                    "Database Error:",
                    err
                );

                return res.status(500).json({
                    success: false,
                    message:
                        "Database connection failed!"
                });

            }

            res.json({
                success: true,
                message:
                    "Database connection is working!",
                result
            });

        }
    );

});


/* =========================
   SERVER
========================= */

const PORT = 5000;

app.listen(PORT, () => {

    console.log(
        `🚀 Server running at http://localhost:${PORT}`
    );

});