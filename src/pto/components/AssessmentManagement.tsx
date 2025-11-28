import React, { useEffect, useState, useRef } from 'react';
import { FaClipboardList, FaPlus, FaTrash, FaEye, FaToggleOn, FaToggleOff } from 'react-icons/fa';
import PTSAssessmentCreation from '../../pts/AssessmentCreation';
import * as XLSX from 'xlsx';
import PTOService, { type Assessment as AssessDto } from '../../services/pto.service';

interface Assessment {
  id: string;
  name: string;
  department: string;
  type: 'department-wise' | 'college-wide';
  duration: number;
  date: string;
  timeWindow: { start: string; end: string };
  attempts: number;
  questions: number;
  status: 'active' | 'inactive' | 'scheduled';
}

interface Question {
  id?: string;
  text: string;
  options?: string[];
  correctIndex?: number;
}

interface AssessmentDetail {
  id?: string;
  name: string;
  department: string;
  type: 'department-wise' | 'college-wide';
  duration: number;
  date: string;
  timeWindow?: { start?: string; end?: string };
  attempts: number;
  questions?: Question[];
  status?: 'active' | 'inactive' | 'scheduled';
}

const AssessmentManagement: React.FC = () => {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await PTOService.getAssessments();
        const mapped: Assessment[] = data.map((a: AssessDto) => ({
          id: a.id,
          name: a.name,
          department: a.department,
          type: a.type,
          duration: a.duration,
          date: a.date,
          timeWindow: { start: (a.timeWindow?.start || ''), end: (a.timeWindow?.end || '') },
          attempts: a.attempts,
          questions: a.questions,
          status: a.status === 'active' ? 'active' : 'inactive'
        }));
        setAssessments(mapped);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to load assessments');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importTargetId, setImportTargetId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleTarget, setScheduleTarget] = useState<Assessment | null>(null);
  const [scheduleMode, setScheduleMode] = useState<'schedule' | 'reschedule'>('schedule');
  const [scheduleForm, setScheduleForm] = useState({
    date: '',
    startTime: '09:00',
    endTime: '18:00',
    duration: 60,
    attempts: 1,
    timezone: 'Asia/Kolkata',
    notes: ''
  });
  const [formData, setFormData] = useState({
    name: '',
    department: '',
    type: 'department-wise' as 'department-wise' | 'college-wide',
    duration: 60,
    date: '',
    timeWindow: { start: '09:00', end: '18:00' },
    attempts: 1,
    questions: 0,
  });

  const [departments, setDepartments] = useState<string[]>([]);
  useEffect(() => {
    const loadCatalog = async () => {
      try {
        const list = await PTOService.getDepartmentCatalog();
        setDepartments(list);
      } catch {
        setDepartments(['CE', 'ME', 'EEE', 'ECE', 'CSE', 'IT']);
      }
    };
    loadCatalog();
  }, []);

  // PTO manual creation removed in favor of PTS schema

  // Edit action is not part of the streamlined PTO UX; opener removed

  const handleUpdateAssessment = async () => {
    if (selectedAssessment) {
      await PTOService.updateAssessment(selectedAssessment.id, {
        name: formData.name,
        department: formData.department,
        type: formData.type,
        duration: formData.duration,
        date: formData.date,
        timeWindow: formData.timeWindow,
        attempts: formData.attempts
      });
      setAssessments(assessments.map(assessment =>
        assessment.id === selectedAssessment.id
          ? { ...selectedAssessment, ...formData }
          : assessment
      ));
      setIsEditModalOpen(false);
      setSelectedAssessment(null);
      resetForm();
    }
  };

  const handleDeleteAssessment = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this assessment?')) {
      await PTOService.deleteAssessment(id);
      const data = await PTOService.getAssessments();
      const mapped: Assessment[] = data.map((a: AssessDto) => ({
        id: a.id,
        name: a.name,
        department: a.department,
        type: a.type,
        duration: a.duration,
        date: a.date,
        timeWindow: { start: (a.timeWindow?.start || ''), end: (a.timeWindow?.end || '') },
        attempts: a.attempts,
        questions: a.questions,
        status: a.status === 'active' ? 'active' : 'inactive'
      }));
      setAssessments(mapped);
    }
  };

  const openScheduleModal = (assessment: Assessment, mode: 'schedule' | 'reschedule' = 'schedule') => {
    setScheduleTarget(assessment);
    setScheduleMode(mode);
    const startIso = assessment.timeWindow?.start || '';
    const endIso = assessment.timeWindow?.end || '';
    const toDate = (iso: string) => (iso ? new Date(iso) : null);
    const sd = toDate(startIso);
    const ed = toDate(endIso);
    const fmtDate = (d: Date | null) => (d ? `${String(d.getFullYear()).padStart(4,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` : '');
    const fmtTime = (d: Date | null) => (d ? `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}` : '09:00');
    setScheduleForm({
      date: fmtDate(sd),
      startTime: fmtTime(sd),
      endTime: fmtTime(ed),
      duration: assessment.duration || 60,
      attempts: assessment.attempts || 1,
      timezone: 'Asia/Kolkata',
      notes: ''
    });
    setIsScheduleModalOpen(true);
  };

  const combineDateTime = (date: string, time: string) => {
    if (!date || !time) return '';
    const d = new Date(`${date}T${time}:00`);
    return d.toISOString();
  };

  const submitSchedule = async () => {
    if (!scheduleTarget) return;
    const startISO = combineDateTime(scheduleForm.date, scheduleForm.startTime);
    const endISO = combineDateTime(scheduleForm.date, scheduleForm.endTime);
    await PTOService.updateAssessment(scheduleTarget.id, {
      scheduling: { startDate: startISO, endDate: endISO, timezone: scheduleForm.timezone },
      duration: scheduleForm.duration,
      attempts: scheduleForm.attempts,
      instructions: scheduleForm.notes
    });
    await PTOService.scheduleAssessment(scheduleTarget.id);
    const data = await PTOService.getAssessments();
    const mapped: Assessment[] = data.map((a: AssessDto) => ({
      id: a.id,
      name: a.name,
      department: a.department,
      type: a.type,
      duration: a.duration,
      date: a.date,
      timeWindow: { start: (a.timeWindow?.start || ''), end: (a.timeWindow?.end || '') },
      attempts: a.attempts,
      questions: a.questions,
      status: a.status === 'active' ? 'active' : 'inactive'
    }));
    setAssessments(mapped);
    setIsScheduleModalOpen(false);
    setScheduleTarget(null);
  };

  const refreshAssessments = async () => {
    const data = await PTOService.getAssessments();
    const mapped: Assessment[] = data.map((a: AssessDto) => ({
      id: a.id,
      name: a.name,
      department: a.department,
      type: a.type,
      duration: a.duration,
      date: a.date,
      timeWindow: { start: (a.timeWindow?.start || ''), end: (a.timeWindow?.end || '') },
      attempts: a.attempts,
      questions: a.questions,
      status: a.status === 'active' ? 'active' : 'inactive'
    }));
    setAssessments(mapped);
  };

  const handleActivate = async (id: string) => {
    await PTOService.enableAssessment(id);
    await refreshAssessments();
  };

  const handleDisable = async (id: string) => {
    await PTOService.disableAssessment(id);
    await refreshAssessments();
  };

  const handleCancelSchedule = async (id: string) => {
    await PTOService.disableAssessment(id);
    await refreshAssessments();
  };

  // Legacy status toggle removed in favor of explicit actions

  const scheduleAssessment = (id: string) => {
    const assessment = assessments.find(a => a.id === id);
    if (!assessment) return;
    openScheduleModal(assessment, 'schedule');
  };

  const rescheduleAssessment = (id: string) => {
    const assessment = assessments.find(a => a.id === id);
    if (!assessment) return;
    openScheduleModal(assessment, 'reschedule');
  };

  const [previewData, setPreviewData] = useState<AssessmentDetail | null>(null);
  const handlePreview = async (assessment: Assessment) => {
    const full = await PTOService.getAssessment(assessment.id) as AssessmentDetail;
    setSelectedAssessment({
      id: assessment.id,
      name: full?.name || assessment.name,
      department: full?.department || assessment.department,
      type: full?.type || assessment.type,
      duration: full?.duration ?? assessment.duration,
      date: full?.date || assessment.date,
      timeWindow: {
        start: full?.timeWindow?.start ?? assessment.timeWindow.start,
        end: full?.timeWindow?.end ?? assessment.timeWindow.end,
      },
      attempts: full?.attempts ?? assessment.attempts,
      questions: Array.isArray(full?.questions) ? full.questions.length : assessment.questions,
      status: (full?.status === 'active' ? 'active' : full?.status === 'inactive' ? 'inactive' : assessment.status)
    });
    setPreviewData(full || null);
    setIsPreviewModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      department: '',
      type: 'department-wise',
      duration: 60,
      date: '',
      timeWindow: { start: '09:00', end: '18:00' },
      attempts: 1,
      questions: 0,
    });
  };

  type ParsedQuestion = { text: string; options: string[]; correctIndex: number };
  const parsePastedQuestions = (text: string): ParsedQuestion[] => {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const items: ParsedQuestion[] = [];
    for (const line of lines) {
      const parts = line.split('|').map(p => p.trim());
      if (parts.length >= 3) {
        const q = parts[0];
        const opts = parts.slice(1, parts.length - 1);
        const ans = parts[parts.length - 1];
        let correctIndex = parseInt(ans, 10);
        if (Number.isNaN(correctIndex)) {
          const letter = String(ans).toUpperCase();
          correctIndex = Math.max(0, ['A','B','C','D','E','F','G'].indexOf(letter));
        }
        items.push({ text: q, options: opts, correctIndex });
      }
    }
    return items;
  };

  const handleImportSubmit = async () => {
    if (!importTargetId) return;
    const parsed = parsePastedQuestions(importText);
    await PTOService.updateAssessment(importTargetId, { questions: parsed });
    const updatedList = assessments.map(a => a.id === importTargetId ? { ...a, questions: parsed.length } : a);
    setAssessments(updatedList);
    setIsImportModalOpen(false);
    setImportText('');
    setImportTargetId(null);
  };

  const handleExcelFile = async (file: File) => {
    const data = await file.arrayBuffer();
    const wb = XLSX.read(data, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[];
    const parsed: ParsedQuestion[] = [];
    for (const r of rows) {
      if (Array.isArray(r) && r.length >= 3) {
        const q = String(r[0] || '').trim();
        const opts = r.slice(1, r.length - 1).map((x: unknown) => String(x ?? '').trim()).filter(Boolean);
        const ans = r[r.length - 1];
        let idx = parseInt(ans, 10);
        if (Number.isNaN(idx)) {
          idx = Math.max(0, ['A','B','C','D','E','F','G'].indexOf(String(ans || '').toUpperCase()));
        }
        if (q && opts.length) parsed.push({ text: q, options: opts, correctIndex: idx });
      }
    }
    if (importTargetId) {
      await PTOService.updateAssessment(importTargetId, { questions: parsed });
      const updatedList = assessments.map(a => a.id === importTargetId ? { ...a, questions: parsed.length } : a);
      setAssessments(updatedList);
    }
    setIsImportModalOpen(false);
    setImportText('');
    setImportTargetId(null);
  };

  return (
    <div className="pto-component-page">
      {/* Statistics */}
      <div className="stats-grid">
        {error && (<div className="admin-error"><p>{error}</p></div>)}
        {loading && (<div className="admin-loading"><div className="spinner"></div><p>Loading assessments...</p></div>)}
        <div className="stat-card">
          <FaClipboardList size={24} color="#9768E1" />
          <div className="stat-content">
            <h3>Total Assessments</h3>
            <p className="stat-value">{assessments.length}</p>
          </div>
        </div>
        <div className="stat-card">
          <FaToggleOn size={24} color="#9768E1" />
          <div className="stat-content">
            <h3>Active</h3>
            <p className="stat-value">{assessments.filter(a => a.status === 'active').length}</p>
          </div>
        </div>
        <div className="stat-card">
          <FaToggleOff size={24} color="#9768E1" />
          <div className="stat-content">
            <h3>Inactive</h3>
            <p className="stat-value">{assessments.filter(a => a.status === 'inactive').length}</p>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className="action-buttons-section">
        <button className="primary-btn" onClick={() => setIsAddModalOpen(true)}>
          <FaPlus /> Create Assessment
        </button>
      </div>

      {/* Assessments Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Assessment Name</th>
              <th>Department</th>
              <th>Type</th>
              <th>Duration</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {/* Active Section */}
            {assessments.filter(a => a.status === 'active').length > 0 && (
              <tr><td colSpan={8}><strong>Active</strong></td></tr>
            )}
            {assessments.filter(a => a.status === 'active').map(assessment => (
              <tr key={`active-${assessment.id}`} onClick={(e) => e.stopPropagation()}>
                <td>{assessment.name || '(Untitled)'} </td>
                <td>{assessment.department}</td>
                <td>
                  <span className={`type-badge ${assessment.type}`}>
                    {assessment.type === 'department-wise' ? 'Dept-wise' : 'College-wide'}
                  </span>
                </td>
                <td>{assessment.duration} min</td>
                <td>
                  <span className={`status-badge ${assessment.status}`}>Active</span>
                </td>
                <td>
                  <div className="action-buttons">
                    <button className="icon-btn preview-btn" onClick={() => handlePreview(assessment)} title="View"><FaEye /></button>
                    <button className="text-btn" onClick={() => handleDisable(assessment.id)} title="Disable" type="button">Disable</button>
                    <button className="text-btn" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setImportTargetId(assessment.id); setIsImportModalOpen(true); }} title="Import Questions" type="button">Import</button>
                  </div>
                </td>
              </tr>
            ))}

            

            {/* Inactive Section */}
            {assessments.filter(a => a.status === 'inactive').length > 0 && (
              <tr><td colSpan={8}><strong>Inactive</strong></td></tr>
            )}
              {assessments.filter(a => a.status === 'inactive').map(assessment => (
                <tr key={`inactive-${assessment.id}`} onClick={(e) => e.stopPropagation()}>
                  <td>{assessment.name || '(Untitled)'} </td>
                  <td>{assessment.department}</td>
                  <td>
                    <span className={`type-badge ${assessment.type}`}>
                      {assessment.type === 'department-wise' ? 'Dept-wise' : 'College-wide'}
                    </span>
                  </td>
                <td>{assessment.duration} min</td>
                <td>
                  <span className={`status-badge ${assessment.status}`}>Inactive</span>
                </td>
                  <td>
                    <div className="action-buttons">
                      <button className="icon-btn preview-btn" onClick={() => handlePreview(assessment)} title="View"><FaEye /></button>
                      <button className="text-btn" onClick={() => handleActivate(assessment.id)} title="Activate" type="button">Activate</button>
                      <button className="icon-btn delete-btn" onClick={() => handleDeleteAssessment(assessment.id)} title="Delete"><FaTrash /></button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Add Assessment Modal replaced with PTS schema */}
      {isAddModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAddModalOpen(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()} style={{ width: '95vw', maxWidth: '1200px', maxHeight: '80vh' }}>
            <h3>Create Assessment</h3>
            <div style={{ height: 'calc(80vh - 64px)', overflow: 'auto' }}>
              <PTSAssessmentCreation />
            </div>
            <div className="modal-actions">
              <button className="secondary-btn" onClick={async () => {
                setIsAddModalOpen(false);
                const data = await PTOService.getAssessments();
                const mapped: Assessment[] = data.map((a: AssessDto) => ({
                  id: a.id,
                  name: a.name,
                  department: a.department,
                  type: a.type,
                  duration: a.duration,
                  date: a.date,
                  timeWindow: { start: (a.timeWindow?.start || ''), end: (a.timeWindow?.end || '') },
                  attempts: a.attempts,
                  questions: a.questions,
                  status: a.status === 'active' ? 'active' : 'inactive'
                }));
                setAssessments(mapped);
              }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Assessment Modal */}
      {isEditModalOpen && (
        <div className="modal-overlay" onClick={() => setIsEditModalOpen(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <h3>Edit Assessment</h3>
            <div className="form-group">
              <label>Assessment Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as 'department-wise' | 'college-wide' })}
              >
                <option value="department-wise">Department-wise</option>
                <option value="college-wide">College-wide</option>
              </select>
            </div>
            <div className="form-group">
              <label>Department</label>
              <select
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              >
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Duration (minutes)</label>
                <input
                  type="number"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                  min="1"
                />
              </div>
              <div className="form-group">
                <label>Number of Attempts</label>
                <input
                  type="number"
                  value={formData.attempts}
                  onChange={(e) => setFormData({ ...formData, attempts: parseInt(e.target.value) })}
                  min="1"
                />
              </div>
            </div>
            <div className="form-group">
              <label>Date</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Time Window Start</label>
                <input
                  type="time"
                  value={formData.timeWindow.start}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    timeWindow: { ...formData.timeWindow, start: e.target.value }
                  })}
                />
              </div>
              <div className="form-group">
                <label>Time Window End</label>
                <input
                  type="time"
                  value={formData.timeWindow.end}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    timeWindow: { ...formData.timeWindow, end: e.target.value }
                  })}
                />
              </div>
            </div>
            <div className="modal-actions">
              <button className="primary-btn" onClick={handleUpdateAssessment}>Update</button>
              <button className="secondary-btn" onClick={() => setIsEditModalOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Assessment Modal */}
      {isPreviewModalOpen && selectedAssessment && (
        <div className="modal-overlay" onClick={() => setIsPreviewModalOpen(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <h3>Preview Assessment</h3>
            <div className="preview-content">
              <div className="preview-item">
                <strong>Name:</strong> {selectedAssessment.name}
              </div>
              <div className="preview-item">
                <strong>Department:</strong> {selectedAssessment.department}
              </div>
              <div className="preview-item">
                <strong>Type:</strong> {selectedAssessment.type === 'department-wise' ? 'Department-wise' : 'College-wide'}
              </div>
              <div className="preview-item">
                <strong>Duration:</strong> {selectedAssessment.duration} minutes
              </div>
              <div className="preview-item">
                <strong>Date:</strong> {selectedAssessment.date}
              </div>
              <div className="preview-item">
                <strong>Time Window:</strong> {selectedAssessment.timeWindow.start} - {selectedAssessment.timeWindow.end}
              </div>
              <div className="preview-item">
                <strong>Attempts:</strong> {selectedAssessment.attempts}
              </div>
              <div className="preview-item">
                <strong>Questions:</strong> {selectedAssessment.questions}
              </div>
              {previewData && Array.isArray(previewData.questions) && previewData.questions.length > 0 && (
                <div className="preview-item">
                  <strong>Question List:</strong>
                  <div>
                    {previewData.questions.map((q: Question, idx: number) => (
                      <div key={q.id || idx} style={{ marginTop: '8px' }}>
                        <div>{idx + 1}. {q.text}</div>
                        {Array.isArray(q.options) && q.options.length > 0 && (
                          <ul style={{ marginLeft: '20px' }}>
                            {q.options.map((opt: string, oi: number) => (
                              <li key={oi}>
                                {String.fromCharCode(65 + oi)}. {opt}
                                {typeof q.correctIndex === 'number' && q.correctIndex === oi ? ' (Correct)' : ''}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="preview-item">
                <strong>Status:</strong> 
                <span className={`status-badge ${selectedAssessment.status}`}>
                  {selectedAssessment.status.charAt(0).toUpperCase() + selectedAssessment.status.slice(1)}
                </span>
              </div>
            </div>
            <div className="modal-actions">
              <button className="primary-btn" onClick={() => setIsPreviewModalOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
      {isImportModalOpen && (
        <div className="modal-overlay" onClick={() => setIsImportModalOpen(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <h3>Import Questions</h3>
            <div className="form-group">
              <label>Paste format: question|option1|option2|option3|option4|Answer</label>
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="One question per line"
                rows={8}
              />
            </div>
            <div className="form-group">
              <label>Or upload Excel</label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => {
                  const f = e.target.files && e.target.files[0];
                  if (f) handleExcelFile(f);
                }}
              />
            </div>
            <div className="modal-actions">
              <button className="primary-btn" onClick={handleImportSubmit} disabled={!importText.trim() || !importTargetId}>Import</button>
              <button className="secondary-btn" onClick={() => setIsImportModalOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {isScheduleModalOpen && scheduleTarget && (
        <div className="modal-overlay" onClick={() => setIsScheduleModalOpen(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <h3>{scheduleMode === 'reschedule' ? 'Reschedule Assessment' : 'Schedule Assessment'}</h3>
            <div className="form-group">
              <label>Date</label>
              <input type="date" value={scheduleForm.date} onChange={(e) => setScheduleForm({ ...scheduleForm, date: e.target.value })} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Start Time</label>
                <input type="time" value={scheduleForm.startTime} onChange={(e) => setScheduleForm({ ...scheduleForm, startTime: e.target.value })} />
              </div>
              <div className="form-group">
                <label>End Time</label>
                <input type="time" value={scheduleForm.endTime} onChange={(e) => setScheduleForm({ ...scheduleForm, endTime: e.target.value })} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Duration (minutes)</label>
                <input type="number" min={1} value={scheduleForm.duration} onChange={(e) => setScheduleForm({ ...scheduleForm, duration: parseInt(e.target.value) || 1 })} />
              </div>
              <div className="form-group">
                <label>Attempts</label>
                <input type="number" min={1} value={scheduleForm.attempts} onChange={(e) => setScheduleForm({ ...scheduleForm, attempts: parseInt(e.target.value) || 1 })} />
              </div>
            </div>
            <div className="form-group">
              <label>Timezone</label>
              <select value={scheduleForm.timezone} onChange={(e) => setScheduleForm({ ...scheduleForm, timezone: e.target.value })}>
                <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                <option value="UTC">UTC</option>
                <option value="Europe/Paris">Europe/Paris</option>
              </select>
            </div>
            <div className="form-group">
              <label>Notes (optional)</label>
              <textarea rows={4} placeholder="Any scheduling notes or instructions" value={scheduleForm.notes} onChange={(e) => setScheduleForm({ ...scheduleForm, notes: e.target.value })} />
            </div>
            <div className="modal-actions">
              <button className="primary-btn" onClick={submitSchedule}>{scheduleMode === 'reschedule' ? 'Save' : 'Schedule'}</button>
              <button className="secondary-btn" onClick={() => setIsScheduleModalOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssessmentManagement;
