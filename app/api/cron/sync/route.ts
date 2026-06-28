import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncProject } from "@/lib/sync/run";

// May process several projects (each does a fetch + convert + maybe deploy).
export const maxDuration = 300;

/**
 * Scheduled sync entry point. Called on a cron (Netlify scheduled function,
 * Vercel Cron, or any external scheduler) and protected by CRON_SECRET.
 *   GET /api/cron/sync?secret=...   or header  x-cron-secret: ...
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const provided =
    request.nextUrl.searchParams.get("secret") || request.headers.get("x-cron-secret");

  if (!secret || provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projects = await prisma.project.findMany({
    where: { autoSync: true },
    select: { id: true, title: true },
  });

  const results: Array<{ id: string; title: string; status: string; url?: string }> = [];
  // Sequential to keep memory/CPU bounded on serverless.
  for (const p of projects) {
    const r = await syncProject(p.id);
    results.push({ id: p.id, title: p.title, status: r.status, url: r.url });
  }

  const changed = results.filter((r) => r.status === "updated" || r.status === "deployed").length;
  return NextResponse.json({ checked: projects.length, changed, results });
}
