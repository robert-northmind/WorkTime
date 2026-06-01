import {
  hasCompleteFirebaseConfig,
  isPlaceholderValue,
  type FirebaseConfigValues,
} from "../../../src/services/firebase/configValidation";

const completeConfig: FirebaseConfigValues = {
  apiKey: "AIza-real-key",
  authDomain: "worktime.firebaseapp.com",
  projectId: "worktime-123",
  storageBucket: "worktime-123.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abc123",
};

describe("isPlaceholderValue", () => {
  it("treats README example values (your_*) as placeholders", () => {
    expect(isPlaceholderValue("your_api_key")).toBe(true);
    expect(isPlaceholderValue("your_project_id")).toBe(true);
    expect(isPlaceholderValue("your_auth_domain")).toBe(true);
  });

  it("treats real values as non-placeholders", () => {
    expect(isPlaceholderValue("worktime-123")).toBe(false);
    expect(isPlaceholderValue("AIza-real-key")).toBe(false);
  });

  it("handles empty and undefined values", () => {
    expect(isPlaceholderValue("")).toBe(false);
    expect(isPlaceholderValue(undefined)).toBe(false);
  });
});

describe("hasCompleteFirebaseConfig", () => {
  it("returns true when every value is a real, non-placeholder string", () => {
    expect(hasCompleteFirebaseConfig(completeConfig)).toBe(true);
  });

  it("returns false when any value is missing", () => {
    expect(
      hasCompleteFirebaseConfig({ ...completeConfig, projectId: undefined })
    ).toBe(false);
  });

  it("returns false when any value is an empty string", () => {
    expect(hasCompleteFirebaseConfig({ ...completeConfig, appId: "" })).toBe(false);
  });

  it("rejects the apiKey placeholder", () => {
    expect(
      hasCompleteFirebaseConfig({ ...completeConfig, apiKey: "your_api_key" })
    ).toBe(false);
  });

  it("rejects non-apiKey placeholders left from the README example", () => {
    expect(
      hasCompleteFirebaseConfig({ ...completeConfig, projectId: "your_project_id" })
    ).toBe(false);
    expect(
      hasCompleteFirebaseConfig({
        ...completeConfig,
        storageBucket: "your_storage_bucket",
      })
    ).toBe(false);
  });
});
