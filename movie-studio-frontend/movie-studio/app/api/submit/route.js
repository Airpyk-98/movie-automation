import { NextResponse } from 'next/server';

// Server-side proxy to n8n: no CORS problems, and webhook URLs / secrets never reach the browser.
export async function POST(request) {
  const b = await request.json();
  const url = b.mode === 'production' ? process.env.N8N_WEBHOOK_URL_PROD : process.env.N8N_WEBHOOK_URL_TEST;
  if (!url) {
    return NextResponse.json({ error: `The ${b.mode} webhook URL is not set in the environment variables.` }, { status: 500 });
  }
  if (!process.env.CALLBACK_SECRET) {
    return NextResponse.json({ error: 'CALLBACK_SECRET is not set in the environment variables.' }, { status: 500 });
  }

  const jobId = `movie_${Date.now()}`;
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const origin = (process.env.APP_URL || `${proto}://${host}`).replace(/\/$/, '');

  const payload = {
    job_id: jobId,
    title: b.title,
    script: b.script,
    characters: b.characters,
    style: b.style,
    aspect_ratio: b.aspect_ratio,
    max_shots_per_scene: b.max_shots_per_scene,
    callback_url: `${origin}/api/job?secret=${encodeURIComponent(process.env.CALLBACK_SECRET)}`,
  };

  const headers = { 'Content-Type': 'application/json' };
  if (process.env.N8N_AUTH_VALUE) headers[process.env.N8N_AUTH_HEADER || 'X-Api-Key'] = process.env.N8N_AUTH_VALUE;

  try {
    const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) });
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: `n8n answered ${res.status}: ${text.slice(0, 300)}` }, { status: 502 });
    }
    return NextResponse.json({ jobId });
  } catch (e) {
    return NextResponse.json({ error: `Could not reach n8n: ${e.message}` }, { status: 502 });
  }
}
