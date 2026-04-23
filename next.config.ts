import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "places.googleapis.com",
      },
      {
        protocol: "https",
        hostname: "chatdmc-avatars.s3.ap-south-1.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "rategen.s3.ap-south-1.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "images.pexels.com",
      },
    ],
  },
  devIndicators: false,
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
  serverExternalPackages: [
    "@xenova/transformers",
    "sharp",
    "onnxruntime-node",
    "@copilotkit/runtime",
    "pino",
    "thread-stream",
  ],
  // Skip TypeScript type checking during build
  // Workaround for @langchain/core 1.x type checking memory issue
  // See: https://github.com/langchain-ai/langchainjs/issues/8477
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
