import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import AdminSidebar from "@/components/admin/AdminSidebar";
import styles from "@/components/admin/admin.module.css";

export default async function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

  return (
    <div className={styles.shell}>
      <AdminSidebar />
      <main className={styles.main}>{children}</main>
    </div>
  );
}
