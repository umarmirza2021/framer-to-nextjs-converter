import ConverterForm from "@/components/ConverterForm";
import styles from "./page.module.css";

const features = [
  {
    title: "Framer & Webflow",
    desc: "Supports published Framer sites and live Webflow sites on custom domains.",
  },
  {
    title: "Full page extraction",
    desc: "Pulls SSR HTML, CSS, meta tags, scripts, and fonts from your published site.",
  },
  {
    title: "Multi-page support",
    desc: "Discovers pages via Framer search index or Webflow sitemap.xml.",
  },
  {
    title: "Live preview",
    desc: "See the converted site in your browser before downloading — interactions included.",
  },
  {
    title: "Deploy-ready zip",
    desc: "Downloads a complete Next.js project — unzip, npm install, and deploy to Vercel or Netlify.",
  },
];

export default function Home() {
  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.badge}>Framer & Webflow → Next.js</div>
        <h1 className={styles.title}>
          Convert Framer &amp; Webflow
          <br />
          to <span className={styles.gradient}>Next.js</span>
        </h1>
        <p className={styles.subtitle}>
          Paste your site URL and get a ready-to-run Next.js project — pages, styles, assets, and
          interactions included.
        </p>
        <ConverterForm />
      </header>

      <section className={styles.features}>
        {features.map((f) => (
          <div key={f.title} className={styles.featureCard}>
            <h3>{f.title}</h3>
            <p>{f.desc}</p>
          </div>
        ))}
      </section>

      <section className={styles.howItWorks}>
        <h2>How it works</h2>
        <ol>
          <li>
            <strong>Fetch</strong> — Downloads your published Framer or Webflow site HTML
          </li>
          <li>
            <strong>Parse</strong> — Extracts SSR content, CSS, meta data, and page routes
          </li>
          <li>
            <strong>Convert</strong> — Builds pure HTML Next.js routes with full platform compatibility
          </li>
          <li>
            <strong>Preview</strong> — Opens a live browser preview so you can check the result first
          </li>
          <li>
            <strong>Download</strong> — Saves a zip with everything you need to deploy
          </li>
        </ol>
      </section>

      <footer className={styles.footer}>
        <p>
          Works with <code>*.framer.website</code> URLs and published Webflow sites on custom domains.
        </p>
      </footer>
    </main>
  );
}