import CollectionEditor from "@/components/admin/CollectionEditor";
import styles from "@/components/admin/admin.module.css";

export default function NewCollectionPage() {
  return (
    <div>
      <div className={styles.header}>
        <div>
          <div className={styles.title}>New collection</div>
          <div className={styles.subtitle}>Name it and define its fields</div>
        </div>
      </div>
      <CollectionEditor />
    </div>
  );
}
