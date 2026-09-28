import { NextResponse } from "next/server";

/**
 * Next.js login endpoint.
 *
 * Learnova has ONE authentication implementation: the Express backend
 * (backend/src/routes/auth.js) which hashes passwords with bcrypt and signs
 * the JWT used across the app. This route used to duplicate that logic with a
 * direct Prisma/plain-password check, which broke `next build` (the Prisma
 * client is a backend dependency) and created a second auth system.
 *
 * It now simply forwards to the Express backend, so existing clients of
 * /api/login keep working without duplicating authentication.
 */

const BACKEND_URL = (process.env.BACKEND_URL || "http://127.0.0.1:3001").replace(/\/+$/, "");

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);

    if (!body?.email || !body?.password) {
      return NextResponse.json(
        {
          success: false,
          message: "Email and password are required",
        },
        { status: 400 }
      );
    }

    const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const data = await response.json().catch(() => null);

    if (!data) {
      return NextResponse.json(
        {
          success: false,
          message: "The Learnova authentication service returned an invalid response.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("LOGIN PROXY ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to reach the Learnova server. Please make sure the backend is running.",
      },
      { status: 503 }
    );
  }
}
