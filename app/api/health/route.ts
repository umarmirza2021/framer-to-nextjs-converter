import { NextResponse } from "next/server";
import { getAuthConfigError, getAuthUrl } from "@/lib/auth-env";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const authError = getAuthConfigError();
  const hasDatabase = Boolean(process.env.DATABASE_URL?.trim());

  let databaseReady = false;
  let databaseError: string | null = null;

  if (hasDatabase) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      databaseReady = true;
    } catch (error) {
      databaseError =
        error instanceof Error ? error.message : "Database connection failed";
    }
  } else {
    databaseError = "DATABASE_URL is not set";
  }

  return NextResponse.json({
    ok: !authError && databaseReady,
    auth: {
      configured: !authError,
      error: authError,
      url: getAuthUrl() || null,
    },
    database: {
      configured: hasDatabase,
      ready: databaseReady,
      error: databaseError,
    },
  });
}