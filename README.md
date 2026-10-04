# LavaLust React frontend

Standalone React + Vite frontend for the LavaLust PHP application.

## Run locally

Start the LavaLust PHP server from the project root in one terminal:

```powershell
php lava run 8001
```

Then start React in another terminal:

```powershell
cd frontend
npm install
Copy-Item .env.example .env
npm run dev
```

Open the URL printed by Vite. The development proxy forwards `/backend/*` to
`VITE_LAVALUST_BACKEND_URL`; change that value in `frontend/.env` if your Laragon
project URL is different. The default uses the LavaLust development server on
port 8001.

The React app uses the LavaLust API for login, listing products, and protected
create/update/delete actions. API tokens are held in `sessionStorage` and cleared
on logout. Make sure `APP_KEY` is set in the root `.env`; the API derives separate
JWT and refresh-token keys from it unless explicit `JWT_SECRET` and
`REFRESH_TOKEN_KEY` values are configured.

Build the static frontend with `npm run build`. Vite writes output to
`frontend/dist`; deployment/serving that build is separate from the current
LavaLust PHP views.