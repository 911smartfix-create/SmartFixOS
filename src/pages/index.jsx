// src/pages/index.jsx  // 👈 usa este nombre si puedes

import Layout from "./Layout.jsx";

import Dashboard from "./Dashboard";
import Orders from "./Orders";
import Customers from "./Customers";
import Financial from "./Financial";
import Employees from "./Employees";
import POS from "./POS";
import Inventory from "./Inventory";
import TimeTracking from "./TimeTracking";
import Reports from "./Reports";
import Settings from "./Settings";
import CustomerPortal from "./CustomerPortal";
import UsersManagement from "./UsersManagement";
import Technicians from "./Technicians";
import SettingsGeneral from "./SettingsGeneral";
import PinAccess from "./PinAccess";          // 👈 sigue igual
import FinancialReports from "./FinancialReports";
import B2BPortal from "./B2BPortal";

import {
  BrowserRouter as Router,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";

const PAGES = {
  Dashboard: Dashboard,
  Orders: Orders,
  Customers: Customers,
  Financial: Financial,
  Employees: Employees,
  POS: POS,
  Inventory: Inventory,
  TimeTracking: TimeTracking,
  Reports: Reports,
  Settings: Settings,
  CustomerPortal: CustomerPortal,
  UsersManagement: UsersManagement,
  Technicians: Technicians,
  SettingsGeneral: SettingsGeneral,
  PinAccess: PinAccess,
  FinancialReports: FinancialReports,
  B2BPortal: B2BPortal,
};

function _getCurrentPage(url) {
  if (url.endsWith("/")) {
    url = url.slice(0, -1);
  }
  let urlLastPart = url.split("/").pop();
  if (urlLastPart.includes("?")) {
    urlLastPart = urlLastPart.split("?")[0];
  }

  const pageName = Object.keys(PAGES).find(
    (page) => page.toLowerCase() === urlLastPart.toLowerCase()
  );
  return pageName || Object.keys(PAGES)[0];
}

// === AQUÍ va el truco: PinAccess SIN Layout cuando estás en "/" o "/PinAccess" 👇
function PagesContent() {
  const location = useLocation();
  const path = location.pathname.toLowerCase();     // 👈
  const isPinRoute = path === "/" || path === "/pinaccess"; // 👈

  if (isPinRoute) {
    // 👇 Pantalla de PIN sola, sin Layout, sin barra
    return (
      <Routes>
        <Route path="/" element={<PinAccess />} />
        <Route path="/PinAccess" element={<PinAccess />} />
      </Routes>
    );
  }

  const currentPage = _getCurrentPage(location.pathname);

  return (
    <Layout currentPageName={currentPage}>
      <Routes>
        {/* 👇 ya NO usamos "/" aquí, solo rutas internas del sistema */}
        <Route path="/Dashboard" element={<Dashboard />} />
        <Route path="/Orders" element={<Orders />} />
        <Route path="/Customers" element={<Customers />} />
        <Route path="/Financial" element={<Financial />} />
        <Route path="/Employees" element={<Employees />} />
        <Route path="/POS" element={<POS />} />
        <Route path="/Inventory" element={<Inventory />} />
        <Route path="/TimeTracking" element={<TimeTracking />} />
        <Route path="/Reports" element={<Reports />} />
        <Route path="/Settings" element={<Settings />} />
        <Route path="/CustomerPortal" element={<CustomerPortal />} />
        <Route path="/UsersManagement" element={<UsersManagement />} />
        <Route path="/Technicians" element={<Technicians />} />
        <Route path="/SettingsGeneral" element={<SettingsGeneral />} />
        <Route path="/FinancialReports" element={<FinancialReports />} />
        <Route path="/B2BPortal" element={<B2BPortal />} />

        {/* fallback por si escribes una ruta rara → vuelve al PIN */}
        <Route path="*" element={<PinAccess />} />  {/* 👈 */}
      </Routes>
    </Layout>
  );
}

export default function Pages() {
  return (
    <Router>
      <PagesContent />
    </Router>
  );
}
