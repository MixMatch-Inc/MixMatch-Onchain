import Link from "next/link";
import type { StarterRoadmapCard } from "@themixmatch/types";

const roadmap: StarterRoadmapCard[] = [
  {
    title: "Authentication first",
    body: "The first public milestone covers signup, sign-in, session handling, and contributor-ready auth patterns."
  },
  {
    title: "Cross-platform baseline",
    body: "Web, API, mobile, and Stellar service workspaces are aligned so features can move together instead of drifting."
  },
  {
    title: "Hackathon-friendly scope",
    body: "This starter favors fast iteration, shared contracts, and clean seams over premature feature depth."
  }
];

export default function HomePage() {
  return (
    <main className="page-shell">
      <section className="hero-card">
        <div className="hero-grid">
          <div>
            <div className="eyebrow">Open source starter</div>
            <h1 className="headline">Build the MixMatch MVP from a clean slate.</h1>
            <p className="lede">
              This repository was reset into a fresh monorepo starter for hackathon
              teams working across Express, Next.js, Expo, and Stellar. The next
              implementation wave begins with authentication.
            </p>
            <div className="pill-row">
              <span className="pill">Express API</span>
              <span className="pill">Next.js web</span>
              <span className="pill">Expo mobile</span>
              <span className="pill">Stellar service</span>
            </div>
          </div>

          <div className="callout-grid">
            {roadmap.map((item) => (
              <article className="callout" key={item.title}>
                <h2>{item.title}</h2>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
