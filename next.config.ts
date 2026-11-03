import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/g/:secret/restaurants",
        destination: "/g/:secret/places",
        permanent: false,
      },
      {
        source: "/g/:secret/restaurants/:path*",
        destination: "/g/:secret/places/:path*",
        permanent: false,
      },
      {
        source: "/g/:secret/history",
        destination: "/g/:secret/past",
        permanent: false,
      },
      {
        source: "/g/:secret/history/:path*",
        destination: "/g/:secret/past/:path*",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
