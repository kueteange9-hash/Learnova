const express = require("express");
const prisma = require("../lib/prisma");
const { defaultDomains } = require("../lib/initDefaults");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    let domains = await prisma.domain.findMany({
      orderBy: { name: "asc" },
    });
    if (!domains || domains.length === 0) {
      domains = defaultDomains.map((d, index) => ({ id: `default-${index}`, ...d }));
    }
    return res.json({ success: true, domains });
  } catch (error) {
    console.error("GET DOMAINS ERROR:", error);
    return res.json({
      success: true,
      domains: defaultDomains.map((d, index) => ({ id: `default-${index}`, ...d })),
    });
  }
});

module.exports = router;
