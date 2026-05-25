import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  MeetingRecorder,
  formatDuration,
  detectMeetingProvider,
  type RecorderState,
  type RecorderResult,
} from "@/lib/recorder";
import { saveRecording } from "@/lib/recordings-store";

export const Route = createFileRoute("/record")({
  head: () => ({
    meta: [
      { title: "Record — MeetIQ Live" },
      {
        name: "description",
        content: "Open a meeting in a new tab and capture audio only.",
      },
    ],
  }),
  component: RecordPage,
});

function RecordPage() {
  const recorderRef = useRef<MeetingRecorder | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);

  const [state, setState] = useState<RecorderState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [includeMic, setIncludeMic] = useState(true);
  const [includeSystemAudio, setIncludeSystemAudio] = useState(true);
  const [result, setResult] = useState<RecorderResult | null>(null);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [supported, setSupported] = useState(true);
  const [saving, setSaving] = useState(false);
  const [meetingUrl, setMeetingUrl] = useState("");

  const provider = meetingUrl ? detectMeetingProvider(meetingUrl) : null;
  const urlLooksValid = (() => {
    try {
      const u = new URL(meetingUrl);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  })();

  useEffect(() => {
    setSupported(MeetingRecorder.isSupported());
  }, []);

  useEffect(() => {
    if (state !== "recording") return;
    const t = setInterval(() => {
      setElapsed(recorderRef.current?.getElapsedMs() ?? 0);
    }, 250);
    return () => clearInterval(t);
  }, [state]);

  useEffect(() => {
    return () => {
      if (playbackUrl) URL.revokeObjectURL(playbackUrl);
      recorderRef.current?.stop();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [playbackUrl]);

  function startWaveform(analyser: AnalyserNode) {
    analyserRef.current = analyser;
    const data = new Uint8Array(analyser.fftSize);

    const draw = () => {
      const canvas = canvasRef.current;
      const a = analyserRef.current;
      if (!canvas || !a) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth * dpr;
      const h = canvas.clientHeight * dpr;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      a.getByteTimeDomainData(data);
      ctx.clearRect(0, 0, w, h);
      ctx.lineWidth = 2 * dpr;
      ctx.strokeStyle = "oklch(0.72 0.18 145)";
      ctx.beginPath();
      const slice = w / data.length;
      let x = 0;
      for (let i = 0; i < data.length; i++) {
        const v = data[i] / 128.0;
        const y = (v * h) / 2;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        x += slice;
      }
      ctx.stroke();
      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);
  }

  function stopWaveform() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    analyserRef.current = null;
    const c = canvasRef.current;
    if (c) {
      const ctx = c.getContext("2d");
      ctx?.clearRect(0, 0, c.width, c.height);
    }
  }

  async function pasteFromClipboard() {
    try {
      const t = await navigator.clipboard.readText();
      if (t) setMeetingUrl(t.trim());
    } catch {
      setError("Couldn't read the clipboard. Paste the link manually.");
    }
  }

  function openMeeting() {
    if (!urlLooksValid) return;
    window.open(meetingUrl, "_blank", "noopener,noreferrer");
  }

  async function handleStart() {
    setError(null);
    setResult(null);
    if (playbackUrl) {
      URL.revokeObjectURL(playbackUrl);
      setPlaybackUrl(null);
    }
    const rec = new MeetingRecorder();
    recorderRef.current = rec;
    rec.onStateChange = (s) => {
      setState(s);
      if (s === "stopped") stopWaveform();
    };
    rec.onError = (e) => setError(e.message);
    rec.onAnalyser = (a) => startWaveform(a);
    rec.onStop = async (r) => {
      setResult(r);
      const url = URL.createObjectURL(r.blob);
      setPlaybackUrl(url);
      try {
        setSaving(true);
        const name =
          (provider ? `${provider} meeting` : "Meeting") +
          ` — ${new Date().toLocaleString()}`;
        await saveRecording({
          id: crypto.randomUUID(),
          name,
          createdAt: Date.now(),
          durationMs: r.durationMs,
          size: r.blob.size,
          mimeType: r.mimeType,
          blob: r.blob,
        });
      } catch (e) {
        console.error(e);
      } finally {
        setSaving(false);
      }
    };
    try {
      await rec.start({ includeMic, includeSystemAudio });
    } catch (e) {
      const err = e as Error;
      if (err.name === "NotAllowedError" || err.name === "AbortError") {
        setError("Recording cancelled — you didn't pick a source to share.");
      } else {
        setError(err.message || "Failed to start recording.");
      }
      setState("idle");
    }
  }

  function handleStop() {
    recorderRef.current?.stop();
  }
  function handlePause() {
    recorderRef.current?.pause();
  }
  function handleResume() {
    recorderRef.current?.resume();
  }

  function downloadCurrent() {
    if (!result || !playbackUrl) return;
    const a = document.createElement("a");
    a.href = playbackUrl;
    a.download = `meetiq-${new Date().toISOString().replace(/[:.]/g, "-")}.webm`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  const isLive = state === "recording" || state === "paused";

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Audio recorder</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Open your meeting in a new tab, then share that tab back to capture audio only.
          </p>
        </div>
        <div className="flex items-center gap-3 font-mono text-2xl tabular-nums">
          {state === "recording" && (
            <span className="rec-dot inline-block h-3 w-3 rounded-full" />
          )}
          {formatDuration(elapsed)}
        </div>
      </div>

      {/* Meeting URL box */}
      <div className="mt-8 rounded-xl border border-border bg-card p-5">
        <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Meeting link
        </label>
        <div className="mt-2 flex flex-wrap gap-2">
          <input
            type="url"
            value={meetingUrl}
            onChange={(e) => setMeetingUrl(e.target.value)}
            placeholder="Paste Zoom, Google Meet, Webex or Teams link…"
            className="flex-1 min-w-[240px] rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
          />
          <button
            type="button"
            onClick={pasteFromClipboard}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-accent"
          >
            Paste
          </button>
          <button
            type="button"
            onClick={openMeeting}
            disabled={!urlLooksValid}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            Open meeting
          </button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {provider ? (
            <>
              Detected: <span className="text-foreground">{provider}</span>. After joining,
              click <span className="text-foreground">Start recording</span> below and pick
              the meeting tab with <span className="text-foreground">“Share tab audio”</span>{" "}
              ticked.
            </>
          ) : (
            "Zoom, Meet, Webex and Teams block being embedded directly. We open them in a real tab so they work, then capture only the audio."
          )}
        </p>
      </div>

      {!supported && (
        <div className="mt-6 rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm">
          Your browser doesn't support audio capture. Use the latest Chrome, Edge, Brave, or
          Opera on desktop.
        </div>
      )}
      {error && (
        <div className="mt-6 rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm">
          {error}
        </div>
      )}

      {/* Recorder */}
      <div className="mt-8 rounded-xl border border-border bg-card overflow-hidden">
        <div className="aspect-[5/2] bg-black/40 relative">
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
          {!isLive && !playbackUrl && (
            <div className="absolute inset-0 grid place-items-center text-center text-muted-foreground p-8 text-sm">
              The audio waveform appears here while you record.
            </div>
          )}
          {!isLive && playbackUrl && (
            <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
              <audio src={playbackUrl} controls className="w-full" />
            </div>
          )}
        </div>

        <div className="p-5 flex flex-wrap items-center justify-between gap-4 border-t border-border">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeMic}
                disabled={isLive}
                onChange={(e) => setIncludeMic(e.target.checked)}
                className="h-4 w-4 accent-primary"
              />
              Microphone
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeSystemAudio}
                disabled={isLive}
                onChange={(e) => setIncludeSystemAudio(e.target.checked)}
                className="h-4 w-4 accent-primary"
              />
              Meeting tab audio
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {state === "idle" || state === "stopped" ? (
              <button
                onClick={handleStart}
                disabled={!supported || (!includeMic && !includeSystemAudio)}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                <span className="h-2 w-2 rounded-full bg-primary-foreground" />
                Start recording
              </button>
            ) : null}
            {state === "recording" && (
              <button
                onClick={handlePause}
                className="inline-flex items-center rounded-md border border-border bg-background px-4 py-2.5 text-sm hover:bg-accent"
              >
                Pause
              </button>
            )}
            {state === "paused" && (
              <button
                onClick={handleResume}
                className="inline-flex items-center rounded-md border border-border bg-background px-4 py-2.5 text-sm hover:bg-accent"
              >
                Resume
              </button>
            )}
            {isLive && (
              <button
                onClick={handleStop}
                className="inline-flex items-center rounded-md bg-destructive px-5 py-2.5 text-sm font-medium text-destructive-foreground hover:bg-destructive/90"
              >
                Stop
              </button>
            )}
          </div>
        </div>
      </div>

      {result && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4">
          <div className="text-sm">
            <div className="font-medium">Recording ready</div>
            <div className="text-muted-foreground">
              {formatDuration(result.durationMs)} ·{" "}
              {(result.blob.size / 1024 / 1024).toFixed(1)} MB
              {saving ? " · saving…" : " · saved to library"}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={downloadCurrent}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Download audio
            </button>
            <Link
              to="/recordings"
              className="rounded-md border border-border bg-background px-4 py-2 text-sm hover:bg-accent"
            >
              Open library
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
