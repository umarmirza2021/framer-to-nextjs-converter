import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["cheerio", "archiver", "@prisma/client", "bcryptjs"],
};

export default nextConfig;