const express = require("express");
const prisma = require("../lib/prisma");

const router = express.Router();

// ==========================
// GET ALL POSTS
// ==========================
router.get("/", async (req, res) => {
  try {
    const posts = await prisma.post.findMany({
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
router.post("/", async (req, res) => {
  try {
    const { authorId, domain, text, image } = req.body;

    if (!authorId || !domain || !text) {
      return res.status(400).json({
        success: false,
        message: "Author, domain and text are required",
      });
    }

    const author = await prisma.user.findUnique({
      where: {
        id: authorId,
      },
    });

    if (!author) {
      return res.status(404).json({
        success: false,
        message: "Author not found",
      });
    }

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
          },
        },
      },
    });

    return res.status(201).json({
      success: true,
      message: "Post created successfully",
      post,
    });
  } catch (error) {
    console.error("CREATE POST ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create post",
    });
  }
});

// ==========================
// GET ONE POST
// (used by the AI recommendation "View Post" page)
// ==========================
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const post = await prisma.post.findUnique({
      where: {
        id,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            image: true,
            bio: true,
            specialist: {
              select: {
                domain: true,
                qualification: true,
                experience: true,
                verification: true,
              },
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

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    return res.json({
      success: true,
      post: {
        id: post.id,
        domain: post.domain,
        text: post.text,
        image: post.image,
        shares: post.shares,
        createdAt: post.createdAt,
        author: {
          id: post.author.id,
          name: post.author.name,
          image: post.author.image,
          bio: post.author.bio,
          domain: post.author.specialist?.domain || post.domain,
          specialization:
            post.author.specialist?.qualification ||
            post.author.specialist?.experience ||
            null,
        },
        comments: post.comments.map((comment) => ({
          id: comment.id,
          text: comment.text,
          createdAt: comment.createdAt,
          author: {
            id: comment.author.id,
            name: comment.author.name,
            image: comment.author.image,
          },
        })),
        likes: post.likes.length,
      },
    });
  } catch (error) {
    console.error("GET POST ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load this post",
    });
  }
});

// ==========================
// DELETE POST
// ==========================
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.post.delete({
      where: {
        id,
      },
    });

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