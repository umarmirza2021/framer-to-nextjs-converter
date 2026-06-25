import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import CmsCollectionsPage from "@/components/cms/CmsCollectionsPage";

export default async function ProjectCmsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const { id } = await params;

  const project = await prisma.project.findFirst({
    where: { id, userId: session!.user!.id },
  });

  if (!project) notFound();

  const collections = await prisma.cmsCollection.findMany({
    where: { projectId: id },
    include: { _count: { select: { fields: true, entries: true } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <CmsCollectionsPage
      projectId={id}
      projectTitle={project.title}
      collections={collections}
    />
  );
}