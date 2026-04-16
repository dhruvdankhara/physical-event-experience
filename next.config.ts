import type { NextConfig } from "next";

// next-pwa does not currently ship first-party TypeScript declarations.
// @ts-expect-error Un-typed third-party config wrapper.
import nextPwa from "next-pwa";

const withPWA = nextPwa({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
});

const nextConfig: NextConfig = {
  /* config options here */
  output: 'standalone',
  turbopack: {},
};

export default withPWA(nextConfig);
