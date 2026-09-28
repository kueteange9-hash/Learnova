require("dotenv").config();

const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const postRoutes = require("./routes/post");
const workshopRoutes = require("./routes/workshops");
const specialistRoutes = require("./routes/specialists");
const aiRoutes = require("./routes/ai");
const onboardingRoutes = require("./routes/onboarding");

const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.json());
app.use("/uploads", express.static("uploads"));

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
app.use("/api/posts", postRoutes);
app.use("/api/workshops", workshopRoutes);
app.use("/api/specialists", specialistRoutes);

// ==========================
// AI GUIDANCE CHAT + ONBOARDING
// ==========================

app.use("/api/ai", aiRoutes);
app.use("/api/onboarding", onboardingRoutes);

// ==========================
// 404 + ERROR HANDLERS
// ==========================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

app.use((error, req, res, next) => {
  console.error("UNHANDLED SERVER ERROR:", error);

  if (res.headersSent) {
    return next(error);
  }

  return res.status(error.status || 500).json({
    success: false,
    message: "Internal server error",
  });
});

// ==========================
// SERVER
// ==========================

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Learnova backend running on http://localhost:${PORT}`);
});
