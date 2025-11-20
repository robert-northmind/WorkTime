# WorkTime

A personal, multi-user-capable work time-tracking web application built with React and Firebase.

## Features

*   **Time Tracking**: Log daily work hours, including start/end times, lunch breaks, and extra hours.
*   **Status Tracking**: Categorize days as Work, Vacation, Holiday, or Sick.
*   **Balance Calculation**: Automatically calculates daily and weekly balance based on expected hours.
*   **Vacation Management**: Track used, planned, and remaining vacation days.
*   **Multi-User**: Supports multiple users via Firebase Authentication.
*   **Responsive Design**: Works on desktop and mobile devices.

## Tech Stack

*   **Frontend**: React, TypeScript, Vite, TailwindCSS
*   **Backend**: Firebase (Authentication, Firestore, Hosting)
*   **Testing**: Jest, React Testing Library

## Getting Started

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
    *   Create a Firebase project.
    *   Enable Authentication (Email/Password).
    *   Enable Firestore Database.
    *   Create a `.env` file in the root directory with your Firebase config:
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

5.  **Build for production**:
    ```bash
    npm run build
    ```

## Project Structure

*   `src/components`: Reusable UI components.
*   `src/pages`: Application pages (Timesheet, Stats, Settings, Login).
*   `src/services`: Core business logic and data services.
*   `src/types`: TypeScript type definitions.
*   `tests`: Unit and integration tests.

## License

[MIT License](LICENSE)
