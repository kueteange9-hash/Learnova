const express = require("express");
const cors = require("cors");
const path = require("path");

// Resolve the backend environment file relative to this file so startup works
// whether the process is launched from the repository root or backend/.
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const authRoutes = require("./routes/auth");
const postRoutes = require("./routes/post");
const workshopRoutes = require("./routes/workshops");
const specialistRoutes = require("./routes/specialists");
const appointmentRoutes = require("./routes/appointments");
const notificationRoutes = require("./routes/notifications");
const adminRoutes = require("./routes/admin");

const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// ==========================
// HEALTH CHECK
// ==========================

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Learnova backend is running",
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Backend and API are working",
  });
});

// ==========================
// AUTH ROUTES
// ==========================

app.use("/api/auth", authRoutes);
app.use("/api/learners", require("./routes/learners"));
app.use("/api/posts", postRoutes);
app.use("/api/follows", require("./routes/follows"));
app.use("/api/workshops", workshopRoutes);
app.use("/api/specialists", specialistRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/messages", require("./routes/messages"));
app.use("/api/domains", require("./routes/domains"));
app.use("/api/support", require("./routes/support"));
app.use("/api/admin", adminRoutes);
app.use("/api/ai", require("./routes/ai"));

const { initDefaults } = require("./lib/initDefaults");

// ==========================
// SERVER
// ==========================

const PORT = process.env.PORT || 3001;

app.listen(PORT, (error) => {
  if (error) {
    if (error.code === "EADDRINUSE") {
      console.error(`Cannot start Learnova: port ${PORT} is already in use. Stop the existing backend before running npm start again.`);
    } else {
      console.error("Failed to start Learnova:", error);
    }
    process.exitCode = 1;
    return;
  }
  console.log(`Learnova backend running on http://localhost:${PORT}`);
  initDefaults().catch(err => console.error("Init defaults error:", err));
});
