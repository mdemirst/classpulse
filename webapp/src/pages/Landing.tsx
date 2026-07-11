import { Link } from "react-router-dom";
import HexLogo from "../components/HexLogo";
import ImprovementRadar from "../components/ImprovementRadar";
import ProgressionGraph from "../components/ProgressionGraph";

export default function Landing() {
  return (
    <div className="landing landing-vivid">
      <div className="landing-blob blob-1" aria-hidden />
      <div className="landing-blob blob-2" aria-hidden />

      <section className="landing-hero">
        <div className="landing-hero-content">
          <div className="landing-eyebrow">
            <HexLogo size={32} />
            <span>ClassPulse</span>
          </div>

          <h1 className="landing-title-vivid">
            every lesson,
            <br />
            <span className="grad-blue">understood</span>.
          </h1>

          <p className="landing-value">
            Intelligent AI that turns every lesson into <b>deep in-class insight</b> —
            for teachers and for every student.
          </p>

          <p className="landing-pain">
            Teachers run 180 lessons a year and get feedback on almost none of them.
          </p>

          <p className="landing-solution">
            ClassPulse delivers per-student engagement, attendance and personalized
            coaching after every class — so teachers know what to change tomorrow,
            not next semester.
          </p>

          <Link to="/dashboard" className="landing-cta primary">
            Open dashboard
          </Link>
        </div>

        <div className="landing-hero-visual">
          <div className="landing-chart card glass">
            <ImprovementRadar />
          </div>
          <div className="landing-chart card glass">
            <div className="landing-chart-head">
              <span className="landing-chart-title">Lesson after lesson</span>
              <span className="landing-chart-sub">engagement compounds as coaching lands</span>
            </div>
            <ProgressionGraph />
          </div>
        </div>
      </section>
    </div>
  );
}
