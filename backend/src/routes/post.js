const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const prisma = require("../lib/prisma");
const { requireAuth, requireRole, requireVerifiedSpecialist } = require("../middleware/auth");

const router = express.Router();
const uploadDirectory = path.join(__dirname, "../../uploads");
fs.mkdirSync(uploadDirectory, { recursive: true });

const imageExtensions = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/avif": ".avif",
  "image/apng": ".apng",
  "image/bmp": ".bmp",
  "image/tiff": ".tiff",
  "image/heic": ".heic",
  "image/heif": ".heif",
  "image/svg+xml": ".svg",
  "image/x-icon": ".ico",
  "image/vnd.microsoft.icon": ".ico",
};

function imageExtension(file) {
  if (imageExtensions[file.mimetype]) return imageExtensions[file.mimetype];
  if (!file.mimetype?.startsWith("image/")) return null;
  const subtype = file.mimetype.slice("image/".length).split(/[;+]/)[0].toLowerCase();
  const extension = subtype.replace(/[^a-z0-9]/g, "");
  return extension ? `.${extension}` : null;
}

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDirectory,
    filename: (req, file, cb) => cb(
      null,
      `community-${req.auth.userId}-${Date.now()}-${Math.round(Math.random() * 1e9)}${imageExtension(file)}`
    ),
  }),
  fileFilter: (req, file, cb) => {
    const allowed = Boolean(imageExtension(file));
    cb(allowed ? null : new Error("Choose an image file"), allowed);
  },
});

function uploadPostImage(req, res, next) {
  upload.single("image")(req, res, (error) => {
    if (!error) return next();
    const message = error.message || "The image could not be uploaded";
    return res.status(400).json({ success: false, message });
  });
}

function removeUploadedImage(file) {
  if (file?.path) fs.unlink(file.path, () => {});
}

// ==========================
// GET ALL POSTS
// ==========================
router.get("/", async (req, res) => {
  try {
    const posts = await prisma.post.findMany({
      where: { author: { role: "SPECIALIST" } },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            specialist: {
              select: { headline: true, verification: true },
            },
          },
        },
        comments: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        },
        likes: true,
      },
    });

    return res.json({
      success: true,
      posts,
    });
  } catch (error) {
    console.error("GET POSTS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load posts",
    });
  }
});

// ==========================
// CREATE POST
// ==========================
router.post("/", requireAuth, requireRole("SPECIALIST"), requireVerifiedSpecialist, uploadPostImage, async (req, res) => {
  try {
    const body = req.body || {};
    const domain = typeof body.domain === "string" ? body.domain.trim() : "";
    const text = typeof body.text === "string" ? body.text.trim() : "";
    const authorId = req.auth.userId;

    if (!authorId || !domain || !text) {
      removeUploadedImage(req.file);
      return res.status(400).json({
        success: false,
        message: "Domain and post text are required",
      });
    }

    if (domain.length > 80 || text.length > 5000) {
      removeUploadedImage(req.file);
      return res.status(400).json({ success: false, message: "Keep the domain under 80 characters and the post under 5,000 characters" });
    }

    const author = await prisma.user.findUnique({
      where: {
        id: authorId,
      },
      include: {
        specialist: true,
      },
    });

    if (!author || author.role !== "SPECIALIST" || !author.specialist) {
      removeUploadedImage(req.file);
      return res.status(404).json({
        success: false,
        message: "Specialist not found",
      });
    }

    if (author.specialist.verification !== "VERIFIED") {
      removeUploadedImage(req.file);
      return res.status(403).json({
        success: false,
        message: "Your specialist account must be approved by the administrator before you can create posts.",
      });
    }

    const image = req.file ? `/uploads/${req.file.filename}` : null;

    const post = await prisma.post.create({
      data: {
        authorId,
        domain,
        text,
        image: image || null,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            specialist: {
              select: { headline: true, verification: true },
            },
          },
        },
        comments: {
          include: {
            author: { select: { id: true, name: true, image: true, role: true } },
          },
          orderBy: { createdAt: "asc" },
        },
        likes: true,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Post created successfully",
      post,
    });
  } catch (error) {
    removeUploadedImage(req.file);
    console.error("CREATE POST ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create post",
    });
  }
});

// ==========================
// LIKE / UNLIKE POST (Learners & Specialists)
// ==========================
router.post("/:id/like", requireAuth, async (req, res) => {
  try {
    const key = { userId_postId: { userId: req.auth.userId, postId: req.params.id } };
    const existing = await prisma.like.findUnique({ where: key });
    if (existing) await prisma.like.delete({ where: key });
    else await prisma.like.create({ data: { userId: req.auth.userId, postId: req.params.id } });
    const likes = await prisma.like.count({ where: { postId: req.params.id } });
    return res.json({ success: true, liked: !existing, likes });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to update like" });
  }
});

// ==========================
// COMMENT ON POST (Learners & Specialists)
// ==========================
router.post("/:id/comments", requireAuth, async (req, res) => {
  try {
    if (!req.body.text?.trim()) return res.status(400).json({ success: false, message: "Comment text is required" });
    const comment = await prisma.comment.create({
      data: { postId: req.params.id, authorId: req.auth.userId, text: req.body.text.trim() },
      include: { author: { select: { id: true, name: true, image: true, role: true } } },
    });
    return res.status(201).json({ success: true, comment });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to add comment" });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const post = await prisma.post.findUnique({ where: { id } });
    if (!post || (post.authorId !== req.auth.userId && req.auth.role !== "ADMIN")) return res.status(404).json({ success: false, message: "Post not found" });
    await prisma.post.delete({ where: { id } });
    if (post.image?.startsWith("/uploads/community-")) {
      fs.unlink(path.join(uploadDirectory, path.basename(post.image)), () => {});
    }

    return res.json({
      success: true,
      message: "Post deleted successfully",
    });
  } catch (error) {
    console.error("DELETE POST ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete post",
    });
  }
});

module.exports = router;
