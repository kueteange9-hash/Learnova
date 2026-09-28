const express = require("express");
const { GoogleGenAI } = require("@google/genai");
const prisma = require("../lib/prisma");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const rankSpecialistsForLearner = (profile, specialists) => {
  const interests = (profile?.interests || []).map(value => value.toLowerCase());
  const goals = (profile?.goals || []).map(value => value.toLowerCase());
  const aspirationWords = (profile?.aspiration || "").toLowerCase().split(/\W+/).filter(word => word.length > 3);

  return specialists
    .map(specialist => {
      const expertise = specialist.expertise || [];
      const searchableText = [specialist.domain, specialist.headline, specialist.howIHelp, ...expertise, ...(specialist.expertiseDescriptions || [])]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const domainMatch = interests.includes(specialist.domain.toLowerCase());
      const expertiseMatches = expertise.filter(item => {
        const value = item.toLowerCase();
        return interests.some(interest => interest.includes(value) || value.includes(interest)) || goals.some(goal => goal.includes(value) || value.includes(goal));
      });
      const aspirationMatches = aspirationWords.filter(word => searchableText.includes(word));
      const score = (domainMatch ? 50 : 0) + Math.min(expertiseMatches.length * 20, 30) + Math.min(aspirationMatches.length * 10, 20) + (specialist.availability?.length ? 5 : 0);
      const reasons = [domainMatch && `matches their interest in ${specialist.domain}`, expertiseMatches.length && `offers ${expertiseMatches.slice(0, 2).join(" and ")}`, aspirationMatches.length && "aligns with their stated goal"].filter(Boolean);
      return { specialist, score, reason: reasons.join("; ") };
    })
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 3);
};

const getLearnerSystemPrompt = (profile, domains, recommendations) => {
  return `You are the Learnova AI Assistant, an expert in career, education, entrepreneurship, finance, agriculture, tech, personal development, and goal exploration.
You are strictly focused on Learnova-related guidance. DO NOT act as a general-purpose chatbot. If a user asks an unrelated question, politely redirect them to Learnova guidance services.
You are an assistant, not a replacement for qualified specialists. Encourage users to connect with verified Learnova specialists.

The current user is a Learner.
Profile Interests: ${(profile?.interests || []).join(", ")}
Goals: ${(profile?.goals || []).join(", ")}
Formats: ${(profile?.formats || []).join(", ")}
Aspiration: ${profile?.aspiration || ""}

Available Domains: ${domains.map(d => d.name).join(", ")}
Recommended Specialists (the only specialists you may recommend):
${recommendations.length ? recommendations.map(({ specialist, reason }) => `- ${specialist.user.name} (${specialist.domain}): ${specialist.expertise.join(", ")}. Why they fit: ${reason}.`).join("\n") : "No strong specialist match is currently available."}

When recommending domains, strictly use the Available Domains.
Only recommend a specialist when they appear in Recommended Specialists. Never invent a specialist. Use their exact names and domains, and explain briefly how their expertise connects to the learner's onboarding answers.
`;
};

const getSpecialistSystemPrompt = specialist => {
  return `You are the Learnova AI Assistant, an expert in helping guidance and counselling specialists.
You are strictly focused on Learnova-related guidance. DO NOT act as a general-purpose chatbot. If a user asks an unrelated question, politely redirect them to Learnova guidance services.

The current user is a Specialist.
Domain: ${specialist?.domain || ""}
Expertise: ${(specialist?.expertise || []).join(", ")}

Help them generate advice/motivation post ideas, create workshop ideas and descriptions, prepare guidance sessions, generate educational guidance content, and brainstorm questions and resources for learners.
`;
};

router.post("/chat", requireAuth, async (req, res) => {
  const requestId = `AI-${Date.now()}-${Math.random()
    .toString(36)
    .substring(2, 8)}`;

  console.log("\n========================================");
  console.log(`[${requestId}] AI CHAT REQUEST STARTED`);
  console.log("========================================");

  try {
    // --------------------------------------------------
    // 1. REQUEST INFORMATION
    // --------------------------------------------------
    console.log(`[${requestId}] Step 1: Checking request body...`);

    const { messages } = req.body;

    console.log(`[${requestId}] Messages received:`, {
      isArray: Array.isArray(messages),
      count: Array.isArray(messages) ? messages.length : 0,
    });

    if (!messages || !Array.isArray(messages)) {
      console.error(`[${requestId}] ERROR: Messages is not an array`);

      return res.status(400).json({
        success: false,
        message: "Messages array is required.",
      });
    }

    if (messages.length === 0) {
      console.error(`[${requestId}] ERROR: Messages array is empty`);

      return res.status(400).json({
        success: false,
        message: "At least one message is required.",
      });
    }

    // --------------------------------------------------
    // 2. CHECK API KEY
    // --------------------------------------------------
    console.log(`[${requestId}] Step 2: Checking Gemini API key...`);

    if (!process.env.GEMINI_API_KEY) {
      console.error(
        `[${requestId}] ERROR: GEMINI_API_KEY is missing from environment`
      );

      return res.status(500).json({
        success: false,
        message: "Gemini API key is missing.",
      });
    }

    console.log(
      `[${requestId}] Gemini API key exists: YES`
    );

    console.log(
      `[${requestId}] Gemini API key length:`,
      process.env.GEMINI_API_KEY.length
    );

    // --------------------------------------------------
    // 3. CHECK AUTHENTICATION
    // --------------------------------------------------
    console.log(`[${requestId}] Step 3: Checking authenticated user...`);

    console.log(`[${requestId}] Auth data:`, {
      userId: req.auth?.userId,
      role: req.auth?.role,
    });

    if (!req.auth) {
      console.error(`[${requestId}] ERROR: req.auth is missing`);

      return res.status(401).json({
        success: false,
        message: "Authentication information is missing.",
      });
    }

    if (!req.auth.userId) {
      console.error(`[${requestId}] ERROR: userId is missing`);

      return res.status(401).json({
        success: false,
        message: "User ID is missing.",
      });
    }

    if (!req.auth.role) {
      console.error(`[${requestId}] ERROR: User role is missing`);

      return res.status(401).json({
        success: false,
        message: "User role is missing.",
      });
    }

    // --------------------------------------------------
    // 4. LOAD USER DATA
    // --------------------------------------------------
    let systemInstruction = "";

    if (req.auth.role === "LEARNER") {
      console.log(`[${requestId}] Step 4: Loading learner data...`);

      let profile;
      let domains;
      let specialists;

      // Learner profile
      try {
        console.log(`[${requestId}] Loading learner profile...`);

        profile = await prisma.learnerProfile.findUnique({
          where: {
            userId: req.auth.userId,
          },
        });

        console.log(`[${requestId}] Learner profile result:`, {
          found: !!profile,
          userId: req.auth.userId,
        });
      } catch (dbError) {
        console.error(
          `[${requestId}] DATABASE ERROR while loading learner profile:`
        );
        console.error(dbError);
        throw dbError;
      }

      // Domains
      try {
        console.log(`[${requestId}] Loading domains...`);

        domains = await prisma.domain.findMany({
          select: {
            name: true,
          },
        });

        console.log(
          `[${requestId}] Domains loaded: ${domains.length}`
        );

        console.log(
          `[${requestId}] Domain names:`,
          domains.map(d => d.name)
        );
      } catch (dbError) {
        console.error(
          `[${requestId}] DATABASE ERROR while loading domains:`
        );
        console.error(dbError);
        throw dbError;
      }

      // Specialists
      try {
        console.log(`[${requestId}] Loading verified specialists...`);

        specialists = await prisma.specialist.findMany({
          where: {
            verification: "VERIFIED",
          },
          include: {
            user: {
              select: {
                name: true,
              },
            },
          },
        });

        console.log(
          `[${requestId}] Verified specialists loaded: ${specialists.length}`
        );
      } catch (dbError) {
        console.error(
          `[${requestId}] DATABASE ERROR while loading specialists:`
        );
        console.error(dbError);
        throw dbError;
      }

      const recommendations = rankSpecialistsForLearner(profile, specialists);
      console.log(`[${requestId}] Selected ${recommendations.length} preference-based specialist recommendations.`);
      console.log(`[${requestId}] Building learner system prompt...`);

      systemInstruction = getLearnerSystemPrompt(
        profile,
        domains,
        recommendations
      );

      console.log(
        `[${requestId}] Learner system prompt created. Length:`,
        systemInstruction.length
      );
    } else if (req.auth.role === "SPECIALIST") {
      console.log(`[${requestId}] Step 4: Loading specialist data...`);

      try {
        const specialist = await prisma.specialist.findUnique({
          where: {
            userId: req.auth.userId,
          },
        });

        console.log(`[${requestId}] Specialist result:`, {
          found: !!specialist,
          userId: req.auth.userId,
        });

        if (!specialist) {
          console.error(
            `[${requestId}] ERROR: Specialist record not found`
          );

          return res.status(404).json({
            success: false,
            message: "Specialist profile not found.",
          });
        }

        systemInstruction = getSpecialistSystemPrompt(specialist);

        console.log(
          `[${requestId}] Specialist system prompt created. Length:`,
          systemInstruction.length
        );
      } catch (dbError) {
        console.error(
          `[${requestId}] DATABASE ERROR while loading specialist:`
        );
        console.error(dbError);
        throw dbError;
      }
    } else {
      console.error(
        `[${requestId}] ERROR: Unsupported role: ${req.auth.role}`
      );

      return res.status(403).json({
        success: false,
        message:
          "AI chat is only available for learners and specialists.",
      });
    }

    // --------------------------------------------------
    // 5. FORMAT GEMINI MESSAGES
    // --------------------------------------------------
    console.log(`[${requestId}] Step 5: Formatting messages for Gemini...`);

    let formattedContents;

    try {
      formattedContents = messages.map((msg, index) => {
        console.log(`[${requestId}] Message ${index}:`, {
          role: msg?.role,
          hasText: typeof msg?.text === "string",
          textLength:
            typeof msg?.text === "string"
              ? msg.text.length
              : 0,
        });

        if (!msg || typeof msg.text !== "string") {
          throw new Error(
            `Invalid message at index ${index}. Expected { role, text }.`
          );
        }

        return {
          role: msg.role === "assistant" ? "model" : "user",
          parts: [
            {
              text: msg.text,
            },
          ],
        };
      });

      console.log(
        `[${requestId}] Formatted messages successfully: ${formattedContents.length}`
      );
    } catch (formatError) {
      console.error(
        `[${requestId}] MESSAGE FORMATTING ERROR:`
      );
      console.error(formatError);

      return res.status(400).json({
        success: false,
        message: "Invalid message format.",
        error:
          process.env.NODE_ENV === "development"
            ? formatError.message
            : undefined,
      });
    }

    // --------------------------------------------------
    // 6. CALL GEMINI
    // --------------------------------------------------
    console.log(`[${requestId}] Step 6: Calling Gemini API...`);

    console.log(`[${requestId}] Gemini configuration:`, {
      model: "gemini-3.6-flash",
      messageCount: formattedContents.length,
      systemInstructionLength: systemInstruction.length,
    });

    let response;

    try {
      response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: formattedContents,
        config: {
          systemInstruction: systemInstruction,
        },
      });

      console.log(`[${requestId}] Gemini API responded successfully`);

      console.log(`[${requestId}] Response information:`, {
        hasResponse: !!response,
        hasText: !!response?.text,
        textLength: response?.text?.length || 0,
      });
    } catch (geminiError) {
      console.error(
        `\n[${requestId}] ================================`
      );
      console.error(`[${requestId}] GEMINI API ERROR`);
      console.error(
        `[${requestId}] ================================`
      );

      console.error("Name:", geminiError?.name);
      console.error("Message:", geminiError?.message);
      console.error("Status:", geminiError?.status);
      console.error("Code:", geminiError?.code);
      console.error("Stack:", geminiError?.stack);

      if (geminiError?.response) {
        console.error("Gemini response:", geminiError.response);
      }

      if (geminiError?.error) {
        console.error("Gemini error object:", geminiError.error);
      }

      throw geminiError;
    }

    // --------------------------------------------------
    // 7. VALIDATE RESPONSE
    // --------------------------------------------------
    console.log(`[${requestId}] Step 7: Validating Gemini response...`);

    if (!response) {
      console.error(
        `[${requestId}] ERROR: Gemini returned an empty response`
      );

      return res.status(500).json({
        success: false,
        message: "Gemini returned an empty response.",
      });
    }

    if (!response.text) {
      console.error(
        `[${requestId}] ERROR: Gemini response contains no text`
      );

      console.error(
        `[${requestId}] Full Gemini response:`,
        response
      );

      return res.status(500).json({
        success: false,
        message: "Gemini returned no text.",
      });
    }

    // --------------------------------------------------
    // 8. SUCCESS
    // --------------------------------------------------
    console.log(`[${requestId}] AI CHAT SUCCESS`);
    console.log(`[${requestId}] Response length: ${response.text.length}`);
    console.log(`[${requestId}] AI CHAT REQUEST FINISHED`);
    console.log("========================================\n");

    return res.json({
      success: true,
      text: response.text,
    });
  } catch (error) {
    // --------------------------------------------------
    // GLOBAL ERROR HANDLER
    // --------------------------------------------------
    console.error(
      `\n[${requestId}] ========================================`
    );
    console.error(`[${requestId}] UNEXPECTED AI CHAT ERROR`);
    console.error(
      `[${requestId}] ========================================`
    );

    console.error("Error name:", error?.name);
    console.error("Error message:", error?.message);
    console.error("Error code:", error?.code);
    console.error("Error status:", error?.status);
    console.error("Error type:", typeof error);
    console.error("Error stack:");
    console.error(error?.stack);

    console.error("Full error object:");
    console.error(error);

    console.error(
      `[${requestId}] ========================================\n`
    );

    return res.status(500).json({
      success: false,
      message: "Failed to reach model.",
      error:
        process.env.NODE_ENV === "development"
          ? error?.message
          : undefined,
      requestId,
    });
  }
});

module.exports = router;
