import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import CmsCollectionEditor from "@/components/cms/CmsCollectionEditor";
import styles from "@/components/cms/cms.module.css";
import dashStyles from "@/app/dashboard/dashboard.module.css";

export default async function CmsCollectionPage({
  params,
}: {
  params: Promise<{ id: string; collectionId: string }>;
}) {
  const session = await auth();
  const { id, collectionId } = await params;

  const project = await prisma.project.findFirst({
    where: { id, userId: session!.user!.id },
  });

  if (!project) notFound();

  const collection = await prisma.cmsCollection.findFirst({
    where: { id: collectionId, projectId: id },
  });

  if (!collection) notFound();

  const collections = await prisma.cmsCollection.findMany({
    where: { projectId: id },
    select: { id: true, name: true, slug: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <main className={dashStyles.dashboard}>
      <Link href={`/dashboard/projects/${id}/cms`} className={dashStyles.backLink}>
        ← All collections
      </Link>

      <div className={styles.tabs}>
        <Link href={`/dashboard/projects/${id}`} className={styles.tab}>
          Preview
        </Link>
        <Link
          href={`/dashboard/projects/${id}/cms`}
          className={`${styles.tab} ${styles.tabActive}`}
        >
          CMS
        </Link>
      </div>

      <CmsCollectionEditor
        projectId={id}
        collectionId={collectionId}
        collections={collections}
      />
    </main>
  );
}