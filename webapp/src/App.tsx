import { BrowserRouter, Link, NavLink, Route, Routes } from "react-router-dom";
import HexLogo from "./components/HexLogo";
import Home from "./pages/Home";
import Landing from "./pages/Landing";
import ClassroomPage from "./pages/Classroom";
import LessonPage from "./pages/Lesson";
import UploadPage from "./pages/Upload";
import StudentReport from "./pages/StudentReport";
import Studio from "./pages/Studio";

export default function App() {
  return (
    <BrowserRouter>
      <div className="topbar">
        <Link to="/" className="logo">
          <HexLogo />
          Class<span>Pulse</span>
        </Link>
        <nav className="nav">
          <NavLink to="/dashboard">Dashboard</NavLink>
        </nav>
        <div className="tag">the heartbeat of the classroom</div>
      </div>
      <div className="container">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/dashboard" element={<Home />} />
          <Route path="/classroom/:classroomId/student/:studentId" element={<StudentReport />} />
          <Route path="/classroom/:id" element={<ClassroomPage />} />
          <Route path="/lesson/:id" element={<LessonPage />} />
          <Route path="/studio/:id" element={<Studio />} />
          <Route path="/upload" element={<UploadPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
