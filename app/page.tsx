import ConverterForm from "@/components/ConverterForm";
import Header from "@/components/Header";

const features = [
  {
    title: "Strips the heavy runtime",
    desc: "Removes Framer's JavaScript engine so pages render instantly — the biggest mobile speed win.",
  },
  {
    title: "Optimized images",
    desc: "Every image is downloaded, re-encoded to WebP, and self-hosted — typically ~70% smaller.",
  },
  {
    title: "Self-hosted assets",
    desc: "Fonts and media are bundled and served from your own edge — no dependency on Framer's CDN.",
  },
  {
    title: "Static, edge-ready",
    desc: "Pre-rendered HTML served from a global CDN for near-instant first paint and strong SEO.",
  },
  {
    title: "One-click deploy",
    desc: "Push straight to Netlify or Vercel, or download the full project to host anywhere.",
  },
  {
    title: "Multi-page support",
    desc: "Discovers and converts every page of your site automatically via Framer's index.",
  },
];

export default function Home() {
  return (
    <>
      <Header />
      <main className="ftn-page">
        <header className="ftn-hero">
          <h1 className="ftn-title">
            Make your Framer site
            <br />
            <span className="ftn-gradient">load faster.</span>
          </h1>
          <p className="ftn-subtitle">
            Paste your Framer URL. We convert it to an optimized Next.js site — stripped of the heavy
            runtime, with self-hosted images and fonts — then deploy it for you.
          </p>
          <ConverterForm />
        </header>

        <section className="ftn-features">
          {features.map((f) => (
            <div key={f.title} className="ftn-feature-card">
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </section>

        <section className="ftn-how-it-works">
          <h2>How it works</h2>
          <ol>
            <li>
              <strong>Fetch</strong> — Downloads your published Framer site and discovers every page
            </li>
            <li>
              <strong>Optimize</strong> — Strips the Framer runtime, re-encodes images to WebP, and self-hosts fonts
            </li>
            <li>
              <strong>Generate</strong> — Builds a static, edge-ready site tuned for top Lighthouse scores
            </li>
            <li>
              <strong>Preview</strong> — Opens a live browser preview so you can check the result first
            </li>
            <li>
              <strong>Deploy</strong> — Ships straight to Netlify or Vercel, or downloads the full project
            </li>
          </ol>
        </section>

        <footer className="ftn-footer">
          <p>
            Works with <code>*.framer.website</code> URLs. Custom domains supported when they resolve to
            Framer.
          </p>
        </footer>
      </main>
    </>
  );
}