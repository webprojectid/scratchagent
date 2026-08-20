import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "missing",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "missing",
    }),
  ],
  pages: { signIn: "/" },
  callbacks: {
    authorized: ({ auth: session, request }) => {
      const path = request.nextUrl.pathname;
      if (path === "/" || path.startsWith("/project/demo") || path.startsWith("/api/")) return true;
      return !!session;
    },
  },
});
