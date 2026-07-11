import { BrowserRouter, Link, NavLink, Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import ClassroomPage from "./pages/Classroom";
import LessonPage from "./pages/Lesson";
import UploadPage from "./pages/Upload";
import StudentReport from "./pages/StudentReport";

function HexLogo() {
  return (
    <svg className="hex-logo" width="28" height="32" viewBox="0 0 28 32" aria-hidden>
      <polygon
        points="14,1 27,8 27,24 14,31 1,24 1,8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle cx="14" cy="16" r="4" fill="currentColor" />
    </svg>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="topbar">
        <Link to="/" className="logo">
          <HexLogo />
          Class<span>Pulse</span>
        </Link>
        <nav className="nav">
          <NavLink to="/" end>Home</NavLink>
          <NavLink to="/upload">Upload</NavLink>
        </nav>
        <div className="tag">the heartbeat of the classroom</div>
      </div>
      <div className="container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/classroom/:classroomId/student/:studentId" element={<StudentReport />} />
          <Route path="/classroom/:id" element={<ClassroomPage />} />
          <Route path="/lesson/:id" element={<LessonPage />} />
          <Route path="/upload" element={<UploadPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
