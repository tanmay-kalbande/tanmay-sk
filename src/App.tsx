import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useEffect } from "react";
import LandingPage from "./components/LandingPage";
import PortfolioPage from "./components/PortfolioPage";
import DashboardsPage from "./components/DashboardsPage";
import AssistantPage from "./components/AssistantPage";

function ScrollToTop() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [location.pathname]);

  return null;
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/portfolio" element={<PortfolioPage />} />
        <Route path="/dashboards" element={<DashboardsPage />} />
        <Route path="/assistant" element={<AssistantPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
