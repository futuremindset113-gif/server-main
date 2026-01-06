import express from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();

// PORT must be dynamic for Render
const PORT = process.env.PORT || 10000;

// Minimal health check route
app.get("/", (_req, res) => {
  res.send("✅ Backend running successfully on Render");
});

// Start server and bind 0.0.0.0
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Minimal server running on port ${PORT}`);
});
