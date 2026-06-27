import ConverterForm from "@/components/ConverterForm";
import Header from "@/components/Header";
import { Zap, ImageIcon, TypeIcon, Globe, ArrowRight } from "@/components/Icons";

const optimizations = [
  {
    icon: Zap,
    title: "Removes Framer's runtime",
    desc: "Strips the heavy JavaScript engine so pages render instantly. The single biggest mobile win.",
  },
  {
    icon: ImageIcon,
    title: "Re-encodes every image",
    desc: "Downloads and converts images to WebP, self-hosted — typically ~70% smaller for a faster LCP.",
  },
  {
    icon: TypeIcon,
    title: "Self-hosts your fonts",
    desc: "Inlines fonts with display-swap to kill the loading waterfall and prevent layout shift.",
  },
  {
    icon: Globe,
    title: "Ships to the edge",
    desc: "Pre-rendered static HTML served from a global CDN — near-instant first byte and strong SEO.",
  },
];

const steps = [
  { n: "1", title: "Paste", desc: "Drop in any published Framer URL." },
  { n: "2", title: "Optimize", desc: "We strip, compress, and self-host everything automatically." },
  { n: "3", title: "Deploy", desc: "Ship to Netlify or Vercel, or download the project." },
];

export default function Home() {
  return (
    <>
      <Header />
      <main className="ftn-page">
        <section className="ftn-hero">
          <span className="ftn-badge">
            <Zap size={13} /> Framer → Next.js performance optimizer
          </span>
          <h1 className="ftn-title">
            Make your Framer site
            <br />
            <span className="ftn-gradient">load faster.</span>
          </h1>
          <p className="ftn-subtitle">
            Paste your Framer URL. We rebuild it as an optimized, static Next.js site —
            then deploy it. No code, no cleanup.
          </p>
          <ConverterForm />
          <p className="ftn-trust">
            Works with any published Framer site · No account needed to preview
          </p>
        </section>

        <section className="ftn-section">
          <h2 className="ftn-section-title">What we optimize</h2>
          <p className="ftn-section-sub">
            Four automatic passes that move your Lighthouse score — every time.
          </p>
          <div className="ftn-features">
            {optimizations.map((o) => {
              const Icon = o.icon;
              return (
                <div key={o.title} className="ftn-feature-card">
                  <span className="ftn-feature-icon">
                    <Icon size={18} />
                  </span>
                  <h3>{o.title}</h3>
                  <p>{o.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="ftn-section">
          <h2 className="ftn-section-title">How it works</h2>
          <div className="ftn-steps">
            {steps.map((s, i) => (
              <div key={s.n} className="ftn-step-card">
                <span className="ftn-step-num">{s.n}</span>
                <div>
                  <h3>{s.title}</h3>
                  <p>{s.desc}</p>
                </div>
                {i < steps.length - 1 && <ArrowRight size={18} className="ftn-step-arrow" />}
              </div>
            ))}
          </div>
        </section>

        <footer className="ftn-footer">
          <p>
            Works with <code>*.framer.website</code>, <code>*.framer.app</code>, and custom
            domains that resolve to Framer.
          </p>
        </footer>
      </main>
    </>
  );
}
