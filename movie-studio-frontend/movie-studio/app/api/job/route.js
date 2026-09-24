import { NextResponse } from 'next/server';
import { put, head, BlobNotFoundError } from '@vercel/blob';

export const dynamic = 'force-dynamic';

// n8n calls this (POST) when every clip is finished. Results are kept in Vercel Blob.
export async function POST(request) {
  const secret = new URL(request.url).searchParams.get('secret') || '';
  if (!process.env.CALLBACK_SECRET || secret !== process.env.CALLBACK_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const data = await request.json();
  if (!/^movie_\d+$/.test(data.jobId || '')) return NextResponse.json({ error: 'bad jobId' }, { status: 400 });
  delete data.callback_url; // contains the secret
  await put(`jobs/${data.jobId}.json`, JSON.stringify(data), {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
  });
  return NextResponse.json({ ok: true });
}

// The browser polls this (GET ?id=movie_123) until the job is completed.
export async function GET(request) {
  const id = new URL(request.url).searchParams.get('id') || '';
  if (!/^movie_\d+$/.test(id)) return NextResponse.json({ error: 'bad id' }, { status: 400 });
  try {
    const meta = await head(`jobs/${id}.json`);
    const res = await fetch(`${meta.url}?t=${Date.now()}`, { cache: 'no-store' });
    return NextResponse.json(await res.json());
  } catch (e) {
    if (e instanceof BlobNotFoundError) return NextResponse.json({ status: 'processing' });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
