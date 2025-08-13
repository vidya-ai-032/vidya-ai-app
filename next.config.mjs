// next.config.js

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Add headers to address Cross-Origin-Opener-Policy issues for Firebase Auth popups
  async headers() {
    return [
      {
        source: '/:path*', // Apply to all paths
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups', // Allows popups to be opened and retain reference to opener
          },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.svgrepo.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com', // For Google profile pictures
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**firebasestorage.googleapis.com**', // Allow images from Firebase Storage
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Webpack configuration (cleaned for unpdf)
  webpack: (config, { isServer }) => {
    if (isServer) {
      // For server-side (API routes), provide fallbacks for Node.js built-in modules
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }
    return config;
  },
};

// FIXED: Changed CommonJS export to ES module export
export default nextConfig;
