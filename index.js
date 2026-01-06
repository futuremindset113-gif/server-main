import express from "express";
import cors from "cors";
import fs from "fs-extra";
import dotenv from "dotenv";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url"; // ✅ Needed for __dirname in ESM

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true }));

// ✅ Fix __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Serve uploaded images statically (works reliably)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// 📁 Ensure upload folder exists
const UPLOAD_DIR = path.join(__dirname, "uploads");
fs.ensureDirSync(UPLOAD_DIR);

// ⚙️ Multer setup for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) =>
    cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, "_")}`),
});
const upload = multer({ storage });

// 📘 Files where data is stored
const POSTS_FILE = path.join(__dirname, "posts.json");
const PROJECTS_FILE = path.join(__dirname, "projects.json");

// 🧩 Helper to safely load or create JSON files
const loadData = async (filePath) => {
  if (!(await fs.pathExists(filePath))) {
    await fs.writeJson(filePath, []);
  }
  return fs.readJson(filePath);
};

// =========================
// 🟢 BLOG / POST ROUTES
// =========================

app.get("/posts", async (req, res) => {
  try {
    const posts = await loadData(POSTS_FILE);
    res.json(posts);
  } catch (err) {
    console.error("❌ Error reading posts:", err);
    res.status(500).json({ error: "Failed to read posts" });
  }
});

app.post("/posts", upload.single("media"), async (req, res) => {
  try {
    const { title, content, type, link, blogLink, media } = req.body;
    if (!title || !content)
      return res.status(400).json({ error: "Title and content are required" });

    let mediaUrl = null;
    if (req.file) {
      mediaUrl = `/uploads/${req.file.filename}`;
    } else if (media && media.startsWith("data:image")) {
      const base64Data = media.split(";base64,").pop();
      const filename = `${Date.now()}.png`;
      const filePath = path.join(UPLOAD_DIR, filename);
      await fs.writeFile(filePath, base64Data, { encoding: "base64" });
      mediaUrl = `/uploads/${filename}`;
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

    console.log(`✅ Added new post: ${newPost.title}`);
    res.status(201).json(newPost);
  } catch (err) {
    console.error("❌ Error adding post:", err);
    res.status(500).json({ error: "Failed to add post" });
  }
});

// --- Update post ---
app.put("/posts/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const updates = req.body;
    const posts = await loadData(POSTS_FILE);
    const index = posts.findIndex((p) => p.id === id);

    if (index === -1)
      return res.status(404).json({ error: "Post not found" });

    posts[index] = { ...posts[index], ...updates, updatedAt: new Date().toISOString() };
    await fs.writeJson(POSTS_FILE, posts, { spaces: 2 });

    console.log(`✏️ Updated post ${id}`);
    res.json(posts[index]);
  } catch (err) {
    console.error("❌ Error updating post:", err);
    res.status(500).json({ error: "Failed to update post" });
  }
});

// --- Delete post ---
app.delete("/posts/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const posts = await loadData(POSTS_FILE);
    const postToDelete = posts.find((p) => p.id === id);
    const updated = posts.filter((p) => p.id !== id);

    if (!postToDelete) return res.status(404).json({ error: "Post not found" });

    if (postToDelete.media && postToDelete.media.startsWith("/uploads")) {
      const filePath = path.join(__dirname, postToDelete.media);
      if (await fs.pathExists(filePath)) await fs.remove(filePath);
      console.log(`🗑 Removed image file: ${filePath}`);
    }

    await fs.writeJson(POSTS_FILE, updated, { spaces: 2 });
    console.log(`🗑 Deleted post ${id}`);
    res.json({ message: "Post deleted", id });
  } catch (err) {
    console.error("❌ Error deleting post:", err);
    res.status(500).json({ error: "Failed to delete post" });
  }
});

// =========================
// 🔵 PROJECT ROUTES
// =========================

app.get("/projects", async (req, res) => {
  try {
    const projects = await loadData(PROJECTS_FILE);
    res.json(projects);
  } catch (err) {
    console.error("❌ Error reading projects:", err);
    res.status(500).json({ error: "Failed to read projects" });
  }
});

// ✅ Fixed field name to "media" so it matches your React form
app.post("/projects", upload.single("media"), async (req, res) => {
  try {
    const { title, link, media } = req.body;
    if (!title) return res.status(400).json({ error: "Project title is required" });

    let mediaUrl = null;
    if (req.file) mediaUrl = `/uploads/${req.file.filename}`;
    else if (media && media.startsWith("data:image")) {
      const base64Data = media.split(";base64,").pop();
      const filename = `${Date.now()}.png`;
      const filePath = path.join(UPLOAD_DIR, filename);
      await fs.writeFile(filePath, base64Data, { encoding: "base64" });
      mediaUrl = `/uploads/${filename}`;
    }

    const newProject = {
      id: Date.now(),
      title,
      media: mediaUrl,
      link: link || null,
      createdAt: new Date().toISOString(),
    };

    const projects = await loadData(PROJECTS_FILE);
    projects.unshift(newProject);
    await fs.writeJson(PROJECTS_FILE, projects, { spaces: 2 });

    console.log(`✅ Added new project: ${newProject.title}`);
    res.status(201).json(newProject);
  } catch (err) {
    console.error("❌ Error adding project:", err);
    res.status(500).json({ error: "Failed to upload project" });
  }
});

app.delete("/projects/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const projects = await loadData(PROJECTS_FILE);
    const projectToDelete = projects.find((p) => p.id === id);
    const updated = projects.filter((p) => p.id !== id);

    if (!projectToDelete) return res.status(404).json({ error: "Project not found" });

    if (projectToDelete.media && projectToDelete.media.startsWith("/uploads")) {
      const filePath = path.join(__dirname, projectToDelete.media);
      if (await fs.pathExists(filePath)) await fs.remove(filePath);
      console.log(`🗑 Removed project image: ${filePath}`);
    }

    await fs.writeJson(PROJECTS_FILE, updated, { spaces: 2 });
    console.log(`🗑 Deleted project ${id}`);
    res.json({ message: "Project deleted", id });
  } catch (err) {
    console.error("❌ Error deleting project:", err);
    res.status(500).json({ error: "Failed to delete project" });
  }
});

// --- 🟩 Health Check ---
app.get("/", (req, res) => {
  res.send("✅ Backend running successfully!");
});

// 🟠 Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
