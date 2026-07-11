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

          <h1 className="landing-title-vivid">
            every <span className="grad-blue">lesson</span>,
            <br />
            <span className="grad-green">understood</span>.
          </h1>

          <p className="landing-value">
            Intelligent AI that turns each lesson into{" "}
            <b>deep in-class insight</b> — for the teacher and for every student.
          </p>

          <p className="landing-pain">
            Teachers teach 180 lessons a year and get feedback on almost none of them:
            no signal on who was with them, who drifted, or which part of the lesson
            actually worked.
          </p>

          <p className="landing-solution">
            ClassPulse analyzes the class and returns <b>per-student engagement</b>,{" "}
            <b>attendance</b>, and <b>personalized coaching</b> — so teachers know what
            to change tomorrow, not next semester.
          </p>

          <p className="landing-tag">
            <span className="tag-realtime">student insights</span>
            {" · "}
            <span className="tag-inclass">teacher coaching</span>
            {" · "}
            <span className="tag-deep">every lesson</span>
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
