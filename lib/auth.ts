import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { getAuthSecret } from "@/lib/auth-env";
import { authConfig } from "@/lib/auth.config";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  secret: getAuthSecret(),
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        // Single-admin login via env (ADMIN_EMAIL + ADMIN_PASSWORD_HASH).
        const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
        const adminHash = process.env.ADMIN_PASSWORD_HASH;
        if (adminEmail && adminHash && email.toLowerCase() === adminEmail) {
          const validAdmin = await verifyPassword(password, adminHash);
          if (!validAdmin) return null;
          return { id: "admin", email: adminEmail, name: "Admin" };
        }

        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
        });

        if (!user) return null;

        const valid = await verifyPassword(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      },
    }),
    ...authConfig.providers,
  ],
});