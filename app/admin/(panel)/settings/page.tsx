import SettingsForm from "@/components/admin/SettingsForm";
import styles from "@/components/admin/admin.module.css";

export default function SettingsPage() {
  return (
    <div>
      <div className={styles.header}>
        <div>
          <div className={styles.title}>Settings</div>
          <div className={styles.subtitle}>Deploy credentials, media provider, and auto-deploy</div>
        </div>
      </div>
      <SettingsForm />
    </div>
  );
}
