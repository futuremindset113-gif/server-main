import express from "express";
import cors from "cors";
import fs from "fs-extra";
import dotenv from "dotenv";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();

/* =========================
   MIDDLEWARES
========================= */
app.use(cors());
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true }));

/* =========================
   __dirname FIX (ESM)
========================= */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* =========================
   UPLOADS SETUP
========================= */
const UPLOAD_DIR = path.join(__dirname, "uploads");
fs.ensureDirSync(UPLOAD_DIR);

app.use("/uploads", express.static(UPLOAD_DIR));

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/\s+/g, "_");
    cb(null, `${Date.now()}-${safeName}`);
  },
});

const upload = multer({ storage });

/* =========================
   DATA FILES
========================= */
const POSTS_FILE = path.join(__dirname, "posts.json");
const PROJECTS_FILE = path.join(__dirname, "projects.json");

const loadData = async (filePath) => {
  if (!(await fs.pathExists(filePath))) {
    await fs.writeJson(filePath, []);
  }
  return fs.readJson(filePath);
};

/* =========================
   HEALTH CHECK
========================= */
app.get("/", (_req, res) => {
  res.send("✅ Backend running successfully!");
});

/* =========================
   POSTS ROUTES
========================= */
app.get("/posts", async (_req, res) => {
  try {
    const posts = await loadData(POSTS_FILE);
    res.json(posts);
  } catch {
    res.status(500).json({ error: "Failed to load posts" });
  }
});

app.post("/posts", upload.single("media"), async (req, res) => {
  try {
    const { title, content, type, link, blogLink } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: "Title and content required" });
    }

    let mediaUrl = null;
    if (req.file) {
      mediaUrl = `/uploads/${req.file.filename}`;
    }

    const newPost = {
      id: Date.now(),
      title,
      content,
      type: type || "blog",
      link: link || null,
      blogLink: blogLink || null,
      media: mediaUrl,
      createdAt: new Date().toISOString(),
    };

    const posts = await loadData(POSTS_FILE);
    posts.unshift(newPost);
    await fs.writeJson(POSTS_FILE, posts, { spaces: 2 });

    res.status(201).json(newPost);
  } catch {
    res.status(500).json({ error: "Failed to create post" });
  }
});

app.delete("/posts/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const posts = await loadData(POSTS_FILE);
    const filtered = posts.filter((p) => p.id !== id);

    if (posts.length === filtered.length) {
      return res.status(404).json({ error: "Post not found" });
    }

    await fs.writeJson(POSTS_FILE, filtered, { spaces: 2 });
    res.json({ message: "Post deleted" });
  } catch {
    res.status(500).json({ error: "Delete failed" });
  }
});

/* =========================
   PROJECT ROUTES
========================= */
app.get("/projects", async (_req, res) => {
  try {
    const projects = await loadData(PROJECTS_FILE);
    res.json(projects);
  } catch {
    res.status(500).json({ error: "Failed to load projects" });
  }
});

app.post("/projects", upload.single("media"), async (req, res) => {
  try {
    const { title, link } = req.body;
    if (!title) {
      return res.status(400).json({ error: "Title required" });
    }

    let mediaUrl = null;
    if (req.file) {
      mediaUrl = `/uploads/${req.file.filename}`;
    }

    const newProject = {
      id: Date.now(),
      title,
      link: link || null,
      media: mediaUrl,
      createdAt: new Date().toISOString(),
    };

    const projects = await loadData(PROJECTS_FILE);
    projects.unshift(newProject);
    await fs.writeJson(PROJECTS_FILE, projects, { spaces: 2 });

    res.status(201).json(newProject);
  } catch {
    res.status(500).json({ error: "Project upload failed" });
  }
});

/* =========================
   RENDER PORT BIND (CRITICAL)
========================= */
const PORT = process.env.PORT;

if (!PORT) {
  throw new Error("❌ PORT is not defined");
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
