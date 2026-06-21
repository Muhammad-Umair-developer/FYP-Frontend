# Local Environment Setup Guide - Frontend

This guide outlines the step-by-step procedure to configure and run the Face Recognition Attendance System Next.js Frontend Client on a local PC.

---

## 1. System Prerequisites

Before running the frontend, ensure your local environment contains the following tools:
- **Node.js**: Version **v18.x or v20.x+** (LTS version recommended).
- **npm**: Installed automatically with Node.js (package manager).

To verify your Node.js installation, run the following commands in your Command Prompt / PowerShell:
```bash
node -v
npm -v
```

---

## 2. Local Setup & Installation

### Step 2.1: Navigate to Frontend Path
Open your terminal and navigate to the frontend directory:
```bash
cd "e:\Umair Folder\FYP\FYP-Frontend"
```

### Step 2.2: Install Package Dependencies
Install all package dependencies defined in the project's `package.json` file:
```bash
npm install
```
This command installs all required packages (such as Next.js, React, Framer Motion, Recharts, jsPDF, and Tailwind CSS/PostCSS plugins) under the `node_modules` folder.

### Step 2.3: Configure API Connection
The frontend connects to the backend API via URLs defined in a central configuration file.
1. Open the configuration file located at: [src/config/api.ts](file:///e:/Umair%20Folder/FYP/FYP-Frontend/src/config/api.ts).
2. By default, it is configured to point to a local backend instance:
   - `API_BASE_URL`: `http://127.0.0.1:8000` (FastAPI REST server address).
   - `WS_BASE_URL`: `ws://127.0.0.1:8000` (FastAPI WebSocket server address).
3. If your backend runs on a different port or server IP, update these two constants in [api.ts](file:///e:/Umair%20Folder/FYP/FYP-Frontend/src/config/api.ts) accordingly.

---

## 3. Running the Client Application

### Step 3.1: Run in Development Mode
To launch the client with hot-reloading enabled, run:
```bash
npm run dev
```
- Open [http://localhost:3000](http://localhost:3000) in your web browser to access the dashboard login screen.
- Log in with the default admin credentials seeded by the backend:
  - **Username/Email**: `admin@fyp.com`
  - **Password**: `admin123`

### Step 3.2: Build and Serve for Production
For staging, deployment, or final production builds:
```bash
# Build the optimized production bundle
npm run build

# Start the compiled client application
npm run start
```
The application will serve the compiled bundle at `http://localhost:3000`.
