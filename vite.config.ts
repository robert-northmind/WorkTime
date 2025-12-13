import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import faroUploader from "@grafana/faro-rollup-plugin";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), "");

  return {
    build: {
      sourcemap: true, // Required for source map uploads
    },
    plugins: [
      react(),
      // Only upload source maps in production builds when credentials are available
      ...(env.FARO_API_KEY
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
