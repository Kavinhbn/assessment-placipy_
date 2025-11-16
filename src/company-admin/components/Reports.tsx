import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import AdminService from '../../services/admin.service';

const Reports: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [collegeReports, setCollegeReports] = useState<any[]>([]);
  const [performanceData, setPerformanceData] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadReportsData();
  }, []);

  const loadReportsData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [colleges, performance] = await Promise.all([
        AdminService.getCollegeReports(),
        AdminService.getPerformanceReport()
      ]);

      setCollegeReports(colleges);
      setPerformanceData(performance);
    } catch (err: any) {
      setError(err.message || 'Failed to load reports data');
      console.error('Error loading reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadReportsData();
    setRefreshing(false);
  };

  // Process data for charts
  const collegePerformance = collegeReports.map(college => ({
    name: college.name,
    students: college.totalStudents || 0,
    assessments: college.totalAssessments || 0,
    completion: college.completionRate || 0
  }));

  const assessmentStats = performanceData?.monthlyStats || [];
  
  const statusData = performanceData?.statusDistribution ? [
    { name: 'Completed', value: performanceData.statusDistribution.completed || 0, color: '#9768E1' },
    { name: 'In Progress', value: performanceData.statusDistribution.inProgress || 0, color: '#E4D5F8' },
    { name: 'Pending', value: performanceData.statusDistribution.pending || 0, color: '#D0BFE7' },
  ] : [];

  const handleExportExcel = () => {
    // In real app, this would generate and download Excel file
    alert('Exporting to Excel... (UI only)');
  };

  const handleExportPDF = () => {
    // In real app, this would generate and download PDF file
    alert('Exporting to PDF... (UI only)');
  };

  return (
    <div className="admin-page-container">
      <div className="admin-page-header">
        <h2 className="admin-page-title">Reports & Analytics</h2>
        <div className="admin-export-buttons">
          <button 
            className="admin-btn-export" 
            onClick={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? '🔄 Refreshing...' : '🔄 Refresh'}
          </button>
          <button className="admin-btn-export" onClick={handleExportExcel}>
            📊 Export Excel
          </button>
          <button className="admin-btn-export" onClick={handleExportPDF}>
            📄 Export PDF
          </button>
        </div>
      </div>

      {error && (
        <div className="admin-error">
          <p>{error}</p>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {loading ? (
        <div className="admin-loading">
          <div className="spinner"></div>
          <p>Loading reports data...</p>
        </div>
      ) : (

      <div className="admin-reports-grid">
        {/* College Performance Chart */}
        <div className="admin-chart-card">
          <h3 className="admin-chart-title">College Performance Overview</h3>
          {collegePerformance.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={collegePerformance}>
              <CartesianGrid strokeDasharray="3 3" stroke="#D0BFE7" />
              <XAxis dataKey="name" stroke="#523C48" style={{ fontSize: '11px' }} />
              <YAxis stroke="#523C48" style={{ fontSize: '11px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FBFAFB',
                  border: '1px solid #D0BFE7',
                  borderRadius: '8px',
                  color: '#523C48'
                }}
              />
              <Legend />
              <Bar dataKey="students" fill="#9768E1" radius={[8, 8, 0, 0]} />
              <Bar dataKey="assessments" fill="#E4D5F8" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          ) : (
            <div className="admin-empty-chart">
              <p>No college performance data available</p>
            </div>
          )}
        </div>

        {/* Assessment Statistics */}
        <div className="admin-chart-card">
          <h3 className="admin-chart-title">Assessment Statistics (Last 6 Months)</h3>
          {assessmentStats.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={assessmentStats}>
              <CartesianGrid strokeDasharray="3 3" stroke="#D0BFE7" />
              <XAxis dataKey="name" stroke="#523C48" style={{ fontSize: '11px' }} />
              <YAxis stroke="#523C48" style={{ fontSize: '11px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FBFAFB',
                  border: '1px solid #D0BFE7',
                  borderRadius: '8px',
                  color: '#523C48'
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="assessments" stroke="#9768E1" strokeWidth={2} />
              <Line type="monotone" dataKey="completions" stroke="#E4D5F8" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
          ) : (
            <div className="admin-empty-chart">
              <p>No assessment statistics available</p>
            </div>
          )}
        </div>

        {/* Status Distribution */}
        <div className="admin-chart-card">
          <h3 className="admin-chart-title">Assessment Status Distribution</h3>
          {statusData.length > 0 && statusData.some(item => item.value > 0) ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry: any) => `${entry.name}: ${((entry.value / statusData.reduce((sum, item) => sum + item.value, 0)) * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          ) : (
            <div className="admin-empty-chart">
              <p>No status distribution data available</p>
            </div>
          )}
        </div>

        {/* Performance Table - Spans 2 columns */}
        <div className="admin-chart-card admin-chart-card-wide">
          <h3 className="admin-chart-title">College Completion Rates</h3>
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>College Name</th>
                  <th>Students</th>
                  <th>Assessments</th>
                  <th>Completion %</th>
                </tr>
              </thead>
              <tbody>
                {collegePerformance.map((college, index) => (
                  <tr key={index}>
                    <td>{college.name}</td>
                    <td>{college.students}</td>
                    <td>{college.assessments}</td>
                    <td>
                      <div className="admin-progress-container">
                        <div className="admin-progress-bar">
                          <div
                            className="admin-progress-fill"
                            style={{ width: `${college.completion}%` }}
                          ></div>
                        </div>
                        <span>{college.completion}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Performing Officers */}
        <div className="admin-chart-card">
          <h3 className="admin-chart-title">Top Performing Officers</h3>
          <div className="admin-top-performers">
            {(performanceData?.topPerformers || []).map((officer: any, index: number) => (
              <div key={index} className="admin-performer-item">
                <div className="admin-performer-rank">#{index + 1}</div>
                <div className="admin-performer-info">
                  <div className="admin-performer-name">{officer.name}</div>
                  <div className="admin-performer-college">{officer.college}</div>
                </div>
                <div className="admin-performer-score">{officer.score}%</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      )}
    </div>
  );
};

export default Reports;

