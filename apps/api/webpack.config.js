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
    ],
    resolve: {
      ...options.resolve,
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
      },
    },
  };
};
