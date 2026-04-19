import React, { useState, useEffect } from 'react';
import { BookOpen, Calendar, Clock, Plus, CheckCircle2, Bell, RefreshCw, AlertCircle, Edit2, Trash2, Tag, BookType, Copy, Filter } from 'lucide-react';

// Make sure to change this to your VM's public IP address when deploying
const API_BASE_URL = 'http://129.159.139.53:8000/api'; // REPLACE WITH YOUR IP

// --- TypeScript Interfaces ---
interface Assignment {
  id: number;
  title: string;
  courseCode: string;
  type: string;
  deadline: string;
  isOptional: boolean;
}

interface CoursesMap {
  [key: string]: string;
}

interface FormData {
  title: string;
  courseCode: string;
  courseName: string;
  type: string;
  deadline: string;
  time: string;
  isOptional: boolean;
}

// --- Dynamic Color Mapping ---
const courseThemes = [
  { leftBorder: 'border-l-blue-500', hover: 'hover:border-blue-300', badgeBg: 'bg-blue-100', badgeText: 'text-blue-800', badgeBorder: 'border-blue-200', dot: 'bg-blue-500' },
  { leftBorder: 'border-l-emerald-500', hover: 'hover:border-emerald-300', badgeBg: 'bg-emerald-100', badgeText: 'text-emerald-800', badgeBorder: 'border-emerald-200', dot: 'bg-emerald-500' },
  { leftBorder: 'border-l-purple-500', hover: 'hover:border-purple-300', badgeBg: 'bg-purple-100', badgeText: 'text-purple-800', badgeBorder: 'border-purple-200', dot: 'bg-purple-500' },
  { leftBorder: 'border-l-rose-500', hover: 'hover:border-rose-300', badgeBg: 'bg-rose-100', badgeText: 'text-rose-800', badgeBorder: 'border-rose-200', dot: 'bg-rose-500' },
  { leftBorder: 'border-l-amber-500', hover: 'hover:border-amber-300', badgeBg: 'bg-amber-100', badgeText: 'text-amber-800', badgeBorder: 'border-amber-200', dot: 'bg-amber-500' },
  { leftBorder: 'border-l-cyan-500', hover: 'hover:border-cyan-300', badgeBg: 'bg-cyan-100', badgeText: 'text-cyan-800', badgeBorder: 'border-cyan-200', dot: 'bg-cyan-500' },
  { leftBorder: 'border-l-indigo-500', hover: 'hover:border-indigo-300', badgeBg: 'bg-indigo-100', badgeText: 'text-indigo-800', badgeBorder: 'border-indigo-200', dot: 'bg-indigo-500' },
  { leftBorder: 'border-l-fuchsia-500', hover: 'hover:border-fuchsia-300', badgeBg: 'bg-fuchsia-100', badgeText: 'text-fuchsia-800', badgeBorder: 'border-fuchsia-200', dot: 'bg-fuchsia-500' }
];

const getCourseTheme = (courseCode: string) => {
  let hash = 0;
  for (let i = 0; i < courseCode.length; i++) {
    hash = courseCode.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % courseThemes.length;
  return courseThemes[index];
};

export default function App() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [coursesMap, setCoursesMap] = useState<CoursesMap>({});
  const [availableCourses, setAvailableCourses] = useState<string[]>([]);
  const [myCourses, setMyCourses] = useState<string[]>([]);
  
  const [loading, setLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [syncMessage, setSyncMessage] = useState<string>('');
  
  // Filtering State
  const [activeTypeFilter, setActiveTypeFilter] = useState<string>('All');
  const assignmentTypes = ['All', 'Assignment', 'Webwork', 'Exam'];

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [currentEditId, setCurrentEditId] = useState<number | null>(null);
  
  const [formData, setFormData] = useState<FormData>({ 
    title: '', 
    courseCode: '', 
    courseName: '', 
    type: 'Assignment', 
    deadline: '', 
    time: '',
    isOptional: false
  });

  // Initial Data Load
  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    setLoading(true);
    setFetchError(null);
    
    try {
      const [coursesRes, assignmentsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/courses`),
        fetch(`${API_BASE_URL}/assignments`)
      ]);

      if (!coursesRes.ok || !assignmentsRes.ok) {
        throw new Error("Server responded with an error.");
      }

      const fetchedCoursesMap: CoursesMap = await coursesRes.json();
      const fetchedAssignments: Assignment[] = await assignmentsRes.json();
      
      setCoursesMap(fetchedCoursesMap);
      
      const codes = Array.from(new Set(fetchedAssignments.map(a => a.courseCode)));
      setAvailableCourses(codes);
      if (myCourses.length === 0) setMyCourses(codes);
      
      const sorted = fetchedAssignments.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
      setAssignments(sorted);
    } catch (error) {
      console.error("Error fetching data from API:", error);
      setFetchError(`Network Error: Could not connect to the backend at ${API_BASE_URL}. Ensure your Python server is running, CORS is configured, and the URL is correct.`);
    } finally {
      setLoading(false);
    }
  };

  const toggleCourse = (courseCode: string) => {
    setMyCourses(prev => 
      prev.includes(courseCode) ? prev.filter(c => c !== courseCode) : [...prev, courseCode]
    );
  };

  const handleCourseCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, ''); 
    val = val.replace(/^0+(?=\d)/, ''); 
    if (val.length > 7) val = val.slice(0, 7);

    const knownName = coursesMap[val] || '';
    
    setFormData({ 
      ...formData, 
      courseCode: val, 
      courseName: knownName || formData.courseName
    });
  };

  const openAddModal = () => {
    setIsEditing(false);
    setCurrentEditId(null);
    setFormData({ title: '', courseCode: '', courseName: '', type: 'Assignment', deadline: '', time: '', isOptional: false });
    setIsModalOpen(true);
  };

  const openEditModal = (assignment: Assignment) => {
    const dateObj = new Date(assignment.deadline);
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(dateObj.getDate()).padStart(2, '0');
    const hh = String(dateObj.getHours()).padStart(2, '0');
    const min = String(dateObj.getMinutes()).padStart(2, '0');

    setIsEditing(true);
    setCurrentEditId(assignment.id);
    setFormData({
      title: assignment.title,
      courseCode: assignment.courseCode,
      courseName: coursesMap[assignment.courseCode] || '',
      type: assignment.type,
      deadline: `${yyyy}-${mm}-${dd}`,
      time: `${hh}:${min}`,
      isOptional: assignment.isOptional || false
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this assignment?")) return;
    
    try {
      const res = await fetch(`${API_BASE_URL}/assignments/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error("Failed to delete");
      setAssignments(prev => prev.filter(a => a.id !== id));
    } catch (error) {
      console.error("Failed to delete assignment:", error);
      alert("Error: Could not delete the assignment. Please check your connection.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.courseCode || !formData.deadline) return;

    const dateTimeString = `${formData.deadline}T${formData.time || '23:59'}:00`;
    
    const payload = {
      title: formData.title,
      courseCode: formData.courseCode,
      courseName: formData.courseName,
      type: formData.type,
      deadline: new Date(dateTimeString).toISOString(),
      isOptional: formData.isOptional
    };

    try {
      if (isEditing && currentEditId !== null) {
        const res = await fetch(`${API_BASE_URL}/assignments/${currentEditId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error("Failed to update");
        const updated: Assignment = await res.json();
        setAssignments(prev => prev.map(a => a.id === currentEditId ? updated : a).sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime()));
      } else {
        const res = await fetch(`${API_BASE_URL}/assignments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error("Failed to create");
        const added: Assignment = await res.json();
        setAssignments(prev => [...prev, added].sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime()));
        
        if (!availableCourses.includes(payload.courseCode)) {
          setAvailableCourses(prev => [...prev, payload.courseCode]);
          setMyCourses(prev => [...prev, payload.courseCode]);
        }
      }

      if (!coursesMap[formData.courseCode]) {
        setCoursesMap(prev => ({ ...prev, [formData.courseCode]: formData.courseName }));
      }
      
      setIsModalOpen(false);
    } catch (error) {
      console.error("Failed to save assignment:", error);
      alert("Error: Could not save the assignment. Please check your connection.");
    }
  };

  const handleSync = () => {
    if (myCourses.length === 0) {
      setSyncMessage('Select at least one course to sync.');
      return;
    }
    
    setSyncing(true);
    setSyncMessage('');
    
    const baseHost = API_BASE_URL.replace('/api', ''); 
    const feedUrl = `${baseHost}/api/calendar/feed.ics?courses=${myCourses.join(',')}`;

    try {
      const textArea = document.createElement("textarea");
      textArea.value = feedUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      textArea.remove();

      setSyncMessage('✅ Link copied! Add it "From URL" in your calendar app.');
    } catch (error) {
      setSyncMessage('❌ Failed to copy link.');
      console.error("Clipboard copy failed:", error);
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMessage(''), 6000);
    }
  };

  const filteredAssignments = assignments.filter(a => {
    const isCourseSelected = myCourses.includes(a.courseCode);
    const isTypeSelected = activeTypeFilter === 'All' || a.type === activeTypeFilter;
    return isCourseSelected && isTypeSelected;
  });

  const formatDateTime = (isoString: string) => {
    const date = new Date(isoString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    if (date.toDateString() === today.toDateString()) dateStr = 'Today';
    else if (date.toDateString() === tomorrow.toDateString()) dateStr = 'Tomorrow';

    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    return `${dateStr} at ${timeStr}`;
  };

  // Card Urgency overrides Course Theme ONLY if overdue/urgent
  const getCardClasses = (deadline: string, theme: any) => {
    const hoursLeft = (new Date(deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60);
    if (hoursLeft < 0) return 'border-l-red-500 border-y-red-200 border-r-red-200 bg-red-50'; // Overdue
    if (hoursLeft < 48) return 'border-l-orange-500 border-y-orange-200 border-r-orange-200 bg-orange-50'; // Urgent
    return `${theme.leftBorder} border-y-slate-200 border-r-slate-200 bg-white ${theme.hover}`; // Normal
  };

  // Keep specific types standardized regardless of course
  const getTypeBadgeStyles = (type: string) => {
    switch(type) {
      case 'Exam': return 'bg-slate-800 text-white border-slate-900';
      case 'Webwork': return 'bg-slate-100 text-slate-700 border-slate-300';
      default: return 'bg-white text-slate-600 border-slate-200 shadow-sm';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-12">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between">
          <div className="flex items-center gap-3 mb-4 sm:mb-0">
            <div className="bg-slate-900 p-2 rounded-lg">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Co-op Board</h1>
              <p className="text-sm text-slate-500">Shared Assignment Deadlines</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={openAddModal}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" /> Add Task
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 flex flex-col md:flex-row gap-8">
        
        {/* Sidebar: Course Selection & Sync */}
        <aside className="w-full md:w-72 flex flex-col gap-6 shrink-0">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-slate-700" /> My Courses
            </h2>
            <div className="space-y-2 mb-6 max-h-64 overflow-y-auto pr-2">
              {availableCourses.map(code => {
                const theme = getCourseTheme(code);
                return (
                  <label key={code} className="flex items-start gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors group">
                    <input 
                      type="checkbox" 
                      checked={myCourses.includes(code)}
                      onChange={() => toggleCourse(code)}
                      className="w-4 h-4 mt-1 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex flex-col flex-1">
                      <div className="flex items-center gap-2">
                        {/* Dynamic Course Color Dot */}
                        <div className={`w-2 h-2 rounded-full ${theme.dot}`}></div>
                        <span className="text-sm font-bold text-slate-700 line-clamp-1">
                          {coursesMap[code] || 'Unknown Course'}
                        </span>
                      </div>
                      <span className="text-xs text-slate-500 group-hover:text-slate-600 ml-4">
                        {code}
                      </span>
                    </div>
                  </label>
                );
              })}
              {availableCourses.length === 0 && !fetchError && (
                <p className="text-sm text-slate-500 italic">No courses added yet.</p>
              )}
            </div>

            <hr className="border-slate-100 mb-6" />

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Bell className="w-4 h-4 text-orange-500" /> Calendar Sync
              </h3>
              <p className="text-xs text-slate-500">Subscribe to a live feed of your selected courses in your Calendar app.</p>
              <button 
                onClick={handleSync}
                disabled={syncing || myCourses.length === 0 || !!fetchError}
                className="w-full flex justify-center items-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {syncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
                {syncing ? 'Generating...' : 'Copy Calendar Feed URL'}
              </button>
              {syncMessage && (
                <p className={`text-xs text-center mt-2 font-medium ${syncMessage.includes('✅') ? 'text-emerald-600' : 'text-red-500'}`}>
                  {syncMessage}
                </p>
              )}
            </div>
          </div>
        </aside>

        {/* Main Content: Assignments Board */}
        <div className="flex-1">
          
          {/* Type Filters */}
          <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
            <div className="flex items-center gap-2 mr-2 text-slate-500">
              <Filter className="w-4 h-4" />
              <span className="text-sm font-semibold">Filter:</span>
            </div>
            {assignmentTypes.map(type => (
              <button
                key={type}
                onClick={() => setActiveTypeFilter(type)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                  activeTypeFilter === type 
                    ? 'bg-slate-800 text-white shadow-sm' 
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          {loading ? (
             <div className="flex justify-center items-center h-40">
               <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
             </div>
          ) : fetchError ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-red-900 mb-1">Connection Error</h3>
              <p className="text-red-700 text-sm max-w-md mx-auto">{fetchError}</p>
            </div>
          ) : filteredAssignments.length === 0 ? (
            <div className="bg-white border border-slate-200 border-dashed rounded-xl p-12 text-center">
              <CheckCircle2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-1">No tasks found!</h3>
              <p className="text-slate-500 text-sm">
                {activeTypeFilter !== 'All' 
                  ? `No upcoming ${activeTypeFilter.toLowerCase()}s for the selected courses.`
                  : "You're all caught up for the selected courses, or no tasks have been added."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredAssignments.map((assignment) => {
                const theme = getCourseTheme(assignment.courseCode);
                return (
                  <div 
                    key={assignment.id} 
                    className={`relative p-5 rounded-xl border-l-4 shadow-sm transition-all group ${getCardClasses(assignment.deadline, theme)}`}
                  >
                    {/* Actions (Edit/Delete) overlay */}
                    <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => openEditModal(assignment)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(assignment.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mb-3 pr-16">
                      {/* Dynamic Course Badge */}
                      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-bold rounded-md border ${theme.badgeBg} ${theme.badgeText} ${theme.badgeBorder}`}>
                        <BookType className="w-3 h-3" />
                        {assignment.courseCode}
                      </span>
                      
                      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-md border ${getTypeBadgeStyles(assignment.type)}`}>
                        <Tag className="w-3 h-3" />
                        {assignment.type}
                      </span>
                      
                      {assignment.isOptional && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-50 text-slate-500 text-xs font-semibold rounded-md border border-slate-200">
                          Optional
                        </span>
                      )}
                      
                      {(new Date(assignment.deadline).getTime() - new Date().getTime()) < 86400000 * 2 && (new Date(assignment.deadline).getTime() > new Date().getTime()) && (
                         <span className="flex items-center gap-1 text-xs font-bold text-orange-600 bg-orange-100 px-2 py-1 rounded-md">
                           <AlertCircle className="w-3 h-3" /> Due Soon
                         </span>
                      )}
                    </div>
                    
                    <h3 className="text-lg font-bold text-slate-900 mb-1 leading-tight">{assignment.title}</h3>
                    <p className="text-xs text-slate-500 mb-4">{coursesMap[assignment.courseCode]}</p>
                    
                    <div className="flex items-center gap-2 text-sm text-slate-700 font-medium">
                      <Clock className="w-4.5 h-4.5 text-slate-400" />
                      <span>{formatDateTime(assignment.deadline)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-800">
                {isEditing ? 'Edit Assignment' : 'Add New Assignment'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">&times;</button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Course Code</label>
                  <input 
                    required
                    type="text" 
                    placeholder="Max 7 digits"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-slate-800"
                    value={formData.courseCode}
                    onChange={handleCourseCodeChange}
                  />
                </div>
                
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                  <select
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-slate-800 bg-white"
                    value={formData.type}
                    onChange={e => setFormData({...formData, type: e.target.value})}
                  >
                    <option value="Assignment">Assignment</option>
                    <option value="Webwork">Webwork</option>
                    <option value="Exam">Exam</option>
                  </select>
                </div>
              </div>

              {formData.courseCode.length > 0 && (
                <div className="animate-in slide-in-from-top-2 duration-300">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Course Name {coursesMap[formData.courseCode] ? '(Auto-filled)' : '(New Course)'}
                  </label>
                  <input 
                    required
                    type="text" 
                    placeholder="e.g. Intro to Computer Science"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${
                      coursesMap[formData.courseCode] 
                        ? 'bg-slate-50 border-slate-200 text-slate-500' 
                        : 'bg-white border-blue-300 text-slate-800'
                    }`}
                    value={formData.courseName}
                    readOnly={!!coursesMap[formData.courseCode]}
                    onChange={e => setFormData({...formData, courseName: e.target.value})}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                <input 
                  required
                  type="text" 
                  placeholder="e.g. Midterm Essay"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-slate-800"
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
                  <input 
                    required
                    type="date" 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-slate-800"
                    value={formData.deadline}
                    onChange={e => setFormData({...formData, deadline: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Time (Optional)</label>
                  <input 
                    type="time" 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-slate-800"
                    value={formData.time}
                    onChange={e => setFormData({...formData, time: e.target.value})}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 mt-2">
                <input 
                  type="checkbox" 
                  id="isOptional"
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  checked={formData.isOptional}
                  onChange={e => setFormData({...formData, isOptional: e.target.checked})}
                />
                <label htmlFor="isOptional" className="text-sm font-medium text-slate-700 cursor-pointer">
                  This deadline is optional
                </label>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
                >
                  {isEditing ? 'Save Changes' : 'Post to Board'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}