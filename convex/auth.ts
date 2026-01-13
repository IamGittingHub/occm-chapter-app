import Google from "@auth/core/providers/google";
import { convexAuth } from "@convex-dev/auth/server";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Google],
  callbacks: {
    async redirect({ redirectTo }) {
      // Allow Expo development URLs (exp:// scheme)
      if (redirectTo.startsWith("exp://")) {
        return redirectTo;
      }
      // Allow custom app scheme (occm://)
      if (redirectTo.startsWith("occm://")) {
        return redirectTo;
      }
      // Allow the production web app URL
      const siteUrl = process.env.SITE_URL;
      if (siteUrl && redirectTo.startsWith(siteUrl)) {
        return redirectTo;
      }
      // Allow localhost for development
      if (redirectTo.startsWith("http://localhost")) {
        return redirectTo;
      }
      // Reject other URLs
      throw new Error(`Invalid redirectTo URI: ${redirectTo}`);
    },
  },
});
