'use client';
import { useEffect, useState } from 'react';
import { upload } from '@vercel/blob/client';

let n = 0;
const blank = () => ({ id: ++n, name: '', description: '', file: null, preview: '' });
const timecode = (s) =>
  [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60].map((v) => String(v).padStart(2, '0')).join(':');

export default function Home() {
  const [mode, setMode] = useState('test');
  const [title, setTitle] = useState('');
  const [script, setScript] = useState('');
  const [style, setStyle] = useState('');
  const [ratio, setRatio] = useState('16:9');
  const [maxShots, setMaxShots] = useState(4);
  const [cast, setCast] = useState([blank()]);
  const [phase, setPhase] = useState('idle'); // idle | uploading | sending | processing | done | error
  const [error, setError] = useState('');
  const [jobId, setJobId] = useState('');
  const [result, setResult] = useState(null);
  const [elapsed, setElapsed] = useState(0);

  // Pick up a job that was running before a refresh.
  useEffect(() => {
    const saved = localStorage.getItem('movie_job');
    if (saved) { setJobId(saved); setPhase('processing'); }
  }, []);

  // Poll for the finished film.
  useEffect(() => {
    if (!jobId || phase !== 'processing') return;
    const t0 = Date.now();
    const tick = setInterval(() => setElapsed(Math.floor((Date.now() - t0) / 1000)), 1000);
    const poll = setInterval(async () => {
      try {
        const d = await (await fetch(`/api/job?id=${jobId}`, { cache: 'no-store' })).json();
        if (d.status === 'completed') { setResult(d); setPhase('done'); }
      } catch {}
    }, 8000);
    return () => { clearInterval(tick); clearInterval(poll); };
  }, [jobId, phase]);

  const upd = (id, patch) => setCast((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  const busy = phase === 'uploading' || phase === 'sending';

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!script.trim()) return setError('Paste your script before starting.');
    if (cast.some((c) => !c.name.trim() || !c.file)) return setError('Every character needs a name and a photo.');
    try {
      setPhase('uploading');
      const characters = await Promise.all(
        cast.map(async (c) => {
          const blob = await upload(`characters/${c.file.name}`, c.file, { access: 'public', handleUploadUrl: '/api/upload' });
          return { name: c.name.trim(), description: c.description.trim(), image_url: blob.url };
        })
      );
      setPhase('sending');
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, title, script, style, aspect_ratio: ratio, max_shots_per_scene: maxShots, characters }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'The request to n8n failed.');
      localStorage.setItem('movie_job', data.jobId);
      setJobId(data.jobId); setResult(null); setElapsed(0); setPhase('processing');
    } catch (err) {
      setError(err.message);
      setPhase('error');
    }
  }

  function reset() {
    localStorage.removeItem('movie_job');
    setJobId(''); setResult(null); setPhase('idle'); setError('');
  }

  return (
    <>
      <div className="slate" aria-hidden="true" />
      <main className="wrap">
        <header className="top">
          <h1>Movie Studio</h1>
          <div className="seg" role="group" aria-label="Webhook">
            <button type="button" aria-pressed={mode === 'test'} onClick={() => setMode('test')}>Test webhook</button>
            <button type="button" aria-pressed={mode === 'production'} onClick={() => setMode('production')}>Live webhook</button>
          </div>
        </header>
        {mode === 'test' && (
          <p className="hint">Before sending, open the workflow in n8n and click Execute workflow. The test URL accepts one call per click.</p>
        )}

        {phase === 'processing' && (
          <section className="status" aria-live="polite">
            <div className="timecode">{timecode(elapsed)}</div>
            <div>
              <strong>Production in progress</strong>
              <p>n8n is planning sets, generating images and animating each shot. You can close this tab; finished clips load when you come back.</p>
              <small>{jobId}</small>
            </div>
          </section>
        )}

        {phase === 'done' && result && (
          <section className="film">
            <div className="film-head">
              <h2>{result.project_title}</h2>
              <button type="button" onClick={reset}>Start a new film</button>
            </div>
            {result.sets.map((s) => (
              <article className="set" key={s.set_id}>
                <h3>{s.set_name}</h3>
                <img className="master" src={s.master_image_url} alt={`Master frame of ${s.set_name}`} />
                <div className="clips">
                  {s.clips.map((c) => (
                    <figure key={c.shot_id}>
                      <video src={c.video_url} poster={c.shot_image_url} controls loop playsInline />
                      <figcaption>
                        <b>{c.angle}</b>
                        {c.dialogue && <q>{c.dialogue}</q>}
                        <a href={c.video_url} target="_blank" rel="noreferrer">Open clip</a>
                      </figcaption>
                    </figure>
                  ))}
                </div>
              </article>
            ))}
          </section>
        )}

        {phase !== 'processing' && phase !== 'done' && (
          <form onSubmit={submit}>
            <fieldset disabled={busy}>
              <legend>Script</legend>
              <label>Title<input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="The Last Train" /></label>
              <textarea className="script" rows={12} value={script} onChange={(e) => setScript(e.target.value)}
                placeholder={'INT. TRAIN STATION - NIGHT\n\nADA waits alone under a flickering lamp...'} />
            </fieldset>

            <fieldset disabled={busy}>
              <legend>Cast</legend>
              <div className="cast">
                {cast.map((c) => (
                  <div className="char" key={c.id}>
                    <label className="drop">
                      {c.preview ? <img src={c.preview} alt="" /> : <span>Add photo</span>}
                      <input type="file" accept="image/png,image/jpeg,image/webp"
                        onChange={(e) => { const f = e.target.files[0]; if (f) upd(c.id, { file: f, preview: URL.createObjectURL(f) }); }} />
                    </label>
                    <input value={c.name} onChange={(e) => upd(c.id, { name: e.target.value })} placeholder="Character name" aria-label="Character name" />
                    <input value={c.description} onChange={(e) => upd(c.id, { description: e.target.value })} placeholder="Optional: age, wardrobe, mood" aria-label="Character description" />
                    {cast.length > 1 && <button type="button" className="link" onClick={() => setCast(cast.filter((x) => x.id !== c.id))}>Remove</button>}
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => setCast([...cast, blank()])}>Add character</button>
            </fieldset>

            <fieldset disabled={busy}>
              <legend>Look</legend>
              <div className="row">
                <label>Visual style<input value={style} onChange={(e) => setStyle(e.target.value)} placeholder="Moody 35mm noir, teal and amber" /></label>
                <label>Aspect ratio
                  <select value={ratio} onChange={(e) => setRatio(e.target.value)}>
                    <option>16:9</option><option>9:16</option><option>1:1</option><option>2.39:1</option>
                  </select>
                </label>
                <label>Max shots per scene
                  <input type="number" min={2} max={8} value={maxShots} onChange={(e) => setMaxShots(Number(e.target.value))} />
                </label>
              </div>
            </fieldset>

            {error && <p className="error" role="alert">{error}</p>}
            <button type="submit" className="go" disabled={busy}>
              {phase === 'uploading' ? 'Uploading photos...' : phase === 'sending' ? 'Sending to n8n...' : 'Start production'}
            </button>
          </form>
        )}
      </main>
    </>
  );
}
