import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function requireProjectAccess(projectId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" as const, status: 401 as const };
  }

  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: session.user.id },
  });

  if (!project) {
    return { error: "Project not found" as const, status: 404 as const };
  }

  return { project, userId: session.user.id };
}