import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  transpilePackages: ["@misupertostada/shared"],
  // Solo `next build`. `next dev` local no cambia.
  output: "standalone",
  outputFileTracingRoot: path.join(here, "../.."),
};

export default nextConfig;
