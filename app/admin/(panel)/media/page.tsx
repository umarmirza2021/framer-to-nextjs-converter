import styles from "@/components/admin/admin.module.css";

export default function MediaPage() {
  return (
    <div>
      <div className={styles.header}>
        <div>
          <div className={styles.title}>Media</div>
          <div className={styles.subtitle}>Upload and manage images for your content</div>
        </div>
      </div>
      <p className={styles.empty}>
        The media library (local + cloud upload) is added in the next stage.
        For now, image fields accept a direct image URL.
      </p>
    </div>
  );
}
