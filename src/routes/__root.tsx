import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight">This page didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {import.meta.env.DEV ? error.message : 'An unexpected error occurred. Please try again.'}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Try again
          </button>
          <a href="/" className="inline-flex items-center justify-center rounded-md border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-accent">
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "MeetIQ Live — Record meetings in your browser" },
      { name: "description", content: "Record your screen and microphone right from the browser. No installs, recordings stay on your device." },
      { property: "og:title", content: "MeetIQ Live — Record meetings in your browser" },
      { property: "og:description", content: "Record your screen and microphone right from the browser. No installs, recordings stay on your device." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "MeetIQ Live — Record meetings in your browser" },
      { name: "twitter:description", content: "Record your screen and microphone right from the browser. No installs, recordings stay on your device." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/2a6a0acc-7209-4bb2-a210-c7eb6b37ea2d/id-preview-7f14c697--bfd67f8e-ba23-4012-9dc2-63d731cc5c94.lovable.app-1779102500408.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/2a6a0acc-7209-4bb2-a210-c7eb6b37ea2d/id-preview-7f14c697--bfd67f8e-ba23-4012-9dc2-63d731cc5c94.lovable.app-1779102500408.png" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function Header() {
  const linkClass = "text-sm text-muted-foreground hover:text-foreground transition-colors";
  return (
    <header className="border-b border-border bg-background/80 backdrop-blur sticky top-0 z-40">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="rec-dot inline-block h-2.5 w-2.5 rounded-full" />
          <span className="text-base font-semibold tracking-tight">MeetIQ Live</span>
        </Link>
        <nav className="flex items-center gap-6">
          <Link to="/" className={linkClass} activeOptions={{ exact: true }} activeProps={{ className: "text-sm text-foreground font-medium" }}>Home</Link>
          <Link to="/record" className={linkClass} activeProps={{ className: "text-sm text-foreground font-medium" }}>Record</Link>
          <Link to="/recordings" className={linkClass} activeProps={{ className: "text-sm text-foreground font-medium" }}>Library</Link>
          <Link to="/about" className={linkClass} activeProps={{ className: "text-sm text-foreground font-medium" }}>About</Link>
        </nav>
      </div>
    </header>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1"><Outlet /></main>
        <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
          MeetIQ Live · Recordings stay on your device
        </footer>
      </div>
    </QueryClientProvider>
  );
}
