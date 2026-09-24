# Movie Studio (front end)

Next.js app that uploads character photos to Vercel Blob, sends the script + cast to your n8n
webhook, then shows the finished clips when n8n calls back.

## Deploy on Vercel
1. Push this folder to a GitHub repo, then **Add New > Project** in Vercel and import it.
2. In the project: **Storage > Create > Blob** and connect it (this adds `BLOB_READ_WRITE_TOKEN`).
3. **Settings > Environment Variables**: add everything from `.env.example`
   (`N8N_WEBHOOK_URL_TEST`, `N8N_WEBHOOK_URL_PROD`, `CALLBACK_SECRET`). Leave `APP_URL` empty.
4. Redeploy.

## n8n
- Test URL: `https://YOUR-N8N-DOMAIN/webhook-test/movie-automation`. Click **Execute workflow** in n8n first.
- Live URL: `https://YOUR-N8N-DOMAIN/webhook/movie-automation`. Toggle the workflow **Active**.
- n8n must be able to reach your Vercel URL to deliver results (it does, since Vercel is public).

## Local dev
```
npm install
vercel env pull .env.local     # or copy .env.example to .env.local and fill it in
npm run dev
```
Results only come back locally if n8n can reach you: run a tunnel (ngrok / cloudflared) and set `APP_URL` to its URL.

## How the pieces connect
- `app/api/upload`: token endpoint for direct browser-to-Blob uploads
- `app/api/submit`: proxies the job to n8n (no CORS, secrets stay server-side)
- `app/api/job`: n8n POSTs the finished result here; the browser polls it with GET
