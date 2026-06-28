import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ProjectActions from "@/components/ProjectActions";
import DeployPanel from "@/components/DeployPanel";
import PerfScores from "@/components/PerfScores";
import AutoSyncPanel from "@/components/AutoSyncPanel";
import styles from "@/components/shared-ui.module.css";
import dashStyles from "../../dashboard.module.css";

export default async function ProjectDetailPage({
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

  const stats = JSON.parse(project.stats) as {
    pages: number;
    assets: number;
    cssSize: number;
  };

  return (
    <main className={dashStyles.dashboard}>
      <Link href="/dashboard" className={dashStyles.backLink}>
        ← Back to projects
      </Link>

      <div className={styles.tabs}>
        <Link
          href={`/dashboard/projects/${id}`}
          className={`${styles.tab} ${styles.tabActive}`}
        >
          Preview
        </Link>
        <Link href="/dashboard/settings" className={styles.tab}>
          Integrations
        </Link>
      </div>

      <div className={dashStyles.detailHeader}>
        <div>
          <h1 className={dashStyles.title}>{project.title}</h1>
          <p className={dashStyles.subtitle}>
            {project.framerUrl} · {stats.pages} pages · {stats.assets} assets ·{" "}
            {(stats.cssSize / 1024).toFixed(0)} KB CSS
          </p>
        </div>
        <ProjectActions projectId={project.id} siteName={project.siteName} />
      </div>

      <iframe
        src={`/api/projects/${project.id}/preview`}
        title="Project preview"
        className={dashStyles.previewFrame}
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
      />

      <DeployPanel projectId={project.id} />
      <PerfScores projectId={project.id} />
      <AutoSyncPanel projectId={project.id} />
    </main>
  );
}