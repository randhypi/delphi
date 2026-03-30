/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  async rewrites() {
    return {
      // fallback: berjalan SETELAH semua Next.js routes dicek
      // Sehingga /api/auth/* ditangani NextAuth, bukan di-proxy ke backend
      fallback: [
        {
          source: '/api/:path*',
          destination: `${process.env.API_BACKEND_URL}/api/:path*`,
        },
      ],
    };
  },
};

module.exports = nextConfig;
