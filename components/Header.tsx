import Link from "next/link";
import { auth } from "@/lib/auth";
import SignOutButton from "@/components/SignOutButton";

export default async function Header() {
  const session = await auth();

  return (
    <header className="ftn-header">
      <Link href="/" className="ftn-logo">
        Framer → <span>Next.js</span>
      </Link>
      <nav className="ftn-nav">
        {session?.user ? (
          <>
            <Link href="/dashboard" className="ftn-link">
              Dashboard
            </Link>
            <Link href="/dashboard/settings" className="ftn-link">
              Settings
            </Link>
            {session.user.email && (
              <span className="ftn-user-email">{session.user.email}</span>
            )}
            <SignOutButton />
          </>
        ) : (
          <>
            <Link href="/login" className="ftn-link">
              Sign in
            </Link>
            <Link href="/signup" className="ftn-link ftn-primary-btn">
              Sign up
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}