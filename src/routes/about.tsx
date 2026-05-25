import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — MeetIQ Live" },
      { name: "description", content: "How MeetIQ Live works and how it handles your data." },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">About MeetIQ Live</h1>
      <p className="mt-4 text-muted-foreground">
        MeetIQ Live is a browser-based meeting recorder. It captures your screen, your
        microphone, and (optionally) system / tab audio, mixes them together, and saves
        the result as a standard WebM video file.
      </p>

      <h2 className="mt-10 text-xl font-semibold">Privacy</h2>
      <p className="mt-3 text-muted-foreground">
        Recordings never leave your device. They're stored in your browser's IndexedDB
        and only you can play, download, or delete them. There is no account, no upload,
        no analytics on your recordings.
      </p>

      <h2 className="mt-10 text-xl font-semibold">Browser support</h2>
      <ul className="mt-3 space-y-2 text-muted-foreground list-disc pl-5">
        <li>Best experience: latest Chrome, Edge, Brave, or Opera on desktop.</li>
        <li>Firefox works for screen capture, but tab/system audio is limited.</li>
        <li>Safari and most mobile browsers do not yet support screen recording.</li>
      </ul>

      <h2 className="mt-10 text-xl font-semibold">Tips</h2>
      <ul className="mt-3 space-y-2 text-muted-foreground list-disc pl-5">
        <li>To capture meeting audio from Google Meet / Zoom, choose "Chrome Tab" in the picker and tick "Share tab audio".</li>
        <li>Pause anytime — the timer freezes and resumes with you.</li>
        <li>Files are saved as <code className="rounded bg-muted px-1 py-0.5 text-xs">.webm</code>. Most players support them; convert with ffmpeg if you need MP4.</li>
      </ul>
    </div>
  );
}
