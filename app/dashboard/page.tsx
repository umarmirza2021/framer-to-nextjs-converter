import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import styles from "./dashboard.module.css";

export default async function DashboardPage() {
  const session = await auth();
  const projects = await prisma.project.findMany({
    where: { userId: session!.user!.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className={styles.dashboard}>
      <h1 className={styles.title}>My Projects</h1>
      <p className={styles.subtitle}>
        Converted Framer sites saved to your account
      </p>

      {projects.length === 0 ? (
        <div className={styles.empty}>
          <h2>No projects yet</h2>
          <p>Convert a Framer site on the home page — it will be saved here automatically.</p>
          <Link href="/" className={styles.ctaBtn}>
            Convert a site
          </Link>
        </div>
      ) : (
        <div className={styles.grid}>
          {projects.map((project) => {
            const stats = JSON.parse(project.stats) as {
              pages: number;
              assets: number;
            };
            return (
              <Link
                key={project.id}
                href={`/dashboard/projects/${project.id}`}
                className={styles.card}
              >
                <h3 className={styles.cardTitle}>{project.title}</h3>
                <p className={styles.cardMeta}>{project.framerUrl}</p>
                <p className={styles.cardStats}>
                  {stats.pages} pages · {stats.assets} assets ·{" "}
                  {new Date(project.createdAt).toLocaleDateString()}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}