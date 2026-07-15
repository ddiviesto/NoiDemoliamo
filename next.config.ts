import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // I PDF ACI originali devono finire nel deploy Vercel insieme
  // all'endpoint che li compila (fs.readFile a runtime)
  outputFileTracingIncludes: {
    "/api/modulo-pdf": ["./docs/moduli/originali/*.pdf"],
  },
};

export default nextConfig;
