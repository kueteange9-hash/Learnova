/**
 * LEGACY PRISMA SHIM (frontend)
 * ---------------------------------------------------------------------
 * Learnova's database lives in the Express backend (backend/prisma),
 * accessed through backend/src/lib/prisma.js.
 *
 * This module used to create a PrismaClient inside the Next.js app, which
 * required "@prisma/client" as a frontend dependency and made
 * `next build` fail with "Module not found: Can't resolve '@prisma/client'".
 *
 * It is kept so any legacy import keeps compiling, but it no longer opens
 * a database connection from the browser app. Call the Express API instead
 * — see lib/api.ts (`api.getSpecialists`, `api.aiChat`, ...).
 */

export const prisma: any = new Proxy(
  {},
  {
    get(_target, property) {
      throw new Error(
        `prisma.${String(property)} is not available in the Next.js app. ` +
          "Use the Learnova Express API instead (see lib/api.ts)."
      );
    },
  }
);

export default prisma;
