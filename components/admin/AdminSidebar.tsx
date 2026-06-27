"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import styles from "./admin.module.css";

const LINKS = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/collections", label: "Collections" },
  { href: "/admin/content", label: "Content" },
  { href: "/admin/pages", label: "Pages & Bindings" },
  { href: "/admin/media", label: "Media" },
  { href: "/admin/deploy", label: "Deploy" },
  { href: "/admin/settings", label: "Settings" },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>◆ CMS Admin</div>
      {LINKS.map((link) => {
        const active = link.exact
          ? pathname === link.href
          : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`${styles.navLink} ${active ? styles.navActive : ""}`}
          >
            {link.label}
          </Link>
        );
      })}
      <div className={styles.spacer} />
      <button className={styles.signOut} onClick={() => signOut({ callbackUrl: "/admin/login" })}>
        Sign out
      </button>
    </aside>
  );
}
