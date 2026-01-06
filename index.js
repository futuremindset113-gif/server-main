import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs-extra";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();

// 🔥 MUST for Render
const PORT = process.env.PORT || 10000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Fix __dirname (ESM)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Uploads folder
const UPLOAD_DIR = path.join(__dirname, "uploads");
fs.ensureDirSync(UPLOAD_DIR);
app.use("/uploads", express.static(UPLOAD_DIR));

// Multer setup
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) =>
    cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, "_")}`)
});
const upload = multer({ storage });

// Data files
const POSTS_FILE = path.join(__dirname, "posts.json");
const PROJECTS_FILE = path.join(__dirname, "projects.json");

// Helper
async function loadData(file) {
  if (!(await fs.pathExists(file))) {
    await fs.writeJson(file, []);
  }
  return fs.readJson(file);
}

// ✅ HEALTH CHECK (VERY IMPORTANT)
app.get("/", (_req, res) => {
  res.status(200).send("✅ Backend running successfully on Render");
});

// ---------------- POSTS ----------------
app.get("/posts", async (_req, res) => {
  const posts = await loadData(POSTS_FILE);
  res.json(posts);
});

app.post("/posts", upload.single("media"), async (req, res) => {
  const { title, content } = req.body;
  if (!title || !content) {
    return res.status(400).json({ error: "Title and content required" });
  }

  let mediaUrl = null;
  if (req.file) mediaUrl = `/uploads/${req.file.filename}`;

  const newPost = {
    id: Date.now(),
    title,
    content,
    media: mediaUrl,
    createdAt: new Date().toISOString()
  };

  const posts = await loadData(POSTS_FILE);
  posts.unshift(newPost);
  await fs.writeJson(POSTS_FILE, posts, { spaces: 2 });

  res.status(201).json(newPost);
});

// ---------------- PROJECTS ----------------
app.get("/projects", async (_req, res) => {
  const projects = await loadData(PROJECTS_FILE);
  res.json(projects);
});

app.post("/projects", upload.single("media"), async (req, res) => {
  const { title, link } = req.body;
  if (!title) return res.status(400).json({ error: "Title required" });

  let mediaUrl = null;
  if (req.file) mediaUrl = `/uploads/${req.file.filename}`;

  const newProject = {
    id: Date.now(),
    title,
    link: link || null,
    media: mediaUrl,
    createdAt: new Date().toISOString()
  };

  const projects = await loadData(PROJECTS_FILE);
  projects.unshift(newProject);
  await fs.writeJson(PROJECTS_FILE, projects, { spaces: 2 });

  res.status(201).json(newProject);
});

// 🔥 FINAL: START SERVER (THIS FIXES PORT SCAN)
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
