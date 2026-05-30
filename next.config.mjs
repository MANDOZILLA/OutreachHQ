/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["better-sqlite3", "imapflow", "mailparser"],
    instrumentationHook: true,
  },
};

export default nextConfig;
