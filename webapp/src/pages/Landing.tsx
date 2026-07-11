import { Link } from "react-router-dom";
import HexLogo from "../components/HexLogo";
import ProgressionGraph from "../components/ProgressionGraph";

export default function Landing() {
  return (
    <div className="landing landing-vivid">
      <div className="landing-blob blob-1" aria-hidden />
      <div className="landing-blob blob-2" aria-hidden />
      <div className="landing-blob blob-3" aria-hidden />
      <div className="landing-blob blob-4" aria-hidden />

      <section className="landing-hero">
        <div className="landing-hero-content">
          <div className="landing-eyebrow">
            <HexLogo size={32} />
            <span>ClassPulse</span>
          </div>

          <p className="landing-slogan">
            <span className="grad-blue">intelligent</span>{" "}
            <span className="grad-violet">AI</span>
          </p>

          <h1 className="landing-title-vivid">
            <span className="grad-green">teacher</span> &{" "}
            <span className="grad-amber">student</span>
            <br />
            insights
          </h1>

          <p className="landing-tag">
            <span className="tag-realtime">real time</span>
            {" · "}
            <span className="tag-inclass">in class</span>
            {" · "}
            <span className="tag-deep">deep insights</span>
          </p>

          <Link to="/dashboard" className="landing-cta primary">
            Open dashboard
          </Link>
        </div>

        <div className="landing-hero-visual">
          <ProgressionGraph />
        </div>
      </section>
    </div>
  );
}
