// Static export deployment refresh; no runtime behavior change.
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true
};

export default nextConfig;
