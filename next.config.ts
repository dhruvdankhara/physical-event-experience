import type { NextConfig } from "next";

// next-pwa does not currently ship first-party TypeScript declarations.
import nextPwa from "@ducanh2912/next-pwa";

const withPWA = nextPwa({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  // skipWaiting: true,
});

const nextConfig: NextConfig = {
  /* config options here */
  output: "standalone",
  serverExternalPackages: [
    "@google-cloud/firestore",
    "@google-cloud/text-to-speech",
    "google-auth-library",
  ],
  turbopack: {},
};

export default withPWA(nextConfig);
