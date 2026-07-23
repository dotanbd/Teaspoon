import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BookOpen, CheckCircle, RefreshCw, Edit, Trash, Search, X, Check,
  AlertCircle, Ban, ArrowLeft, Users, ListChecks, Sparkles, GitMerge,
  ChevronDown, Plus, Star, Zap, Wrench, Shield, AlertTriangle
} from 'lucide-react';

export const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'myteaspoon.tech') return 'https://api.myteaspoon.tech/api/v2';
    if (window.location.hostname === 'dev.myteaspoon.tech') return 'https://api-dev.myteaspoon.tech/api/v2';
  }
  return 'http://localhost:8001/api/v2';
};

export const API_BASE_URL = getApiBaseUrl();

export interface AdminUser { id: number; name: string; email: string; role: string; picture: string; }
export interface AuditLog { id: number; user_name: string; user_email: string; action: string; entity_type: string; entity_id: string; old_data: string; new_data: string; status: string; created_at: string; }
interface CourseSyllabus { name: string; hw_weight: number; hw_keep: number; hw_magen: boolean; ww_weight: number; ww_keep: number; ww_magen: boolean; lab_report_weight: number; lab_report_keep: number; lab_report_magen: boolean; exam_weight: number; exam_magen: boolean; }
export interface CoursesMap { [key: string]: CourseSyllabus; }

export const formatLogDate = (val: any) => {
  if (!val) return 'ריק';
  try {
    return new Intl.DateTimeFormat('he-IL', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    }).format(new Date(val));
  } catch {
    return String(val);
  }
};

export const translateField = (key: string) => {
  const dictionary: Record<string, string> = {
    title: 'כותרת', description: 'תיאור', type: 'סוג מטלה', deadline: 'תאריך הגשה',
    recommended_deadline: 'תאריך מומלץ)', course_code: 'קוד קורס', is_active: 'סטטוס',
    color: 'צבע', name: 'שם הקורס'
  };
  return dictionary[key] || key;
};

export const isDateField = (key: string) => key.toLowerCase().includes('date') || key.toLowerCase().includes('deadline');

const CHANGELOG_ICONS: Record<string, React.ElementType> = { Star, Zap, Sparkles, Wrench, Shield };
const DynamicChangelogIcon = ({ name, className }: { name: string, className?: string }) => {
  const Icon = CHANGELOG_ICONS[name] || Star;
  return <Icon className={className} />;
};
const AdminDashboard = ({
  token,
  logs,
  setLogs,
  coursesMap,
  userProfile
}: {
  token: string,
  logs: AuditLog[],
  setLogs: React.Dispatch<React.SetStateAction<AuditLog[]>>,
  coursesMap: CoursesMap,
  userProfile: any
}) => {
  const [activeTab, setActiveTab] = useState<'users' | 'logs' | 'changelogs' | 'merges'>('users');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Changelog State
  const [appReleases, setAppReleases] = useState<any[]>([]);
  const [editingChangelog, setEditingChangelog] = useState<any | null>(null);
  const currentAppVersion = appReleases.length > 0 ? Math.max(...appReleases.map(r => r.version)) : 0;

  // Advance Semester Modal State
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const [advancePayload, setAdvancePayload] = useState({
    new_semester_code: '',
    new_semester_name: '',
    term: 'WINTER',
    year: new Date().getFullYear()
  });

  // User search state
  const [userSearchQuery, setUserSearchQuery] = useState('');

  // Merge management states
  const [selectedMergeCourse, setSelectedMergeCourse] = useState<string>('');
  const [isMergeDropdownOpen, setIsMergeDropdownOpen] = useState(false);
  const [mergeCandidates, setMergeCandidates] = useState<Record<string, any[]>>({});
  const [mergeSelection, setMergeSelection] = useState<{ targetId: number | null, sourceId: number | null }>({ targetId: null, sourceId: null });

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearchQuery.toLowerCase())
  );

  const handleRejectAndBlock = async (logId: number) => {
    if (!window.confirm("האם לדחות את השינוי ולחסום את המשתמש מלערוך בעתיד?")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/admin/logs/${logId}/reject_and_block`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setLogs(prev => prev.filter(l => l.id !== logId));
        fetchAdminData();
      } else {
        alert("שגיאה בחסימת המשתמש.");
      }
    } catch {
      alert("שגיאת תקשורת.");
    }
  };

  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string[]>([]);

  const extractcourse_code = (entityId: string) => {
    if (!entityId) return "";
    if (entityId.includes(':')) {
      const afterColon = entityId.split(':')[1];
      return afterColon.split(' - ')[0].trim();
    }
    return entityId.trim();
  };

  const pendingcourse_codes = useMemo(() => {
    const pendingLogs = logs.filter(log => log.status === 'PENDING');
    const codes = pendingLogs.map(log => extractcourse_code(log.entity_id));
    return Array.from(new Set(codes)).sort();
  }, [logs]);

  const displayedLogs = useMemo(() => {
    if (selectedCourseFilter.length === 0) return logs;
    return logs.filter(log => selectedCourseFilter.includes(extractcourse_code(log.entity_id)));
  }, [logs, selectedCourseFilter]);

  const toggleCourseFilter = (code: string) => {
    setSelectedCourseFilter(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  const fetchAdminData = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === 'users') {
        const res = await fetch(`${API_BASE_URL}/admin/users`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) setUsers(await res.json());
      } else if (activeTab === 'logs') {
        const res = await fetch(`${API_BASE_URL}/admin/logs`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) setLogs(await res.json());
      } else if (activeTab === 'changelogs') {
        const res = await fetch(`${API_BASE_URL}/changelogs`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) setAppReleases(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [activeTab, token, setLogs]);

  const fetchMergeData = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/admin/assignments/merge-candidates`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setMergeCandidates(data);

      // If the currently selected course no longer has duplicates after merging, clear the selection
      if (selectedMergeCourse && !data[selectedMergeCourse]) {
        setSelectedMergeCourse('');
      }
    } catch (err) {
      console.error("Failed to fetch merge candidates:", err);
    }
  };

  // 2. The useEffect now just calls our reusable function when the tab opens
  useEffect(() => {
    if (activeTab === 'merges') {
      fetchMergeData();
    }
  }, [activeTab, token]);

  useEffect(() => { fetchAdminData(); }, [fetchAdminData]);

  // Dedicated fetch just for the Merges tab
  useEffect(() => {
    if (activeTab === 'merges' && token) {
      console.log("Merges tab opened! Fetching candidates...");

      fetch(`${API_BASE_URL}/admin/assignments/merge-candidates`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          console.log("DEBUG - Received Merge Data from backend:", data);
          setMergeCandidates(data);
        })
        .catch(err => console.error("Failed to fetch merge candidates:", err));
    }
  }, [activeTab, token]);

  const handleRoleChange = async (userId: number, newRole: string) => {
    if (!window.confirm(`האם אתה בטוח שברצונך לשנות את ההרשאה ל-${newRole}?`)) return;
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    try {
      await fetch(`${API_BASE_URL}/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ role: newRole })
      });
    } catch {
      fetchAdminData();
    }
  };

  const handleApproveLog = async (logId: number) => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/logs/${logId}/approve`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setLogs(prev => prev.filter(l => l.id !== logId));
      } else {
        alert("שגיאה באישור הפעולה.");
      }
    } catch {
      alert("שגיאת תקשורת.");
    }
  };

  const handleRevertLog = async (logId: number) => {
    if (!window.confirm("האם לדחות את השינוי ולשחזר את המידע המקורי? הפעולה לא ניתנת לביטול.")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/admin/logs/${logId}/revert`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setLogs(prev => prev.filter(l => l.id !== logId));
      } else {
        alert("שגיאה בשחזור הפעולה.");
      }
    } catch {
      alert("שגיאת תקשורת.");
    }
  };

  const handleAdvanceSemester = async (e: React.FormEvent) => {
    e.preventDefault();

    const isConfirmed = window.confirm(
      `האם אתה בטוח שברצונך להתקדם לסמסטר ${advancePayload.new_semester_name}?\n\nפעולה זו תמחק לצמיתות את הסמסטר הישן ביותר ואת כל הקבצים המצורפים שלו. פעולה זו בלתי הפיכה!`
    );

    if (!isConfirmed) return;

    try {
      const res = await fetch(`${API_BASE_URL}/admin/semesters/advance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(advancePayload)
      });

      if (res.ok) {
        alert("הסמסטר קודם בהצלחה! העמוד יתרענן כעת.");
        setIsAdvanceModalOpen(false);
        window.location.reload(); // Refresh to pull the new semester data from scratch
      } else {
        alert("שגיאה בקידום הסמסטר.");
      }
    } catch (err) {
      alert("שגיאת תקשורת מול השרת.");
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col h-[calc(100vh-10rem)]">

      {/* --- TABS NAVIGATION --- */}
      <div className="flex overflow-x-auto standard-scrollbar border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 shrink-0 px-4 pt-4 gap-4">
        <button onClick={() => setActiveTab('users')} className={`flex items-center gap-2 pb-3 px-2 font-bold transition-colors border-b-2 whitespace-nowrap ${activeTab === 'users' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
          <Users className="w-4 h-4" /> ניהול משתמשים
        </button>
        <button onClick={() => setActiveTab('logs')} className={`flex items-center gap-2 pb-3 px-2 font-bold transition-colors border-b-2 whitespace-nowrap ${activeTab === 'logs' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
          <ListChecks className="w-4 h-4" /> אישורים ממתינים {logs.length > 0 && `(${logs.length})`}
        </button>
        <button onClick={() => setActiveTab('merges')} className={`flex items-center gap-2 pb-3 px-2 font-bold transition-colors border-b-2 whitespace-nowrap ${activeTab === 'merges' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
          <GitMerge className="w-4 h-4" /> מיזוג כפילויות
        </button>
        {userProfile?.role === 'owner' && (
          <button onClick={() => setActiveTab('changelogs')} className={`flex items-center gap-2 pb-3 px-2 font-bold transition-colors border-b-2 whitespace-nowrap ${activeTab === 'changelogs' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
            <Sparkles className="w-4 h-4" /> עדכוני מערכת
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {loading ? (
          <div className="flex justify-center items-center h-full"><RefreshCw className="w-8 h-8 text-blue-500 animate-spin" /></div>
        ) : activeTab === 'users' ? (
          /* ... YOUR EXISTING USERS TAB ... */
          <div className="flex flex-col gap-4">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              כמות משתמשים רשומים:
              {users && (
                <span className="ms-2 px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs font-black">
                  {users.length}
                </span>
              )}
            </h3>
            <div className="relative w-full md:w-72">
              <input
                type="text"
                placeholder="חיפוש לפי שם או אימייל..."
                value={userSearchQuery}
                onChange={e => setUserSearchQuery(e.target.value)}
                className="w-full pl-4 pr-10 py-2 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-colors dark:text-slate-100"
              />
              <Search className="w-4 h-4 absolute right-3 top-2.5 text-slate-400" />
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
              <table className="w-full text-sm text-right">
                <thead className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-900/50 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-6 py-3 font-semibold">משתמש</th>
                    <th className="px-6 py-3 font-semibold hidden md:table-cell">אימייל</th>
                    <th className="px-6 py-3 font-semibold">הרשאה נוכחית</th>
                    <th className="px-6 py-3 font-semibold">פעולות</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {filteredUsers.map(u => (
                    <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 md:px-6 py-4 flex items-center gap-3">
                        <img src={u.picture} alt="" className="w-8 h-8 rounded-full bg-slate-200 shrink-0" referrerPolicy="no-referrer" />
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-900 dark:text-slate-100 line-clamp-1">{u.name}</span>
                          <span className="text-xs text-slate-400 md:hidden block mt-0.5 line-clamp-1" dir="ltr">{u.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400 hidden md:table-cell" dir="ltr">{u.email}</td>
                      <td className="px-4 md:px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-bold ${u.role === 'owner' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                          u.role === 'admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                            u.role === 'restricted' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                              'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}>
                          {u.role === 'owner' ? 'בעלים' : u.role === 'admin' ? 'מנהל' : u.role === 'restricted' ? 'מוגבל' : 'משתמש רגיל'}
                        </span>
                      </td>
                      <td className="px-4 md:px-6 py-4">
                        <select
                          value={u.role}
                          disabled={u.role === 'owner'}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          className={`bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-2 md:px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 dark:text-slate-200 ${u.role === 'owner' ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <option value="user">משתמש רגיל</option>
                          <option value="restricted">מוגבל (קריאה בלבד)</option>
                          <option value="admin">מנהל</option>
                          {u.role === 'owner' && <option value="owner">בעלים</option>}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : activeTab === 'logs' ? (
          /* ... YOUR EXISTING LOGS TAB ... */
          <div className="space-y-4">
            {logs.length === 0 && (
              <div className="text-center py-16 flex flex-col items-center">
                <CheckCircle className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-4" />
                <h3 className="text-lg font-bold text-slate-500 dark:text-slate-400">אין שינויים הממתינים לאישור</h3>
                <p className="text-sm text-slate-400 mt-1">כל העריכות טופלו!</p>
              </div>
            )}

            {pendingcourse_codes.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 mb-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">

                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 mr-2">
                  ממתין לאישור:
                </span>
                <button
                  onClick={() => setSelectedCourseFilter([])}
                  className={`px-3 py-1.5 text-xs font-bold rounded-full transition-all duration-200 ${selectedCourseFilter.length === 0
                    ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                >
                  הכל
                </button>
                {pendingcourse_codes.map(code => (
                  <button
                    key={code}
                    onClick={() => toggleCourseFilter(code)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-full transition-all duration-200 flex items-center gap-1 ${selectedCourseFilter.includes(code)
                      ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20'
                      : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50'
                      }`}
                  >
                    <span className="line-clamp-1 text-right">
                      {code} {coursesMap[code]?.name ? `- ${coursesMap[code].name}` : ''}
                    </span>
                  </button>
                ))}
              </div>
            )}
            <div className="space-y-4">
              {displayedLogs.map(log => {
                let parsedOld: Record<string, any> | null = null;
                let parsedNew: Record<string, any> | null = null;

                try { parsedOld = log.old_data ? JSON.parse(log.old_data) : null; } catch { parsedOld = null; }
                try { parsedNew = log.new_data ? JSON.parse(log.new_data) : null; } catch { parsedNew = null; }

                const course_code = extractcourse_code(log.entity_id);
                const itemTitle = parsedNew?.title || parsedOld?.title || '';

                return (
                  <div key={log.id} className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 md:p-5 bg-white dark:bg-slate-800/50 shadow-sm flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">

                      <div className="flex flex-wrap items-center gap-2 mb-4">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${log.action === 'CREATE' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' :
                          log.action === 'DELETE' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' :
                            'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                          }`}>
                          {log.action}
                        </span>

                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300 tracking-wider truncate max-w-[250px] sm:max-w-sm border border-indigo-200 dark:border-indigo-800/50">
                          {course_code} - {coursesMap[course_code]?.name || 'קורס לא מזוהה'}
                        </span>

                        {log.entity_type === 'SUMMARY' && log.action === 'CREATE' && (
                          <a
                            href={`${API_BASE_URL}/admin/summaries/${log.entity_id.split(':')[0]}/preview?token=${token}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2.5 py-0.5 rounded-md hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors border border-emerald-200 dark:border-emerald-800"
                          >
                            <BookOpen className="w-3.5 h-3.5" /> צפה בקובץ
                          </a>
                        )}

                        <span className="text-xs text-slate-400 mr-auto" dir="ltr">{new Date(log.created_at).toLocaleString('he-IL')}</span>
                      </div>

                      <div className="mb-4 border-b border-slate-100 dark:border-slate-700/50 pb-4">
                        {log.entity_type !== 'COURSE' && (
                          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white mb-1.5">
                            {itemTitle || `${log.entity_type === 'ASSIGNMENT' ? 'מטלה' : 'סיכום'} #${log.entity_id.split(':').pop()}`}
                          </h2>
                        )}
                        <div className="text-sm text-slate-600 dark:text-slate-300">
                          בוצע ע"י: <span className="font-bold">{log.user_name}</span> <span className="text-xs opacity-70" dir="ltr">({log.user_email})</span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-3 overflow-hidden">
                        {log.action === 'UPDATE' && (
                          <div className="flex flex-col gap-2 w-full">
                            <div className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">שינויים שבוצעו:</div>
                            {(parsedNew ? Object.keys(parsedNew) : []).map(key => {
                              const oldV = parsedOld?.[key];
                              const newV = parsedNew?.[key];

                              if (JSON.stringify(oldV) === JSON.stringify(newV)) return null;

                              const isRecDeadline = key === 'recommended_deadline';
                              const displayOld = isDateField(key) && oldV ? formatLogDate(oldV) : (oldV ?? 'ריק');
                              const displayNew = isDateField(key) && newV ? formatLogDate(newV) : (newV ?? 'ריק');

                              return (
                                <div key={key} className={`flex flex-col sm:flex-row sm:items-center gap-2 p-2.5 rounded-lg border text-sm ${isRecDeadline
                                  ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800/50 shadow-sm'
                                  : 'bg-slate-50 border-slate-100 dark:bg-slate-800/40 dark:border-slate-700/50'
                                  }`}>
                                  <span className={`font-semibold min-w-[130px] ${isRecDeadline ? 'text-amber-800 dark:text-amber-400' : 'text-slate-700 dark:text-slate-300'}`}>
                                    {translateField(key)}:
                                  </span>
                                  <div className="flex items-center gap-2 flex-wrap flex-1">
                                    {oldV !== undefined && (
                                      <>
                                        <span className="text-red-500 dark:text-red-400 line-through opacity-80">{displayOld}</span>
                                        <ArrowLeft className="w-3.5 h-3.5 text-slate-400" />
                                      </>
                                    )}
                                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">{displayNew}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {log.action === 'CREATE' && (
                          <div className="flex-1 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 p-3 rounded-lg text-xs">
                            <div className="font-bold text-blue-700 dark:text-blue-400 mb-2">נתוני הפריט החדש:</div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-slate-800 dark:text-slate-200 font-medium">
                              {parsedNew && Object.entries(parsedNew).map(([key, val]) => {
                                if (!val || key === 'id' || key === 'course_id' || key === 'course_code') return null;
                                return (
                                  <div key={key} className="truncate">
                                    <span className="text-slate-500 dark:text-slate-400">{key}:</span> {String(val)}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {log.action === 'DELETE' && (
                          <div className="flex-1 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 p-3 rounded-lg text-xs">
                            <div className="font-bold text-red-700 dark:text-red-400 mb-2 flex items-center gap-1.5">
                              <AlertCircle className="w-3.5 h-3.5" /> בקשת מחיקה לפריט עם הנתונים הבאים:
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-slate-600 dark:text-slate-400 font-medium line-through opacity-80">
                              {parsedOld && Object.entries(parsedOld).map(([key, val]) => {
                                if (!val || key === 'id' || key === 'course_id' || key === 'course_code') return null;
                                return (
                                  <div key={key} className="truncate">
                                    <span className="opacity-70">{key}:</span> {String(val)}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 flex flex-col gap-2 border-t lg:border-t-0 lg:border-r border-slate-100 dark:border-slate-700 pt-4 lg:pt-0 lg:pr-4 min-w-[140px]">
                      <button onClick={() => handleApproveLog(log.id)} className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded-lg text-sm font-bold transition-colors shadow-sm">
                        <Check className="w-4 h-4" /> אישור
                      </button>
                      <button onClick={() => handleRevertLog(log.id)} className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 hover:text-slate-900 dark:hover:text-white rounded-lg text-sm font-medium transition-colors text-slate-700 dark:text-slate-200">
                        <X className="w-4 h-4" /> דחייה
                      </button>
                      <button onClick={() => handleRejectAndBlock(log.id)} className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 border border-red-200 dark:border-red-900/50 rounded-lg text-xs font-bold transition-colors mt-1">
                        <Ban className="w-3.5 h-3.5" /> דחה וחסום
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : activeTab === 'merges' ? (
          <div className="space-y-6">
            <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-200 dark:border-blue-800/50">
              <h3 className="text-lg font-bold text-blue-800 dark:text-blue-300 flex items-center gap-2 mb-1">
                <GitMerge className="w-5 h-5" /> מיזוג מטלות ידני
              </h3>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                בחר קורס כדי להציג את כל המטלות שלו. בחר מטלת יעד (ידנית) ומטלת מקור (מודל) כדי למזג ביניהן.
                פעולה זו תעתיק את הדדליין והמזהה של מודל למטלה הידנית, ותמחק את המטלה האוטומטית הכפולה.
              </p>
            </div>

            {/* Course Selector Dropdown (Custom React Component) */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <label className="block text-sm font-bold mb-3 text-slate-700 dark:text-slate-300">
                בחר קורס לעריכה:
              </label>

              {/* Custom Dropdown Container */}
              <div className="relative">

                {/* The "Trigger" Button (Replaces the <select> box) */}
                <button
                  type="button"
                  onClick={() => setIsMergeDropdownOpen(!isMergeDropdownOpen)}
                  className="w-full px-4 py-3 flex items-center justify-between border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-900 dark:text-white font-medium"
                >
                  {/* Selected Value Text */}
                  <span className="truncate">
                    {selectedMergeCourse
                      ? `${selectedMergeCourse} ${coursesMap[selectedMergeCourse]?.name ? `- ${coursesMap[selectedMergeCourse].name}` : ''}`
                      : '-- בחר קורס מהרשימה --'}
                  </span>

                  {/* Arrow Icon */}
                  <ChevronDown className={`w-5 h-5 text-slate-500 transition-transform duration-200 ${isMergeDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* The Dropdown Menu (Replaces the <option> tags) */}
                {isMergeDropdownOpen && (
                  <div className="absolute z-50 w-full mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
                    <ul className="py-1 text-right">
                      {Object.keys(mergeCandidates).map(code => (
                        <li key={code}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedMergeCourse(code);
                              setMergeSelection({ targetId: null, sourceId: null });
                              setIsMergeDropdownOpen(false); // Close menu on select
                            }}
                            className={`w-full text-right px-4 py-3 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors border-b border-slate-100 dark:border-slate-700/50 last:border-0 ${selectedMergeCourse === code
                              ? 'bg-blue-50/50 dark:bg-slate-700/50 text-blue-700 dark:text-blue-400 font-bold'
                              : 'text-slate-700 dark:text-slate-300'
                              }`}
                          >
                            {code} {coursesMap[code]?.name ? `- ${coursesMap[code].name}` : ''}
                          </button>
                        </li>
                      ))}

                      {/* Fallback if no courses exist */}
                      {Object.keys(mergeCandidates).length === 0 && (
                        <li className="px-4 py-3 text-slate-500 dark:text-slate-400 text-sm text-center">
                          אין קורסים זמינים למיזוג
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* The Two Columns (Renders only when a course is selected) */}
            {selectedMergeCourse && mergeCandidates[selectedMergeCourse] && (
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm animate-in fade-in duration-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                  {/* TARGET: Manual Assignments */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                      <div className="text-sm font-bold text-slate-700 dark:text-slate-300">
                        מטלות ידניות (יעד)
                      </div>
                    </div>
                    <div className="space-y-2">
                      {mergeCandidates[selectedMergeCourse].filter(a => !a.has_moodle_uid).length === 0 && (
                        <div className="text-xs text-slate-400 p-2">אין מטלות ידניות בקורס זה.</div>
                      )}
                      {mergeCandidates[selectedMergeCourse].filter(a => !a.has_moodle_uid).map(item => (
                        <button
                          key={item.id}
                          onClick={() => setMergeSelection(prev => ({ ...prev, targetId: item.id }))}
                          className={`w-full text-right p-3 rounded-lg border text-sm transition-all ${mergeSelection.targetId === item.id
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 ring-1 ring-emerald-500'
                            : 'border-slate-200 dark:border-slate-700 hover:border-emerald-300'
                            }`}
                        >
                          <div className="font-bold text-slate-800 dark:text-slate-200">{item.title}</div>
                          <div className="text-xs text-slate-500 mt-1">{new Date(item.deadline).toLocaleString('he-IL')}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* SOURCE: Moodle Assignments */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                      <div className="text-sm font-bold text-slate-700 dark:text-slate-300">
                        מטלות Moodle (מקור למחיקה)
                      </div>
                    </div>
                    <div className="space-y-2">
                      {mergeCandidates[selectedMergeCourse].filter(a => a.has_moodle_uid).length === 0 && (
                        <div className="text-xs text-slate-400 p-2">אין מטלות Moodle בקורס זה.</div>
                      )}
                      {mergeCandidates[selectedMergeCourse].filter(a => a.has_moodle_uid).map(item => (
                        <button
                          key={item.id}
                          onClick={() => setMergeSelection(prev => ({ ...prev, sourceId: item.id }))}
                          className={`w-full text-right p-3 rounded-lg border text-sm transition-all ${mergeSelection.sourceId === item.id
                            ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 ring-1 ring-orange-500'
                            : 'border-slate-200 dark:border-slate-700 hover:border-orange-300'
                            }`}
                        >
                          <div className="font-bold text-slate-800 dark:text-slate-200">{item.title}</div>
                          <div className="text-xs text-slate-500 mt-1">{new Date(item.deadline).toLocaleString('he-IL')}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Execute Merge Button */}
                <div className="mt-8 pt-5 border-t border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-xs text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed">
                    * המערכת תעתיק את תאריך ההגשה והמזהה הייחודי ממטלת ה-Moodle אל המטלה הידנית שבחרת.
                  </div>
                  <button
                    disabled={!mergeSelection.targetId || !mergeSelection.sourceId}
                    onClick={async () => {
                      if (!window.confirm('בטוח? פעולה זו תעדכן את המטלה המקורית ותמחק את הכפילות לתמיד.')) return;
                      try {
                        const res = await fetch(`${API_BASE_URL}/admin/assignments/merge`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                          body: JSON.stringify({ target_id: mergeSelection.targetId, source_id: mergeSelection.sourceId })
                        });
                        if (res.ok) {
                          // Clear the specific assignment selections
                          setMergeSelection({ targetId: null, sourceId: null });
                          fetchMergeData();

                        } else {
                          alert('שגיאה במיזוג.');
                        }
                      } catch (e) {
                        console.error(e);
                      }
                    }}
                    className="w-full sm:w-auto bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-700 text-white px-8 py-2.5 rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all active:scale-95"
                  >
                    <GitMerge className="w-4 h-4" /> בצע מיזוג עכשיו
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">ניהול עדכוני מערכת (Changelogs)</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">הוסף עדכונים על גרסאות שיוצגו לכל המשתמשים.</p>
              </div>
              <button
                onClick={() => setIsAdvanceModalOpen(true)}
                className="px-4 py-2 bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400 font-bold rounded-xl text-sm hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors border border-rose-200 dark:border-rose-800/50 flex items-center gap-2"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>קידום סמסטר</span>
              </button>
              <button
                onClick={() => {
                  setEditingChangelog({ version: currentAppVersion + 1, date_str: '', title: '', features: [] });
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> גרסה חדשה
              </button>
            </div>

            {editingChangelog && (
              <div className="bg-blue-50 dark:bg-blue-900/10 p-5 rounded-xl border border-blue-200 dark:border-blue-800/50 space-y-4">
                <h4 className="font-bold text-blue-800 dark:text-blue-300">
                  {editingChangelog.id ? `עריכת גרסה ${editingChangelog.version}` : 'יצירת גרסה חדשה'}
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input type="number" placeholder="מספר גרסה (למשל: 3)" value={editingChangelog.version} onChange={e => setEditingChangelog({ ...editingChangelog, version: parseInt(e.target.value) })} className="p-2 rounded border dark:bg-slate-800 dark:border-slate-600 outline-none focus:ring-1 focus:ring-blue-500 dark:text-white" />
                  <input type="text" placeholder="תאריך (למשל: מאי 2026)" value={editingChangelog.date_str} onChange={e => setEditingChangelog({ ...editingChangelog, date_str: e.target.value })} className="p-2 rounded border dark:bg-slate-800 dark:border-slate-600 outline-none focus:ring-1 focus:ring-blue-500 dark:text-white" />
                  <input type="text" placeholder="כותרת העדכון" value={editingChangelog.title} onChange={e => setEditingChangelog({ ...editingChangelog, title: e.target.value })} className="p-2 rounded border dark:bg-slate-800 dark:border-slate-600 outline-none focus:ring-1 focus:ring-blue-500 dark:text-white" />
                </div>

                <div className="space-y-3 mt-4">
                  <div className="font-semibold text-sm dark:text-white">פסקאות / פיצ'רים:</div>
                  {editingChangelog.features.map((feat: any, idx: number) => (
                    <div key={idx} className="flex flex-col sm:flex-row gap-2 items-start bg-white dark:bg-slate-800 p-3 rounded-lg border dark:border-slate-700">

                      <select
                        value={feat.icon || 'Star'}
                        onChange={e => { const newF = [...editingChangelog.features]; newF[idx].icon = e.target.value; setEditingChangelog({ ...editingChangelog, features: newF }); }}
                        className="w-full sm:w-32 p-1.5 text-sm rounded border dark:border-slate-600 dark:bg-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-blue-500"
                        dir="ltr"
                      >
                        {Object.keys(CHANGELOG_ICONS).map(iconName => (
                          <option key={iconName} value={iconName}>{iconName}</option>
                        ))}
                      </select>

                      <input type="text" placeholder="כותרת הפיצ'ר" value={feat.title} onChange={e => { const newF = [...editingChangelog.features]; newF[idx].title = e.target.value; setEditingChangelog({ ...editingChangelog, features: newF }); }} className="w-full sm:w-1/3 p-1.5 text-sm rounded border dark:border-slate-600 dark:bg-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-blue-500" />
                      <textarea placeholder="תיאור..." value={feat.desc} onChange={e => { const newF = [...editingChangelog.features]; newF[idx].desc = e.target.value; setEditingChangelog({ ...editingChangelog, features: newF }); }} className="w-full flex-1 p-1.5 text-sm rounded border dark:border-slate-600 dark:bg-slate-900 dark:text-white sm:h-9 min-h-[60px] sm:min-h-0 outline-none focus:ring-1 focus:ring-blue-500" />

                      <button onClick={() => { const newF = editingChangelog.features.filter((_: any, i: number) => i !== idx); setEditingChangelog({ ...editingChangelog, features: newF }); }} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 p-1.5 rounded self-end sm:self-auto transition-colors"><Trash className="w-4 h-4" /></button>
                    </div>
                  ))}
                  <button onClick={() => setEditingChangelog({ ...editingChangelog, features: [...editingChangelog.features, { icon: 'Star', title: '', desc: '' }] })} className="text-sm text-blue-600 dark:text-blue-400 font-bold flex items-center gap-1"><Plus className="w-4 h-4" /> הוסף פסקה</button>
                </div>

                <div className="flex gap-2 justify-end mt-4 pt-4 border-t border-blue-200 dark:border-blue-800">
                  <button onClick={() => setEditingChangelog(null)} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-white rounded-lg text-sm font-bold transition-colors">ביטול</button>
                  <button
                    onClick={async () => {
                      const method = editingChangelog.id ? 'PUT' : 'POST';
                      const url = editingChangelog.id ? `${API_BASE_URL}/admin/changelogs/${editingChangelog.id}` : `${API_BASE_URL}/admin/changelogs`;
                      await fetch(url, {
                        method,
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify(editingChangelog)
                      });
                      setEditingChangelog(null);
                      fetchAdminData()
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold flex items-center gap-2 transition-colors shadow-sm"
                  >
                    <Check className="w-4 h-4" /> שמור גרסה
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {appReleases.map(log => (
                <div key={log.id} className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 px-2 py-0.5 rounded text-sm font-black">גרסה {log.version}</span>
                      <span className="text-slate-500 text-sm">{log.date}</span>
                    </div>
                    <h4 className="text-lg font-bold text-slate-800 dark:text-white mb-3">{log.title}</h4>
                    <div className="space-y-2">
                      {log.features.map((f: any, idx: number) => (
                        <div key={idx} className="text-sm text-slate-600 dark:text-slate-400 flex items-start gap-2">
                          <DynamicChangelogIcon name={f.icon} className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold text-slate-700 dark:text-slate-300">{f.title}: </span>
                            {f.desc}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0 mr-4">
                    <button onClick={() => setEditingChangelog(log)} className="p-2 text-slate-400 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 dark:bg-slate-700/50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"><Edit className="w-4 h-4" /></button>
                    <button onClick={async () => {
                      if (window.confirm('בטוח שברצונך למחוק גרסה זו?')) {
                        await fetch(`${API_BASE_URL}/admin/changelogs/${log.id}`, {
                          method: 'DELETE',
                          headers: { 'Authorization': `Bearer ${token}` }
                        });
                        fetchAdminData();
                      }
                    }} className="p-2 text-slate-400 hover:text-red-600 bg-slate-50 hover:bg-red-50 dark:bg-slate-700/50 dark:hover:bg-red-900/30 rounded-lg transition-colors"><Trash className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      {isAdvanceModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" dir="rtl">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700 p-8">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6">קידום סמסטר</h2>

            <form onSubmit={handleAdvanceSemester} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">קוד סמסטר (באנגלית, לדוגמה: 2026_SUMMER)</label>
                <input
                  required
                  type="text"
                  value={advancePayload.new_semester_code}
                  onChange={e => setAdvancePayload(prev => ({ ...prev, new_semester_code: e.target.value.toUpperCase() }))}
                  className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:border-rose-500 text-slate-800 dark:text-slate-100"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">שם סמסטר לתצוגה (לדוגמה: סמסטר קיץ תשפ"ו)</label>
                <input
                  required
                  type="text"
                  value={advancePayload.new_semester_name}
                  onChange={e => setAdvancePayload(prev => ({ ...prev, new_semester_name: e.target.value }))}
                  className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:border-rose-500 text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">עונה</label>
                  <select
                    value={advancePayload.term}
                    onChange={e => setAdvancePayload(prev => ({ ...prev, term: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:border-rose-500 text-slate-800 dark:text-slate-100"
                  >
                    <option value="WINTER">חורף (WINTER)</option>
                    <option value="SPRING">אביב (SPRING)</option>
                    <option value="SUMMER">קיץ (SUMMER)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">שנה קלנדרית</label>
                  <input
                    required
                    type="number"
                    value={advancePayload.year}
                    onChange={e => setAdvancePayload(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                    className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:border-rose-500 text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-6 mt-6 border-t border-slate-100 dark:border-slate-700">
                <button type="submit" className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 rounded-xl transition-colors">
                  בצע קידום
                </button>
                <button type="button" onClick={() => setIsAdvanceModalOpen(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold py-3 rounded-xl transition-colors">
                  ביטול
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};



export default AdminDashboard;
