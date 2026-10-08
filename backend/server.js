require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");

const { seedIfNeeded } = require("./utils/db");

const authRoutes = require("./routes/auth.routes");
const eventsRoutes = require("./routes/events.routes");
const bookingsRoutes = require("./routes/bookings.routes");
const ticketsRoutes = require("./routes/tickets.routes");
const organizerRoutes = require("./routes/organizer.routes");
const adminRoutes = require("./routes/admin.routes");

seedIfNeeded();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: process.env.CLIENT_ORIGIN || "*" }));
app.use(express.json());

// ---- API routes ----
app.use("/api/auth", authRoutes);
app.use("/api/events", eventsRoutes);
app.use("/api/bookings", bookingsRoutes);
app.use("/api/tickets", ticketsRoutes);
app.use("/api/organizer", organizerRoutes);
app.use("/api/admin", adminRoutes);

app.get("/api/health", (req, res) => res.json({ status: "ok", service: "EVENTRA API", timestamp: new Date().toISOString() }));

app.use("/api", (req, res) => {
  res.status(404).json({ message: "API route not found" });
});

// ---- Serve the frontend (static, no build step) ----
const FRONTEND_DIR = path.join(__dirname, "..", "frontend");
app.use(express.static(FRONTEND_DIR));

// Fallback: any non-API GET returns index.html (simple multi-page app;
// each page is its own .html file, this just covers deep links / refreshes)
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, "index.html"));
});

// ---- Central error handler ----
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || "Something went wrong." });
});

app.listen(PORT, () => {
  console.log(`EVENTRA server running at http://localhost:${PORT}`);
});
