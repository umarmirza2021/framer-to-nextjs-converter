import DeployPanel from "@/components/admin/DeployPanel";
import styles from "@/components/admin/admin.module.css";

export default function DeployPage() {
  return (
    <div>
      <div className={styles.header}>
        <div>
          <div className={styles.title}>Deploy</div>
          <div className={styles.subtitle}>Publish your site to Vercel or Netlify</div>
        </div>
      </div>
      <DeployPanel />
    </div>
  );
}
