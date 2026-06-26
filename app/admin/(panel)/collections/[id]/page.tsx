import { notFound } from "next/navigation";
import { getCollection } from "@/lib/cms/client";
import { NotFoundError } from "@/lib/cms/errors";
import CollectionEditor from "@/components/admin/CollectionEditor";
import styles from "@/components/admin/admin.module.css";

export default async function EditCollectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  try {
    const collection = await getCollection(id);
    return (
      <div>
        <div className={styles.header}>
          <div>
            <div className={styles.title}>Edit: {collection.name}</div>
            <div className={styles.subtitle}>Add, remove, or reorder fields</div>
          </div>
        </div>
        <CollectionEditor existing={collection} />
      </div>
    );
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
}
