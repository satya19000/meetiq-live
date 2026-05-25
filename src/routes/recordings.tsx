import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
  listRecordings,
  getRecording,
  deleteRecording,
  type RecordingMeta,
} from "@/lib/recordings-store";
import { formatBytes, formatDuration } from "@/lib/recorder";
import { buildRecordingDocx } from "@/lib/docx-export";

export const Route = createFileRoute("/recordings")({
  head: () => ({
    meta: [
      { title: "Library — MeetIQ Live" },
      { name: "description", content: "Your saved recordings on this device." },
    ],
  }),
  component: RecordingsPage,
});

function RecordingsPage() {
  const [items, setItems] = useState<RecordingMeta[] | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setItems(await listRecordings());
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    return () => { if (playingUrl) URL.revokeObjectURL(playingUrl); };
  }, [playingUrl]);

  async function play(id: string) {
    const rec = await getRecording(id);
    if (!rec) return;
    if (playingUrl) URL.revokeObjectURL(playingUrl);
    const url = URL.createObjectURL(rec.blob);
    setPlayingUrl(url);
    setPlayingId(id);
  }

  async function download(id: string) {
    const rec = await getRecording(id);
    if (!rec) return;
    const url = URL.createObjectURL(rec.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${rec.name.replace(/[^a-z0-9-_]+/gi, "_")}.webm`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function downloadDocx(meta: RecordingMeta) {
    const blob = await buildRecordingDocx(meta);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${meta.name.replace(/[^a-z0-9-_]+/gi, "_")}.docx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function remove(id: string) {
    if (!confirm("Delete this recording? This can't be undone.")) return;
    if (id === playingId) {
      if (playingUrl) URL.revokeObjectURL(playingUrl);
      setPlayingUrl(null);
      setPlayingId(null);
    }
    await deleteRecording(id);
    await refresh();
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Library</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Recordings saved on this device. Clearing browser storage will delete them.
          </p>
        </div>
        <Link to="/record" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          New recording
        </Link>
      </div>

      {playingUrl && (
        <div className="mt-6 rounded-xl border border-border bg-card p-4">
          <audio src={playingUrl} controls autoPlay className="w-full" />
        </div>
      )}

      <div className="mt-6">
        {items === null ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            No recordings yet. <Link to="/record" className="text-primary hover:underline">Record your first one</Link>.
          </div>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border bg-card overflow-hidden">
            {items.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <div className="font-medium truncate">{r.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {new Date(r.createdAt).toLocaleString()} · {formatDuration(r.durationMs)} · {formatBytes(r.size)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => play(r.id)} className="rounded-md border border-border bg-background px-3 py-1.5 text-sm hover:bg-accent">Play</button>
                  <button onClick={() => download(r.id)} className="rounded-md border border-border bg-background px-3 py-1.5 text-sm hover:bg-accent">Audio</button>
                  <button onClick={() => downloadDocx(r)} className="rounded-md border border-border bg-background px-3 py-1.5 text-sm hover:bg-accent">DOCX</button>
                  <button onClick={() => remove(r.id)} className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-1.5 text-sm text-destructive hover:bg-destructive/20">Delete</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
