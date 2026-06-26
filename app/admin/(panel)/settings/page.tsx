import styles from "@/components/admin/admin.module.css";

export default function SettingsPage() {
  return (
    <div>
      <div className={styles.header}>
        <div>
          <div className={styles.title}>Settings</div>
          <div className={styles.subtitle}>Deploy tokens, media provider, and admin account</div>
        </div>
      </div>
      <p className={styles.empty}>
        Settings (deploy tokens, auto-deploy toggle, media provider, password)
        are added in the next stage.
      </p>
    </div>
  );
}
