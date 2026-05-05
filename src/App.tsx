import React, { useState, useEffect, useCallback } from 'react';
import { 
  BookOpen, Calendar, Clock, Plus, CheckCircle, RefreshCw, 
  AlertCircle, Edit, Trash, Tag, Filter, Circle, Sun, Moon, 
  LogIn, User, Search, X, Check, Paperclip, FileText, Upload, Coffee,  
  XCircle, Lightbulb, Calculator, Shield, Settings, ChevronDown, 
  Heart, Users, ShieldAlert, ArrowRight, ArrowLeft, ListChecks, Ban
} from 'lucide-react';

// --- Production API Configuration ---
const getApiBaseUrl = () => {
  if (typeof window !== 'undefined' && window.location.hostname === 'myteaspoon.tech') {
    return 'https://api.myteaspoon.tech/api/v2';
  }
  return 'http://localhost:8001/api/v2';
};

const API_BASE_URL = getApiBaseUrl();

// --- TypeScript Interfaces ---
interface Attachment { id: number; filename: string; url: string; uploader_id: number; category: string; likes?: number; isLikedByMe?: boolean; }
interface Assignment { id: number; title: string; courseCode: string; type: string; deadline: string; isOptional: boolean; isCompleted: boolean; grade: number | null; attachments: Attachment[]; }
interface UserProfile { id: number; email: string; name: string; picture: string; role: string; totalLikesReceived?: number; }
interface CourseSyllabus { name: string; hw_weight: number; hw_keep: number; hw_magen: boolean; ww_weight: number; ww_keep: number; ww_magen: boolean; exam_weight: number; exam_magen: boolean; }
interface CoursesMap { [key: string]: CourseSyllabus; }
interface AssignmentFormData { title: string; courseCode: string; courseName: string; type: string; deadline: string; time: string; isOptional: boolean; }
interface CourseTheme { startBorder: string; hover: string; badgeBg: string; badgeText: string; badgeBorder: string; dot: string; }
interface GradeSummary { earned: string; possible: string; isMagen: boolean; unconfigured: boolean; }

// Admin Interfaces
interface AdminUser { id: number; name: string; email: string; role: string; picture: string; }
interface AuditLog { id: number; user_name: string; user_email: string; action: string; entity_type: string; entity_id: string; old_data: string; new_data: string; status: string; created_at: string; }

const typeTranslations: Record<string, string> = { 'All': 'הכל', 'Assignment': 'גיליון', 'Webwork': 'וובוורק', 'Exam': 'מבחן' };

const courseThemes: CourseTheme[] = [
  { startBorder: 'border-s-blue-500', hover: 'hover:border-blue-300 dark:hover:border-blue-400', badgeBg: 'bg-blue-100 dark:bg-blue-900/30', badgeText: 'text-blue-800 dark:text-blue-300', badgeBorder: 'border-blue-200 dark:border-blue-800/50', dot: 'bg-blue-500' },
  { startBorder: 'border-s-emerald-500', hover: 'hover:border-emerald-300 dark:hover:border-emerald-400', badgeBg: 'bg-emerald-100 dark:bg-emerald-900/30', badgeText: 'text-emerald-800 dark:text-emerald-300', badgeBorder: 'border-emerald-200 dark:border-emerald-800/50', dot: 'bg-emerald-500' },
  { startBorder: 'border-s-purple-500', hover: 'hover:border-purple-300 dark:hover:border-purple-400', badgeBg: 'bg-purple-100 dark:bg-purple-900/30', badgeText: 'text-purple-800 dark:text-purple-300', badgeBorder: 'border-purple-200 dark:border-purple-800/50', dot: 'bg-purple-500' },
  { startBorder: 'border-s-rose-500', hover: 'hover:border-rose-300 dark:hover:border-rose-400', badgeBg: 'bg-rose-100 dark:bg-rose-900/30', badgeText: 'text-rose-800 dark:text-rose-300', badgeBorder: 'border-rose-200 dark:border-rose-800/50', dot: 'bg-rose-500' },
  { startBorder: 'border-s-amber-500', hover: 'hover:border-amber-300 dark:hover:border-amber-400', badgeBg: 'bg-amber-100 dark:bg-amber-900/30', badgeText: 'text-amber-800 dark:text-amber-300', badgeBorder: 'border-amber-200 dark:border-amber-800/50', dot: 'bg-amber-500' },
  { startBorder: 'border-s-indigo-500', hover: 'hover:border-indigo-300 dark:hover:border-indigo-400', badgeBg: 'bg-indigo-100 dark:bg-indigo-900/30', badgeText: 'text-indigo-800 dark:text-indigo-300', badgeBorder: 'border-indigo-200 dark:border-indigo-800/50', dot: 'bg-indigo-500' },
  { startBorder: 'border-s-cyan-500', hover: 'hover:border-cyan-300 dark:hover:border-cyan-400', badgeBg: 'bg-cyan-100 dark:bg-cyan-900/30', badgeText: 'text-cyan-800 dark:text-cyan-300', badgeBorder: 'border-cyan-200 dark:border-cyan-800/50', dot: 'bg-cyan-500' },
  { startBorder: 'border-s-teal-500', hover: 'hover:border-teal-300 dark:hover:border-teal-400', badgeBg: 'bg-teal-100 dark:bg-teal-900/30', badgeText: 'text-teal-800 dark:text-teal-300', badgeBorder: 'border-teal-200 dark:border-teal-800/50', dot: 'bg-teal-500' },
  { startBorder: 'border-s-lime-500', hover: 'hover:border-lime-300 dark:hover:border-lime-400', badgeBg: 'bg-lime-100 dark:bg-lime-900/30', badgeText: 'text-lime-800 dark:text-lime-300', badgeBorder: 'border-lime-200 dark:border-lime-800/50', dot: 'bg-lime-500' },
  { startBorder: 'border-s-green-500', hover: 'hover:border-green-300 dark:hover:border-green-400', badgeBg: 'bg-green-100 dark:bg-green-900/30', badgeText: 'text-green-800 dark:text-green-300', badgeBorder: 'border-green-200 dark:border-green-800/50', dot: 'bg-green-500' },
  { startBorder: 'border-s-sky-500', hover: 'hover:border-sky-300 dark:hover:border-sky-400', badgeBg: 'bg-sky-100 dark:bg-sky-900/30', badgeText: 'text-sky-800 dark:text-sky-300', badgeBorder: 'border-sky-200 dark:border-sky-800/50', dot: 'bg-sky-500' },
  { startBorder: 'border-s-violet-500', hover: 'hover:border-violet-300 dark:hover:border-violet-400', badgeBg: 'bg-violet-100 dark:bg-violet-900/30', badgeText: 'text-violet-800 dark:text-violet-300', badgeBorder: 'border-violet-200 dark:border-violet-800/50', dot: 'bg-violet-500' },
  { startBorder: 'border-s-fuchsia-500', hover: 'hover:border-fuchsia-300 dark:hover:border-fuchsia-400', badgeBg: 'bg-fuchsia-100 dark:bg-fuchsia-900/30', badgeText: 'text-fuchsia-800 dark:text-fuchsia-300', badgeBorder: 'border-fuchsia-200 dark:border-fuchsia-800/50', dot: 'bg-fuchsia-500' },
  { startBorder: 'border-s-pink-500', hover: 'hover:border-pink-300 dark:hover:border-pink-400', badgeBg: 'bg-pink-100 dark:bg-pink-900/30', badgeText: 'text-pink-800 dark:text-pink-300', badgeBorder: 'border-pink-200 dark:border-pink-800/50', dot: 'bg-pink-500' },
  { startBorder: 'border-s-orange-500', hover: 'hover:border-orange-300 dark:hover:border-orange-400', badgeBg: 'bg-orange-100 dark:bg-orange-900/30', badgeText: 'text-orange-800 dark:text-orange-300', badgeBorder: 'border-orange-200 dark:border-orange-800/50', dot: 'bg-orange-500' },
  { startBorder: 'border-s-red-500', hover: 'hover:border-red-300 dark:hover:border-red-400', badgeBg: 'bg-red-100 dark:bg-red-900/30', badgeText: 'text-red-800 dark:text-red-300', badgeBorder: 'border-red-200 dark:border-red-800/50', dot: 'bg-red-500' },
  { startBorder: 'border-s-yellow-500', hover: 'hover:border-yellow-300 dark:hover:border-yellow-400', badgeBg: 'bg-yellow-100 dark:bg-yellow-900/30', badgeText: 'text-yellow-800 dark:text-yellow-300', badgeBorder: 'border-yellow-200 dark:border-yellow-800/50', dot: 'bg-yellow-500' },
  { startBorder: 'border-s-slate-600', hover: 'hover:border-slate-400 dark:hover:border-slate-500', badgeBg: 'bg-slate-200 dark:bg-slate-800/30', badgeText: 'text-slate-800 dark:text-slate-200', badgeBorder: 'border-slate-300 dark:border-slate-700/50', dot: 'bg-slate-600' },
  { startBorder: 'border-s-stone-500', hover: 'hover:border-stone-300 dark:hover:border-stone-400', badgeBg: 'bg-stone-100 dark:bg-stone-900/30', badgeText: 'text-stone-800 dark:text-stone-300', badgeBorder: 'border-stone-200 dark:border-stone-800/50', dot: 'bg-stone-500' },
  { startBorder: 'border-s-orange-600', hover: 'hover:border-orange-400 dark:hover:border-orange-500', badgeBg: 'bg-orange-100 dark:bg-orange-900/40', badgeText: 'text-orange-900 dark:text-orange-200', badgeBorder: 'border-orange-300 dark:border-orange-800/50', dot: 'bg-orange-600' },
  { startBorder: 'border-s-blue-600', hover: 'hover:border-blue-400 dark:hover:border-blue-500', badgeBg: 'bg-blue-100 dark:bg-blue-900/40', badgeText: 'text-blue-900 dark:text-blue-200', badgeBorder: 'border-blue-300 dark:border-blue-800/50', dot: 'bg-blue-600' },
  { startBorder: 'border-s-emerald-600', hover: 'hover:border-emerald-400 dark:hover:border-emerald-500', badgeBg: 'bg-emerald-100 dark:bg-emerald-900/40', badgeText: 'text-emerald-900 dark:text-emerald-200', badgeBorder: 'border-emerald-300 dark:border-emerald-800/50', dot: 'bg-emerald-600' },
  { startBorder: 'border-s-purple-600', hover: 'hover:border-purple-400 dark:hover:border-purple-500', badgeBg: 'bg-purple-100 dark:bg-purple-900/40', badgeText: 'text-purple-900 dark:text-purple-200', badgeBorder: 'border-purple-300 dark:border-purple-800/50', dot: 'bg-purple-600' },
  { startBorder: 'border-s-rose-600', hover: 'hover:border-rose-400 dark:hover:border-rose-500', badgeBg: 'bg-rose-100 dark:bg-rose-900/40', badgeText: 'text-rose-900 dark:text-rose-200', badgeBorder: 'border-rose-300 dark:border-rose-800/50', dot: 'bg-rose-600' },
  { startBorder: 'border-s-amber-600', hover: 'hover:border-amber-400 dark:hover:border-amber-500', badgeBg: 'bg-amber-100 dark:bg-amber-900/40', badgeText: 'text-amber-900 dark:text-amber-200', badgeBorder: 'border-amber-300 dark:border-amber-800/50', dot: 'bg-amber-600' },
  { startBorder: 'border-s-indigo-600', hover: 'hover:border-indigo-400 dark:hover:border-indigo-500', badgeBg: 'bg-indigo-100 dark:bg-indigo-900/40', badgeText: 'text-indigo-900 dark:text-indigo-200', badgeBorder: 'border-indigo-300 dark:border-indigo-800/50', dot: 'bg-indigo-600' },
  { startBorder: 'border-s-cyan-600', hover: 'hover:border-cyan-400 dark:hover:border-cyan-500', badgeBg: 'bg-cyan-100 dark:bg-cyan-900/40', badgeText: 'text-cyan-900 dark:text-cyan-200', badgeBorder: 'border-cyan-300 dark:border-cyan-800/50', dot: 'bg-cyan-600' },
  { startBorder: 'border-s-teal-600', hover: 'hover:border-teal-400 dark:hover:border-teal-500', badgeBg: 'bg-teal-100 dark:bg-teal-900/40', badgeText: 'text-teal-900 dark:text-teal-200', badgeBorder: 'border-teal-300 dark:border-teal-800/50', dot: 'bg-teal-600' },
  { startBorder: 'border-s-lime-600', hover: 'hover:border-lime-400 dark:hover:border-lime-500', badgeBg: 'bg-lime-100 dark:bg-lime-900/40', badgeText: 'text-lime-900 dark:text-lime-200', badgeBorder: 'border-lime-300 dark:border-lime-800/50', dot: 'bg-lime-600' },
  { startBorder: 'border-s-green-600', hover: 'hover:border-green-400 dark:hover:border-green-500', badgeBg: 'bg-green-100 dark:bg-green-900/40', badgeText: 'text-green-900 dark:text-green-200', badgeBorder: 'border-green-300 dark:border-green-800/50', dot: 'bg-green-600' },
  { startBorder: 'border-s-sky-600', hover: 'hover:border-sky-400 dark:hover:border-sky-500', badgeBg: 'bg-sky-100 dark:bg-sky-900/40', badgeText: 'text-sky-900 dark:text-sky-200', badgeBorder: 'border-sky-300 dark:border-sky-800/50', dot: 'bg-sky-600' },
  { startBorder: 'border-s-violet-600', hover: 'hover:border-violet-400 dark:hover:border-violet-500', badgeBg: 'bg-violet-100 dark:bg-violet-900/40', badgeText: 'text-violet-900 dark:text-violet-200', badgeBorder: 'border-violet-300 dark:border-violet-800/50', dot: 'bg-violet-600' },
  { startBorder: 'border-s-fuchsia-600', hover: 'hover:border-fuchsia-400 dark:hover:border-fuchsia-500', badgeBg: 'bg-fuchsia-100 dark:bg-fuchsia-900/40', badgeText: 'text-fuchsia-900 dark:text-fuchsia-200', badgeBorder: 'border-fuchsia-300 dark:border-fuchsia-800/50', dot: 'bg-fuchsia-600' },
  { startBorder: 'border-s-pink-600', hover: 'hover:border-pink-400 dark:hover:border-pink-500', badgeBg: 'bg-pink-100 dark:bg-pink-900/40', badgeText: 'text-pink-900 dark:text-pink-200', badgeBorder: 'border-pink-300 dark:border-pink-800/50', dot: 'bg-pink-600' },
  { startBorder: 'border-s-red-600', hover: 'hover:border-red-400 dark:hover:border-red-500', badgeBg: 'bg-red-100 dark:bg-red-900/40', badgeText: 'text-red-900 dark:text-red-200', badgeBorder: 'border-red-300 dark:border-red-800/50', dot: 'bg-red-600' },
  { startBorder: 'border-s-yellow-600', hover: 'hover:border-yellow-400 dark:hover:border-yellow-500', badgeBg: 'bg-yellow-100 dark:bg-yellow-900/40', badgeText: 'text-yellow-900 dark:text-yellow-200', badgeBorder: 'border-yellow-300 dark:border-yellow-800/50', dot: 'bg-yellow-600' },
  { startBorder: 'border-s-blue-400', hover: 'hover:border-blue-300 dark:hover:border-blue-500', badgeBg: 'bg-blue-100 dark:bg-blue-900/20', badgeText: 'text-blue-700 dark:text-blue-400', badgeBorder: 'border-blue-200 dark:border-blue-700/50', dot: 'bg-blue-400' },
  { startBorder: 'border-s-emerald-400', hover: 'hover:border-emerald-300 dark:hover:border-emerald-500', badgeBg: 'bg-emerald-100 dark:bg-emerald-900/20', badgeText: 'text-emerald-700 dark:text-emerald-400', badgeBorder: 'border-emerald-200 dark:border-emerald-700/50', dot: 'bg-emerald-400' },
  { startBorder: 'border-s-purple-400', hover: 'hover:border-purple-300 dark:hover:border-purple-500', badgeBg: 'bg-purple-100 dark:bg-purple-900/20', badgeText: 'text-purple-700 dark:text-purple-400', badgeBorder: 'border-purple-200 dark:border-purple-700/50', dot: 'bg-purple-400' },
  { startBorder: 'border-s-rose-400', hover: 'hover:border-rose-300 dark:hover:border-rose-500', badgeBg: 'bg-rose-100 dark:bg-rose-900/20', badgeText: 'text-rose-700 dark:text-rose-400', badgeBorder: 'border-rose-200 dark:border-rose-700/50', dot: 'bg-rose-400' },
  { startBorder: 'border-s-amber-400', hover: 'hover:border-amber-300 dark:hover:border-amber-500', badgeBg: 'bg-amber-100 dark:bg-amber-900/20', badgeText: 'text-amber-700 dark:text-amber-400', badgeBorder: 'border-amber-200 dark:border-amber-700/50', dot: 'bg-amber-400' },
  { startBorder: 'border-s-indigo-400', hover: 'hover:border-indigo-300 dark:hover:border-indigo-500', badgeBg: 'bg-indigo-100 dark:bg-indigo-900/20', badgeText: 'text-indigo-700 dark:text-indigo-400', badgeBorder: 'border-indigo-200 dark:border-indigo-700/50', dot: 'bg-indigo-400' },
  { startBorder: 'border-s-cyan-400', hover: 'hover:border-cyan-300 dark:hover:border-cyan-500', badgeBg: 'bg-cyan-100 dark:bg-cyan-900/20', badgeText: 'text-cyan-700 dark:text-cyan-400', badgeBorder: 'border-cyan-200 dark:border-cyan-700/50', dot: 'bg-cyan-400' },
  { startBorder: 'border-s-teal-400', hover: 'hover:border-teal-300 dark:hover:border-teal-500', badgeBg: 'bg-teal-100 dark:bg-teal-900/20', badgeText: 'text-teal-700 dark:text-teal-400', badgeBorder: 'border-teal-200 dark:border-teal-700/50', dot: 'bg-teal-400' },
  { startBorder: 'border-s-lime-400', hover: 'hover:border-lime-300 dark:hover:border-lime-500', badgeBg: 'bg-lime-100 dark:bg-lime-900/20', badgeText: 'text-lime-700 dark:text-lime-400', badgeBorder: 'border-lime-200 dark:border-lime-700/50', dot: 'bg-lime-400' },
  { startBorder: 'border-s-green-400', hover: 'hover:border-green-300 dark:hover:border-green-500', badgeBg: 'bg-green-100 dark:bg-green-900/20', badgeText: 'text-green-700 dark:text-green-400', badgeBorder: 'border-green-200 dark:border-green-700/50', dot: 'bg-green-400' },
  { startBorder: 'border-s-sky-400', hover: 'hover:border-sky-300 dark:hover:border-sky-500', badgeBg: 'bg-sky-100 dark:bg-sky-900/20', badgeText: 'text-sky-700 dark:text-sky-400', badgeBorder: 'border-sky-200 dark:border-sky-700/50', dot: 'bg-sky-400' },
  { startBorder: 'border-s-violet-400', hover: 'hover:border-violet-300 dark:hover:border-violet-500', badgeBg: 'bg-violet-100 dark:bg-violet-900/20', badgeText: 'text-violet-700 dark:text-violet-400', badgeBorder: 'border-violet-200 dark:border-violet-700/50', dot: 'bg-violet-400' },
  { startBorder: 'border-s-fuchsia-400', hover: 'hover:border-fuchsia-300 dark:hover:border-fuchsia-500', badgeBg: 'bg-fuchsia-100 dark:bg-fuchsia-900/20', badgeText: 'text-fuchsia-700 dark:text-fuchsia-400', badgeBorder: 'border-fuchsia-200 dark:border-fuchsia-700/50', dot: 'bg-fuchsia-400' },
  { startBorder: 'border-s-pink-400', hover: 'hover:border-pink-300 dark:hover:border-pink-500', badgeBg: 'bg-pink-100 dark:bg-pink-900/20', badgeText: 'text-pink-700 dark:text-pink-400', badgeBorder: 'border-pink-200 dark:border-pink-700/50', dot: 'bg-pink-400' },
  { startBorder: 'border-s-orange-400', hover: 'hover:border-orange-300 dark:hover:border-orange-500', badgeBg: 'bg-orange-100 dark:bg-orange-900/20', badgeText: 'text-orange-700 dark:text-orange-400', badgeBorder: 'border-orange-200 dark:border-orange-700/50', dot: 'bg-orange-400' },
  { startBorder: 'border-s-red-400', hover: 'hover:border-red-300 dark:hover:border-red-500', badgeBg: 'bg-red-100 dark:bg-red-900/20', badgeText: 'text-red-700 dark:text-red-400', badgeBorder: 'border-red-200 dark:border-red-700/50', dot: 'bg-red-400' },
  { startBorder: 'border-s-yellow-400', hover: 'hover:border-yellow-300 dark:hover:border-yellow-500', badgeBg: 'bg-yellow-100 dark:bg-yellow-900/20', badgeText: 'text-yellow-700 dark:text-yellow-400', badgeBorder: 'border-yellow-200 dark:border-yellow-700/50', dot: 'bg-yellow-400' },
  { startBorder: 'border-s-blue-700', hover: 'hover:border-blue-500 dark:hover:border-blue-600', badgeBg: 'bg-blue-100 dark:bg-blue-900/50', badgeText: 'text-blue-900 dark:text-blue-100', badgeBorder: 'border-blue-300 dark:border-blue-700/70', dot: 'bg-blue-700' },
  { startBorder: 'border-s-emerald-700', hover: 'hover:border-emerald-500 dark:hover:border-emerald-600', badgeBg: 'bg-emerald-100 dark:bg-emerald-900/50', badgeText: 'text-emerald-900 dark:text-emerald-100', badgeBorder: 'border-emerald-300 dark:border-emerald-700/70', dot: 'bg-emerald-700' },
  { startBorder: 'border-s-purple-700', hover: 'hover:border-purple-500 dark:hover:border-purple-600', badgeBg: 'bg-purple-100 dark:bg-purple-900/50', badgeText: 'text-purple-900 dark:text-purple-100', badgeBorder: 'border-purple-300 dark:border-purple-700/70', dot: 'bg-purple-700' },
  { startBorder: 'border-s-rose-700', hover: 'hover:border-rose-500 dark:hover:border-rose-600', badgeBg: 'bg-rose-100 dark:bg-rose-900/50', badgeText: 'text-rose-900 dark:text-rose-100', badgeBorder: 'border-rose-300 dark:border-rose-700/70', dot: 'bg-rose-700' },
  { startBorder: 'border-s-amber-700', hover: 'hover:border-amber-500 dark:hover:border-amber-600', badgeBg: 'bg-amber-100 dark:bg-amber-900/50', badgeText: 'text-amber-900 dark:text-amber-100', badgeBorder: 'border-amber-300 dark:border-amber-700/70', dot: 'bg-amber-700' },
  { startBorder: 'border-s-indigo-700', hover: 'hover:border-indigo-500 dark:hover:border-indigo-600', badgeBg: 'bg-indigo-100 dark:bg-indigo-900/50', badgeText: 'text-indigo-900 dark:text-indigo-100', badgeBorder: 'border-indigo-300 dark:border-indigo-700/70', dot: 'bg-indigo-700' },
  { startBorder: 'border-s-cyan-700', hover: 'hover:border-cyan-500 dark:hover:border-cyan-600', badgeBg: 'bg-cyan-100 dark:bg-cyan-900/50', badgeText: 'text-cyan-900 dark:text-cyan-100', badgeBorder: 'border-cyan-300 dark:border-cyan-700/70', dot: 'bg-cyan-700' },
  { startBorder: 'border-s-teal-700', hover: 'hover:border-teal-500 dark:hover:border-teal-600', badgeBg: 'bg-teal-100 dark:bg-teal-900/50', badgeText: 'text-teal-900 dark:text-teal-100', badgeBorder: 'border-teal-300 dark:border-teal-700/70', dot: 'bg-teal-700' },
  { startBorder: 'border-s-lime-700', hover: 'hover:border-lime-500 dark:hover:border-lime-600', badgeBg: 'bg-lime-100 dark:bg-lime-900/50', badgeText: 'text-lime-900 dark:text-lime-100', badgeBorder: 'border-lime-300 dark:border-lime-700/70', dot: 'bg-lime-700' },
  { startBorder: 'border-s-green-700', hover: 'hover:border-green-500 dark:hover:border-green-600', badgeBg: 'bg-green-100 dark:bg-green-900/50', badgeText: 'text-green-900 dark:text-green-100', badgeBorder: 'border-green-300 dark:border-green-700/70', dot: 'bg-green-700' },
  { startBorder: 'border-s-sky-700', hover: 'hover:border-sky-500 dark:hover:border-sky-600', badgeBg: 'bg-sky-100 dark:bg-sky-900/50', badgeText: 'text-sky-900 dark:text-sky-100', badgeBorder: 'border-sky-300 dark:border-sky-700/70', dot: 'bg-sky-700' },
  { startBorder: 'border-s-violet-700', hover: 'hover:border-violet-500 dark:hover:border-violet-600', badgeBg: 'bg-violet-100 dark:bg-violet-900/50', badgeText: 'text-violet-900 dark:text-violet-100', badgeBorder: 'border-violet-300 dark:border-violet-700/70', dot: 'bg-violet-700' },
  { startBorder: 'border-s-fuchsia-700', hover: 'hover:border-fuchsia-500 dark:hover:border-fuchsia-600', badgeBg: 'bg-fuchsia-100 dark:bg-fuchsia-900/50', badgeText: 'text-fuchsia-900 dark:text-fuchsia-100', badgeBorder: 'border-fuchsia-300 dark:border-fuchsia-700/70', dot: 'bg-fuchsia-700' },
  { startBorder: 'border-s-pink-700', hover: 'hover:border-pink-500 dark:hover:border-pink-600', badgeBg: 'bg-pink-100 dark:bg-pink-900/50', badgeText: 'text-pink-900 dark:text-pink-100', badgeBorder: 'border-pink-300 dark:border-pink-700/70', dot: 'bg-pink-700' },
  { startBorder: 'border-s-orange-700', hover: 'hover:border-orange-500 dark:hover:border-orange-600', badgeBg: 'bg-orange-100 dark:bg-orange-900/50', badgeText: 'text-orange-900 dark:text-orange-100', badgeBorder: 'border-orange-300 dark:border-orange-700/70', dot: 'bg-orange-700' },
  { startBorder: 'border-s-red-700', hover: 'hover:border-red-500 dark:hover:border-red-600', badgeBg: 'bg-red-100 dark:bg-red-900/50', badgeText: 'text-red-900 dark:text-red-100', badgeBorder: 'border-red-300 dark:border-red-700/70', dot: 'bg-red-700' },
  { startBorder: 'border-s-yellow-700', hover: 'hover:border-yellow-500 dark:hover:border-yellow-600', badgeBg: 'bg-yellow-100 dark:bg-yellow-900/50', badgeText: 'text-yellow-900 dark:text-yellow-100', badgeBorder: 'border-yellow-300 dark:border-yellow-700/70', dot: 'bg-yellow-700' },
  { startBorder: 'border-s-gray-500', hover: 'hover:border-gray-300 dark:hover:border-gray-400', badgeBg: 'bg-gray-100 dark:bg-gray-900/30', badgeText: 'text-gray-800 dark:text-gray-300', badgeBorder: 'border-gray-200 dark:border-gray-800/50', dot: 'bg-gray-500' },
  { startBorder: 'border-s-gray-600', hover: 'hover:border-gray-400 dark:hover:border-gray-500', badgeBg: 'bg-gray-100 dark:bg-gray-900/40', badgeText: 'text-gray-900 dark:text-gray-200', badgeBorder: 'border-gray-300 dark:border-gray-800/50', dot: 'bg-gray-600' },
  { startBorder: 'border-s-gray-700', hover: 'hover:border-gray-500 dark:hover:border-gray-600', badgeBg: 'bg-gray-100 dark:bg-gray-900/50', badgeText: 'text-gray-900 dark:text-gray-100', badgeBorder: 'border-gray-300 dark:border-gray-700/70', dot: 'bg-gray-700' },
  { startBorder: 'border-s-zinc-500', hover: 'hover:border-zinc-300 dark:hover:border-zinc-400', badgeBg: 'bg-zinc-100 dark:bg-zinc-900/30', badgeText: 'text-zinc-800 dark:text-zinc-300', badgeBorder: 'border-zinc-200 dark:border-zinc-800/50', dot: 'bg-zinc-500' },
  { startBorder: 'border-s-zinc-600', hover: 'hover:border-zinc-400 dark:hover:border-zinc-500', badgeBg: 'bg-zinc-100 dark:bg-zinc-900/40', badgeText: 'text-zinc-900 dark:text-zinc-200', badgeBorder: 'border-zinc-300 dark:border-zinc-800/50', dot: 'bg-zinc-600' },
  { startBorder: 'border-s-neutral-500', hover: 'hover:border-neutral-300 dark:hover:border-neutral-400', badgeBg: 'bg-neutral-100 dark:bg-neutral-900/30', badgeText: 'text-neutral-800 dark:text-neutral-300', badgeBorder: 'border-neutral-200 dark:border-neutral-800/50', dot: 'bg-neutral-500' },
  { startBorder: 'border-s-slate-500', hover: 'hover:border-slate-300 dark:hover:border-slate-400', badgeBg: 'bg-slate-100 dark:bg-slate-900/30', badgeText: 'text-slate-800 dark:text-slate-300', badgeBorder: 'border-slate-200 dark:border-slate-800/50', dot: 'bg-slate-500' },
  { startBorder: 'border-s-slate-700', hover: 'hover:border-slate-500 dark:hover:border-slate-600', badgeBg: 'bg-slate-100 dark:bg-slate-900/50', badgeText: 'text-slate-900 dark:text-slate-100', badgeBorder: 'border-slate-300 dark:border-slate-700/70', dot: 'bg-slate-700' },
  { startBorder: 'border-s-stone-600', hover: 'hover:border-stone-400 dark:hover:border-stone-500', badgeBg: 'bg-stone-100 dark:bg-stone-900/40', badgeText: 'text-stone-900 dark:text-stone-200', badgeBorder: 'border-stone-300 dark:border-stone-800/50', dot: 'bg-stone-600' },
  { startBorder: 'border-s-stone-700', hover: 'hover:border-stone-500 dark:hover:border-stone-600', badgeBg: 'bg-stone-100 dark:bg-stone-900/50', badgeText: 'text-stone-900 dark:text-stone-100', badgeBorder: 'border-stone-300 dark:border-stone-700/70', dot: 'bg-stone-700' },
  { startBorder: 'border-s-blue-800', hover: 'hover:border-blue-600 dark:hover:border-blue-700', badgeBg: 'bg-blue-100 dark:bg-blue-900/60', badgeText: 'text-blue-900 dark:text-blue-100', badgeBorder: 'border-blue-300 dark:border-blue-700', dot: 'bg-blue-800' },
  { startBorder: 'border-s-emerald-800', hover: 'hover:border-emerald-600 dark:hover:border-emerald-700', badgeBg: 'bg-emerald-100 dark:bg-emerald-900/60', badgeText: 'text-emerald-900 dark:text-emerald-100', badgeBorder: 'border-emerald-300 dark:border-emerald-700', dot: 'bg-emerald-800' },
  { startBorder: 'border-s-purple-800', hover: 'hover:border-purple-600 dark:hover:border-purple-700', badgeBg: 'bg-purple-100 dark:bg-purple-900/60', badgeText: 'text-purple-900 dark:text-purple-100', badgeBorder: 'border-purple-300 dark:border-purple-700', dot: 'bg-purple-800' },
  { startBorder: 'border-s-rose-800', hover: 'hover:border-rose-600 dark:hover:border-rose-700', badgeBg: 'bg-rose-100 dark:bg-rose-900/60', badgeText: 'text-rose-900 dark:text-rose-100', badgeBorder: 'border-rose-300 dark:border-rose-700', dot: 'bg-rose-800' },
  { startBorder: 'border-s-orange-800', hover: 'hover:border-orange-600 dark:hover:border-orange-700', badgeBg: 'bg-orange-100 dark:bg-orange-900/60', badgeText: 'text-orange-900 dark:text-orange-100', badgeBorder: 'border-orange-300 dark:border-orange-700', dot: 'bg-orange-800' },
  { startBorder: 'border-s-red-800', hover: 'hover:border-red-600 dark:hover:border-red-700', badgeBg: 'bg-red-100 dark:bg-red-900/60', badgeText: 'text-red-900 dark:text-red-100', badgeBorder: 'border-red-300 dark:border-red-700', dot: 'bg-red-800' },
  { startBorder: 'border-s-teal-800', hover: 'hover:border-teal-600 dark:hover:border-teal-700', badgeBg: 'bg-teal-100 dark:bg-teal-900/60', badgeText: 'text-teal-900 dark:text-teal-100', badgeBorder: 'border-teal-300 dark:border-teal-700', dot: 'bg-teal-800' },
  { startBorder: 'border-s-cyan-800', hover: 'hover:border-cyan-600 dark:hover:border-cyan-700', badgeBg: 'bg-cyan-100 dark:bg-cyan-900/60', badgeText: 'text-cyan-900 dark:text-cyan-100', badgeBorder: 'border-cyan-300 dark:border-cyan-700', dot: 'bg-cyan-800' },
  { startBorder: 'border-s-green-800', hover: 'hover:border-green-600 dark:hover:border-green-700', badgeBg: 'bg-green-100 dark:bg-green-900/60', badgeText: 'text-green-900 dark:text-green-100', badgeBorder: 'border-green-300 dark:border-green-700', dot: 'bg-green-800' },
  { startBorder: 'border-s-sky-800', hover: 'hover:border-sky-600 dark:hover:border-sky-700', badgeBg: 'bg-sky-100 dark:bg-sky-900/60', badgeText: 'text-sky-900 dark:text-sky-100', badgeBorder: 'border-sky-300 dark:border-sky-700', dot: 'bg-sky-800' },
  { startBorder: 'border-s-violet-800', hover: 'hover:border-violet-600 dark:hover:border-violet-700', badgeBg: 'bg-violet-100 dark:bg-violet-900/60', badgeText: 'text-violet-900 dark:text-violet-100', badgeBorder: 'border-violet-300 dark:border-violet-700', dot: 'bg-violet-800' },
  { startBorder: 'border-s-fuchsia-800', hover: 'hover:border-fuchsia-600 dark:hover:border-fuchsia-700', badgeBg: 'bg-fuchsia-100 dark:bg-fuchsia-900/60', badgeText: 'text-fuchsia-900 dark:text-fuchsia-100', badgeBorder: 'border-fuchsia-300 dark:border-fuchsia-700', dot: 'bg-fuchsia-800' },
  { startBorder: 'border-s-pink-800', hover: 'hover:border-pink-600 dark:hover:border-pink-700', badgeBg: 'bg-pink-100 dark:bg-pink-900/60', badgeText: 'text-pink-900 dark:text-pink-100', badgeBorder: 'border-pink-300 dark:border-pink-700', dot: 'bg-pink-800' },
  { startBorder: 'border-s-amber-800', hover: 'hover:border-amber-600 dark:hover:border-amber-700', badgeBg: 'bg-amber-100 dark:bg-amber-900/60', badgeText: 'text-amber-900 dark:text-amber-100', badgeBorder: 'border-amber-300 dark:border-amber-700', dot: 'bg-amber-800' },
  { startBorder: 'border-s-yellow-800', hover: 'hover:border-yellow-600 dark:hover:border-yellow-700', badgeBg: 'bg-yellow-100 dark:bg-yellow-900/60', badgeText: 'text-yellow-900 dark:text-yellow-100', badgeBorder: 'border-yellow-300 dark:border-yellow-700', dot: 'bg-yellow-800' },
  { startBorder: 'border-s-lime-800', hover: 'hover:border-lime-600 dark:hover:border-lime-700', badgeBg: 'bg-lime-100 dark:bg-lime-900/60', badgeText: 'text-lime-900 dark:text-lime-100', badgeBorder: 'border-lime-300 dark:border-lime-700', dot: 'bg-lime-800' },
  { startBorder: 'border-s-indigo-800', hover: 'hover:border-indigo-600 dark:hover:border-indigo-700', badgeBg: 'bg-indigo-100 dark:bg-indigo-900/60', badgeText: 'text-indigo-900 dark:text-indigo-100', badgeBorder: 'border-indigo-300 dark:border-indigo-700', dot: 'bg-indigo-800' },
  { startBorder: 'border-s-blue-900', hover: 'hover:border-blue-700 dark:hover:border-blue-800', badgeBg: 'bg-blue-100 dark:bg-blue-900/70', badgeText: 'text-blue-900 dark:text-blue-50', badgeBorder: 'border-blue-300 dark:border-blue-700', dot: 'bg-blue-900' },
  { startBorder: 'border-s-red-900', hover: 'hover:border-red-700 dark:hover:border-red-800', badgeBg: 'bg-red-100 dark:bg-red-900/70', badgeText: 'text-red-900 dark:text-red-50', badgeBorder: 'border-red-300 dark:border-red-700', dot: 'bg-red-900' },
  { startBorder: 'border-s-green-900', hover: 'hover:border-green-700 dark:hover:border-green-800', badgeBg: 'bg-green-100 dark:bg-green-900/70', badgeText: 'text-green-900 dark:text-green-50', badgeBorder: 'border-green-300 dark:border-green-700', dot: 'bg-green-900' },
  { startBorder: 'border-s-purple-900', hover: 'hover:border-purple-700 dark:hover:border-purple-800', badgeBg: 'bg-purple-100 dark:bg-purple-900/70', badgeText: 'text-purple-900 dark:text-purple-50', badgeBorder: 'border-purple-300 dark:border-purple-700', dot: 'bg-purple-900' },
  { startBorder: 'border-s-pink-900', hover: 'hover:border-pink-700 dark:hover:border-pink-800', badgeBg: 'bg-pink-100 dark:bg-pink-900/70', badgeText: 'text-pink-900 dark:text-pink-50', badgeBorder: 'border-pink-300 dark:border-pink-700', dot: 'bg-pink-900' }
];

const getCourseTheme = (courseCode: string): CourseTheme => {
  let hash = 0; for (let i = 0; i < courseCode.length; i++) hash = courseCode.charCodeAt(i) + ((hash << 5) - hash);
  return courseThemes[Math.abs(hash) % courseThemes.length];
};

// ==========================================
// ADMIN DASHBOARD COMPONENT
// ==========================================
const AdminDashboard = ({ token }: { token: string }) => {
  const [activeTab, setActiveTab] = useState<'users' | 'logs'>('users');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  // User search state
  const [userSearchQuery, setUserSearchQuery] = useState('');

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
        fetchAdminData(); // Refresh the users list so the admin sees the new "restricted" badge immediately
      } else {
        alert("שגיאה בחסימת המשתמש.");
      }
    } catch {
      alert("שגיאת תקשורת.");
    }
  };

  const fetchAdminData = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === 'users') {
        const res = await fetch(`${API_BASE_URL}/admin/users`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) setUsers(await res.json());
      } else {
        const res = await fetch(`${API_BASE_URL}/admin/logs`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) setLogs(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [activeTab, token]);

  useEffect(() => { fetchAdminData(); }, [fetchAdminData]);

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

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col h-[calc(100vh-10rem)]">
      <div className="flex border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 shrink-0 px-4 pt-4 gap-4">
        <button onClick={() => setActiveTab('users')} className={`flex items-center gap-2 pb-3 px-2 font-bold transition-colors border-b-2 ${activeTab === 'users' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
          <Users className="w-4 h-4" /> ניהול משתמשים
        </button>
        <button onClick={() => setActiveTab('logs')} className={`flex items-center gap-2 pb-3 px-2 font-bold transition-colors border-b-2 ${activeTab === 'logs' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
          <ListChecks className="w-4 h-4" /> אישורים ממתינים {logs.length > 0 && `(${logs.length})`}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {loading ? (
          <div className="flex justify-center items-center h-full"><RefreshCw className="w-8 h-8 text-blue-500 animate-spin" /></div>
        ) : activeTab === 'users' ? (
          <div className="flex flex-col gap-4">
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
                        <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-bold ${
                          u.role === 'owner' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
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
        ) : (
          <div className="space-y-4">
            {logs.length === 0 && (
              <div className="text-center py-16 flex flex-col items-center">
                <CheckCircle className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-4" />
                <h3 className="text-lg font-bold text-slate-500 dark:text-slate-400">אין שינויים הממתינים לאישור</h3>
                <p className="text-sm text-slate-400 mt-1">כל העריכות טופלו!</p>
              </div>
            )}
            
            {logs.map(log => {
              let parsedOld = null; let parsedNew = null;
              try { parsedOld = log.old_data ? JSON.parse(log.old_data) : null; } catch {}
              try { parsedNew = log.new_data ? JSON.parse(log.new_data) : null; } catch {}

              return (
                <div key={log.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 md:p-5 bg-white dark:bg-slate-800/50 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400">{log.action}</span>
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        {log.entity_type === 'COURSE' 
                          ? `קורס: ${log.entity_id}` 
                          : (log.entity_id.includes(':') ? log.entity_id.split(':')[1] : `${log.entity_type} #${log.entity_id}`)
                        }
                      </span>
                      <span className="text-xs text-slate-400" dir="ltr">{new Date(log.created_at).toLocaleString('he-IL')}</span>
                    </div>
                    
                    <div className="text-sm text-slate-600 dark:text-slate-300 mb-3">
                      בוצע ע"י: <span className="font-bold">{log.user_name}</span> <span className="text-xs opacity-70" dir="ltr">({log.user_email})</span>
                    </div>

                    {log.entity_type === 'COURSE' && log.action === 'CREATE' ? (
                      <div className="flex items-stretch gap-2 sm:gap-4 overflow-hidden">
                        <div className="flex-1 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 p-3 rounded text-xs">
                          <div className="font-bold text-blue-700 dark:text-blue-400 mb-1">קורס חדש שנוסף:</div>
                          {parsedNew && <div className="text-slate-800 dark:text-slate-200 font-medium">שם הקורס: {parsedNew.name}<br/>קוד הקורס: {log.entity_id.split(':')[0]}</div>}
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col sm:flex-row items-stretch gap-2 sm:gap-4 overflow-hidden">
                        {/* UPDATE ACTION - Shows Before and After */}
                        {log.action === 'UPDATE' && (
                          <>
                            <div className="flex-1 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 p-3 rounded text-xs opacity-80">
                              <div className="font-bold text-red-700 dark:text-red-400 mb-1">המידע המקורי:</div>
                              {parsedOld && <div className="text-slate-600 dark:text-slate-400">
                                {log.entity_type === 'COURSE' ? `שם קורס: ${parsedOld.name}` : <>שם: {parsedOld.title}<br />מועד: {parsedOld.deadline}</>}
                              </div>}
                            </div>
                            <div className="hidden sm:flex items-center justify-center text-slate-300"><ArrowLeft className="w-4 h-4" /></div>
                            <div className="flex-1 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 p-3 rounded text-xs">
                              <div className="font-bold text-emerald-700 dark:text-emerald-400 mb-1">השינוי המוצע:</div>
                              {parsedNew && <div className="text-slate-800 dark:text-slate-200 font-medium">
                                {log.entity_type === 'COURSE' ? `שם קורס: ${parsedNew.name}` : <>שם: {parsedNew.title}<br />מועד: {parsedNew.deadline}</>}
                              </div>}
                            </div>
                          </>
                        )}

                        {/* CREATE ACTION - Shows Only New Data */}
                        {log.action === 'CREATE' && (
                          <div className="flex-1 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 p-3 rounded text-xs">
                            <div className="font-bold text-blue-700 dark:text-blue-400 mb-1">נוצר פריט חדש:</div>
                            {parsedNew && <div className="text-slate-800 dark:text-slate-200 font-medium">
                              {log.entity_type === 'COURSE' ? `שם קורס: ${parsedNew.name}` : <>שם: {parsedNew.title}<br />מועד: {parsedNew.deadline}</>}
                            </div>}
                          </div>
                        )}

                        {/* DELETE ACTION - Shows Only Old Data with Warning */}
                        {log.action === 'DELETE' && (
                          <div className="flex-1 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 p-3 rounded text-xs">
                            <div className="font-bold text-red-700 dark:text-red-400 mb-1 flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5" /> בקשת מחיקה לפריט:
                            </div>
                            {parsedOld && <div className="text-slate-600 dark:text-slate-400 font-medium line-through mt-1">
                              שם: {parsedOld.title} <br /> מועד: {parsedOld.deadline}
                            </div>}
                          </div>
                        )}

                      </div>
                    )}
                  </div>
                  
                  <div className="shrink-0 flex flex-col gap-2 border-t lg:border-t-0 lg:border-r border-slate-100 dark:border-slate-700 pt-4 lg:pt-0 lg:pr-4 min-w-[140px]">
                    <button onClick={() => handleApproveLog(log.id)} className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded-lg text-sm font-bold transition-colors">
                      <Check className="w-4 h-4" /> אישור
                    </button>
                    <button onClick={() => handleRevertLog(log.id)} className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white rounded-lg text-sm font-medium transition-colors text-slate-700 dark:text-slate-200">
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
        )}
      </div>
    </div>
  );
};


// ==========================================
// MAIN APP COMPONENT
// ==========================================
export default function App() {
  const [token, setToken] = useState<string | null>(typeof window !== 'undefined' ? localStorage.getItem('teaspoon_jwt') : null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  const [currentView, setCurrentView] = useState<'app' | 'admin'>('app');

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

  const [hideCompleted, setHideCompleted] = useState<boolean>(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('teaspoon_hide_completed') === 'true';
    return false;
  });

  const [dateRange, setDateRange] = useState<{start: string, end: string}>({ start: '', end: '' });
  
  // ✨ State for Dropdowns (Hover on desktop, Click on mobile)
  const [openFilter, setOpenFilter] = useState<'type' | 'status' | 'date' | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [activeTypeFilter, setActiveTypeFilter] = useState<string>('All');
  const assignmentTypes = ['All', 'Assignment', 'Webwork', 'Exam'];

  // Modals State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [currentEditId, setCurrentEditId] = useState<number | null>(null);
  const [formData, setFormData] = useState<AssignmentFormData>({ title: '', courseCode: '', courseName: '', type: 'Assignment', deadline: '', time: '', isOptional: false });

  // Course Settings Modal State
  const [isCourseModalOpen, setIsCourseModalOpen] = useState<boolean>(false);
  const [editingCourseCode, setEditingCourseCode] = useState<string | null>(null);
  const [courseFormData, setCourseFormData] = useState<CourseSyllabus>({ name: '', hw_weight: 0, hw_keep: 0, hw_magen: false, ww_weight: 0, ww_keep: 0, ww_magen: false, exam_weight: 0, exam_magen: false });

  // File Interaction State
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const [editingFileId, setEditingFileId] = useState<number | null>(null);
  const [editFileName, setEditFileName] = useState<string>('');

  // Add Course Modal State
  const [isAddCourseModalOpen, setIsAddCourseModalOpen] = useState<boolean>(false);
  const [newCourseCode, setNewCourseCode] = useState<string>('');
  const [newCourseName, setNewCourseName] = useState<string>('');
  const [courseCodeError, setCourseCodeError] = useState<string>('');

  // Intro Modal State
  const [showIntroModal, setShowIntroModal] = useState<boolean>(false);
  const [dontShowAgain, setDontShowAgain] = useState<boolean>(false);

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

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('teaspoon_hide_completed', String(hideCompleted));
    }
  }, [hideCompleted]);

  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('hasSeenIntro')) {
      setShowIntroModal(true);
    }
  }, []);

  const fetchAllData = useCallback(async () => {
    setLoading(true); setFetchError(null);
    try {
      const headers: HeadersInit = {}; if (token) headers['Authorization'] = `Bearer ${token}`;
      const [coursesRes, assignmentsRes] = await Promise.all([ fetch(`${API_BASE_URL}/courses`), fetch(`${API_BASE_URL}/assignments`, { headers }) ]);
      if (!coursesRes.ok || !assignmentsRes.ok) throw new Error("Network error");
      
      const rawMap = await coursesRes.json(); const mappedMap: CoursesMap = {};
      Object.entries(rawMap).forEach(([k, v]: [string, any]) => {
          mappedMap[k] = { name: v.name || '', hw_weight: v.hw_weight || 0, hw_keep: v.hw_keep !== undefined ? v.hw_keep : (v.hw_drop || 0), hw_magen: v.hw_magen || false, ww_weight: v.ww_weight || 0, ww_keep: v.ww_keep !== undefined ? v.ww_keep : (v.ww_drop || 0), ww_magen: v.ww_magen || false, exam_weight: v.exam_weight || 0, exam_magen: v.exam_magen || false };
      });
      setCoursesMap(mappedMap);

      let fetchedAssignments: Assignment[] = await assignmentsRes.json();

      if (token) {
        try {
          const [userRes, userCoursesRes] = await Promise.all([ fetch(`${API_BASE_URL}/users/me`, { headers }), fetch(`${API_BASE_URL}/users/me/courses`, { headers }) ]);
          if (userRes.ok) { setUserProfile(await userRes.json()); const dbCourses = await userCoursesRes.json(); setMyCourses(dbCourses); setVisibleCourses(dbCourses);
          } else throw new Error("Unauthorized");
        } catch { localStorage.removeItem('teaspoon_jwt'); setToken(null); }
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

  useEffect(() => { if (currentView === 'app') { fetchAllData(); } }, [fetchAllData, currentView]);

  // --- Functions ---
  const syncCourses = (newCourses: string[]) => {
    if (token) fetch(`${API_BASE_URL}/users/me/courses`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(newCourses) });
    else localStorage.setItem('guest_courses', JSON.stringify(newCourses));
  };
  const handleAddCourse = (code: string) => { 
    if (!code.trim()) return;
    if (!myCourses.includes(code)) { const updated = [...myCourses, code]; setMyCourses(updated); setVisibleCourses(prev => [...prev, code]); syncCourses(updated); } 
    setSearchQuery(''); setIsSearchFocused(false); 
  };
  const handleRemoveCourse = (code: string) => { const updated = myCourses.filter(c => c !== code); setMyCourses(updated); setVisibleCourses(prev => prev.filter(c => c !== code)); syncCourses(updated); };
  const toggleVisibleCourse = (code: string) => setVisibleCourses(prev => prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]);

  const openCourseSettings = (code: string) => {
    setEditingCourseCode(code);
    const syl = coursesMap[code] || { name: '', hw_weight: 0, hw_keep: 0, hw_magen: false, ww_weight: 0, ww_keep: 0, ww_magen: false, exam_weight: 0, exam_magen: false };
    setCourseFormData(syl); setIsCourseModalOpen(true);
  };

  const handleSaveCourseSettings = async (e: React.FormEvent) => {
    e.preventDefault(); if (!token || !editingCourseCode) return;
    setCoursesMap(prev => ({ ...prev, [editingCourseCode]: courseFormData })); setIsCourseModalOpen(false);
    const payload = { ...courseFormData, hw_drop: courseFormData.hw_keep, ww_drop: courseFormData.ww_keep };
    try { await fetch(`${API_BASE_URL}/courses/${editingCourseCode}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(payload) }); } catch { }
  };

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

  const openAddModal = () => { setIsEditing(false); setCurrentEditId(null); setFormData({ title: '', courseCode: '', courseName: '', type: 'Assignment', deadline: '', time: '', isOptional: false }); setIsModalOpen(true); };

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

  const calculateCourseGrade = (code: string): GradeSummary | null => {
    const syllabus = coursesMap[code] || { name: '', hw_weight: 0, hw_keep: 0, hw_magen: false, ww_weight: 0, ww_keep: 0, ww_magen: false, exam_weight: 0, exam_magen: false };
    const courseAssignments = assignments.filter(a => a.courseCode === code);
    if (courseAssignments.length === 0 || !courseAssignments.some(a => a.grade !== null)) return null;

    const processCategory = (type: string, weight: number, keepCount: number) => {
      if (weight === 0) return { earned: 0, possible: 0, rawAvg: undefined };
      const items = courseAssignments.filter(a => a.type === type); const gradedItems = items.filter(a => a.grade !== null);
      if (gradedItems.length === 0) return { earned: 0, possible: weight, rawAvg: undefined }; 
      const actualKeep = keepCount > 0 ? keepCount : Math.max(1, gradedItems.length);
      let grades = gradedItems.map(a => a.grade as number).sort((a, b) => b - a); 
      if (keepCount > 0) { while (grades.length < actualKeep) { grades.push(0); } }
      const keptGrades = grades.slice(0, actualKeep); const avg = keptGrades.reduce((sum, g) => sum + g, 0) / actualKeep;
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
        final_exam_possible += hw.possible; final_exam_earned += (exam.rawAvg / 100) * hw.possible; final_hw_possible = 0; final_hw_earned = 0; isMagenActive = true;
      }
      if (syllabus.ww_magen && ww.possible > 0 && ww.rawAvg !== undefined && ww.rawAvg < exam.rawAvg) {
        final_exam_possible += ww.possible; final_exam_earned += (exam.rawAvg / 100) * ww.possible; final_ww_possible = 0; final_ww_earned = 0; isMagenActive = true;
      }
    }

    const totalEarned = final_hw_earned + final_ww_earned + final_exam_earned; const totalPossible = final_hw_possible + final_ww_possible + final_exam_possible;
    if (totalPossible === 0) {
        const gradedItems = courseAssignments.filter(a => a.grade !== null);
        const avg = gradedItems.reduce((sum, a) => sum + (a.grade as number), 0) / gradedItems.length;
        return { earned: avg.toFixed(1), possible: '100', isMagen: false, unconfigured: true };
    }
    return { earned: totalEarned.toFixed(1), possible: totalPossible.toFixed(1), isMagen: isMagenActive, unconfigured: false };
  };

  const handleCalendarSync = () => {
    let calendarUrl = '';
    if (token) { calendarUrl = `${API_BASE_URL}/calendar/feed?token=${token}`; } 
    else if (visibleCourses.length > 0) { calendarUrl = `${API_BASE_URL}/calendar/feed?courses=${visibleCourses.join(',')}`; } 
    else { alert("אין קורסים מסומנים לסנכרון."); return; }
    navigator.clipboard.writeText(calendarUrl).then(() => { setIsCalendarCopied(true); setTimeout(() => setIsCalendarCopied(false), 2000); }).catch(() => { alert("שגיאה בהעתקת הקישור ליומן. אנא נסה שוב."); });
  };

  const handleFileUpload = async (assignmentId: number, e: React.ChangeEvent<HTMLInputElement>, category: string) => {
    if (!e.target.files || e.target.files.length === 0 || !token) return;
    const file = e.target.files[0]; const inputElement = e.target; setUploadingId(assignmentId);
    const fd = new FormData(); fd.append('file', file); fd.append('category', category);
    try { await fetch(`${API_BASE_URL}/assignments/${assignmentId}/attachments`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: fd }); await fetchAllData();
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

  // ✨ NEW: Optimistic Like Toggle
  const handleToggleLike = async (assignmentId: number, attachmentId: number, currentLikedStatus: boolean | undefined) => {
    if (!token) {
      alert("יש להתחבר כדי לסמן לייק לפתרון.");
      return;
    }

    // Find the attachment to check if it's uploaded by the current user
    const assignment = assignments.find(a => a.id === assignmentId);
    const attachment = assignment?.attachments.find(att => att.id === attachmentId);
    if (attachment && userProfile && attachment.uploader_id === userProfile.id) {
      alert("לא ניתן לסמן לייק לפתרון שלך.");
      return;
    }

    const isLiking = !currentLikedStatus;
    const increment = isLiking ? 1 : -1;

    // Optimistically update the UI instantly
    setAssignments(prev => prev.map(a => {
      if (a.id !== assignmentId) return a;
      return { ...a, attachments: a.attachments.map(att => { if (att.id !== attachmentId) return att; return { ...att, likes: Math.max(0, (att.likes || 0) + increment), isLikedByMe: isLiking }; }) };
    }));
    try { await fetch(`${API_BASE_URL}/attachments/${attachmentId}/like`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } }); } catch { fetchAllData(); }
  };

  const searchResults = Object.entries(coursesMap).filter(([code, syl]) => { if (!searchQuery) return false; return code.includes(searchQuery) || (syl.name && syl.name.toLowerCase().includes(searchQuery.toLowerCase())); }).slice(0, 5);
  
  const filteredAssignments = assignments.filter(a => {
    if (!visibleCourses.includes(a.courseCode)) return false;
    if (activeTypeFilter !== 'All' && a.type !== activeTypeFilter) return false;
    if (hideCompleted && a.isCompleted) return false;
    
    if (dateRange.start || dateRange.end) {
      const assignmentDate = new Date(a.deadline).getTime();
      if (dateRange.start) { const start = new Date(dateRange.start); start.setHours(0, 0, 0, 0); if (assignmentDate < start.getTime()) return false; }
      if (dateRange.end) { const end = new Date(dateRange.end); end.setHours(23, 59, 59, 999); if (assignmentDate > end.getTime()) return false; }
    }
    return true;
  });

  const formatDateTime = (isoString: string) => {
    const date = new Date(isoString); const today = new Date(); const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    let dateStr = date.toLocaleDateString('he-IL', { month: 'short', day: 'numeric' });
    if (date.toDateString() === today.toDateString()) dateStr = 'היום'; else if (date.toDateString() === tomorrow.toDateString()) dateStr = 'מחר';
    return `${dateStr} ב-${date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', hour12: false })}`;
  };
  
  const getCardClasses = (deadline: string, courseTheme: CourseTheme, isCompleted: boolean, isOptional: boolean) => {
    if (isCompleted) return 'border-solid border-s-slate-300 dark:border-s-slate-600 border-y-slate-200 dark:border-y-slate-700 border-e-slate-200 dark:border-e-slate-700 bg-slate-100/60 dark:bg-slate-800/60 opacity-60 grayscale-[0.3] hover:opacity-80'; 
    const hoursLeft = (new Date(deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60);
    
    if (hoursLeft < 0 && !isOptional) return 'border-solid border-s-red-500 border-y-red-200 dark:border-y-red-900/50 border-e-red-200 dark:border-e-red-900/50 bg-red-50 dark:bg-red-900/20';
    if (hoursLeft < 48 && !isOptional) return 'border-solid border-s-orange-500 border-y-orange-200 dark:border-y-orange-9０/5０ border-e-orange-2０ dark:border-e-orange-9０/5０ bg-orange-5０ dark:bg-orange-9０/2０';
    return `border-solid ${courseTheme.startBorder} border-y-slate-200 dark:border-y-slate-700 border-e-slate-200 dark:border-e-slate-700 bg-white dark:bg-slate-800 ${courseTheme.hover}`;
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
      
      <div className="flex items-center gap-2 shrink-0">
        {att.category === 'solution' && (
          <button 
            onClick={(e) => { e.preventDefault(); handleToggleLike(assignmentId, att.id, att.isLikedByMe); }}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors ${att.isLikedByMe ? 'text-rose-600 bg-rose-100 dark:bg-rose-900/40 dark:text-rose-400 font-bold' : 'text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-rose-500 font-medium'}`}
            title="סמן פתרון כמועיל"
          >
            <Heart className={`w-3.5 h-3.5 ${att.isLikedByMe ? 'fill-current' : ''}`} />
            <span>{att.likes || 0}</span>
          </button>
        )}
        {!editingFileId && token && (userProfile?.id === att.uploader_id || userProfile?.role === 'admin' || userProfile?.role === 'owner') && (
          <div className="flex gap-1 opacity-0 group-hover/file:opacity-100 transition-opacity">
            <button onClick={(e) => { e.preventDefault(); setEditingFileId(att.id); setEditFileName(att.filename.replace(/\.[^/.]+$/, "")); }} className="text-slate-400 hover:text-blue-500" title="שינוי שם"><Edit className="w-3.5 h-3.5" /></button>
            <button onClick={(e) => { e.preventDefault(); handleDeleteAttachment(assignmentId, att.id); }} className="text-slate-400 hover:text-red-500" title="מחיקה"><XCircle className="w-3.5 h-3.5" /></button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-sans pb-12 transition-colors duration-200" dir="rtl">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 shadow-sm border-b border-slate-200 dark:border-slate-700 relative md:sticky top-0 z-40 transition-colors duration-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-0">
          
          {/* ✨ Admin Panel / Header Title Side */}
          <div className="flex flex-wrap items-center gap-4 sm:gap-6 w-full md:w-auto">
            <div className="flex items-center gap-3">
              <div className="bg-slate-900 dark:bg-slate-700 p-2 rounded-lg"><Coffee className="w-6 h-6 text-white" /></div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50">Teaspoon</h1>
                {token ? <p className="text-sm text-slate-500 dark:text-slate-400">שלום {userProfile?.name?.split(' ')[0]}!</p> : <p className="text-sm text-slate-500 dark:text-slate-400 italic">מצב אורח</p>}
              </div>
            </div>

            {/* ✨ Admin Panel Button - Now attached safely to the left of the main title block */}
            {(userProfile?.role === 'admin' || userProfile?.role === 'owner') && (
              <button 
                onClick={() => setCurrentView(v => v === 'app' ? 'admin' : 'app')}
                className={`flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-bold transition-all shadow-sm ${currentView === 'admin' ? 'bg-purple-100 text-purple-700 border border-purple-300 dark:bg-purple-900/50 dark:text-purple-300 dark:border-purple-700' : 'bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600'}`}
              >
                {currentView === 'app' ? <><ShieldAlert className="w-4 h-4" /> פאנל ניהול</> : <><ArrowRight className="w-4 h-4" /> חזרה למערכת</>}
              </button>
            )}
          </div>
          
          {/* ✨ Action Buttons (Flexible Mobile Row) */}
          <div className="flex flex-wrap items-center justify-start md:justify-end gap-2 sm:gap-3 w-full md:w-auto mt-2 md:mt-0">
            <button onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')} className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"><Moon className="w-5 h-5 hidden dark:block" /><Sun className="w-5 h-5 block dark:hidden" /></button>
            
            <button 
              onClick={handleCalendarSync} 
              className={`flex items-center gap-2 border px-3 py-2 sm:px-4 rounded-lg text-xs sm:text-sm font-medium transition-colors shadow-sm ${
                isCalendarCopied ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400' : 'bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200'
              }`}
            >
              {isCalendarCopied ? <Check className="w-4 h-4" /> : <Calendar className="w-4 h-4" />} 
              <span className="hidden sm:inline">{isCalendarCopied ? 'הקישור הועתק!' : 'סנכרון ליומן'}</span>
            </button>

            {token ? (
              <>
                <div className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-lg text-xs sm:text-sm font-medium border border-rose-200 dark:border-rose-800/50" title="סך הלייקים שקיבלת מהקהילה">
                  <Heart className="w-4 h-4 fill-current" />
                  <span className="font-bold">{userProfile?.totalLikesReceived || 0}</span>
                </div>
                
                <button onClick={() => { localStorage.removeItem('teaspoon_jwt'); setToken(null); setUserProfile(null); }} className="flex items-center gap-2 p-2 px-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-xs sm:text-sm font-medium" title="התנתק"><User className="w-4 h-4 sm:w-5 sm:h-5" /> התנתק</button>
                <button onClick={openAddModal} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 sm:px-4 rounded-lg text-xs sm:text-sm font-medium transition-colors shadow-sm"><Plus className="w-4 h-4" /> הוספת מטלה</button>
              </>
            ) : (
              <button onClick={() => window.location.href = `${API_BASE_URL}/auth/login`} className="flex items-center gap-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 px-3 py-2 sm:px-4 rounded-lg text-xs sm:text-sm font-medium transition-colors shadow-sm"><LogIn className="w-4 h-4" /> התחברות לעריכה</button>
            )}
          </div>
        </div>
      </header>

      {/* View Routing Logic */}
      <main className="max-w-6xl mx-auto px-4 py-8 flex flex-col md:flex-row gap-8 items-start">
        {currentView === 'admin' && token ? (
          <div className="w-full">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6 flex items-center gap-3">
              <ShieldAlert className="w-8 h-8 text-purple-600 dark:text-purple-400" />
              מערכת ניהול ובקרת איכות
            </h2>
            <AdminDashboard token={token} />
          </div>
        ) : (
          <>
            {/* Right Menu */}
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
                      
                      {searchQuery && !myCourses.includes(searchQuery) && (
                        <button 
                          onMouseDown={(e) => { e.preventDefault(); setNewCourseCode(searchQuery); setNewCourseName(''); setCourseCodeError(''); setIsAddCourseModalOpen(true); }} 
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

            {/* Main Content (Assignments) */}
            <div className="flex-1 relative z-10 flex flex-col min-h-full">
              
              {/* ✨ Unified Filter Row */}
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-6 relative z-20">
                <div className="flex items-center gap-2 ms-1 sm:ms-2 text-slate-500 dark:text-slate-400">
                  <Filter className="w-4 h-4" />
                  <span className="text-sm font-semibold">סינון:</span>
                </div>

                {/* Global Filter Overlay (Hides on desktop for hover filters, present for date or mobile) */}
                {openFilter && (
                  <div 
                    className={`fixed inset-0 z-40 ${openFilter === 'date' ? '' : 'md:hidden'}`} 
                    onClick={() => setOpenFilter(null)}
                  ></div>
                )}

                {/* Type Filter */}
                <div 
                  className="relative"
                  onMouseEnter={() => window.innerWidth >= 768 && setOpenFilter('type')}
                  onMouseLeave={() => window.innerWidth >= 768 && setOpenFilter(null)}
                >
                  <button 
                    onClick={() => setOpenFilter(prev => prev === 'type' ? null : 'type')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm relative z-50"
                  >
                    סוג: <span className="font-bold text-blue-600 dark:text-blue-400">{typeTranslations[activeTypeFilter]}</span>
                    <ChevronDown className={`w-3.5 h-3.5 opacity-50 transition-transform ${openFilter === 'type' ? 'rotate-180' : ''}`} />
                  </button>
                  {openFilter === 'type' && (
                    <div className="absolute top-full right-0 pt-1 w-32 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl transition-all duration-200 overflow-hidden flex flex-col z-50">
                      {assignmentTypes.map(type => (
                        <button 
                          key={type} 
                          onClick={() => { setActiveTypeFilter(type); setOpenFilter(null); }} 
                          className={`text-right px-4 py-2 text-sm hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors ${ activeTypeFilter === type ? 'text-blue-600 dark:text-blue-400 font-bold bg-blue-50/50 dark:bg-slate-700/50' : 'text-slate-700 dark:text-slate-300' }`}
                        >
                          {typeTranslations[type]}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Status Filter */}
                <div 
                  className="relative"
                  onMouseEnter={() => window.innerWidth >= 768 && setOpenFilter('status')}
                  onMouseLeave={() => window.innerWidth >= 768 && setOpenFilter(null)}
                >
                  <button 
                    onClick={() => setOpenFilter(prev => prev === 'status' ? null : 'status')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm relative z-50"
                  >
                    סטטוס: <span className="font-bold text-blue-600 dark:text-blue-400">{hideCompleted ? 'לא בוצעו' : 'הכל'}</span>
                    <ChevronDown className={`w-3.5 h-3.5 opacity-50 transition-transform ${openFilter === 'status' ? 'rotate-180' : ''}`} />
                  </button>
                  {openFilter === 'status' && (
                    <div className="absolute top-full right-0 pt-1 w-32 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl transition-all duration-200 overflow-hidden flex flex-col z-50">
                      <button 
                        onClick={() => { setHideCompleted(false); setOpenFilter(null); }} 
                        className={`text-right px-4 py-2 text-sm hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors ${ !hideCompleted ? 'text-blue-600 dark:text-blue-400 font-bold bg-blue-50/50 dark:bg-slate-700/50' : 'text-slate-700 dark:text-slate-300' }`}
                      >
                        הכל
                      </button>
                      <button 
                        onClick={() => { setHideCompleted(true); setOpenFilter(null); }} 
                        className={`text-right px-4 py-2 text-sm hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors ${ hideCompleted ? 'text-blue-600 dark:text-blue-400 font-bold bg-blue-50/50 dark:bg-slate-700/50' : 'text-slate-700 dark:text-slate-300' }`}
                      >
                        לא בוצעו
                      </button>
                    </div>
                  )}
                </div>

                {/* Dates Filter - Click Only, with centered transform on mobile to prevent cropping */}
                <div className="relative">
                  <button 
                    onClick={() => setOpenFilter(prev => prev === 'date' ? null : 'date')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-sm font-medium transition-colors shadow-sm relative z-50 ${ (dateRange.start || dateRange.end) ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700' }`}
                  >
                    <Calendar className={`w-4 h-4 ${ (dateRange.start || dateRange.end) ? 'text-blue-500' : 'text-slate-400' }`} />
                    תאריכים {(dateRange.start || dateRange.end) && '(פעיל)'}
                    <ChevronDown className={`w-3.5 h-3.5 opacity-50 transition-transform ${openFilter === 'date' ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {openFilter === 'date' && (
                    <div className="absolute top-full left-1/2 -translate-x-1/2 md:left-auto md:translate-x-0 md:right-0 mt-1 w-64 max-w-[calc(100vw-2rem)] p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-50 cursor-default">
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">מתאריך:</label>
                          <input 
                            type="date" 
                            value={dateRange.start} 
                            onChange={e => setDateRange(prev => ({...prev, start: e.target.value}))} 
                            className="w-full px-2 py-1.5 text-sm border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded outline-none text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500" 
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">עד תאריך:</label>
                          <input 
                            type="date" 
                            value={dateRange.end} 
                            onChange={e => setDateRange(prev => ({...prev, end: e.target.value}))} 
                            className="w-full px-2 py-1.5 text-sm border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded outline-none text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500" 
                          />
                        </div>
                        {(dateRange.start || dateRange.end) && (
                          <button 
                            onClick={() => { setDateRange({start: '', end: ''}); setOpenFilter(null); }} 
                            className="w-full text-center text-xs text-red-500 hover:text-red-600 dark:hover:text-red-400 font-semibold pt-2 border-t border-slate-100 dark:border-slate-700 mt-2 transition-colors"
                          >
                            נקה תאריכים
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {loading ? ( <div className="flex justify-center items-center h-40"><RefreshCw className="w-8 h-8 text-blue-500 animate-spin" /></div> ) 
              : fetchError ? ( <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-xl p-8 text-center transition-colors"><AlertCircle className="w-12 h-12 text-red-400 dark:text-red-500 mx-auto mb-4" /><h3 className="text-lg font-medium text-red-900 dark:text-red-200 mb-1">שגיאת תקשורת</h3><p className="text-red-700 dark:text-red-300 text-sm max-w-md mx-auto">{fetchError}</p></div> ) 
              : filteredAssignments.length === 0 ? ( <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 border-dashed rounded-xl p-12 text-center transition-colors"><CheckCircle className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" /><h3 className="text-lg font-medium text-slate-900 dark:text-slate-50 mb-1">אין מטלות להצגה</h3></div> ) 
              : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 content-start">
                  {filteredAssignments.map((assignment) => {
                    const courseTheme = getCourseTheme(assignment.courseCode);
                    return (
                      <div key={assignment.id} className={`relative p-5 rounded-xl border-s-4 shadow-sm group flex flex-col justify-between ${getCardClasses(assignment.deadline, courseTheme, assignment.isCompleted, assignment.isOptional)}`}>
                        {token && (
                          <div className="absolute top-4 end-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openEditModal(assignment)} className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-700 rounded-md transition-colors"><Edit className="w-4 h-4" /></button>
                            <button onClick={() => handleDelete(assignment.id)} className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-slate-700 rounded-md transition-colors"><Trash className="w-4 h-4" /></button>
                          </div>
                        )}
                        <div>
                          <div className="flex flex-wrap items-center gap-2 mb-3 pe-16">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-bold rounded-md border ${assignment.isCompleted ? 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-600' : `${courseTheme.badgeBg} ${courseTheme.badgeText} ${courseTheme.badgeBorder}`}`} dir="ltr">
                              {assignment.courseCode} - {coursesMap[assignment.courseCode]?.name}
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
                          
                          <div className={`flex items-center justify-between ms-8 ${assignment.isCompleted ? 'text-slate-400' : 'text-slate-700 dark:text-slate-300'}`}>
                            <div className={`flex items-center gap-2 text-sm font-medium ${assignment.isOptional && !assignment.isCompleted ? 'text-amber-600 dark:text-amber-400' : ''}`}>
                              <Clock className="w-4 h-4" /> 
                              <span>
                                {formatDateTime(assignment.deadline)} 
                                {assignment.isOptional && <span className="text-xs font-bold opacity-80 ms-1">(תאריך מומלץ)</span>}
                              </span>
                            </div>
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
                          {(assignment.attachments?.filter(a => a.category === 'assignment').length || 0) > 0 && (<div className="mb-3"><span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1.5 block">קבצי מטלה</span><div className="space-y-1.5">{assignment.attachments?.filter(a => a.category === 'assignment').map(att => renderAttachment(att, assignment.id))}</div></div>)}
                          
                          {(assignment.attachments?.filter(a => a.category === 'solution').length || 0) > 0 && (
                            <div>
                              <span className="text-[10px] font-bold text-emerald-500 dark:text-emerald-600 uppercase mb-1.5 flex items-center gap-1">
                                <Lightbulb className="w-3 h-3" /> רפרנסים ועזרים
                              </span>
                              <div className="space-y-1.5">
                                {assignment.attachments?.filter(a => a.category === 'solution')
                                  .sort((a, b) => (b.likes || 0) - (a.likes || 0)) 
                                  .map(att => renderAttachment(att, assignment.id))}
                              </div>
                            </div>
                          )}
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
          </>
        )}
      </main>

      {/* Assignment Modal */}
      {isModalOpen && token && (
        <div className="fixed inset-0 bg-slate-900/50 dark:bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-700">
            <div className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700 px-6 py-4 flex justify-between items-center"><h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">{isEditing ? 'עריכת מטלה' : 'הוספת מטלה חדשה'}</h2><button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-2xl leading-none">&times;</button></div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
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
              <div className="flex items-center gap-3 pt-2">
                <input type="checkbox" id="isOptional" checked={formData.isOptional} onChange={e => setFormData({...formData, isOptional: e.target.checked})} className="w-4 h-4 border border-slate-300 dark:border-slate-600 rounded focus:ring-2 focus:ring-blue-500 accent-blue-600 cursor-pointer" />
                <label htmlFor="isOptional" className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer">תאריך רשות (ללא התראה)</label>
              </div>
              <div className="pt-4 flex gap-3"><button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 font-medium transition-colors">ביטול</button><button type="submit" className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">שמירה</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Add Course Modal */}
      {isAddCourseModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 dark:bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-700">
            <div className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700 px-6 py-4 flex justify-between items-center"><h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">הוספת קורס חדש</h2><button onClick={() => setIsAddCourseModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-2xl leading-none">&times;</button></div>
            <form onSubmit={(e) => {
              e.preventDefault();
              const codeRegex = /^\d{3}0\d{3}$/;
              if (!codeRegex.test(newCourseCode)) { setCourseCodeError('קוד קורס חייב להיות בפורמט: XXX0XXX (לדוגמה: 1150204)'); return; }
              if (!newCourseName.trim()) { setCourseCodeError('שם הקורס לא יכול להיות ריק'); return; }
              if (coursesMap[newCourseCode]) { handleAddCourse(newCourseCode); } else {
                if (!myCourses.includes(newCourseCode)) {
                  const updated = [...myCourses, newCourseCode]; setMyCourses(updated); setVisibleCourses(prev => [...prev, newCourseCode]);
                  setCoursesMap(prev => ({ ...prev, [newCourseCode]: { name: newCourseName, hw_weight: 0, hw_keep: 0, hw_magen: false, ww_weight: 0, ww_keep: 0, ww_magen: false, exam_weight: 0, exam_magen: false } }));
                  syncCourses(updated);
                }
              }
              setIsAddCourseModalOpen(false); setNewCourseCode(''); setNewCourseName(''); setCourseCodeError('');
            }} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">קוד קורס</label>
                <input required type="text" placeholder="לדוגמה: 1150204" maxLength={7} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 dark:text-slate-100" value={newCourseCode} onChange={(e) => { setNewCourseCode(e.target.value.toUpperCase()); setCourseCodeError(''); }} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">שם הקורס</label>
                <input required type="text" placeholder="לדוגמה: חשבון 1" className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 dark:text-slate-100" value={newCourseName} onChange={(e) => { setNewCourseName(e.target.value); setCourseCodeError(''); }} />
              </div>
              {courseCodeError && <p className="text-sm text-red-600 dark:text-red-400">{courseCodeError}</p>}
              <div className="pt-4 flex gap-3"><button type="button" onClick={() => setIsAddCourseModalOpen(false)} className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 font-medium transition-colors">ביטול</button><button type="submit" className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">הוסף</button></div>
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

      {/* Intro Modal */}
      {showIntroModal && (
        <div className="fixed inset-0 bg-slate-900/50 dark:bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-700">
            <div className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Coffee className="w-6 h-6 text-blue-500" />
                ברוכים הבאים ל-Teaspoon!
              </h2>
              <button 
                onClick={() => {
                  setShowIntroModal(false);
                  if (dontShowAgain) {
                    localStorage.setItem('hasSeenIntro', 'true');
                  }
                }} 
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-2xl leading-none"
              >
                &times;
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="text-center mb-6">
                <div className="bg-slate-900 dark:bg-slate-700 p-3 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <Coffee className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-2">
                  Teaspoon - מערכת ניהול מטלות קהילתית
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  פלטפורמה למעקב מטלות, שיתוף פתרונות ועזרה הדדית
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <Coffee className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">ניהול כל המטלות במקום אחד עם תזכורות וסנכרון ליומן</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <Coffee className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">העלאת רפרנסים וגיליונות - הכל במקום אחד</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <Coffee className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">קהילה בסגנון ויקי - עדכונים מתבססים על משתמשי הקהילה</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <Coffee className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">חישוב ציונים - מעקב אוטומטי אחר הציונים המצטברים ממטלות שבוצעו</p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3 mb-4">
                  <input 
                    type="checkbox" 
                    id="dontShowAgain" 
                    checked={dontShowAgain} 
                    onChange={(e) => setDontShowAgain(e.target.checked)} 
                    className="w-4 h-4 border border-slate-300 dark:border-slate-600 rounded focus:ring-2 focus:ring-blue-500 accent-blue-600 cursor-pointer" 
                  />
                  <label htmlFor="dontShowAgain" className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                    אל תציג שוב
                  </label>
                </div>
                <button 
                  onClick={() => {
                    setShowIntroModal(false);
                    if (dontShowAgain) {
                      localStorage.setItem('hasSeenIntro', 'true');
                    }
                  }}
                  className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  בואו נתחיל!
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}