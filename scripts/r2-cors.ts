/**
 * Configura CORS en el bucket R2 para subidas directas desde el browser en production.
 * En development la API hace de proxy y no hace falta correr esto.
 *
 * Uso: bun scripts/r2-cors.ts
 */
import { PutBucketCorsCommand, S3Client } from "@aws-sdk/client-s3";
import { loadEnv } from "../apps/api/src/config/env";
import { r2Configured } from "../apps/api/src/config/env";

const env = loadEnv();
if (!r2Configured(env)) {
  console.error("Faltan variables R2_* en .env");
  process.exit(1);
}

const origins = new Set([env.WEB_ORIGIN]);
if (env.NODE_ENV !== "production") {
  origins.add("http://localhost:3000");
}

const client = new S3Client({
  region: "auto",
  endpoint: env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID!,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY!,
  },
});

await client.send(
  new PutBucketCorsCommand({
    Bucket: env.R2_BUCKET!,
    CORSConfiguration: {
      CORSRules: [
        {
          AllowedOrigins: [...origins],
          AllowedMethods: ["GET", "PUT", "HEAD"],
          AllowedHeaders: ["content-type", "content-length"],
          ExposeHeaders: ["ETag"],
          MaxAgeSeconds: 3600,
        },
      ],
    },
  }),
);

console.log(`CORS aplicado en ${env.R2_BUCKET} para: ${[...origins].join(", ")}`);
