import ConverterForm from "@/components/ConverterForm";
import Header from "@/components/Header";

const features = [
  {
    title: "Full page extraction",
    desc: "Pulls SSR HTML, CSS, meta tags, and fonts from your published Framer site.",
  },
  {
    title: "Multi-page support",
    desc: "Discovers and converts all pages via Framer's search index.",
  },
  {
    title: "Asset support",
    desc: "Images and media load from Framer's CDN for fast, reliable conversions.",
  },
  {
    title: "Live preview",
    desc: "See the converted site in your browser before downloading — animations and layout included.",
  },
  {
    title: "Deploy-ready zip",
    desc: "Downloads a complete Next.js project — unzip, npm install, and deploy to Vercel or Netlify.",
  },
];

export default function Home() {
  return (
    <>
      <Header />
      <main className="ftn-page">
        <header className="ftn-hero">
          <h1 className="ftn-title">
            Convert Framer sites
            <br />
            to <span className="ftn-gradient">Next.js</span>
          </h1>
          <p className="ftn-subtitle">
            Paste your Framer URL and get a ready-to-run Next.js project — pages, styles, assets, and
            animations included.
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
              <strong>Fetch</strong> — Downloads your published Framer site HTML
            </li>
            <li>
              <strong>Parse</strong> — Extracts SSR content, CSS, meta data, and page routes
            </li>
            <li>
              <strong>Convert</strong> — Builds a pure HTML Next.js route with full Framer animations
            </li>
            <li>
              <strong>Preview</strong> — Opens a live browser preview so you can check the result first
            </li>
            <li>
              <strong>Download</strong> — Saves a zip with everything you need to deploy
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