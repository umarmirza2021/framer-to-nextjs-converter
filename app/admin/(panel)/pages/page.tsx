import Link from "next/link";
import { prisma } from "@/lib/prisma";
import styles from "@/components/admin/admin.module.css";

export const dynamic = "force-dynamic";

export default async function PagesListPage() {
  const pages = await prisma.cmsPage.findMany({
    include: { collection: true, _count: { select: { bindings: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className={styles.header}>
        <div>
          <div className={styles.title}>Pages & Bindings</div>
          <div className={styles.subtitle}>
            Connect Framer layers to CMS fields for each list and detail page
          </div>
        </div>
      </div>

      {pages.length === 0 ? (
        <p className={styles.empty}>
          No CMS pages registered yet. Pages are registered when you import a
          Framer site that uses a collection, or via the import flow.
        </p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Route</th>
              <th>Type</th>
              <th>Collection</th>
              <th>Bindings</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {pages.map((p) => (
              <tr key={p.id}>
                <td>
                  <Link href={`/admin/pages/${p.id}`} className={styles.rowLink}>
                    {p.route}
                  </Link>
                </td>
                <td>{p.pageType}</td>
                <td style={{ color: "#8a909c" }}>{p.collection.name}</td>
                <td>{p._count.bindings}</td>
                <td style={{ textAlign: "right" }}>
                  <Link href={`/admin/pages/${p.id}`} className={styles.btnGhost}>
                    Edit bindings
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
