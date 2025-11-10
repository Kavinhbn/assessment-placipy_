import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FaUsers, 
  FaBuilding, 
  FaClipboardList, 
  FaChartLine,
  FaCalendarAlt,
  FaFileAlt,
  FaChartBar,
  FaUserGraduate
} from 'react-icons/fa';

const DashboardHome: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalAssessments: 0,
    activeAssessments: 0,
    enrolledStudents: 0,
    completedToday: 0
  });

  // Simulate loading data dynamically
  useEffect(() => {
    const loadStats = () => {
      setStats({
        totalAssessments: 24,
        activeAssessments: 8,
        enrolledStudents: 156,
        completedToday: 23
      });
    };

    setTimeout(loadStats, 500);
  }, []);

  // KPI Cards matching the image style
  const kpiCards = [
    { 
      label: 'TOTAL ASSESSMENTS', 
      value: stats.totalAssessments, 
      change: '+4 from last month',
      icon: FaClipboardList
    },
    { 
      label: 'ACTIVE ASSESSMENTS', 
      value: stats.activeAssessments, 
      change: 'Currently running',
      icon: FaCalendarAlt
    },
    { 
      label: 'ENROLLED STUDENTS', 
      value: stats.enrolledStudents, 
      change: 'Across all batches',
      icon: FaUsers
    },
    { 
      label: 'COMPLETED TODAY', 
      value: stats.completedToday, 
      change: 'Assessment submissions',
      icon: FaChartLine
    },
  ];

  // Quick Actions matching PRD requirements
  const quickActions = [
    {
      title: 'Create Assessment',
      description: 'Create, edit, and manage assessments',
      icon: FaFileAlt,
      path: '/pto/assessments',
      action: 'create'
    },
    {
      title: 'View Reports',
      description: 'Analyze performance and export reports',
      icon: FaChartBar,
      path: '/pto/reports',
      action: 'reports'
    },
    {
      title: 'Manage Departments',
      description: 'Add, edit, and manage departments',
      icon: FaBuilding,
      path: '/pto/departments',
      action: 'departments'
    },
    {
      title: 'Student Management',
      description: 'View and manage student details',
      icon: FaUserGraduate,
      path: '/pto/students',
      action: 'students'
    }
  ];

  const handleQuickAction = (path: string) => {
    navigate(path);
  };

  return (
    <div className="pto-dashboard-home">
      {/* Welcome Banner - Matching PTS Style */}
      <div className="pto-welcome-banner">
        <div className="pto-welcome-content">
          <h1 className="pto-welcome-title">Welcome to PTS Dashboard</h1>
          <p className="pto-welcome-subtitle">
            Manage assessments, track student progress, and generate insights for better placement training.
          </p>
        </div>
      </div>

      {/* KPI Cards - Matching Image Style */}
      <div className="pto-kpi-section">
        <div className="pto-kpi-grid">
          {kpiCards.map((card, index) => (
            <div key={index} className="pto-kpi-card">
              <div className="pto-kpi-label">{card.label}</div>
              <div className="pto-kpi-value">{card.value}</div>
              <div className="pto-kpi-change">{card.change}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions Section */}
      <div className="pto-quick-actions-section">
        <h2 className="pto-section-title">Quick Actions</h2>
        <div className="pto-quick-actions-grid">
          {quickActions.map((action, index) => {
            const IconComponent = action.icon;
            return (
              <div 
                key={index} 
                className="pto-quick-action-card"
                onClick={() => handleQuickAction(action.path)}
              >
                <div className="pto-quick-action-icon">
                  <IconComponent size={24} />
                </div>
                <h3 className="pto-quick-action-title">{action.title}</h3>
                <p className="pto-quick-action-description">{action.description}</p>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};

export default DashboardHome;

