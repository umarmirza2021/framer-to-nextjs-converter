"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import styles from "./AuthForm.module.css";

interface AuthFormProps {
  mode: "login" | "signup";
}

export default function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "signup") {
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, name: name.trim() || undefined }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Signup failed");
        }
      }

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        throw new Error(mode === "login" ? "Invalid email or password" : "Account created but sign-in failed");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.authPage}>
      <div className={styles.authCard}>
        <h1 className={styles.authTitle}>
          {mode === "login" ? "Welcome back" : "Create account"}
        </h1>
        <p className={styles.authSubtitle}>
          {mode === "login"
            ? "Sign in to save and manage your converted projects"
            : "Sign up to save conversions and deploy later"}
        </p>

        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit}>
          {mode === "signup" && (
            <div className={styles.field}>
              <label className={styles.label} htmlFor="name">
                Name (optional)
              </label>
              <input
                id="name"
                type="text"
                className={styles.input}
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            </div>
          )}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              className={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              className={styles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </div>
          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>

        <p className={styles.footer}>
          {mode === "login" ? (
            <>
              Don&apos;t have an account? <a href="/signup">Sign up</a>
            </>
          ) : (
            <>
              Already have an account? <a href="/login">Sign in</a>
            </>
          )}
        </p>
      </div>
    </div>
  );
}