"use client";

import { signOut } from "next-auth/react";

export default function SignOutButton() {
  return (
    <button
      type="button"
      className="ftn-sign-out-btn"
      onClick={() => signOut({ callbackUrl: "/" })}
    >
      Sign out
    </button>
  );
}