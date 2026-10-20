import type { NextConfig } from "next";
const config: NextConfig = {
  serverExternalPackages: ["pdfkit"],
  outputFileTracingIncludes: {
    "/api/documents/export": ["./public/fonts/*.woff"],
  },
};
export default config;
