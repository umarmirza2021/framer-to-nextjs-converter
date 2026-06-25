import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const isDashboard = request.nextUrl.pathname.startsWith("/dashboard");
      const isAuthPage =
        request.nextUrl.pathname === "/login" || request.nextUrl.pathname === "/signup";

      if (isDashboard && !isLoggedIn) return false;
      if (isAuthPage && isLoggedIn) {
        return Response.redirect(new URL("/dashboard", request.nextUrl));
      }
      return true;
    },
  },
};