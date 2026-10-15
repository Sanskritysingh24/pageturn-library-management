# Library Management System

A full-stack Library Management System starter built for a three-tier cloud deployment:

- **Frontend:** React + Vite (Netlify)
- **Backend:** Node.js + Express REST API (Render)
- **Database:** MongoDB Atlas + Mongoose

## Features
- Dashboard statistics
- Book CRUD and search
- Member CRUD and search
- Issue/return workflow with due dates
- Transaction history
- Input validation and API error handling
- CORS restricted by `FRONTEND_URL`
- MongoDB credentials kept in backend environment variables

## Requirements
Install Node.js LTS (includes npm), Git (optional), and VS Code.

## 1. Configure the backend
Open a terminal in this project folder:

```bash
cd backend
npm install
```

Copy `.env.example` to `.env`, then fill in your MongoDB Atlas connection string:

```env
PORT=5000
MONGODB_URI=mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@YOUR_CLUSTER/libraryDB?retryWrites=true&w=majority
FRONTEND_URL=http://localhost:5173
```

Create a MongoDB Atlas cluster and database user. In Atlas, add your current IP to Network Access while developing. For a hosted Render service, configure Atlas Network Access appropriately for your deployment. Never put the MongoDB URI in frontend code or commit `.env`.

Start the API:

```bash
npm run dev
```

Test it by opening http://localhost:5000/api/health . You should receive JSON showing the API is running.

## 2. Configure the frontend
Open a second terminal from the project root:

```bash
cd frontend
npm install
```

Create a file named `.env` inside `frontend/`:

```env
VITE_API_URL=http://localhost:5000/api
```

Start the frontend:

```bash
npm run dev
```

Open the local URL shown by Vite, usually http://localhost:5173.

## 3. Deploy the backend to Render
1. Push this project to a GitHub repository.
2. In Render, create a **Web Service** connected to the repository.
3. Set **Root Directory** to `backend`.
4. Build command: `npm install`
5. Start command: `npm start`
6. Add environment variables:
   - `MONGODB_URI` = your Atlas connection string
   - `FRONTEND_URL` = your deployed Netlify URL (add/update after frontend deployment)
   - `NODE_ENV` = `production`
7. Deploy and test `https://YOUR-RENDER-SERVICE.onrender.com/api/health`.

## 4. Deploy the frontend to Netlify
1. In Netlify, import the same GitHub repository.
2. Set **Base directory** to `frontend`.
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Add environment variable:
   - `VITE_API_URL` = `https://YOUR-RENDER-SERVICE.onrender.com/api`
6. Deploy.
7. Copy your Netlify site URL and update `FRONTEND_URL` in Render to that URL. Redeploy/restart the backend if required.

## API overview
- `GET /api/health`
- `GET /api/books`, `GET /api/books/:id`, `POST /api/books`, `PUT /api/books/:id`, `DELETE /api/books/:id`
- `GET /api/members`, `GET /api/members/:id`, `POST /api/members`, `PUT /api/members/:id`, `DELETE /api/members/:id`
- `GET /api/transactions`, `POST /api/transactions/issue`, `PATCH /api/transactions/:id/return`

## Notes
- This is a project starter, not a production-hardened system.
- Authentication/role-based access is not included yet; add it before exposing administrative functions publicly.
- Do not use real sensitive personal data during testing.
