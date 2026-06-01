import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow the dev server's HMR/assets to be requested from the LAN host you open
  // the app on (e.g. http://192.168.1.5:3000 from a phone on the same network).
  allowedDevOrigins: ["192.168.1.5"],
};

export default nextConfig;
