import type { NextConfig } from "next";
const config: NextConfig = {
  serverExternalPackages: ["pdfkit", "pdfjs-dist", "mammoth", "yauzl"],
  outputFileTracingIncludes: {
    "/api/documents/export": ["./public/fonts/*.woff"],
  },
};
export default config;
