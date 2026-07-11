import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import LessonPage from "./pages/Lesson";

export default function App() {
  return (
    <BrowserRouter>
      <div className="topbar">
        <Link to="/" className="logo">Class<span>Pulse</span></Link>
        <div className="tag">the heartbeat of the classroom</div>
      </div>
      <div className="container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/lesson/:id" element={<LessonPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
