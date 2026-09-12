const path = require("node:path");
const nodeExternals = require("webpack-node-externals");

/** Empaqueta packages ESM del workspace para que Node CJS pueda exigirlos. */
module.exports = function (options) {
  return {
    ...options,
    externals: [
      nodeExternals({
        allowlist: [/^@misupertostada\//, "luxon", "postgres"],
      }),
      // takumi-pdf lee pkg/*.wasm relativo a su carpeta. Si webpack lo
      // mete en el bundle, __dirname apunta a apps/api y el binario no existe.
      "takumi-pdf",
      /^@takumi-rs\//,
    ],
    resolve: {
      ...options.resolve,
      extensions: [".tsx", ".ts", ".js", ...(options.resolve?.extensions ?? [])],
      alias: {
        ...(options.resolve && options.resolve.alias),
        "@misupertostada/shared": path.resolve(
          __dirname,
          "../../packages/shared/src/index.ts",
        ),
        "@misupertostada/db": path.resolve(
          __dirname,
          "../../packages/db/src/index.ts",
        ),
        "@misupertostada/pdf": path.resolve(
          __dirname,
          "../../packages/pdf/src/index.ts",
        ),
      },
    },
  };
};
