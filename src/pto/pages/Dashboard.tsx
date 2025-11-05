import React, { useState, useEffect, useMemo, memo } from "react";
import { Routes, Route, Link, useLocation, useNavigate } from "react-router-dom";
import {
  FaTachometerAlt,
  FaBuilding,
  FaUser,
  FaClipboardList,
  FaUserGraduate,
  FaChartBar,
  FaUserCircle,
  FaSignOutAlt,
} from "react-icons/fa";

import DashboardHome from "../components/DashboardHome";
import DepartmentManagement from "../components/DepartmentManagement";
import StaffManagement from "../components/StaffManagement";
import AssessmentManagement from "../components/AssessmentManagement";
import StudentManagement from "../components/StudentManagement";
import ReportsAnalytics from "../components/ReportsAnalytics";
import Profile from "../components/Profile";

import "../styles/Dashboard.css";

const PTODashboard: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentSectionName, setCurrentSectionName] = useState("Dashboard");


  /* ✅ Nav Items */
  const navItems = useMemo(
    () => [
      { id: "dashboard", label: "Dashboard", path: "/pto", icon: FaTachometerAlt },
      { id: "departments", label: "Departments", path: "/pto/departments", icon: FaBuilding },
      { id: "staff", label: "Staff Management", path: "/pto/staff", icon: FaUser },
      { id: "assessments", label: "Assessments", path: "/pto/assessments", icon: FaClipboardList },
      { id: "students", label: "Students", path: "/pto/students", icon: FaUserGraduate },
      { id: "reports", label: "Reports & Analytics", path: "/pto/reports", icon: FaChartBar },
      { id: "profile", label: "Profile", path: "/pto/profile", icon: FaUserCircle },
    ],
    []
  );

  /* ✅ Activate tab on URL change */
  useEffect(() => {
    const currentPath = location.pathname;

    if (currentPath === "/") {
      navigate("/pto", { replace: true });
      return;
    }

    const matchedItem = navItems.find((item) => {
      if (item.path === "/pto" && (currentPath === "/pto" || currentPath === "/pto/"))
        return true;
      if (item.path !== "/pto" && currentPath.startsWith(item.path)) return true;
      return false;
    });

    setActiveTab(matchedItem ? matchedItem.id : "dashboard");
    setCurrentSectionName(matchedItem ? matchedItem.label : "Dashboard");
  }, [location, navItems]);

  /* ✅ Logout */
  const handleLogout = () => navigate("/");

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const closeSidebar = () => setSidebarOpen(false);


  return (
    <div className="pto-dashboard">
      {/* ✅ Mobile Hamburger */}
      <button className="hamburger-menu" onClick={toggleSidebar}>
        <span></span>
        <span></span>
        <span></span>
      </button>

      {/* ✅ Sidebar */}
      <nav className={`dashboard-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <FaUserCircle size={48} color="#ffffff" />
          </div>
          <h2>PTO Portal</h2>
        </div>

        <ul className="sidebar-menu">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.id}>
                <Link
                  to={item.path}
                  className={`sidebar-link ${activeTab === item.id ? "active" : ""}`}
                  onClick={() => {
                    setActiveTab(item.id);
                    closeSidebar();
                  }}
                >
                  <Icon className="sidebar-icon" />
                  <span className="sidebar-label">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="sidebar-footer">
          <button
            className="logout-btn"
            onClick={() => {
              handleLogout();
              closeSidebar();
            }}
          >
            <FaSignOutAlt className="sidebar-icon" />
            <span className="sidebar-label">Logout</span>
          </button>
        </div>
      </nav>

      {/* ✅ Overlay */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={closeSidebar}></div>}

      {/* ✅ MAIN */}
      <main className="dashboard-main">
        {/* Sticky Header with Section Name */}
        <header className="pto-sticky-header">
          <div className="header-inner">
            <h2 className="section-name-header">{currentSectionName}</h2>
            <p className="section-subtitle">
              {currentSectionName === 'Dashboard' && 'Overview and insights for today'}
              {currentSectionName === 'Departments' && 'Manage departments, staff and performance'}
              {currentSectionName === 'Staff Management' && 'Create, edit and manage staff permissions'}
              {currentSectionName === 'Assessments' && 'Plan, create and monitor assessments'}
              {currentSectionName === 'Students' && 'Search, filter and communicate with students'}
              {currentSectionName === 'Reports & Analytics' && 'Analyze performance and export reports'}
              {currentSectionName === 'Profile' && 'Manage your profile and preferences'}
            </p>
          </div>
        </header>
        
        {/* ✅ ROUTES */}
        <div className="dashboard-content">
          <Routes>
            <Route index element={<DashboardHome />} />
            <Route path="departments" element={<DepartmentManagement />} />
            <Route path="staff" element={<StaffManagement />} />
            <Route path="assessments" element={<AssessmentManagement />} />
            <Route path="students" element={<StudentManagement />} />
            <Route path="reports" element={<ReportsAnalytics />} />
            <Route path="profile" element={<Profile />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

export default memo(PTODashboard);
