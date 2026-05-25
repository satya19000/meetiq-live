// Browser MediaRecorder helper for AUDIO-ONLY meeting capture.
// Uses getDisplayMedia to capture tab/system audio (user picks the meeting tab),
// optionally mixes the microphone, and records to webm/opus.

export type RecorderState = "idle" | "recording" | "paused" | "stopped";

export interface RecorderResult {
  blob: Blob;
  mimeType: string;
  durationMs: number;
}

export interface StartOptions {
  includeMic: boolean;
  includeSystemAudio: boolean;
}

export class MeetingRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private displayStream: MediaStream | null = null;
  private micStream: MediaStream | null = null;
  private audioCtx: AudioContext | null = null;
  private mixedStream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private startedAt = 0;
  private accumulatedMs = 0;

  onStop?: (result: RecorderResult) => void;
  onError?: (err: Error) => void;
  onStateChange?: (state: RecorderState) => void;
  onAnalyser?: (analyser: AnalyserNode) => void;

  static isSupported(): boolean {
    return (
      typeof navigator !== "undefined" &&
      !!navigator.mediaDevices &&
      typeof window !== "undefined" &&
      typeof window.MediaRecorder !== "undefined" &&
      (typeof navigator.mediaDevices.getDisplayMedia === "function" ||
        typeof navigator.mediaDevices.getUserMedia === "function")
    );
  }

  private pickMimeType(): string {
    const candidates = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4",
      "audio/ogg;codecs=opus",
    ];
    for (const c of candidates) {
      if (window.MediaRecorder?.isTypeSupported?.(c)) return c;
    }
    return "audio/webm";
  }

  async start(opts: StartOptions): Promise<void> {
    if (!MeetingRecorder.isSupported()) {
      throw new Error(
        "Audio recording isn't supported in this browser. Try the latest Chrome, Edge, or Brave on desktop.",
      );
    }

    // 1) Tab/system audio via getDisplayMedia (browsers require requesting video too;
    //    we drop the video track immediately and never record it).
    if (opts.includeSystemAudio) {
      if (typeof navigator.mediaDevices.getDisplayMedia !== "function") {
        throw new Error(
          "This browser can't share tab audio. Use the latest Chrome, Edge, or Brave on desktop, or turn off the system audio option.",
        );
      }
      this.displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });
      // We don't record video — stop the video track right away.
      this.displayStream.getVideoTracks().forEach((t) => t.stop());

      const sysAudio = this.displayStream.getAudioTracks();
      if (sysAudio.length === 0) {
        // User forgot to tick "Share tab audio"
        this.cleanupStreams();
        throw new Error(
          "No tab audio was shared. When the browser asks, pick the meeting tab and tick 'Share tab audio'.",
        );
      }
      // Stop everything if the user clicks the browser's "Stop sharing"
      sysAudio[0].addEventListener("ended", () => {
        if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
          this.stop();
        }
      });
    }

    // 2) Mic (optional)
    if (opts.includeMic) {
      try {
        this.micStream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true },
        });
      } catch {
        this.cleanupStreams();
        throw new Error(
          "Microphone access was blocked. Allow mic permission or turn off the microphone option.",
        );
      }
    }

    // 3) Mix audio tracks (always go through WebAudio so we get an analyser for the meter)
    const sysAudio = this.displayStream?.getAudioTracks() ?? [];
    const micAudio = this.micStream?.getAudioTracks() ?? [];

    if (sysAudio.length === 0 && micAudio.length === 0) {
      this.cleanupStreams();
      throw new Error("Pick at least one audio source (meeting tab audio or microphone).");
    }

    this.audioCtx = new AudioContext();
    const dest = this.audioCtx.createMediaStreamDestination();
    this.analyser = this.audioCtx.createAnalyser();
    this.analyser.fftSize = 512;

    if (sysAudio.length) {
      const src = this.audioCtx.createMediaStreamSource(new MediaStream(sysAudio));
      src.connect(dest);
      src.connect(this.analyser);
    }
    if (micAudio.length) {
      const src = this.audioCtx.createMediaStreamSource(new MediaStream(micAudio));
      src.connect(dest);
      src.connect(this.analyser);
    }

    this.mixedStream = new MediaStream(dest.stream.getAudioTracks());
    this.onAnalyser?.(this.analyser);

    // 4) Record
    const mimeType = this.pickMimeType();
    this.chunks = [];
    this.mediaRecorder = new MediaRecorder(this.mixedStream, { mimeType });
    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) this.chunks.push(e.data);
    };
    this.mediaRecorder.onerror = (e: Event) => {
      const err = (e as unknown as { error?: Error }).error;
      this.onError?.(err ?? new Error("Recording error"));
    };
    this.mediaRecorder.onstop = () => {
      const blob = new Blob(this.chunks, { type: mimeType });
      const durationMs =
        this.accumulatedMs + (this.startedAt ? Date.now() - this.startedAt : 0);
      this.cleanupStreams();
      this.onStateChange?.("stopped");
      this.onStop?.({ blob, mimeType, durationMs });
    };

    this.mediaRecorder.start(1000);
    this.startedAt = Date.now();
    this.accumulatedMs = 0;
    this.onStateChange?.("recording");
  }

  pause() {
    if (this.mediaRecorder?.state === "recording") {
      this.mediaRecorder.pause();
      this.accumulatedMs += Date.now() - this.startedAt;
      this.startedAt = 0;
      this.onStateChange?.("paused");
    }
  }

  resume() {
    if (this.mediaRecorder?.state === "paused") {
      this.mediaRecorder.resume();
      this.startedAt = Date.now();
      this.onStateChange?.("recording");
    }
  }

  stop() {
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      this.mediaRecorder.stop();
    } else {
      this.cleanupStreams();
      this.onStateChange?.("stopped");
    }
  }

  getElapsedMs(): number {
    if (this.startedAt) return this.accumulatedMs + (Date.now() - this.startedAt);
    return this.accumulatedMs;
  }

  private cleanupStreams() {
    this.displayStream?.getTracks().forEach((t) => t.stop());
    this.micStream?.getTracks().forEach((t) => t.stop());
    this.mixedStream?.getTracks().forEach((t) => t.stop());
    this.audioCtx?.close().catch(() => {});
    this.displayStream = null;
    this.micStream = null;
    this.mixedStream = null;
    this.audioCtx = null;
    this.analyser = null;
  }
}

export function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return hh > 0 ? `${pad(hh)}:${pad(mm)}:${pad(ss)}` : `${pad(mm)}:${pad(ss)}`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export function detectMeetingProvider(url: string): string | null {
  try {
    const u = new URL(url);
    const h = u.hostname.toLowerCase();
    if (h.includes("zoom.us") || h.includes("zoom.com")) return "Zoom";
    if (h.includes("meet.google.com")) return "Google Meet";
    if (h.includes("webex.com")) return "Cisco Webex";
    if (h.includes("teams.microsoft.com") || h.includes("teams.live.com"))
      return "Microsoft Teams";
    if (h.includes("meet.jit.si")) return "Jitsi";
    return u.hostname;
  } catch {
    return null;
  }
}
