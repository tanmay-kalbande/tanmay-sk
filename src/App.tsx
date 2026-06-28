import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useEffect } from "react";
import LandingPage from "./components/LandingPage";
import PortfolioPage from "./components/PortfolioPage";
import DashboardsPage from "./components/DashboardsPage";
import AssistantPage from "./components/AssistantPage";
import MaintenancePage from "./components/MaintenancePage";

// HIDE PORTFOLIO FOR A FEW DAYS
const MAINTENANCE_MODE = false;

function ScrollToTop() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [location.pathname]);

  return null;
}

export default function App() {
  if (MAINTENANCE_MODE) {
    return <MaintenancePage />;
  }

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
