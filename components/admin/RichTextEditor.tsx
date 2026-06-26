"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect } from "react";
import styles from "./admin.module.css";

export default function RichTextEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (html: string) => void;
}) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value || "",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        style:
          "min-height:120px;padding:11px;outline:none;background:#0e1014;border:1px solid #262a33;border-radius:0 0 8px 8px;",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  // Keep external value changes in sync (e.g. when switching items).
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  if (!editor) return null;

  const Btn = ({
    label,
    active,
    onClick,
  }: {
    label: string;
    active?: boolean;
    onClick: () => void;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={styles.btnGhost}
      style={{
        padding: "4px 9px",
        fontWeight: 700,
        background: active ? "#1f6feb33" : undefined,
        borderColor: active ? "#1f6feb" : undefined,
      }}
    >
      {label}
    </button>
  );

  return (
    <div>
      <div
        className={styles.row}
        style={{
          gap: 4,
          padding: 6,
          background: "#121419",
          border: "1px solid #262a33",
          borderBottom: "none",
          borderRadius: "8px 8px 0 0",
        }}
      >
        <Btn label="B" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} />
        <Btn label="I" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} />
        <Btn label="H2" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} />
        <Btn label="• List" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} />
        <Btn label="“ Quote" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()} />
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
