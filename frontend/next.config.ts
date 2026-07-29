import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/digital-twin",
        destination: "/commercial-digital-twin",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
