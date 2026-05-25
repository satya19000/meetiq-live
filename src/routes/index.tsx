import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MeetIQ Live — Record meetings in your browser" },
      { name: "description", content: "One-click screen + microphone recording. No installs. Recordings stay on your device." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div>
      <section className="mx-auto max-w-4xl px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
          <span className="rec-dot inline-block h-1.5 w-1.5 rounded-full" />
          Browser-based · Private by default
        </div>
        <h1 className="mt-6 text-5xl md:text-6xl font-semibold tracking-tight">
          Record meeting <span className="text-primary">audio</span> from any browser.
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
          Paste your Zoom, Google Meet, Webex or Teams link, open it in a tab, and capture
          high-quality audio only — never video. Recordings stay on your device.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link to="/record" className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
            Start a recording
          </Link>
          <Link to="/recordings" className="inline-flex items-center justify-center rounded-md border border-border bg-card px-6 py-3 text-sm font-medium hover:bg-accent transition-colors">
            View library
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-24 grid gap-4 md:grid-cols-3">
        {[
          { t: "Audio-only", d: "We capture the meeting tab's audio + your mic. No video is ever recorded." },
          { t: "Works everywhere", d: "Zoom, Google Meet, Webex, Teams — anything that opens in a browser tab." },
          { t: "Local library + DOCX", d: "Saved to your browser. Export the audio file and a DOCX notes template." },
        ].map((f) => (
          <div key={f.t} className="rounded-lg border border-border bg-card p-6">
            <h3 className="text-sm font-semibold">{f.t}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{f.d}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
