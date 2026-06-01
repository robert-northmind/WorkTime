// Pure, dependency-free Firebase config validation helpers.
//
// Kept separate from `config.ts` so the logic can be unit tested without
// pulling in `import.meta.env` or triggering Firebase initialization side
// effects at module load.

export interface FirebaseConfigValues {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
}

// The README documents an example `.env` whose values are all `your_*`
// placeholders (e.g. `your_api_key`, `your_project_id`). Treat any value with
// this prefix as not-yet-configured rather than only special-casing the API key.
const PLACEHOLDER_PREFIX = "your_";

export function isPlaceholderValue(value: string | undefined): boolean {
  return typeof value === "string" && value.startsWith(PLACEHOLDER_PREFIX);
}

function isRealValue(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && !isPlaceholderValue(value);
}

export function hasCompleteFirebaseConfig(config: FirebaseConfigValues): boolean {
  return Object.values(config).every(isRealValue);
}
