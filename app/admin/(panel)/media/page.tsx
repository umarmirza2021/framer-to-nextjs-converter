import MediaLibrary from "@/components/admin/MediaLibrary";
import styles from "@/components/admin/admin.module.css";

export default function MediaPage() {
  return (
    <div>
      <div className={styles.header}>
        <div>
          <div className={styles.title}>Media</div>
          <div className={styles.subtitle}>Upload images and copy their URLs into content</div>
        </div>
      </div>
      <MediaLibrary />
    </div>
  );
}
