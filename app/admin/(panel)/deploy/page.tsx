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
      <p className={styles.empty}>
        Deployment control (Vercel/Netlify triggers, live logs, history) is
        added in the next stage.
      </p>
    </div>
  );
}
