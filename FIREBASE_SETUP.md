# Firebase Setup Checklist

Follow these steps to connect your WorkTime app to a live Firebase backend.

## 1. Create Project
- [x] Go to the [Firebase Console](https://console.firebase.google.com/).
- [x] Click **Add project**.
- [x] Name it `WorkTime` (or similar) and follow the setup steps.
- [x] (Optional) Disable Google Analytics if you want a simpler setup.

## 2. Enable Authentication
- [x] In the project sidebar, go to **Build** > **Authentication**.
- [x] Click **Get started**.
- [x] Select the **Sign-in method** tab.
- [x] Click **Email/Password**.
- [x] Enable the **Email/Password** switch (leave "Email link" disabled).
- [x] Click **Save**.

## 3. Create Firestore Database
- [x] In the sidebar, go to **Build** > **Firestore Database**.
- [x] Click **Create database**.
- [x] Choose a **Location** close to you (e.g., `eur3` for Europe, `us-central1` for US).
- [x] Select **Start in production mode**.
- [x] Click **Create**.

## 4. Set Security Rules
- [x] In the Firestore Database page, go to the **Rules** tab.
- [x] Replace the existing rules with the following code to ensure users can only access their own data:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Users can read/write their own user profile
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Users can read/write their own time entries
    match /entries/{entryId} {
      allow read, update, delete: if request.auth != null && request.auth.uid == resource.data.uid;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.uid;
    }
  }
}
```
- [x] Click **Publish**.

## 5. Get Configuration Keys
- [x] Click the **Gear icon** (Project settings) in the top left sidebar.
- [x] Scroll down to the **Your apps** section.
- [x] Click the **</> (Web)** icon.
- [x] Register the app (Nickname: "WorkTime Web").
- [x] **Copy** the values from the `firebaseConfig` object shown on screen.

## 6. Configure Local Environment
- [x] In your project folder, duplicate `.env.example` and name it `.env`.
- [x] Paste your copied values into the `.env` file:

```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=worktime-xyz.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=worktime-xyz
VITE_FIREBASE_STORAGE_BUCKET=worktime-xyz.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=123456...
VITE_FIREBASE_APP_ID=1:123456...
```

## 7. Run the App
- [x] Restart your development server to load the new env vars:
  ```bash
  npm run dev
  ```
- [x] Open the app in your browser.
- [ ] Try to **Login** (since it's a new project, you'll need to create a user manually in the Auth tab or handle sign-up errors if we haven't built a sign-up form yet. *Note: The current Login page calls `signInWithEmailAndPassword`. For a new user, you can manually create a user in the Firebase Console > Authentication > Users tab first.*)
