import React, { useState, useEffect, useCallback } from 'react';
import { 
  BookOpen, Calendar, Clock, Plus, CheckCircle, RefreshCw, 
  AlertCircle, Edit, Trash, Tag, Filter, Circle, Sun, Moon, 
  LogIn, User, Search, X, Check, Paperclip, FileText, Upload, 
  XCircle, Lightbulb, Calculator, Shield, Settings 
} from 'lucide-react';

// --- Production API Configuration ---
// We use window.location.hostname logic to avoid "import.meta" target environment build errors
const getApiBaseUrl = () => {
  if (typeof window !== 'undefined' && window.location.hostname === 'teaspoon.ecetechnion.me') {
    return 'https://api.ecetechnion.me/api/v2';
  }
  return 'http://localhost:8001/api/v2';
};

const API_BASE_URL = getApiBaseUrl();

// --- TypeScript Interfaces ---
interface Attachment { id: number; filename: string; url: string; uploader_id: number; category: string; }
interface Assignment { id: number; title: string; courseCode: string; type: string; deadline: string; isOptional: boolean; isCompleted: boolean; grade: number | null; attachments: Attachment[]; }
interface UserProfile { id: number; email: string; name: string; picture: string; role: string; }

interface CourseSyllabus { 
  name: string; 
  hw_weight: number; 
  hw_keep: number; 
  hw_magen: boolean; 
  ww_weight: number; 
  ww_keep: number; 
  ww_magen: boolean; 
  exam_weight: number; 
  exam_magen: boolean; 
}

interface CoursesMap { [key: string]: CourseSyllabus; }

interface AssignmentFormData { 
  title: string; 
  courseCode: string; 
  courseName: string; 
  type: string; 
  deadline: string; 
  time: string; 
  isOptional: boolean; 
}

interface CourseTheme { startBorder: string; hover: string; badgeBg: string; badgeText: string; badgeBorder: string; dot: string; }

interface GradeSummary {
  earned: string;
  possible: string;
  isMagen: boolean;
  unconfigured: boolean;
}

const typeTranslations: Record<string, string> = { 'All': 'הכל', 'Assignment': 'גיליון', 'Webwork': 'וובוורק', 'Exam': 'מבחן' };

const courseThemes: CourseTheme[] = [
  { startBorder: 'border-s-blue-500', hover: 'hover:border-blue-300 dark:hover:border-blue-400', badgeBg: 'bg-blue-100 dark:bg-blue-900/30', badgeText: 'text-blue-800 dark:text-blue-300', badgeBorder: 'border-blue-200 dark:border-blue-800/50', dot: 'bg-blue-500' },
  { startBorder: 'border-s-emerald-500', hover: 'hover:border-emerald-300 dark:hover:border-emerald-400', badgeBg: 'bg-emerald-100 dark:bg-emerald-900/30', badgeText: 'text-emerald-800 dark:text-emerald-300', badgeBorder: 'border-emerald-200 dark:border-emerald-800/50', dot: 'bg-emerald-500' },
  { startBorder: 'border-s-purple-500', hover: 'hover:border-purple-300 dark:hover:border-purple-400', badgeBg: 'bg-purple-100 dark:bg-purple-900/30', badgeText: 'text-purple-800 dark:text-purple-300', badgeBorder: 'border-purple-200 dark:border-purple-800/50', dot: 'bg-purple-500' },
  { startBorder: 'border-s-rose-500', hover: 'hover:border-rose-300 dark:hover:border-rose-400', badgeBg: 'bg-rose-100 dark:bg-rose-900/30', badgeText: 'text-rose-800 dark:text-rose-300', badgeBorder: 'border-rose-200 dark:border-rose-800/50', dot: 'bg-rose-500' },
  { startBorder: 'border-s-amber-500', hover: 'hover:border-amber-300 dark:hover:border-amber-400', badgeBg: 'bg-amber-100 dark:bg-amber-900/30', badgeText: 'text-amber-800 dark:text-amber-300', badgeBorder: 'border-amber-200 dark:border-amber-800/50', dot: 'bg-amber-500' }
];

const getCourseTheme = (courseCode: string): CourseTheme => {
  let hash = 0; for (let i = 0; i < courseCode.length; i++) hash = courseCode.charCodeAt(i) + ((hash << 5) - hash);
  return courseThemes[Math.abs(hash) % courseThemes.length];
};

export default function App() {
  const [token, setToken] = useState<string | null>(typeof window !== 'undefined' ? localStorage.getItem('teaspoon_jwt') : null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [coursesMap, setCoursesMap] = useState<CoursesMap>({});
  
  const [myCourses, setMyCourses] = useState<string[]>([]); 
  const [visibleCourses, setVisibleCourses] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isCalendarCopied, setIsCalendarCopied] = useState(false);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => { 
    if (typeof window !== 'undefined') return localStorage.getItem('theme') as 'light' | 'dark' || 'light'; 
    return 'light'; 
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [activeTypeFilter, setActiveTypeFilter] = useState<string>('All');
  const assignmentTypes = ['All', 'Assignment', 'Webwork', 'Exam'];

  // Modals State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [currentEditId, setCurrentEditId] = useState<number | null>(null);
  const [formData, setFormData] = useState<AssignmentFormData>({ 
    title: '', courseCode: '', courseName: '', type: 'Assignment', deadline: '', time: '', isOptional: false 
  });

  // Course Settings Modal State
  const [isCourseModalOpen, setIsCourseModalOpen] = useState<boolean>(false);
  const [editingCourseCode, setEditingCourseCode] = useState<string | null>(null);
  const [courseFormData, setCourseFormData] = useState<CourseSyllabus>({ 
    name: '', hw_weight: 0, hw_keep: 0, hw_magen: false, ww_weight: 0, ww_keep: 0, ww_magen: false, exam_weight: 0, exam_magen: false 
  });

  // File Interaction State
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const [editingFileId, setEditingFileId] = useState<number | null>(null);
  const [editFileName, setEditFileName] = useState<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlToken = urlParams.get('token');
      if (urlToken) { 
        localStorage.setItem('teaspoon_jwt', urlToken); 
        setToken(urlToken); 
        window.history.replaceState({}, document.title, window.location.pathname); 
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const root = window.document.documentElement;
      theme === 'dark' ? root.classList.add('dark') : root.classList.remove('dark');
      localStorage.setItem('theme', theme);
    }
  }, [theme]);

  const fetchAllData = useCallback(async () => {
    setLoading(true); setFetchError(null);
    try {
      const headers: HeadersInit = {}; if (token) headers['Authorization'] = `Bearer ${token}`;
      const [coursesRes, assignmentsRes] = await Promise.all([ fetch(`${API_BASE_URL}/courses`), fetch(`${API_BASE_URL}/assignments`, { headers }) ]);
      
      if (!coursesRes.ok || !assignmentsRes.ok) throw new Error("Network error");
      
      const rawMap = await coursesRes.json();
      const mappedMap: CoursesMap = {};
      Object.entries(rawMap).forEach(([k, v]: [string, any]) => {
          mappedMap[k] = {
              name: v.name || '',
              hw_weight: v.hw_weight || 0,
              hw_keep: v.hw_keep !== undefined ? v.hw_keep : (v.hw_drop || 0), 
              hw_magen: v.hw_magen || false,
              ww_weight: v.ww_weight || 0,
              ww_keep: v.ww_keep !== undefined ? v.ww_keep : (v.ww_drop || 0),
              ww_magen: v.ww_magen || false,
              exam_weight: v.exam_weight || 0,
              exam_magen: v.exam_magen || false
          };
      });
      setCoursesMap(mappedMap);

      let fetchedAssignments: Assignment[] = await assignmentsRes.json();

      if (token) {
        try {
          const [userRes, userCoursesRes] = await Promise.all([ fetch(`${API_BASE_URL}/users/me`, { headers }), fetch(`${API_BASE_URL}/users/me/courses`, { headers }) ]);
          if (userRes.ok) {
            setUserProfile(await userRes.json());
            const dbCourses = await userCoursesRes.json(); setMyCourses(dbCourses); setVisibleCourses(dbCourses);
          } else throw new Error("Unauthorized");
        } catch { 
            localStorage.removeItem('teaspoon_jwt'); 
            setToken(null); 
        }
      } else {
        const localCourses = JSON.parse(localStorage.getItem('guest_courses') || '[]');
        const localCompletions = JSON.parse(localStorage.getItem('guest_completions') || '[]');
        const localGrades = JSON.parse(localStorage.getItem('guest_grades') || '{}');
        setMyCourses(localCourses); setVisibleCourses(localCourses);
        fetchedAssignments = fetchedAssignments.map(a => ({ ...a, isCompleted: localCompletions.includes(a.id), grade: localGrades[a.id] ?? null }));
      }
      setAssignments(fetchedAssignments.map(a => ({ ...a, deadline: a.deadline.endsWith('Z') ? a.deadline : `${a.deadline}Z` })).sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime()));
    } catch { setFetchError('שגיאת תקשורת עם השרת.'); } finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetchAllData(); }, [fetchAllData]);

  // --- Course Functions ---
  const syncCourses = (newCourses: string[]) => {
    if (token) fetch(`${API_BASE_URL}/users/me/courses`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(newCourses) });
    else localStorage.setItem('guest_courses', JSON.stringify(newCourses));
  };
  const handleAddCourse = (code: string) => { 
    if (!code.trim()) return;
    if (!myCourses.includes(code)) { 
      const updated = [...myCourses, code]; 
      setMyCourses(updated); 
      setVisibleCourses(prev => [...prev, code]); 
      syncCourses(updated); 
    } 
    setSearchQuery(''); 
    setIsSearchFocused(false); 
  };
  const handleRemoveCourse = (code: string) => { const updated = myCourses.filter(c => c !== code); setMyCourses(updated); setVisibleCourses(prev => prev.filter(c => c !== code)); syncCourses(updated); };
  const toggleVisibleCourse = (code: string) => setVisibleCourses(prev => prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]);

  const openCourseSettings = (code: string) => {
    setEditingCourseCode(code);
    const syl = coursesMap[code] || { name: '', hw_weight: 0, hw_keep: 0, hw_magen: false, ww_weight: 0, ww_keep: 0, ww_magen: false, exam_weight: 0, exam_magen: false };
    setCourseFormData(syl);
    setIsCourseModalOpen(true);
  };

  const handleSaveCourseSettings = async (e: React.FormEvent) => {
    e.preventDefault(); if (!token || !editingCourseCode) return;
    setCoursesMap(prev => ({ ...prev, [editingCourseCode]: courseFormData }));
    setIsCourseModalOpen(false);

    const payload = {
        ...courseFormData,
        hw_drop: courseFormData.hw_keep,
        ww_drop: courseFormData.ww_keep
    };

    try { await fetch(`${API_BASE_URL}/courses/${editingCourseCode}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(payload) }); } catch { }
  };

  // --- Assignment Functions ---
  const toggleCompletion = async (id: number) => {
    setAssignments(prev => prev.map(a => a.id === id ? { ...a, isCompleted: !a.isCompleted } : a));
    if (token) fetch(`${API_BASE_URL}/assignments/${id}/toggle`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
    else {
      const localCompletions = JSON.parse(localStorage.getItem('guest_completions') || '[]');
      const updated = localCompletions.includes(id) ? localCompletions.filter((i: number) => i !== id) : [...localCompletions, id];
      localStorage.setItem('guest_completions', JSON.stringify(updated));
    }
  };

  const handleGradeUpdate = async (id: number, val: string) => {
    const grade = val === '' ? null : parseInt(val);
    setAssignments(prev => prev.map(a => a.id === id ? { ...a, grade } : a));
    if (token) fetch(`${API_BASE_URL}/assignments/${id}/grade`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ grade }) });
    else {
      const localGrades = JSON.parse(localStorage.getItem('guest_grades') || '{}');
      if (grade === null) delete localGrades[id]; else localGrades[id] = grade;
      localStorage.setItem('guest_grades', JSON.stringify(localGrades));
    }
  };

  const openAddModal = () => { 
    setIsEditing(false); 
    setCurrentEditId(null); 
    setFormData({ 
      title: '', 
      courseCode: '', 
      courseName: '', 
      type: 'Assignment', 
      deadline: '', 
      time: '', 
      isOptional: false 
    }); 
    setIsModalOpen(true); 
  };

  const openEditModal = (assignment: Assignment) => {
    const d = new Date(assignment.deadline); setIsEditing(true); setCurrentEditId(assignment.id);
    setFormData({ title: assignment.title, courseCode: assignment.courseCode, courseName: coursesMap[assignment.courseCode]?.name || '', type: assignment.type, isOptional: assignment.isOptional || false, deadline: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`, time: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` });
    setIsModalOpen(true);
  };
  const handleDelete = async (id: number) => {
    if (!window.confirm("למחוק מטלה זו?")) return;
    try { await fetch(`${API_BASE_URL}/assignments/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }}); setAssignments(prev => prev.filter(a => a.id !== id)); } catch { alert("שגיאה במחיקה."); }
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!token) return;
    const payload = { title: formData.title, courseCode: formData.courseCode, type: formData.type, deadline: new Date(`${formData.deadline}T${formData.time || '23:59'}:00`).toISOString(), isOptional: formData.isOptional };
    try {
      if (!coursesMap[formData.courseCode]) {
         await fetch(`${API_BASE_URL}/courses/${formData.courseCode}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ name: formData.courseName, hw_weight: 0, hw_drop: 0, ww_weight: 0, ww_drop: 0, exam_weight: 0, hw_magen: false, ww_magen: false, exam_magen: false }) });
      }
      await fetch(`${API_BASE_URL}/assignments${isEditing ? `/${currentEditId}` : ''}`, { method: isEditing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(payload) });
      fetchAllData(); setIsModalOpen(false); if (!myCourses.includes(payload.courseCode)) handleAddCourse(payload.courseCode);
    } catch { alert("שגיאה בשמירה."); }
  };

  // --- Grade Calculation Logic ---
  const calculateCourseGrade = (code: string): GradeSummary | null => {
    const syllabus = coursesMap[code] || { name: '', hw_weight: 0, hw_keep: 0, hw_magen: false, ww_weight: 0, ww_keep: 0, ww_magen: false, exam_weight: 0, exam_magen: false };
    const courseAssignments = assignments.filter(a => a.courseCode === code);
    if (courseAssignments.length === 0 || !courseAssignments.some(a => a.grade !== null)) return null;

    const processCategory = (type: string, weight: number, keepCount: number) => {
      if (weight === 0) return { earned: 0, possible: 0, rawAvg: undefined };
      const items = courseAssignments.filter(a => a.type === type);
      const gradedItems = items.filter(a => a.grade !== null);
      if (gradedItems.length === 0) return { earned: 0, possible: weight, rawAvg: undefined }; 

      const actualKeep = keepCount > 0 ? keepCount : Math.max(1, gradedItems.length);
      let grades = gradedItems.map(a => a.grade as number).sort((a, b) => b - a); 
      if (keepCount > 0) { while (grades.length < actualKeep) { grades.push(0); } }
      const keptGrades = grades.slice(0, actualKeep);
      const avg = keptGrades.reduce((sum, g) => sum + g, 0) / actualKeep;
      return { earned: (avg / 100) * weight, possible: weight, rawAvg: avg };
    };

    const hw = processCategory('Assignment', syllabus.hw_weight || 0, syllabus.hw_keep || 0);
    const ww = processCategory('Webwork', syllabus.ww_weight || 0, syllabus.ww_keep || 0);
    const exam = processCategory('Exam', syllabus.exam_weight || 0, 0); 

    let final_hw_earned = hw.earned; let final_hw_possible = hw.possible;
    let final_ww_earned = ww.earned; let final_ww_possible = ww.possible;
    let final_exam_earned = exam.earned; let final_exam_possible = exam.possible;
    let isMagenActive = false;

    if (exam.possible > 0 && exam.rawAvg !== undefined) {
      if (syllabus.hw_magen && hw.possible > 0 && hw.rawAvg !== undefined && hw.rawAvg < exam.rawAvg) {
        final_exam_possible += hw.possible; final_exam_earned += (exam.rawAvg / 100) * hw.possible;
        final_hw_possible = 0; final_hw_earned = 0; isMagenActive = true;
      }
      if (syllabus.ww_magen && ww.possible > 0 && ww.rawAvg !== undefined && ww.rawAvg < exam.rawAvg) {
        final_exam_possible += ww.possible; final_exam_earned += (exam.rawAvg / 100) * ww.possible;
        final_ww_possible = 0; final_ww_earned = 0; isMagenActive = true;
      }
    }

    const totalEarned = final_hw_earned + final_ww_earned + final_exam_earned;
    const totalPossible = final_hw_possible + final_ww_possible + final_exam_possible;

    if (totalPossible === 0) {
        const gradedItems = courseAssignments.filter(a => a.grade !== null);
        const avg = gradedItems.reduce((sum, a) => sum + (a.grade as number), 0) / gradedItems.length;
        return { earned: avg.toFixed(1), possible: '100', isMagen: false, unconfigured: true };
    }

    return { earned: totalEarned.toFixed(1), possible: totalPossible.toFixed(1), isMagen: isMagenActive, unconfigured: false };
  };

  // --- Dynamic Calendar Sync ---
  const handleCalendarSync = () => {
    let calendarUrl = '';
    
    if (token) {
      calendarUrl = `${API_BASE_URL}/calendar/feed?token=${token}`;
    } else if (visibleCourses.length > 0) {
      calendarUrl = `${API_BASE_URL}/calendar/feed?courses=${visibleCourses.join(',')}`;
    } else {
      alert("אין קורסים מסומנים לסנכרון.");
      return;
    }
    
    navigator.clipboard.writeText(calendarUrl).then(() => {
      setIsCalendarCopied(true);
      setTimeout(() => setIsCalendarCopied(false), 2000);
    }).catch(() => {
      alert("שגיאה בהעתקת הקישור ליומן. אנא נסה שוב.");
    });
  };

  // --- MinIO ---
  const handleFileUpload = async (assignmentId: number, e: React.ChangeEvent<HTMLInputElement>, category: string) => {
    if (!e.target.files || e.target.files.length === 0 || !token) return;
    const file = e.target.files[0]; const inputElement = e.target; setUploadingId(assignmentId);
    const fd = new FormData(); fd.append('file', file); fd.append('category', category);
    try {
      await fetch(`${API_BASE_URL}/assignments/${assignmentId}/attachments`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: fd });
      await fetchAllData();
    } catch { alert("שגיאה בהעלאה."); } finally { setUploadingId(null); inputElement.value = ''; }
  };
  const handleRenameAttachment = async (assignmentId: number, attachmentId: number) => {
    if (!token || !editFileName.trim()) return;
    const oldName = assignments.find(a => a.id === assignmentId)?.attachments.find(a => a.id === attachmentId)?.filename;
    const extension = oldName?.includes('.') ? oldName.substring(oldName.lastIndexOf('.')) : '';
    const finalName = editFileName.includes('.') ? editFileName : `${editFileName}${extension}`;
    setAssignments(prev => prev.map(a => a.id === assignmentId ? { ...a, attachments: (a.attachments || []).map(att => att.id === attachmentId ? { ...att, filename: finalName } : att) } : a));
    setEditingFileId(null);
    try { await fetch(`${API_BASE_URL}/attachments/${attachmentId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ filename: finalName }) }); } catch { fetchAllData(); }
  };
  const handleDeleteAttachment = async (assignmentId: number, attachmentId: number) => {
    if (!token || !window.confirm("למחוק קובץ?")) return;
    setAssignments(prev => prev.map(a => a.id === assignmentId ? { ...a, attachments: (a.attachments || []).filter(att => att.id !== attachmentId) } : a));
    try { await fetch(`${API_BASE_URL}/attachments/${attachmentId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } }); } catch { fetchAllData(); }
  };

  const searchResults = Object.entries(coursesMap).filter(([code, syl]) => { if (!searchQuery) return false; return code.includes(searchQuery) || (syl.name && syl.name.toLowerCase().includes(searchQuery.toLowerCase())); }).slice(0, 5);
  const filteredAssignments = assignments.filter(a => visibleCourses.includes(a.courseCode) && (activeTypeFilter === 'All' || a.type === activeTypeFilter));

  const formatDateTime = (isoString: string) => {
    const date = new Date(isoString); const today = new Date(); const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    let dateStr = date.toLocaleDateString('he-IL', { month: 'short', day: 'numeric' });
    if (date.toDateString() === today.toDateString()) dateStr = 'היום'; else if (date.toDateString() === tomorrow.toDateString()) dateStr = 'מחר';
    return `${dateStr} ב-${date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', hour12: false })}`;
  };
  const getCardClasses = (deadline: string, courseTheme: CourseTheme, isCompleted: boolean) => {
    if (isCompleted) return 'border-s-slate-300 dark:border-s-slate-600 border-y-slate-200 dark:border-y-slate-700 border-e-slate-200 dark:border-e-slate-700 bg-slate-100/60 dark:bg-slate-800/60 opacity-60 grayscale-[0.3] hover:opacity-80'; 
    const hoursLeft = (new Date(deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60);
    if (hoursLeft < 0) return 'border-s-red-500 border-y-red-200 dark:border-y-red-900/50 border-e-red-200 dark:border-e-red-900/50 bg-red-50 dark:bg-red-900/20';
    if (hoursLeft < 48) return 'border-s-orange-500 border-y-orange-200 dark:border-y-orange-900/50 border-e-orange-200 dark:border-e-orange-900/50 bg-orange-50 dark:bg-orange-900/20';
    return `${courseTheme.startBorder} border-y-slate-200 dark:border-y-slate-700 border-e-slate-200 dark:border-e-slate-700 bg-white dark:bg-slate-800 ${courseTheme.hover}`;
  };

  const renderAttachment = (att: Attachment, assignmentId: number) => (
    <div key={att.id} className="flex items-center justify-between bg-slate-50 dark:bg-slate-900/50 rounded p-1.5 border border-slate-100 dark:border-slate-700/50 group/file">
      {editingFileId === att.id ? (
        <div className="flex items-center gap-2 flex-1 ml-4" onClick={e => e.preventDefault()}>
          <input autoFocus type="text" value={editFileName} onChange={e => setEditFileName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleRenameAttachment(assignmentId, att.id)} className="text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-600 rounded px-1.5 py-0.5 w-full outline-none focus:ring-1 focus:ring-blue-500" />
          <button onClick={() => handleRenameAttachment(assignmentId, att.id)} className="text-emerald-500 hover:text-emerald-600 p-0.5"><Check className="w-3 h-3" /></button>
          <button onClick={() => setEditingFileId(null)} className="text-slate-400 hover:text-red-500 p-0.5"><X className="w-3 h-3" /></button>
        </div>
      ) : (
        <a href={att.url} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2 overflow-hidden hover:underline ${att.category === 'solution' ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'}`}>
          <FileText className="w-3.5 h-3.5 shrink-0" />
          <span className="text-xs truncate" dir="ltr">{att.filename}</span>
        </a>
      )}
      {!editingFileId && token && (userProfile?.id === att.uploader_id || userProfile?.role === 'admin') && (
        <div className="flex gap-1 opacity-0 group-hover/file:opacity-100 transition-opacity shrink-0">
          <button onClick={(e) => { e.preventDefault(); setEditingFileId(att.id); setEditFileName(att.filename.replace(/\.[^/.]+$/, "")); }} className="text-slate-400 hover:text-blue-500" title="שינוי שם"><Edit className="w-3.5 h-3.5" /></button>
          <button onClick={() => handleDeleteAttachment(assignmentId, att.id)} className="text-slate-400 hover:text-red-500" title="מחיקה"><XCircle className="w-3.5 h-3.5" /></button>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-sans pb-12 transition-colors duration-200" dir="rtl">
      {/* Header - relative on mobile, sticky top-0 on desktop (md) */}
      <header className="bg-white dark:bg-slate-800 shadow-sm border-b border-slate-200 dark:border-slate-700 relative md:sticky top-0 z-40 transition-colors duration-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between">
          <div className="flex items-center gap-3 mb-4 sm:mb-0">
            <div className="bg-slate-900 dark:bg-slate-700 p-2 rounded-lg"><Calendar className="w-6 h-6 text-white" /></div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50">Teaspoon</h1>
              {token ? <p className="text-sm text-slate-500 dark:text-slate-400">שלום {userProfile?.name?.split(' ')[0]}!</p> : <p className="text-sm text-slate-500 dark:text-slate-400 italic">מצב אורח</p>}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')} className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"><Moon className="w-5 h-5 hidden dark:block" /><Sun className="w-5 h-5 block dark:hidden" /></button>
            
            <button 
              onClick={handleCalendarSync} 
              className={`flex items-center gap-2 border px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm ${
                isCalendarCopied 
                  ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400' 
                  : 'bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200'
              }`}
            >
              {isCalendarCopied ? <Check className="w-4 h-4" /> : <Calendar className="w-4 h-4" />} 
              {isCalendarCopied ? 'הקישור הועתק!' : 'סנכרון ליומן'}
            </button>

            {token ? (
              <>
                <button onClick={() => { localStorage.removeItem('teaspoon_jwt'); setToken(null); setUserProfile(null); }} className="flex items-center gap-2 p-2 px-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-sm font-medium" title="התנתק"><User className="w-5 h-5" /> התנתק</button>
                <button onClick={openAddModal} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"><Plus className="w-4 h-4" /> הוספת מטלה</button>
              </>
            ) : (
              <button onClick={() => window.location.href = `${API_BASE_URL}/auth/login`} className="flex items-center gap-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"><LogIn className="w-4 h-4" /> התחברות לעריכה</button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 flex flex-col md:flex-row gap-8 items-start">
        {/* Right Menu - Flexes top to bottom and stays sticky on desktop */}
        <aside className="w-full md:w-72 flex flex-col gap-6 shrink-0 md:sticky md:top-24 md:h-[calc(100vh-7rem)] z-30">
          <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-colors flex-1 flex flex-col overflow-hidden relative">
            <h2 className="font-semibold text-slate-900 dark:text-slate-50 mb-4 flex items-center gap-2 shrink-0"><BookOpen className="w-5 h-5 text-slate-700 dark:text-slate-300" /> הקורסים שלי</h2>
            <div className="relative mb-6 shrink-0">
              <div className="relative">
                <input type="text" placeholder="חיפוש קורס..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onFocus={() => setIsSearchFocused(true)} onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)} className="w-full pl-4 pr-10 py-2 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-colors dark:text-slate-100" />
                <Search className="w-4 h-4 absolute right-3 top-2.5 text-slate-400" />
              </div>
              
              {isSearchFocused && searchQuery && (
                <div className="absolute z-30 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl max-h-60 overflow-y-auto flex flex-col">
                  {searchResults.length > 0 && searchResults.map(([code, syl]) => (
                    <button key={code} onClick={() => handleAddCourse(code)} className="w-full text-right px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 flex flex-col items-start border-b border-slate-100 dark:border-slate-700 last:border-0 transition-colors">
                      <div className="flex justify-between items-center w-full"><span className="text-sm font-bold text-slate-800 dark:text-slate-100">{syl.name}</span>{myCourses.includes(code) && <CheckCircle className="w-4 h-4 text-emerald-500" />}</div>
                      <span className="text-xs text-slate-500">{code}</span>
                    </button>
                  ))}
                  
                  {/* Smart Add Course Option below results */}
                  {searchQuery && !myCourses.includes(searchQuery) && (
                    <button 
                      onMouseDown={(e) => { e.preventDefault(); handleAddCourse(searchQuery); }} 
                      className="w-full text-right px-4 py-3 hover:bg-blue-50 dark:hover:bg-slate-700 flex items-center gap-2 border-t border-slate-100 dark:border-slate-700 text-blue-600 dark:text-blue-400 transition-colors mt-auto"
                    >
                      <Plus className="w-4 h-4" />
                      <span className="text-sm font-bold">הוסף קורס: {searchQuery}</span>
                    </button>
                  )}
                </div>
              )}
            </div>
            
            <div className="space-y-2 flex-1 overflow-y-auto pe-2 scrollbar-thin">
              {myCourses.map(code => {
                const courseTheme = getCourseTheme(code);
                return (
                  <div key={code} className="flex items-center justify-between p-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg transition-colors group">
                    <label className="flex items-start gap-3 cursor-pointer flex-1">
                      <input type="checkbox" checked={visibleCourses.includes(code)} onChange={() => toggleVisibleCourse(code)} className="w-4 h-4 mt-1 rounded border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-blue-600 focus:ring-blue-500 dark:focus:ring-offset-slate-800" />
                      <div className="flex flex-col flex-1">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${courseTheme.dot}`}></div>
                          <span className="text-sm font-bold text-slate-700 dark:text-slate-200 line-clamp-1">{coursesMap[code]?.name || 'קורס מותאם'}</span>
                        </div>
                        <span className="text-xs text-slate-500 dark:text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 me-4 text-start" dir="ltr">{code}</span>
                      </div>
                    </label>
                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                      {token && (<button onClick={(e) => { e.preventDefault(); openCourseSettings(code); }} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-md transition-all"><Settings className="w-4 h-4" /></button>)}
                      <button onClick={(e) => { e.preventDefault(); handleRemoveCourse(code); }} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-all focus:opacity-100"><X className="w-4 h-4" /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>

        <div className="flex-1 relative z-10 flex flex-col min-h-full">
          <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
            <div className="flex items-center gap-2 ms-2 text-slate-500 dark:text-slate-400"><Filter className="w-4 h-4" /><span className="text-sm font-semibold">סינון:</span></div>
            {assignmentTypes.map(type => (<button key={type} onClick={() => setActiveTypeFilter(type)} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${ activeTypeFilter === type ? 'bg-slate-800 dark:bg-blue-600 text-white shadow-sm' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700' }`}>{typeTranslations[type]}</button>))}
          </div>

          {loading ? ( <div className="flex justify-center items-center h-40"><RefreshCw className="w-8 h-8 text-blue-500 animate-spin" /></div> ) 
          : fetchError ? ( <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-xl p-8 text-center transition-colors"><AlertCircle className="w-12 h-12 text-red-400 dark:text-red-500 mx-auto mb-4" /><h3 className="text-lg font-medium text-red-900 dark:text-red-200 mb-1">שגיאת תקשורת</h3><p className="text-red-700 dark:text-red-300 text-sm max-w-md mx-auto">{fetchError}</p></div> ) 
          : filteredAssignments.length === 0 ? ( <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 border-dashed rounded-xl p-12 text-center transition-colors"><CheckCircle className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" /><h3 className="text-lg font-medium text-slate-900 dark:text-slate-50 mb-1">אין מטלות</h3></div> ) 
          : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 content-start">
              {filteredAssignments.map((assignment) => {
                const courseTheme = getCourseTheme(assignment.courseCode);
                return (
                  <div key={assignment.id} className={`relative p-5 rounded-xl border-s-4 shadow-sm group flex flex-col justify-between ${getCardClasses(assignment.deadline, courseTheme, assignment.isCompleted)}`}>
                    {token && (
                      <div className="absolute top-4 end-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEditModal(assignment)} className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-700 rounded-md transition-colors"><Edit className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(assignment.id)} className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-slate-700 rounded-md transition-colors"><Trash className="w-4 h-4" /></button>
                      </div>
                    )}
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-3 pe-16">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-bold rounded-md border ${assignment.isCompleted ? 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-600' : `${courseTheme.badgeBg} ${courseTheme.badgeText} ${courseTheme.badgeBorder}`}`} dir="ltr">
                           {assignment.courseCode}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-md border bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 shadow-sm">
                          <Tag className="w-3 h-3" /> {typeTranslations[assignment.type]}
                        </span>
                      </div>
                      
                      <div className="flex items-start gap-3 mb-1">
                        <button onClick={() => toggleCompletion(assignment.id)} className="shrink-0 text-slate-400 hover:text-emerald-500 dark:hover:text-emerald-400 mt-0.5">
                          {assignment.isCompleted ? <CheckCircle className="w-5 h-5 text-emerald-500 dark:text-emerald-400" /> : <Circle className="w-5 h-5" />}
                        </button>
                        <h3 className={`text-lg font-bold ${assignment.isCompleted ? 'text-slate-400 line-through' : 'text-slate-900 dark:text-slate-50'}`}>{assignment.title}</h3>
                      </div>
                      <p className={`text-xs mb-4 ms-8 ${assignment.isCompleted ? 'text-slate-400 dark:text-slate-500' : 'text-slate-500 dark:text-slate-400'}`}>{coursesMap[assignment.courseCode]?.name || 'קורס מותאם'}</p>
                      
                      <div className={`flex items-center justify-between ms-8 ${assignment.isCompleted ? 'text-slate-400' : 'text-slate-700 dark:text-slate-300'}`}>
                        <div className="flex items-center gap-2 text-sm font-medium"><Clock className="w-4 h-4" /> <span>{formatDateTime(assignment.deadline)}</span></div>
                        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 shadow-sm">
                          <span className="text-[10px] font-bold uppercase text-slate-400">ציון</span>
                          <input type="number" min="0" max="100" placeholder="--" className="w-8 text-sm bg-transparent text-center font-bold outline-none text-slate-800 dark:text-slate-100" value={assignment.grade ?? ''} onChange={(e) => handleGradeUpdate(assignment.id, e.target.value)} />
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 ms-8 border-t border-slate-200 dark:border-slate-700/50 pt-3">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold flex items-center gap-1 text-slate-500 dark:text-slate-400"><Paperclip className="w-3 h-3" /> קבצים ({assignment.attachments?.length || 0})</span>
                        {token && (
                          <div className="flex items-center gap-3">
                            <label className={`text-xs flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 cursor-pointer ${uploadingId === assignment.id ? 'opacity-50 pointer-events-none' : ''}`}><input type="file" className="hidden" onChange={(e) => handleFileUpload(assignment.id, e, 'assignment')} disabled={uploadingId === assignment.id} /><Upload className="w-3 h-3" /> מטלה</label>
                            <label className={`text-xs flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 cursor-pointer ${uploadingId === assignment.id ? 'opacity-50 pointer-events-none' : ''}`}><input type="file" className="hidden" onChange={(e) => handleFileUpload(assignment.id, e, 'solution')} disabled={uploadingId === assignment.id} /><Upload className="w-3 h-3" /> פתרון</label>
                            {uploadingId === assignment.id && <RefreshCw className="w-3 h-3 animate-spin text-slate-400" />}
                          </div>
                        )}
                      </div>
                      {(assignment.attachments?.filter(a => a.category === 'assignment').length || 0) > 0 && (<div className="mb-3"><span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1.5 block">קובצי מטלה</span><div className="space-y-1.5">{assignment.attachments?.filter(a => a.category === 'assignment').map(att => renderAttachment(att, assignment.id))}</div></div>)}
                      {(assignment.attachments?.filter(a => a.category === 'solution').length || 0) > 0 && (<div><span className="text-[10px] font-bold text-emerald-500 dark:text-emerald-600 uppercase mb-1.5 flex items-center gap-1"><Lightbulb className="w-3 h-3" /> פתרונות ועזרים</span><div className="space-y-1.5">{assignment.attachments?.filter(a => a.category === 'solution').map(att => renderAttachment(att, assignment.id))}</div></div>)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {visibleCourses.length > 0 && assignments.some(a => a.grade !== null) && (
            <div className="mt-12 border-t border-slate-200 dark:border-slate-700 pt-8 mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-4 flex items-center gap-2"><Calculator className="w-5 h-5 text-slate-500" /> מצב ציונים</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {visibleCourses.map(code => {
                  const summary = calculateCourseGrade(code);
                  if (!summary) return null;
                  const themeObj = getCourseTheme(code);
                  return (
                    <div key={`grade-${code}`} className={`p-4 rounded-xl border ${themeObj.badgeBg} ${themeObj.badgeBorder} shadow-sm`}>
                       <div className="flex justify-between items-start mb-3">
                         <div className="flex flex-col">
                           <span className={`font-bold ${themeObj.badgeText} text-sm line-clamp-1`}>{coursesMap[code]?.name || 'קורס מותאם'}</span>
                           <span className={`text-xs ${themeObj.badgeText} opacity-70`} dir="ltr">{code}</span>
                         </div>
                         <div className="flex gap-1">
                           {summary.unconfigured && <span title="יש להגדיר משקלים למטלות בהגדרות הקורס להצגת ציון משוקלל" className="cursor-help"><AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-orange-500" /></span>}
                           {summary.isMagen && <span title="ציון מגן פעיל"><Shield className={`w-4 h-4 mt-0.5 shrink-0 ${themeObj.badgeText}`} /></span>}
                       </div>
                       </div>
                       <div className="flex items-baseline gap-1.5" dir="ltr">
                         <span className={`text-3xl font-black leading-none ${themeObj.badgeText}`}>{summary.earned}</span>
                         <span className={`text-lg font-medium leading-none ${themeObj.badgeText} opacity-60 mb-0.5`}>/ {summary.possible}</span>
                       </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Assignment Modal */}
      {isModalOpen && token && (
        <div className="fixed inset-0 bg-slate-900/50 dark:bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-700">
            <div className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700 px-6 py-4 flex justify-between items-center"><h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">{isEditing ? 'עריכת מטלה' : 'הוספת מטלה חדשה'}</h2><button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-2xl leading-none">&times;</button></div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                
                {/* NEW COURSE DROPDOWN */}
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">קורס</label>
                  <select 
                    required 
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 dark:text-slate-100 text-right appearance-none" 
                    value={formData.courseCode}
                    onChange={e => setFormData({ ...formData, courseCode: e.target.value, courseName: coursesMap[e.target.value]?.name || formData.courseName })}
                  >
                    <option value="" disabled>{myCourses.length === 0 ? 'יש הוסף קורסים תחילה' : 'בחר קורס...'}</option>
                    {myCourses.map(code => (
                      <option key={code} value={code}>{code} - {coursesMap[code]?.name || 'קורס מותאם'}</option>
                    ))}
                  </select>
                </div>
                
                <div className="col-span-2 sm:col-span-1"><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">סוג המטלה</label><select className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 dark:text-slate-100" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}><option value="Assignment">גיליון</option><option value="Webwork">וובוורק</option><option value="Exam">מבחן</option></select></div>
              </div>

              <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">כותרת</label><input required type="text" placeholder="לדוגמה: גיליון 1, בוחן אמצע" className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 dark:text-slate-100" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">תאריך הגשה</label><input required type="date" className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 dark:text-slate-100" value={formData.deadline} onChange={e => setFormData({...formData, deadline: e.target.value})} /></div>
                <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">שעה (רשות)</label><input type="time" className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 dark:text-slate-100" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} /></div>
              </div>
              <div className="pt-4 flex gap-3"><button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 font-medium transition-colors">ביטול</button><button type="submit" className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">שמירה</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Syllabus Modal */}
      {isCourseModalOpen && token && (
        <div className="fixed inset-0 bg-slate-900/50 dark:bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-700">
            <div className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700 px-6 py-4 flex justify-between items-center"><h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2"><Settings className="w-5 h-5 text-slate-500" /> הגדרות סילבוס</h2><button onClick={() => setIsCourseModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-2xl leading-none">&times;</button></div>
            <form onSubmit={handleSaveCourseSettings} className="p-6 space-y-4">
              <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">שם הקורס</label><input required type="text" className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 dark:text-slate-100" value={courseFormData.name} onChange={e => setCourseFormData({...courseFormData, name: e.target.value})} /></div>
              <div className="grid grid-cols-[1fr_1fr_auto] gap-3 border-t border-slate-100 dark:border-slate-700 pt-4 items-end">
                <div><label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">משקל גיליונות (%)</label><input type="number" min="0" max="100" className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 dark:text-slate-100" value={courseFormData.hw_weight} onChange={e => setCourseFormData({...courseFormData, hw_weight: parseInt(e.target.value)||0})} /></div>
                <div><label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">מספר גיליונות תקפים</label><input type="number" min="0" max="20" className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 dark:text-slate-100" value={courseFormData.hw_keep} onChange={e => setCourseFormData({...courseFormData, hw_keep: parseInt(e.target.value)||0})} /></div>
                <label className="flex items-center gap-1.5 cursor-pointer pb-2 text-xs font-medium text-slate-700 dark:text-slate-300 w-16"><input type="checkbox" checked={courseFormData.hw_magen} onChange={e => setCourseFormData({...courseFormData, hw_magen: e.target.checked})} className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500" /> מגן</label>
              </div>
              <div className="grid grid-cols-[1fr_1fr_auto] gap-3 items-end">
                <div><label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">משקל וובוורק (%)</label><input type="number" min="0" max="100" className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 dark:text-slate-100" value={courseFormData.ww_weight} onChange={e => setCourseFormData({...courseFormData, ww_weight: parseInt(e.target.value)||0})} /></div>
                <div><label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">מספר וובוורקים תקפים</label><input type="number" min="0" max="20" className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 dark:text-slate-100" value={courseFormData.ww_keep} onChange={e => setCourseFormData({...courseFormData, ww_keep: parseInt(e.target.value)||0})} /></div>
                <label className="flex items-center gap-1.5 cursor-pointer pb-2 text-xs font-medium text-slate-700 dark:text-slate-300 w-16"><input type="checkbox" checked={courseFormData.ww_magen} onChange={e => setCourseFormData({...courseFormData, ww_magen: e.target.checked})} className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500" /> מגן</label>
              </div>
              <div className="grid grid-cols-[1fr_1fr_auto] gap-3 border-t border-slate-100 dark:border-slate-700 pt-4 items-end">
                 <div><label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">משקל בוחן אמצע (%)</label><input type="number" min="0" max="100" className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 dark:text-slate-100" value={courseFormData.exam_weight} onChange={e => setCourseFormData({...courseFormData, exam_weight: parseInt(e.target.value)||0})} /></div>
                 <div></div>
                 <label className="flex items-center gap-1.5 cursor-pointer pb-2 text-xs font-medium text-slate-700 dark:text-slate-300 w-16"><input type="checkbox" checked={courseFormData.exam_magen} onChange={e => setCourseFormData({...courseFormData, exam_magen: e.target.checked})} className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500" /> מגן</label>
              </div>
              <div className="pt-4 flex gap-3"><button type="button" onClick={() => setIsCourseModalOpen(false)} className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 font-medium transition-colors">ביטול</button><button type="submit" className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">שמירה</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}