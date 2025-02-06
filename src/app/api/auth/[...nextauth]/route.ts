import NextAuth, { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { MongoDBAdapter } from "@next-auth/mongodb-adapter";
import clientPromise from "@/lib/mongodb";

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "openid profile email https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/meetings",
          access_type: "offline", // Ensures we receive a refresh token
          prompt: "consent", // Forces re-consent if permissions are missing
        },
      },
    }),
  ],
  adapter: MongoDBAdapter(clientPromise),
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token ?? "";
        token.refreshToken = account.refresh_token ?? "";
      }
      return token;
    },
    async session({ session, token }) {
      return {
        ...session,
        accessToken: typeof token.accessToken === "string" ? token.accessToken : "",
        refreshToken: typeof token.refreshToken === "string" ? token.refreshToken : "",
      };
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
