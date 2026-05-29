import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import faroUploader from "@grafana/faro-rollup-plugin";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), "");
  const requiredFirebaseEnv = [
    "VITE_FIREBASE_API_KEY",
    "VITE_FIREBASE_AUTH_DOMAIN",
    "VITE_FIREBASE_PROJECT_ID",
    "VITE_FIREBASE_STORAGE_BUCKET",
    "VITE_FIREBASE_MESSAGING_SENDER_ID",
    "VITE_FIREBASE_APP_ID",
  ];
  const missingFirebaseEnv = requiredFirebaseEnv.filter(
    (key) => !env[key] || env[key] === "your_api_key"
  );

  if (mode === "production" && missingFirebaseEnv.length > 0) {
    throw new Error(
      `Missing required Firebase env vars for production build: ${missingFirebaseEnv.join(", ")}`
    );
  }

  const uploadSourcemaps = mode === "production" && Boolean(env.FARO_API_KEY);

  return {
    build: {
      sourcemap: uploadSourcemaps ? "hidden" : false,
    },
    plugins: [
      react(),
      // Only upload source maps in production builds when credentials are available
      ...(uploadSourcemaps
        ? [
            faroUploader({
              appName: "WorkTime",
              endpoint:
                "https://faro-api-prod-eu-west-2.grafana.net/faro/api/v1",
              appId: "4363",
              stackId: "990857",
              apiKey: env.FARO_API_KEY,
              gzipContents: true,
              verbose: true,
              keepSourcemaps: false, // Delete source maps after upload (security best practice)
            }),
          ]
        : []),
    ],
  };
});
