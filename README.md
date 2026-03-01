# WorkTime

A personal, multi-user-capable work time-tracking web application built with React and Firebase.

## Features

- **Time Tracking**: Log daily work hours, including start/end times, lunch breaks, and extra hours.
- **Status Tracking**: Categorize days as Work, Vacation, Holiday, or Sick.
- **Balance Calculation**: Automatically calculates daily and weekly balance based on expected hours.
- **Vacation Management**: Track used, planned, and remaining vacation days.
- **Multi-User**: Supports multiple users via Firebase Authentication.
- **Responsive Design**: Works on desktop and mobile devices.

## Tech Stack

- **Frontend**: React, TypeScript, Vite, TailwindCSS
- **Backend**: Firebase (Authentication, Firestore, Hosting)
- **Testing**: Jest, React Testing Library

## Getting Started

**Node version**: This project targets Node.js 24.

1.  **Clone the repository**:

    ```bash
    git clone <repository-url>
    cd WorkTime
    ```

2.  **Install dependencies**:

    ```bash
    npm install
    ```

3.  **Configure Firebase**:
    - Create a Firebase project.
    - Enable Authentication (Email/Password).
    - Enable Firestore Database.
    - Create a `.env` file in the root directory with your Firebase config:
      ```env
      VITE_FIREBASE_API_KEY=your_api_key
      VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
      VITE_FIREBASE_PROJECT_ID=your_project_id
      VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
      VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
      VITE_FIREBASE_APP_ID=your_app_id
      ```

4.  **Run the development server**:

    ```bash
    npm run dev
    ```

### Optional: Agent test login mode (for local AI-agent testing)

You can enable a special login path that accepts a hard-coded test user while still allowing normal Firebase auth for all other credentials.

1. Add these values to `.env.local`:

   ```env
   VITE_AGENT_TEST_AUTH_ENABLED=true
   VITE_AGENT_TEST_EMAIL=agent-test@example.com
   VITE_AGENT_TEST_PASSWORD=agent-test-password
   ```

2. Run local dev:

   ```bash
   npm run dev
   ```

3. On `/login`, sign in with the configured test credentials (or use the "Fill test credentials" helper button).

When this mode is disabled (or unset), authentication works normally via Firebase only.

5.  **Build for production**:
    ```bash
    npm run build
    ```

## Project Structure

- `src/components`: Reusable UI components.
- `src/pages`: Application pages (Timesheet, Stats, Settings, Login).
- `src/services`: Core business logic and data services.
- `src/types`: TypeScript type definitions.
- `tests`: Unit and integration tests.

## Deployment

The app is deployed to Firebase Hosting at:
**https://worktime-ac19a.web.app**

### CI/CD (GitHub Actions)

*   Pull requests from the same repo run checks (`npm run check`).
*   Merges to `main` (pushes to `main`) run `npm run build` and deploy to Firebase Hosting.

### Deploying Changes

To deploy new changes to production:

1.  **Build the app**:

    ```bash
    npm run build
    ```

2.  **Deploy to Firebase**:

    ```bash
    firebase deploy
    ```

    This will deploy:
    - Your web app (from the `dist` folder)
    - Firestore security rules
    - Firestore indexes

3.  **Deploy only hosting** (if you only changed frontend code):
    ```bash
    firebase deploy --only hosting
    ```

**What gets deployed:**

- `firebase deploy` deploys: web app + Firestore rules + Firestore indexes
- `firebase deploy --only hosting` deploys: web app only (faster)

**When to use which:**

- Use `--only hosting` for UI changes, bug fixes, new features (99% of the time)
- Use full `firebase deploy` when you modify `firestore.rules` or `firestore.indexes.json`

> **Note**: Make sure you're logged in with the correct Firebase account (`firebase login`) and linked to the right project (`firebase use default`).

## License

[MIT License](LICENSE)
