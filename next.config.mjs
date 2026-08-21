/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['pdf-parse', 'mammoth', '@prisma/client', 'prisma'],
};

export default nextConfig;
