import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  BookOpen, Calendar, Clock, Plus, CheckCircle, RefreshCw,
  AlertCircle, Edit, Trash, Filter, Sun, Moon,
  LogIn, User, Search, X, Check, Paperclip, FileText, Coffee,
  XCircle, Calculator, Shield, Settings, ChevronDown,
  Heart, Users, ShieldAlert, ArrowLeft, ListChecks, Ban,
  Trophy, LayoutGrid, List, Download, UploadCloud, Loader2,
  Star, Zap, Wrench, Sparkles
} from 'lucide-react';

// --- Production/Development API Configuration ---
const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'myteaspoon.tech') {
      return 'https://api.myteaspoon.tech/api/v2'; // Production
    }
    if (window.location.hostname === 'dev.myteaspoon.tech') {
      return 'https://api-dev.myteaspoon.tech/api/v2'; // Staging/Dev
    }
  }
  return 'http://localhost:8001/api/v2'; // Local development
};

const API_BASE_URL = getApiBaseUrl();

// --- Environment Awareness ---
const isDevEnvironment = () => {
  if (typeof window !== 'undefined') {
    return window.location.hostname === 'dev.myteaspoon.tech' || window.location.hostname === 'localhost';
  }
  return false;
};

const IS_DEV = isDevEnvironment();

const CHANGELOG_ICONS: Record<string, React.ElementType> = {
  Star,      // For New Features
  Zap,       // For Performance/Speed
  Sparkles,  // For UI/Design
  Wrench,    // For Bug Fixes
  Shield     // For Security/Permissions
};

const DynamicChangelogIcon = ({ name, className }: { name: string, className?: string }) => {
  const Icon = CHANGELOG_ICONS[name] || Star; // Fallback to Star if missing
  return <Icon className={className} />;
};

// --- TypeScript Interfaces ---
interface Attachment { id: number; filename: string; url: string; uploader_id: number; category: string; likes?: number; isLikedByMe?: boolean; }
interface Assignment { id: number; title: string; courseCode: string; type: string; deadline: string; recommended_deadline?: string | null; isCompleted: boolean; grade: number | null; attachments: Attachment[]; }
interface UserProfile { id: number; email: string; name: string; picture: string; role: string; totalLikesReceived?: number; total_credits?: number; weighted_sum?: number; previous_total_credits?: number; previous_weighted_sum?: number; binary_credits?: number; previous_binary_credits?: number; last_seen_version?: number; }
interface CourseSyllabus { name: string; hw_weight: number; hw_keep: number; hw_magen: boolean; ww_weight: number; ww_keep: number; ww_magen: boolean; lab_report_weight: number; lab_report_keep: number; lab_report_magen: boolean; exam_weight: number; exam_magen: boolean; }
interface CoursesMap { [key: string]: CourseSyllabus; }
interface AssignmentFormData { title: string; courseCode: string; courseName: string; type: string; deadline: string; time: string; recommended_date: string; recommended_time: string; }
interface CourseTheme { startBorder: string; hover: string; badgeBg: string; badgeText: string; badgeBorder: string; dot: string; }
interface GradeSummary { earned: string; possible: string; isMagen: boolean; magenStatus: string; unconfigured: boolean; }

// Admin Interfaces
interface AdminUser { id: number; name: string; email: string; role: string; picture: string; }
interface AuditLog { id: number; user_name: string; user_email: string; action: string; entity_type: string; entity_id: string; old_data: string; new_data: string; status: string; created_at: string; }

// Leaderboard Interfaces
interface LeaderboardEntry { id: number; name: string; picture: string; score: number; }
interface LeaderboardSection { top_3: LeaderboardEntry[]; me: { rank: number; entry: LeaderboardEntry; }; }
interface LeaderboardData { semester: LeaderboardSection; all_time: LeaderboardSection; }

interface Summary {
  id: number;
  filename: string;
  url: string;
  uploader_id: number;
  uploader_name: string;
  uploader_picture: string;
  upload_date: string;
  likes: number;
  isLikedByMe: boolean;
}

const typeTranslations: Record<string, string> = { 'All': 'הכל', 'Assignment': 'גיליון', 'Webwork': 'וובוורק', 'Exam': 'מבחן', 'lab_report': 'דוח מעבדה', 'other': 'אחר' };

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

const formatLogDate = (val: any) => {
  if (!val) return 'ריק';
  try {
    return new Intl.DateTimeFormat('he-IL', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    }).format(new Date(val));
  } catch {
    return String(val);
  }
};

const translateField = (key: string) => {
  const dictionary: Record<string, string> = {
    title: 'כותרת',
    description: 'תיאור',
    type: 'סוג מטלה',
    deadline: 'תאריך הגשה',
    recommended_deadline: 'תאריך מומלץ)',
    courseCode: 'קוד קורס',
    is_active: 'סטטוס',
    color: 'צבע',
    name: 'שם הקורס'
  };
  return dictionary[key] || key;
};

// Helper to determine if a field is a date
const isDateField = (key: string) => key.toLowerCase().includes('date') || key.toLowerCase().includes('deadline');

// ==========================================
// ADMIN DASHBOARD COMPONENT
// ==========================================
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
  const [activeTab, setActiveTab] = useState<'users' | 'logs' | 'changelogs'>('users');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Changelog State
  const [appReleases, setAppReleases] = useState<any[]>([]);
  const [editingChangelog, setEditingChangelog] = useState<any | null>(null);
  const currentAppVersion = appReleases.length > 0 ? Math.max(...appReleases.map(r => r.version)) : 0;

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
        fetchAdminData();
      } else {
        alert("שגיאה בחסימת המשתמש.");
      }
    } catch {
      alert("שגיאת תקשורת.");
    }
  };

  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string[]>([]);

  const extractCourseCode = (entityId: string) => {
    if (!entityId) return "";
    if (entityId.includes(':')) {
      const afterColon = entityId.split(':')[1];
      return afterColon.split(' - ')[0].trim();
    }
    return entityId.trim();
  };

  const pendingCourseCodes = useMemo(() => {
    const pendingLogs = logs.filter(log => log.status === 'PENDING');
    const codes = pendingLogs.map(log => extractCourseCode(log.entity_id));
    return Array.from(new Set(codes)).sort();
  }, [logs]);

  const displayedLogs = useMemo(() => {
    if (selectedCourseFilter.length === 0) return logs;
    return logs.filter(log => selectedCourseFilter.includes(extractCourseCode(log.entity_id)));
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

      {/* --- TABS NAVIGATION --- */}
      <div className="flex overflow-x-auto standard-scrollbar border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 shrink-0 px-4 pt-4 gap-4">
        <button onClick={() => setActiveTab('users')} className={`flex items-center gap-2 pb-3 px-2 font-bold transition-colors border-b-2 whitespace-nowrap ${activeTab === 'users' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
          <Users className="w-4 h-4" /> ניהול משתמשים
        </button>
        <button onClick={() => setActiveTab('logs')} className={`flex items-center gap-2 pb-3 px-2 font-bold transition-colors border-b-2 whitespace-nowrap ${activeTab === 'logs' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
          <ListChecks className="w-4 h-4" /> אישורים ממתינים {logs.length > 0 && `(${logs.length})`}
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

            {pendingCourseCodes.length > 0 && (
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
                {pendingCourseCodes.map(code => (
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

                const courseCode = extractCourseCode(log.entity_id);
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
                          {courseCode} - {coursesMap[courseCode]?.name || 'קורס לא מזוהה'}
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
        ) : (
          /* 👈 NEW CHANGELOGS TAB */
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">ניהול עדכוני מערכת (Changelogs)</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">הוסף גרסאות חדשות שיקפצו לכל המשתמשים.</p>
              </div>
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
                      fetchAdminData(); // Smooth SPA reload instead of window.location.reload()
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
                        await fetch(`${API_BASE_URL}/admin/changelogs/${log.id}?token=${token}`, { method: 'DELETE' });
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
    </div>
  );
};


// ==========================================
// MAIN APP COMPONENT
// ==========================================
export default function App() {
  const [token, setToken] = useState<string | null>(typeof window !== 'undefined' ? localStorage.getItem('teaspoon_jwt') : null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  const [currentView, setCurrentView] = useState<'app' | 'admin' | 'summaries'>('app');

  // View Mode State (Cards vs List)
  const [viewMode, setViewMode] = useState<'cards' | 'list'>(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('teaspoon_view_mode') as 'cards' | 'list' || 'cards';
    return 'cards';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem('teaspoon_view_mode', viewMode);
  }, [viewMode]);

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

  const [isProgressMinimized, setIsProgressMinimized] = useState<boolean>(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('teaspoon_progress_minimized') === 'true';
    return false;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('teaspoon_progress_minimized', String(isProgressMinimized));
    }
  }, [isProgressMinimized]);

  const [isCourseListMinimized, setIsCourseListMinimized] = useState<boolean>(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('teaspoon_course_list_minimized') === 'true';
    return false;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('teaspoon_course_list_minimized', String(isCourseListMinimized));
    }
  }, [isCourseListMinimized]);

  const [dateRange, setDateRange] = useState<{ start: string, end: string }>({ start: '', end: '' });

  // State for Dropdowns (Hover on desktop, Click on mobile)
  const [openFilter, setOpenFilter] = useState<'type' | 'status' | 'date' | null>(null);
  const desktopFilterRef = useRef<HTMLDivElement>(null);

  // The "Invisible Listener" that replaces the physical overlay
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // If a filter is open, and the user clicked completely outside the filter row, close it!
      if (desktopFilterRef.current && !desktopFilterRef.current.contains(event.target as Node)) {
        setOpenFilter(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [loading, setLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [activeTypeFilter, setActiveTypeFilter] = useState<string>('All');
  const assignmentTypes = ['All', 'Assignment', 'Webwork', 'Exam'];

  // Assignments Modal State
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [currentEditId, setCurrentEditId] = useState<number | null>(null);
  const [formData, setFormData] = useState<AssignmentFormData>({
    title: '', courseCode: '', courseName: '', type: 'Assignment',
    deadline: '', time: '',
    recommended_date: '', recommended_time: ''
  });

  // Course Settings Modal State
  const [isCourseModalOpen, setIsCourseModalOpen] = useState<boolean>(false);
  const [editingCourseCode, setEditingCourseCode] = useState<string | null>(null);
  const [editModalCourseCode, setEditModalCourseCode] = useState<string>('');
  const [courseFormData, setCourseFormData] = useState<CourseSyllabus>({ name: '', hw_weight: 0, hw_keep: 0, hw_magen: false, ww_weight: 0, ww_keep: 0, ww_magen: false, lab_report_weight: 0, lab_report_keep: 0, lab_report_magen: false, exam_weight: 0, exam_magen: false });

  // File Interaction State
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const [editingFileId, setEditingFileId] = useState<number | null>(null);
  const [editFileName, setEditFileName] = useState<string>('');

  // --- Secure JIT Download State & Handler ---
  const [downloadingAttachmentId, setDownloadingAttachmentId] = useState<number | null>(null);

  const handleSafeFileClick = async (e: React.MouseEvent, att: Attachment) => {
    e.preventDefault();
    e.stopPropagation();

    // 1. Instantly open a blank tab (Crucial to bypass popup blockers)
    const newTab = window.open('', '_blank');

    if (!newTab) {
      alert("הדפדפן חסם את פתיחת החלון. אנא אשר חלונות קופצים (Pop-ups) עבור אתר זה.");
      return;
    }

    try {
      setDownloadingAttachmentId(att.id);

      // 2. Ask backend to mint a fresh 60-second HMAC URL
      const res = await fetch(`${API_BASE_URL}/attachments/${att.id}/generate-link`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) throw new Error("Failed to generate secure link");

      const data = await res.json();

      // 3. Redirect the blank tab to the freshly generated API proxy URL
      const fullUrl = data.url.startsWith('http')
        ? data.url
        : `${API_BASE_URL.replace('/api/v2', '')}${data.url}`;

      newTab.location.href = fullUrl;

    } catch (error) {
      console.error("Link generation failed:", error);
      newTab.close(); // Prevent user from staring at a dead white page
      alert("שגיאה בגישה לקובץ. אנא נסה שוב.");
    } finally {
      setDownloadingAttachmentId(null);
    }
  };

  // Add Course Modal State
  const [isAddCourseModalOpen, setIsAddCourseModalOpen] = useState<boolean>(false);
  const [newCourseCode, setNewCourseCode] = useState<string>('');
  const [newCourseName, setNewCourseName] = useState<string>('');
  const [courseCodeError, setCourseCodeError] = useState<string>('');
  const [isAddingCourse, setIsAddingCourse] = useState<boolean>(false);

  // --- Changelog & Intro Modal State ---
  const [appReleases, setAppReleases] = useState<any[]>([]);
  const [unseenReleases, setUnseenReleases] = useState<any[]>([]);
  const [showIntroModal, setShowIntroModal] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(true);

  // 1. Fetch Changelogs on mount
  useEffect(() => {
    const fetchChangelogs = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/changelogs`);
        if (res.ok) {
          const data = await res.json();
          setAppReleases(data);
        }
      } catch (err) {
        console.error("Failed to fetch changelogs", err);
      }
    };
    fetchChangelogs();
  }, []);

  // 2. Check if the user needs to see the modal
  useEffect(() => {
    if (userProfile && appReleases.length > 0) {
      const currentAppVersion = Math.max(...appReleases.map(r => r.version), 0);
      const userVersion = userProfile.last_seen_version || 0;

      if (userVersion < currentAppVersion) {
        const newReleases = appReleases.filter(r => r.version > userVersion);
        setUnseenReleases(newReleases);
        setShowIntroModal(true);
      }
    }
  }, [userProfile, appReleases]);

  // 3. Handler for closing the modal and updating the DB
  const handleCloseIntroModal = async () => {
    setShowIntroModal(false);

    if (dontShowAgain && token && appReleases.length > 0) {
      const currentAppVersion = Math.max(...appReleases.map(r => r.version));
      try {
        await fetch(`${API_BASE_URL}/users/me/intro-version`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ version: currentAppVersion })
        });

        // Optimistically update local profile
        setUserProfile(prev => prev ? { ...prev, last_seen_version: currentAppVersion } : prev);
      } catch (err) {
        console.error("Failed to update intro version", err);
      }
    }
  };

  // Mobile Filter Modal State
  const [isMobileFilterModalOpen, setIsMobileFilterModalOpen] = useState<boolean>(false);

  // Degree Progress Modal State
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
  const [progressForm, setProgressForm] = useState({
    is_redo: false,
    is_pass_fail: false,
    old_was_pass_fail: false,
    credits: '',
    new_score: '',
    old_score: ''
  });
  const [isProgressUpdating, setIsProgressUpdating] = useState(false);

  const [logs, setLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    const fetchAdminLogs = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/admin/logs`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) setLogs(await res.json());
      } catch (e) {
        console.error("Error fetching logs:", e);
      }
    };

    if (token && userProfile && ['admin', 'owner'].includes(userProfile.role)) {
      fetchAdminLogs();
    }
  }, [token, userProfile, currentView]);

  //filter menu ref for outside click detection
  const filterMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target as Node)) {
        setOpenFilter(null); // Close the menu!
      }
    };

    // Only attach the listener if the menu is actually open
    if (openFilter) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openFilter]);

  // Summaries State
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [selectedSummaryCourse, setSelectedSummaryCourse] = useState<string>('');
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [editingSummaryId, setEditingSummaryId] = useState<number | null>(null);
  const [summaryFormData, setSummaryFormData] = useState<{ filename: string; file: File | null }>({ filename: '', file: null });
  const [isUploadingSummary, setIsUploadingSummary] = useState<boolean>(false);

  // Fetch summaries when view changes or course is selected
  useEffect(() => {
    const fetchSummaries = async () => {
      if (!selectedSummaryCourse) return;
      try {
        const res = await fetch(`${API_BASE_URL}/summaries/${selectedSummaryCourse}`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        if (res.ok) setSummaries(await res.json());
      } catch (e) {
        console.error("Error fetching summaries:", e);
      }
    };

    if (currentView === 'summaries') fetchSummaries();
  }, [currentView, selectedSummaryCourse, token]);

  const handleSubmitSummary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSummaryCourse || !token) return;

    if (!editingSummaryId && !summaryFormData.file) {
      alert("יש לבחור קובץ להעלאה");
      return;
    }

    setIsUploadingSummary(true);
    const formData = new FormData();
    formData.append('filename', summaryFormData.filename);
    if (summaryFormData.file) formData.append('file', summaryFormData.file);
    if (!editingSummaryId) formData.append('courseCode', selectedSummaryCourse);

    try {
      const url = editingSummaryId ? `${API_BASE_URL}/summaries/${editingSummaryId}` : `${API_BASE_URL}/summaries`;
      const method = editingSummaryId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (res.ok) {
        setIsSummaryModalOpen(false);
        const fetchRes = await fetch(`${API_BASE_URL}/summaries/${selectedSummaryCourse}`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (fetchRes.ok) setSummaries(await fetchRes.json());
      } else {
        alert("שגיאה בשמירת הסיכום");
      }
    } catch {
      alert("שגיאת תקשורת");
    } finally {
      setIsUploadingSummary(false);
    }
  };

  const toggleSummaryLike = async (summaryId: number) => {

    if (!token) {
      alert("יש להתחבר כדי לסמן לייק לפתרון.");
      return;
    }

    const summary = summaries.find(s => s.id === summaryId);
    if (summary && userProfile && summary.uploader_id === userProfile.id) {
      alert("לא ניתן לסמן לייק לסיכום שלך.");
      return;
    }

    // Optimistic UI Update
    setSummaries(prev => prev.map(s =>
      s.id === summaryId
        ? { ...s, isLikedByMe: !s.isLikedByMe, likes: s.isLikedByMe ? s.likes - 1 : s.likes + 1 }
        : s
    ));
    await fetch(`${API_BASE_URL}/summaries/${summaryId}/like`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
  };

  const deleteSummary = async (summaryId: number, uploaderId: number) => {
    if (!token) return;
    const isOwnerOrAdmin = userProfile?.id === uploaderId || ['admin', 'owner'].includes(userProfile?.role || '');
    if (!isOwnerOrAdmin) return alert("אין לך הרשאה למחוק קובץ זה.");
    if (!window.confirm("האם אתה בטוח שברצונך למחוק סיכום זה?")) return;

    const res = await fetch(`${API_BASE_URL}/summaries/${summaryId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.ok) setSummaries(prev => prev.filter(s => s.id !== summaryId));
  };

  // Leaderboard Modal State
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState<boolean>(false);
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardData | null>(null);
  const [isLeaderboardLoading, setIsLeaderboardLoading] = useState<boolean>(false);

  // Leaderboard Tab State
  const [activeLeaderboardTab, setActiveLeaderboardTab] = useState<'semester' | 'all_time'>('semester');

  const fetchLeaderboard = async () => {
    if (!token) return;
    setIsLeaderboardLoading(true);
    setIsLeaderboardOpen(true);
    try {
      const res = await fetch(`${API_BASE_URL}/users/leaderboard`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) setLeaderboardData(await res.json());
    } catch {
      alert("שגיאה בטעינת לוח התוצאות");
    } finally {
      setIsLeaderboardLoading(false);
    }
  };

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
      const [coursesRes, assignmentsRes] = await Promise.all([fetch(`${API_BASE_URL}/courses`), fetch(`${API_BASE_URL}/assignments`, { headers })]);
      if (!coursesRes.ok || !assignmentsRes.ok) throw new Error("Network error");

      const rawMap = await coursesRes.json(); const mappedMap: CoursesMap = {};
      Object.entries(rawMap).forEach(([k, v]: [string, any]) => {
        mappedMap[k] = { name: v.name || '', hw_weight: v.hw_weight || 0, hw_keep: v.hw_keep !== undefined ? v.hw_keep : (v.hw_drop || 0), hw_magen: v.hw_magen || false, ww_weight: v.ww_weight || 0, ww_keep: v.ww_keep !== undefined ? v.ww_keep : (v.ww_drop || 0), ww_magen: v.ww_magen || false, exam_weight: v.exam_weight || 0, exam_magen: v.exam_magen || false, lab_report_weight: v.lab_report_weight || 0, lab_report_keep: v.lab_report_keep !== undefined ? v.lab_report_keep : (v.lab_report_drop || 0), lab_report_magen: v.lab_report_magen || false };
      });
      setCoursesMap(mappedMap);

      let fetchedAssignments: Assignment[] = await assignmentsRes.json();

      if (token) {
        try {
          const [userRes, userCoursesRes] = await Promise.all([fetch(`${API_BASE_URL}/users/me`, { headers }), fetch(`${API_BASE_URL}/users/me/courses`, { headers })]);
          if (userRes.ok) {
            setUserProfile(await userRes.json());
            const dbCourses = await userCoursesRes.json();
            setMyCourses(dbCourses);
            setVisibleCourses([]);
          } else throw new Error("Unauthorized");
        } catch { localStorage.removeItem('teaspoon_jwt'); setToken(null); }
      } else {
        const localCourses = JSON.parse(localStorage.getItem('guest_courses') || '[]');
        const localCompletions = JSON.parse(localStorage.getItem('guest_completions') || '[]');
        const localGrades = JSON.parse(localStorage.getItem('guest_grades') || '{}');
        setMyCourses(localCourses); setVisibleCourses([]);
        fetchedAssignments = fetchedAssignments.map(a => ({ ...a, isCompleted: localCompletions.includes(a.id), grade: localGrades[a.id] ?? null }));
      }
      setAssignments(fetchedAssignments.map(a => ({
        ...a,
        deadline: a.deadline.endsWith('Z') ? a.deadline : `${a.deadline}Z`
      })).sort((a, b) => {
        // Sort by recommended_deadline if available, otherwise fallback to deadline
        const timeA = new Date(a.recommended_deadline || a.deadline).getTime();
        const timeB = new Date(b.recommended_deadline || b.deadline).getTime();
        return timeA - timeB;
      }));
    } catch { setFetchError('שגיאת תקשורת עם השרת.'); } finally { setLoading(false); }
  }, [token]);

  useEffect(() => { if (currentView === 'app') { fetchAllData(); } }, [fetchAllData, currentView]);

  // --- Functions ---
  const syncCourses = (newCourses: string[]) => {
    if (token) fetch(`${API_BASE_URL}/users/me/courses`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(newCourses) });
    else localStorage.setItem('guest_courses', JSON.stringify(newCourses));
  };
  const handleAddCourse = async (code: string) => {
    if (!code.trim()) return false;

    if (!myCourses.includes(code)) {
      const updated = [...myCourses, code];

      if (token) {
        try {
          // Await the server response BEFORE updating the UI!
          const res = await fetch(`${API_BASE_URL}/users/me/courses`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(updated)
          });

          if (!res.ok) throw new Error('Sync failed');
        } catch (e) {
          alert("אופס! נראה שיש בעיית חיבור. השינוי לא נשמר בשרת.");
          return false;
        }
      } else {
        localStorage.setItem('guest_courses', JSON.stringify(updated));
      }

      setMyCourses(updated);
      if (visibleCourses.length > 0) {
        setVisibleCourses(prev => [...prev, code]);
      }
    }

    setSearchQuery('');
    setIsSearchFocused(false);
    return true; // Success!
  };
  const handleRemoveCourse = (code: string) => { const updated = myCourses.filter(c => c !== code); setMyCourses(updated); setVisibleCourses(prev => prev.filter(c => c !== code)); syncCourses(updated); };
  const toggleVisibleCourse = (code: string) => setVisibleCourses(prev => prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]);

  const openCourseSettings = (code: string) => {
    setEditingCourseCode(code);
    setEditModalCourseCode(code);
    const syl = coursesMap[code] || { name: '', hw_weight: 0, hw_keep: 0, hw_magen: false, ww_weight: 0, ww_keep: 0, ww_magen: false, exam_weight: 0, exam_magen: false };
    setCourseFormData(syl); setIsCourseModalOpen(true);
  };

  const handleSaveCourseSettings = async (e: React.FormEvent) => {
    e.preventDefault(); if (!token || !editingCourseCode) return;

    let finalCourseCode = editingCourseCode;

    // Handle course code rename for admins
    if (editModalCourseCode !== editingCourseCode && (userProfile?.role === 'admin' || userProfile?.role === 'owner')) {
      try {
        const renameRes = await fetch(`${API_BASE_URL}/admin/courses/${editingCourseCode}/code`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ new_code: editModalCourseCode })
        });

        if (!renameRes.ok) {
          alert("שגיאה בשינוי מספר הקורס. ייתכן והמספר כבר קיים.");
          return;
        }

        finalCourseCode = editModalCourseCode;

        // Cascade changes locally immediately
        setMyCourses(prev => {
          const updated = prev.map(c => c === editingCourseCode ? editModalCourseCode : c);
          syncCourses(updated); // Resync to the DB!
          return updated;
        });
        setVisibleCourses(prev => prev.map(c => c === editingCourseCode ? editModalCourseCode : c));
        setAssignments(prev => prev.map(a => a.courseCode === editingCourseCode ? { ...a, courseCode: editModalCourseCode } : a));

        setCoursesMap(prev => {
          const newMap = { ...prev };
          newMap[editModalCourseCode] = courseFormData;
          delete newMap[editingCourseCode];
          return newMap;
        });
        setEditingCourseCode(editModalCourseCode);
      } catch {
        alert("שגיאת תקשורת בעת שינוי מספר הקורס.");
        return;
      }
    } else {
      setCoursesMap(prev => ({ ...prev, [editingCourseCode]: courseFormData }));
    }

    setIsCourseModalOpen(false);
    const payload = { ...courseFormData, hw_drop: courseFormData.hw_keep, ww_drop: courseFormData.ww_keep };
    try { await fetch(`${API_BASE_URL}/courses/${finalCourseCode}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(payload) }); } catch { }
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

  const openAddModal = () => {
    setIsEditing(false);
    setCurrentEditId(null);
    setFormData({
      title: '', courseCode: '', courseName: '', type: 'Assignment',
      deadline: '', time: '',
      recommended_date: '', recommended_time: ''
    });
    setIsAssignmentModalOpen(true);
  };

  const openEditModal = (assignment: Assignment) => {
    const d = new Date(assignment.deadline);
    const r = assignment.recommended_deadline ? new Date(assignment.recommended_deadline) : null;

    setIsEditing(true);
    setCurrentEditId(assignment.id);

    setFormData({
      title: assignment.title,
      courseCode: assignment.courseCode,
      courseName: coursesMap[assignment.courseCode]?.name || '',
      type: assignment.type,
      deadline: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
      time: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
      recommended_date: r ? `${r.getFullYear()}-${String(r.getMonth() + 1).padStart(2, '0')}-${String(r.getDate()).padStart(2, '0')}` : '',
      recommended_time: r ? `${String(r.getHours()).padStart(2, '0')}:${String(r.getMinutes()).padStart(2, '0')}` : ''
    });
    setIsAssignmentModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    const rec_deadline = formData.recommended_date ? new Date(`${formData.recommended_date}T${formData.recommended_time || '23:59'}:00`).toISOString() : null;

    const payload = {
      title: formData.title,
      courseCode: formData.courseCode,
      type: formData.type,
      deadline: new Date(`${formData.deadline}T${formData.time || '23:59'}:00`).toISOString(),
      recommended_deadline: rec_deadline
    };

    try {
      if (!coursesMap[formData.courseCode]) {
        await fetch(`${API_BASE_URL}/courses/${formData.courseCode}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ name: formData.courseName, hw_weight: 0, hw_drop: 0, ww_weight: 0, ww_drop: 0, exam_weight: 0, hw_magen: false, ww_magen: false, exam_magen: false }) });
      }
      await fetch(`${API_BASE_URL}/assignments${isEditing ? `/${currentEditId}` : ''}`, { method: isEditing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(payload) });
      fetchAllData();
      setIsAssignmentModalOpen(false);
      if (!myCourses.includes(payload.courseCode)) handleAddCourse(payload.courseCode);
    } catch { alert("שגיאה בשמירה."); }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("למחוק מטלה זו?")) return;
    try { await fetch(`${API_BASE_URL}/assignments/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } }); setAssignments(prev => prev.filter(a => a.id !== id)); } catch { alert("שגיאה במחיקה."); }
  };

  const calculateCourseGrade = (code: string): GradeSummary | null => {
    const syllabus = coursesMap[code] || {
      name: '',
      hw_weight: 0, hw_keep: 0, hw_magen: false,
      ww_weight: 0, ww_keep: 0, ww_magen: false,
      lab_report_weight: 0, lab_report_keep: 0, lab_report_magen: false,
      exam_weight: 0, exam_magen: false
    };

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
    const lab = processCategory('lab_report', syllabus.lab_report_weight || 0, syllabus.lab_report_keep || 0);
    const exam = processCategory('Exam', syllabus.exam_weight || 0, 0);

    let final_hw_earned = hw.earned; let final_hw_possible = hw.possible;
    let final_ww_earned = ww.earned; let final_ww_possible = ww.possible;
    let final_lab_earned = lab.earned; let final_lab_possible = lab.possible;
    let final_exam_earned = exam.earned; let final_exam_possible = exam.possible;

    let activeCategories = 0;
    let magenCategories = 0;

    // Only count categories that actually have weight in the syllabus
    if (hw.possible > 0) {
      activeCategories++;
      if (syllabus.hw_magen) magenCategories++;
    }
    if (ww.possible > 0) {
      activeCategories++;
      if (syllabus.ww_magen) magenCategories++;
    }
    if (lab.possible > 0) {
      activeCategories++;
      if (syllabus.lab_report_magen) magenCategories++;
    }

    let magenStatus: 'none' | 'partial' | 'full' = 'none';
    if (magenCategories > 0) {
      // If all active assignment types have a magen, it's 'full'. Otherwise, it's 'partial' (mixed).
      magenStatus = (magenCategories === activeCategories) ? 'full' : 'partial';
    }

    // The actual grade calculation math (remains unchanged)
    if (exam.possible > 0 && exam.rawAvg !== undefined) {
      if (syllabus.hw_magen && hw.possible > 0 && hw.rawAvg !== undefined && hw.rawAvg < exam.rawAvg) {
        final_exam_possible += hw.possible; final_exam_earned += (exam.rawAvg / 100) * hw.possible; final_hw_possible = 0; final_hw_earned = 0;
      }
      if (syllabus.ww_magen && ww.possible > 0 && ww.rawAvg !== undefined && ww.rawAvg < exam.rawAvg) {
        final_exam_possible += ww.possible; final_exam_earned += (exam.rawAvg / 100) * ww.possible; final_ww_possible = 0; final_ww_earned = 0;
      }
      if (syllabus.lab_report_magen && lab.possible > 0 && lab.rawAvg !== undefined && lab.rawAvg < exam.rawAvg) {
        final_exam_possible += lab.possible; final_exam_earned += (exam.rawAvg / 100) * lab.possible; final_lab_possible = 0; final_lab_earned = 0;
      }
    }

    const totalEarned = final_hw_earned + final_ww_earned + final_lab_earned + final_exam_earned;
    const totalPossible = final_hw_possible + final_ww_possible + final_lab_possible + final_exam_possible;

    if (totalPossible === 0) {
      const gradedItems = courseAssignments.filter(a => a.grade !== null && a.type !== 'other');
      if (gradedItems.length === 0) return null;
      const avg = gradedItems.reduce((sum, a) => sum + (a.grade as number), 0) / gradedItems.length;
      return { earned: avg.toFixed(1), possible: '100', isMagen: false, magenStatus: 'none', unconfigured: true };
    }

    return { earned: totalEarned.toFixed(1), possible: totalPossible.toFixed(1), isMagen: magenStatus !== 'none', magenStatus, unconfigured: false };
  };



  const handleProgressUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setIsProgressUpdating(true);
    try {
      const payload = {
        is_redo: progressForm.is_redo,
        is_pass_fail: progressForm.is_pass_fail,
        old_was_pass_fail: progressForm.old_was_pass_fail,
        credits: parseFloat(progressForm.credits),
        // Send null if it's a pass/fail course, otherwise parse the score
        new_score: progressForm.is_pass_fail ? null : parseFloat(progressForm.new_score),
        old_score: (progressForm.is_redo && !progressForm.old_was_pass_fail) ? parseFloat(progressForm.old_score) : null
      };

      const res = await fetch(`${API_BASE_URL}/users/me/progress/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setUserProfile(await res.json());
        setIsProgressModalOpen(false);
        // Reset all fields including the new checkboxes
        setProgressForm({ is_redo: false, is_pass_fail: false, old_was_pass_fail: false, credits: '', new_score: '', old_score: '' });
      } else {
        alert("שגיאה בעדכון הנתונים");
      }
    } catch {
      alert("שגיאת תקשורת");
    } finally {
      setIsProgressUpdating(false);
    }
  };

  const handleProgressAction = async (action: 'undo' | 'reset') => {
    if (action === 'reset' && !window.confirm("האם לאפס לחלוטין את חישוב הממוצע ונקודות הזכות?")) return;
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/users/me/progress/${action}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setUserProfile(await res.json());
    } catch {
      alert("שגיאת תקשורת");
    }
  };

  const handleCalendarSync = () => {
    let calendarUrl = '';
    if (token) { calendarUrl = `${API_BASE_URL}/calendar/feed?token=${token}`; }
    else if (myCourses.length > 0) { calendarUrl = `${API_BASE_URL}/calendar/feed?courses=${myCourses.join(',')}`; }
    else { alert("אין קורסים מסומנים לסנכרון."); return; }
    navigator.clipboard.writeText(calendarUrl).then(() => { setIsCalendarCopied(true); setTimeout(() => setIsCalendarCopied(false), 2000); }).catch(() => { alert("שגיאה בהעתקת הקישור ליומן. אנא נסה שוב."); });
  };

  const handleFileUpload = async (assignmentId: number, e: React.ChangeEvent<HTMLInputElement>, category: string) => {
    if (!e.target.files || e.target.files.length === 0 || !token) return;
    const file = e.target.files[0]; const inputElement = e.target; setUploadingId(assignmentId);
    const fd = new FormData(); fd.append('file', file); fd.append('category', category);
    try {
      await fetch(`${API_BASE_URL}/assignments/${assignmentId}/attachments`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: fd }); await fetchAllData();
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

  // Optimistic Like Toggle
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
    const activeCourses = visibleCourses.length > 0 ? visibleCourses : myCourses;
    if (!activeCourses.includes(a.courseCode)) return false;
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

  const renderAttachment = (att: Attachment, assignmentId: number) => {
    const isSolution = att.category === 'solution';
    const colorClasses = isSolution
      ? 'text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300'
      : 'text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300';

    return (
      <div key={att.id} className="flex items-start justify-between bg-slate-50 dark:bg-slate-900/50 rounded p-1.5 border border-slate-100 dark:border-slate-700/50 group/file gap-2">

        {editingFileId === att.id ? (
          <div className="flex items-center gap-2 flex-1 ml-1" onClick={e => e.preventDefault()}>
            <input autoFocus type="text" value={editFileName} onChange={e => setEditFileName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleRenameAttachment(assignmentId, att.id)} className="text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-600 rounded px-1.5 py-0.5 w-full outline-none focus:ring-1 focus:ring-blue-500" />
            <button onClick={() => handleRenameAttachment(assignmentId, att.id)} className="text-emerald-500 hover:text-emerald-600 p-0.5 shrink-0"><Check className="w-3 h-3" /></button>
            <button onClick={() => setEditingFileId(null)} className="text-slate-400 hover:text-red-500 p-0.5 shrink-0"><X className="w-3 h-3" /></button>
          </div>
        ) : (
          <button
            onClick={(e) => handleSafeFileClick(e, att)}
            disabled={downloadingAttachmentId === att.id}
            title="פתיחת קובץ בחלון חדש"
            className={`group flex items-start gap-1.5 flex-1 hover:underline bg-transparent border-none p-0 cursor-pointer disabled:opacity-50 disabled:cursor-wait text-right transition-colors ${colorClasses}`}
          >
            {/* Swaps the document icon for a spinner during the brief JIT fetch */}
            {downloadingAttachmentId === att.id ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0 mt-0.5" />
            ) : (
              <FileText className="w-3.5 h-3.5 shrink-0 mt-0.5 transition-transform group-hover:scale-110" />
            )}

            <span className="text-xs break-all leading-relaxed" dir="ltr">
              {att.filename}
            </span>
          </button>
        )}

        <div className="flex items-start gap-2 shrink-0">
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
            <div className="flex gap-1 opacity-0 group-hover/file:opacity-100 transition-opacity mt-0.5">
              <button onClick={(e) => { e.preventDefault(); setEditingFileId(att.id); setEditFileName(att.filename.replace(/\.[^/.]+$/, "")); }} className="text-slate-400 hover:text-blue-500" title="שינוי שם"><Edit className="w-3.5 h-3.5" /></button>
              <button onClick={(e) => { e.preventDefault(); handleDeleteAttachment(assignmentId, att.id); }} className="text-slate-400 hover:text-red-500" title="מחיקה"><XCircle className="w-3.5 h-3.5" /></button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans pb-12 transition-colors duration-200" dir="rtl">
      {/* Header */}
      <header className={`sticky top-0 z-40 backdrop-blur-xl border-b transition-colors ${IS_DEV
        ? 'bg-[#FAF9F6]/90 dark:bg-slate-950/90 border-orange-200 dark:border-orange-900'
        : 'bg-[#FAF9F6]/90 dark:bg-slate-950/90 border-slate-200/60 dark:border-slate-800'
        }`}>
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20 gap-2">
            {/* Logo Area (Right) */}
            <div className="flex items-center gap-2 sm:gap-4 shrink-0">
              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-[0.8rem] sm:rounded-[1rem] flex items-center justify-center text-white shadow-sm ${IS_DEV ? 'bg-orange-500' : 'bg-rose-500'}`}>
                <Coffee className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2.5} />
              </div>
              <span className="text-2xl font-black tracking-tight text-[#1a202c] dark:text-white hidden sm:block">Teaspoon</span>
              {IS_DEV && <span className="hidden sm:block rounded-full bg-orange-100 text-orange-700 text-xs font-bold px-2 py-1">Sandbox</span>}
            </div>

            {/* Desktop Center Navigation */}
            <div className="hidden md:flex items-center h-full gap-8">
              <button
                onClick={() => setCurrentView('app')}
                className={`h-full flex items-center font-bold text-sm border-b-[3px] transition-all pt-[3px] ${currentView === 'app' ? 'border-rose-500 text-rose-600 dark:text-rose-400' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
              >
                מטלות
              </button>
              <button
                onClick={() => {
                  setCurrentView('summaries');
                  const validCourses = myCourses.filter(c => c !== '9990999');
                  if (!selectedSummaryCourse && validCourses.length > 0) {
                    setSelectedSummaryCourse(validCourses[0]);
                  }
                }}
                className={`h-full flex items-center font-bold text-sm border-b-[3px] transition-all pt-[3px] ${currentView === 'summaries' ? 'border-rose-500 text-rose-600 dark:text-rose-400' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
              >
                סיכומים
              </button>
              {(userProfile?.role === 'admin' || userProfile?.role === 'owner') && (
                <button
                  onClick={() => setCurrentView('admin')}
                  className={`h-full flex items-center font-bold text-sm border-b-[3px] transition-all pt-[3px] relative ${currentView === 'admin' ? 'border-purple-500 text-purple-600 dark:text-purple-400' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
                >
                  ניהול
                  {logs && logs.length > 0 && currentView !== 'admin' && (
                    <span className="absolute top-6 -left-3 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                    </span>
                  )}
                </button>
              )}
            </div>

            {/* User & Actions Area (Left) */}
            <div className="flex items-center gap-2 sm:gap-4 shrink-0">
              {/* Calendar Sync */}
              <button
                onClick={handleCalendarSync}
                className={`flex items-center justify-center p-1.5 sm:px-4 sm:py-2 rounded-full text-sm font-bold transition-colors shadow-sm border ${isCalendarCopied ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-300 text-emerald-700 dark:text-emerald-400' : 'bg-white dark:bg-slate-800 border-slate-200/60 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                title="סנכרון ליומן"
              >
                {isCalendarCopied ? <Check className="w-4 h-4" /> : <Calendar className="w-4 h-4" />}
                <span className="hidden sm:inline ms-2">{isCalendarCopied ? 'הקישור הועתק!' : 'סנכרון ליומן'}</span>
              </button>

              {/* Leaderboard */}
              {token && (
                <button
                  onClick={fetchLeaderboard}
                  className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-full text-xs sm:text-sm font-bold border border-rose-200/60 dark:border-rose-800/50 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors shadow-sm"
                  title="לוח הפותרים המובילים"
                >
                  <Heart className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" /> <span>{userProfile?.totalLikesReceived || 0}</span>
                </button>
              )}

              {/* Theme Toggle */}
              <button onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')} className="p-1.5 sm:p-2 rounded-full bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 shadow-sm transition-colors">
                <Moon className="w-4 h-4 hidden dark:block" />
                <Sun className="w-4 h-4 block dark:hidden" />
              </button>

              {token ? (
                <div className="relative group/user pb-2 -mb-2">
                  <div className="flex items-center gap-2 sm:gap-3 bg-transparent sm:bg-white sm:dark:bg-slate-800 sm:border border-slate-200/60 dark:border-slate-700 py-1 sm:py-1.5 px-1 sm:px-2 rounded-full sm:shadow-sm cursor-pointer hover:shadow-md transition-shadow">
                    <img src={userProfile?.picture || '/api/placeholder/32/32'} alt="" className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-slate-200 sm:border-slate-100 dark:border-slate-700" referrerPolicy="no-referrer" />
                    <div className="hidden sm:flex flex-col items-end pe-2">
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{userProfile?.name?.split(' ')[0]}</span>
                      <span className="text-[10px] text-slate-500 font-medium">הגדרות חשבון</span>
                    </div>
                    <ChevronDown className="hidden sm:block w-4 h-4 text-slate-400 ms-1 me-2" />
                  </div>

                  {/* Hover Dropdown (Uses left-0 to perfectly expand into the screen on RTL) */}
                  <div className="absolute top-full left-0 w-48 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl shadow-xl p-2 opacity-0 invisible group-hover/user:opacity-100 group-hover/user:visible transition-all z-50">
                    <button onClick={() => { localStorage.removeItem('teaspoon_jwt'); setToken(null); setUserProfile(null); }} className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl text-sm font-bold text-red-600 dark:text-red-400 transition-colors mt-1">
                      <LogIn className="w-4 h-4 rotate-180" /> התנתק
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => window.location.href = `${API_BASE_URL}/auth/login`} className="flex items-center gap-1.5 px-4 py-1.5 sm:px-6 sm:py-2.5 rounded-full bg-[#1a202c] dark:bg-white text-white dark:text-slate-900 text-xs sm:text-sm font-bold hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors shadow-md">
                  <LogIn className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> התחברות
                </button>
              )}
            </div>
          </div>
        </div>
      </header>


      {/* View Routing Logic */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 flex flex-col md:flex-row gap-8 items-start">
        {/* Mobile App Pillar Switcher (Native App Feel) */}
        <div className="flex sm:hidden w-full bg-slate-100 dark:bg-slate-900/50 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-inner mb-4 shrink-0">
          <button
            onClick={() => setCurrentView('app')}
            className={`flex-1 flex justify-center items-center gap-1.5 py-2 text-sm font-bold rounded-lg transition-all ${currentView === 'app' ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
          >
            <ListChecks className="w-4 h-4" /> מטלות
          </button>
          <button
            onClick={() => {
              setCurrentView('summaries');
              const validCourses = myCourses.filter(c => c !== '9990999');
              if (!selectedSummaryCourse && validCourses.length > 0) {
                setSelectedSummaryCourse(validCourses[0]);
              }
            }}
            className={`flex-1 flex justify-center items-center gap-1.5 py-2 text-sm font-bold rounded-lg transition-all ${currentView === 'summaries' ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
          >
            <BookOpen className="w-4 h-4" /> סיכומים
          </button>

          {/* Admin Mobile Tab */}
          {(userProfile?.role === 'admin' || userProfile?.role === 'owner') && (
            <button
              onClick={() => setCurrentView('admin')}
              className={`flex-1 flex justify-center items-center gap-1.5 py-2 text-sm font-bold rounded-lg transition-all relative ${currentView === 'admin' ? 'bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
            >
              <ShieldAlert className="w-4 h-4" /> ניהול

              {/* Notification Dot for Mobile Tab */}
              {logs && logs.length > 0 && currentView !== 'admin' && (
                <span className="absolute top-1.5 right-2 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                </span>
              )}
            </button>
          )}
        </div>
        {currentView === 'admin' && token ? (
          <div className="w-full">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6 flex items-center gap-3">
              <ShieldAlert className="w-8 h-8 text-purple-600 dark:text-purple-400" />
              מערכת ניהול
            </h2>
            <AdminDashboard token={token} logs={logs} setLogs={setLogs} coursesMap={coursesMap} userProfile={userProfile} />
          </div>
        ) : currentView === 'summaries' ? (
          <div className="flex flex-col flex-1 animate-in fade-in duration-300">
            {/* Summaries Header & Course Selector */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200 dark:border-slate-700 mb-4 sm:mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-500" />
                  מאגר סיכומים
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">שתפו ומצאו סיכומים, מבחני עבר וחומרי עזר לקורסים שלכם.</p>
              </div>

              {/* Mobile fix: Stacked on small screens, side-by-side on sm+ */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
                <select
                  value={selectedSummaryCourse}
                  onChange={(e) => setSelectedSummaryCourse(e.target.value)}
                  className="w-full sm:w-auto md:w-64 px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="" disabled>בחר קורס...</option>
                  {myCourses
                    .filter(code => code !== '9990999')
                    .map(code => (
                      <option key={code} value={code}>{code} - {coursesMap[code]?.name}</option>
                    ))}
                </select>

                {token && selectedSummaryCourse && (
                  <button
                    onClick={() => {
                      setEditingSummaryId(null);
                      setSummaryFormData({ filename: '', file: null });
                      setIsSummaryModalOpen(true);
                    }}
                    className={`w-full sm:w-auto flex justify-center items-center gap-2 px-4 py-2.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/60 transition-colors font-bold text-sm rounded-xl border border-emerald-200 dark:border-emerald-800 shadow-sm`}
                  >
                    <UploadCloud className="w-4 h-4" /> העלה קובץ
                  </button>
                )}
              </div>
            </div>

            {/* Summaries Grid */}
            {!selectedSummaryCourse ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 sm:p-12 text-slate-400 bg-white/50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 border-dashed">
                <FileText className="w-12 h-12 sm:w-16 sm:h-16 mb-4 opacity-20" />
                <p className="text-base sm:text-lg font-bold text-slate-500 text-center">בחרו קורס כדי לצפות בסיכומים</p>
              </div>
            ) : summaries.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 sm:p-12 text-slate-400 bg-white/50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 border-dashed">
                <FileText className="w-12 h-12 sm:w-16 sm:h-16 mb-4 opacity-20" />
                <p className="text-base sm:text-lg font-bold text-slate-500 mb-2 text-center">אין עדיין סיכומים לקורס זה</p>
                {token && <p className="text-xs sm:text-sm text-center">היו הראשונים להעלות חומר עזר!</p>}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 content-start">
                {[...summaries]
                  .sort((a, b) => (b.likes || 0) - (a.likes || 0))
                  .map(summary => {
                    const isOwnerOrAdmin = userProfile?.id === summary.uploader_id || ['admin', 'owner'].includes(userProfile?.role || '');

                    return (
                      <div key={summary.id} className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow flex flex-col group relative">

                        {/* Action Buttons (Absolute corner) */}
                        {isOwnerOrAdmin && (
                          <div className="absolute top-2 left-2 sm:top-3 sm:left-3 flex flex-col gap-1 z-10 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-all">
                            <button
                              onClick={() => {
                                setEditingSummaryId(summary.id);
                                setSummaryFormData({ filename: summary.filename, file: null });
                                setIsSummaryModalOpen(true);
                              }}
                              className="p-1.5 text-slate-300 hover:text-blue-500 dark:hover:text-blue-400 bg-white dark:bg-slate-800 rounded-md shadow-sm border border-transparent hover:border-blue-100 dark:hover:border-blue-900/50" title="עריכה"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteSummary(summary.id, summary.uploader_id)}
                              className="p-1.5 text-slate-300 hover:text-red-500 dark:hover:text-red-400 bg-white dark:bg-slate-800 rounded-md shadow-sm border border-transparent hover:border-red-100 dark:hover:border-red-900/50" title="מחיקה"
                            >
                              <Trash className="w-4 h-4" />
                            </button>
                          </div>
                        )}

                        <div className="flex items-start gap-3 mb-4 pe-12 sm:pe-10">
                          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-800/50 shadow-sm">
                            <FileText className="w-5 h-5" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <h3 className="font-bold text-slate-800 dark:text-slate-100 truncate text-sm" title={summary.filename}>{summary.filename}</h3>

                            <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500 dark:text-slate-400 font-medium">
                              {/* mini avatar next to the name */}
                              {summary.uploader_picture ? (
                                <img
                                  src={summary.uploader_picture}
                                  alt={summary.uploader_name}
                                  className="w-4 h-4 rounded-full shrink-0 border border-slate-200 dark:border-slate-700"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <User className="w-3.5 h-3.5 shrink-0 opacity-70" />
                              )}

                              <span className="truncate max-w-[100px] sm:max-w-[120px]" title={summary.uploader_name}>
                                {summary.uploader_name}
                              </span>
                              <span className="opacity-50">•</span>
                              <span>{new Date(summary.upload_date).toLocaleDateString('he-IL')}</span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-auto flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700/50">
                          <a href={summary.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors bg-slate-50 dark:bg-slate-900/50 px-3 py-1.5 rounded-lg">
                            <Download className="w-4 h-4" /> הורד
                          </a>

                          <button onClick={() => toggleSummaryLike(summary.id)} className={`flex items-center gap-1.5 text-sm font-bold px-3 py-1.5 rounded-lg transition-colors border ${summary.isLikedByMe ? 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800/50' : 'bg-white text-slate-400 hover:text-rose-500 border-slate-200 dark:bg-slate-800 dark:border-slate-700 shadow-sm'}`}>
                            <Heart className={`w-4 h-4 ${summary.isLikedByMe ? 'fill-current' : ''}`} />
                            {summary.likes}
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Right Menu (Sidebar) */}
            <aside className="w-full md:w-72 lg:w-80 xl:w-[22rem] flex flex-col gap-6 shrink-0 md:sticky md:top-28 md:h-[calc(100vh-8rem)] z-30">
              <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-200/60 dark:border-slate-700 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex-1 flex flex-col overflow-hidden relative">

                {/* Header */}
                <div className="flex justify-between items-center shrink-0">
                  <div className="flex items-center gap-2">
                    <h2 className="font-black text-xl text-[#1a202c] dark:text-white">הקורסים שלי</h2>
                    {/* Mobile-only Collapse Button */}
                    <button
                      onClick={() => setIsCourseListMinimized(!isCourseListMinimized)}
                      className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-all duration-200"
                      title={isCourseListMinimized ? 'הצג קורסים' : 'הסתר קורסים'}
                    >
                      <ChevronDown className={`w-5 h-5 transition-transform duration-500 ease-in-out ${isCourseListMinimized ? '' : 'rotate-180'}`} />
                    </button>
                  </div>

                  {/* Add Course / Assignment Shortcut */}
                  <button onClick={() => setIsAddCourseModalOpen(true)} className="w-10 h-10 rounded-full bg-rose-50 text-rose-500 dark:bg-rose-900/30 dark:text-rose-400 flex items-center justify-center hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors" title="הוספת קורס חדש">
                    <Plus className="w-5 h-5" />
                  </button>
                </div>

                {/* Responsive Animated Wrapper: Grid on Mobile, Flex on Desktop */}
                <div className={`grid md:flex md:flex-1 md:flex-col min-h-0 transition-all duration-500 ease-in-out ${isCourseListMinimized ? 'grid-rows-[0fr] opacity-0 md:opacity-100 md:grid-rows-none md:mt-6' : 'grid-rows-[1fr] opacity-100 mt-6'}`}>
                  <div className="overflow-hidden flex flex-col min-h-0 md:flex-1 w-full">

                    {/* Search */}
                    <div className="relative mb-6 shrink-0 focus:outline-none focus:ring-0">
                      <input type="text" placeholder="חיפוש מהיר..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onFocus={() => setIsSearchFocused(true)} onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)} className="w-full pl-4 pr-10 py-3 rounded-2xl bg-[#FAF9F6] dark:bg-slate-900 border-none text-sm font-medium focus:ring-0 focus:outline-none transition-colors dark:text-slate-100" />
                      <Search className="w-4 h-4 absolute right-4 top-3.5 text-slate-400" />

                      {isSearchFocused && searchQuery && (
                        <div className="absolute z-30 w-full mt-2 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-xl max-h-60 overflow-y-auto flex flex-col">
                          {searchResults.length > 0 && searchResults.map(([code, syl]) => (
                            <button key={code} onClick={() => handleAddCourse(code)} className="w-full text-right px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 flex flex-col items-start border-b border-slate-50 dark:border-slate-700 last:border-0 transition-colors">
                              <div className="flex justify-between items-center w-full"><span className="text-sm font-bold text-slate-800 dark:text-slate-100">{syl.name}</span>{myCourses.includes(code) && <CheckCircle className="w-4 h-4 text-emerald-500" />}</div>
                              <span className="text-xs text-slate-500">{code}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Course List */}
                    <div className="space-y-3 flex-1 overflow-y-auto pe-2 scrollbar-thin">
                      {myCourses.map(code => {
                        const courseTheme = getCourseTheme(code);
                        return (
                          <div key={code} className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-2xl hover:shadow-md transition-all group">
                            <label className="flex items-center gap-3 cursor-pointer flex-1 min-w-0 group relative p-2 rounded-xl">
                              <input
                                type="checkbox"
                                checked={visibleCourses.includes(code)}
                                onChange={() => toggleVisibleCourse(code)}
                                className="hidden"
                              />
                              <div className="relative shrink-0 w-8 h-8 flex items-center justify-center z-0">
                                <div
                                  className={`absolute transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${courseTheme.dot} ${visibleCourses.includes(code)
                                    ? '-top-2.5 -bottom-2.5 -right-2.5 -left-1.5 rounded-r-xl rounded-l-[0.8rem] shadow-sm'
                                    : 'inset-0 rounded-[0.8rem] opacity-70 group-hover:opacity-100'
                                    }`}
                                ></div>
                              </div>

                              {/* Text Container */}
                              <div className="flex flex-col flex-1 opacity-90 group-hover:opacity-100 min-w-0 relative z-10 mr-1">
                                <span className={`text-sm font-bold transition-colors ${visibleCourses.includes(code) ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'} line-clamp-1`}>
                                  {coursesMap[code]?.name || 'קורס מותאם'}
                                </span>
                                <span className="text-[11px] font-semibold text-slate-400" dir="ltr">{code}</span>
                              </div>
                            </label>
                            <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity pr-2">
                              <button onClick={(e) => { e.preventDefault(); handleRemoveCourse(code); }} className="text-slate-400 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
                              {code !== '9990999' &&
                                <button onClick={(e) => { e.preventDefault(); openCourseSettings(code); }} className="text-slate-400 hover:text-blue-500"><Settings className="w-3.5 h-3.5" /></button>
                              }
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

              </div>
            </aside>

            {/* Main Content (Assignments & Stats) */}
            <div className="flex-1 relative z-10 flex flex-col min-h-full gap-8 min-w-0">

              {/* Personal Progress Block */}
              {(() => {
                // Calculate progress on the fly for visible courses (excluding personal tasks)
                const activeCourses = visibleCourses.length > 0 ? visibleCourses : myCourses;
                const progressCourses = activeCourses.filter(c => c !== '9990999');

                let totalProgressAssignments = 0;
                let completedProgressAssignments = 0;

                // Loop through each active course to apply syllabus-specific rules
                progressCourses.forEach(c => {
                  const code = typeof c === 'string' ? c : (c as any).code; // Safety check in case myCourses holds objects

                  // 1. Get assignments for this specific course
                  const courseAssignments = assignments.filter(a => a.courseCode === code && a.type !== 'other');

                  let courseRequired = courseAssignments.length;
                  let courseCompleted = courseAssignments.filter(a => a.isCompleted).length;

                  // 2. Fetch specific course data from map
                  const courseData = typeof coursesMap !== 'undefined' ? coursesMap[code] : null;

                  if (courseData) {
                    const hasWwKeep = courseData.ww_keep !== null && courseData.ww_keep !== undefined;
                    const hasHwKeep = courseData.hw_keep !== null && courseData.hw_keep !== undefined;

                    // If the course has explicit "keep" values defined
                    if (hasWwKeep || hasHwKeep) {
                      const totalKeep = (courseData.ww_keep || 0) + (courseData.hw_keep || 0);

                      if (totalKeep > 0) {
                        courseRequired = totalKeep;
                      }
                    }
                  }

                  // 3. Cap completed count (Prevents a student doing 5 assignments in a "keep 4" course from skewing the total)
                  courseCompleted = Math.min(courseCompleted, courseRequired);

                  // 4. Add to the global tally
                  totalProgressAssignments += courseRequired;
                  completedProgressAssignments += courseCompleted;
                });

                const progressPercentage = totalProgressAssignments === 0 ? 0 : Math.round((completedProgressAssignments / totalProgressAssignments) * 100);

                return (
                  <div className="mb-8 pb-8 border-b border-slate-200/60 dark:border-slate-700 relative group/progress">

                    {/* Header */}
                    <div className="flex justify-between items-center">
                      <h2 className="text-xl font-black text-[#1a202c] dark:text-white">מצב התקדמות</h2>

                      {/* The Minimize/Maximize Button */}
                      <button
                        onClick={() => setIsProgressMinimized(!isProgressMinimized)}
                        className={`p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-all duration-200 ${isProgressMinimized ? 'opacity-100' : 'opacity-0 group-hover/progress:opacity-100'}`}
                        title={isProgressMinimized ? 'הצג מצב התקדמות' : 'הסתר מצב התקדמות'}
                      >
                        <ChevronDown className={`w-5 h-5 transition-transform duration-500 ease-in-out ${isProgressMinimized ? '' : 'rotate-180'}`} />
                      </button>
                    </div>

                    {/* The Animated Wrapper: CSS Grid 0fr to 1fr Trick! */}
                    <div className={`grid transition-all duration-500 ease-in-out ${isProgressMinimized ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100'}`}>
                      <div className="overflow-hidden">

                        {/* Inner Grid Container */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 pb-1">

                          {/* Assignments Progress */}
                          <div className="bg-white dark:bg-slate-800 rounded-[2rem] p-6 border border-slate-200/50 dark:border-slate-700 shadow-sm flex flex-col justify-between relative overflow-hidden group">
                            <div className="flex justify-between items-start mb-4">
                              <div>
                                <span className="text-[10px] font-black text-blue-500 uppercase tracking-wider mb-1 block">מטלות הסמסטר</span>
                                <h3 className="font-bold text-[#1a202c] dark:text-white text-lg">קצב ביצוע</h3>
                              </div>
                              <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-500 transition-transform duration-300 group-hover:scale-110">
                                <ListChecks className="w-5 h-5" />
                              </div>
                            </div>

                            <div>
                              <div className="flex items-end justify-between mb-2">
                                <span className="text-3xl font-black text-[#1a202c] dark:text-white leading-none">{progressPercentage}%</span>
                                <span className="text-sm font-medium text-slate-500">{completedProgressAssignments} מתוך {totalProgressAssignments}</span>
                              </div>
                              {/* Progress Bar */}
                              <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden" dir="ltr">
                                <div className="h-full bg-blue-500 rounded-full transition-all duration-1000 ease-out delay-300" style={{ width: `${progressPercentage}%` }}></div>
                              </div>
                            </div>
                          </div>

                          {/* Degree Average */}
                          <div
                            onClick={() => setIsProgressModalOpen(true)}
                            className="bg-white dark:bg-slate-800 rounded-[2rem] p-6 border border-slate-200/50 dark:border-slate-700 shadow-sm flex flex-col justify-between group/card relative cursor-pointer hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors"
                          >
                            <div className="flex justify-between items-start mb-4">
                              <div>
                                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-wider mb-1 block">ממוצע תואר</span>
                                <h3 className="font-bold text-[#1a202c] dark:text-white text-lg">ציונים</h3>
                              </div>
                              <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-500 transition-transform duration-300 group-hover/card:scale-110">
                                <Trophy className="w-5 h-5" />
                              </div>
                            </div>
                            <div>
                              <span className="text-3xl font-black text-[#1a202c] dark:text-white leading-none">
                                {userProfile?.total_credits ? (userProfile.weighted_sum! / userProfile.total_credits).toFixed(2) : '--'}
                              </span>
                            </div>
                          </div>

                          {/* Credit Points */}
                          <div
                            onClick={() => setIsProgressModalOpen(true)}
                            className="bg-white dark:bg-slate-800 rounded-[2rem] p-6 border border-slate-200/50 dark:border-slate-700 shadow-sm flex flex-col justify-between group/card relative cursor-pointer hover:border-purple-300 dark:hover:border-purple-700 transition-colors"
                          >
                            <div className="flex justify-between items-start mb-4">
                              <div>
                                <span className="text-[10px] font-black text-purple-500 uppercase tracking-wider mb-1 block">נקודות זכות</span>
                                <h3 className="font-bold text-[#1a202c] dark:text-white text-lg">התקדמות לתואר</h3>
                              </div>
                              <div className="w-10 h-10 rounded-full bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center text-purple-500 transition-transform duration-300 group-hover/card:scale-110">
                                <BookOpen className="w-5 h-5" />
                              </div>
                            </div>
                            <div>
                              <span className="text-3xl font-black text-[#1a202c] dark:text-white leading-none">
                                {(userProfile?.total_credits || userProfile?.binary_credits) ?
                                  ((userProfile.total_credits || 0) + (userProfile.binary_credits || 0)).toFixed(1) : '--'}
                              </span>
                            </div>
                          </div>

                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Top Action Bar */}
              <div className="flex flex-wrap items-center justify-between mt-2 gap-4">
                <h2 className="text-2xl font-black text-[#1a202c] dark:text-white hidden sm:block">מטלות קרובות</h2>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  {/* openAddModal Button! */}
                  <button onClick={openAddModal} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-[#1a202c] dark:bg-blue-600 text-white text-sm font-bold shadow-md hover:bg-slate-800 dark:hover:bg-blue-700 transition-colors">
                    <Plus className="w-4 h-4" /> מטלה חדשה
                  </button>

                  <div className="relative z-[60] flex-1 sm:flex-none" ref={filterMenuRef}>

                    <button onClick={() => setOpenFilter(prev => prev ? null : 'status')} className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-bold shadow-sm border border-slate-200/50 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                      <Filter className="w-4 h-4" /> סינון
                    </button>

                    {/* Filter Menus Container */}
                    {openFilter && (
                      <div className="absolute top-full mt-2 left-0 bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 rounded-2xl shadow-xl p-4 flex flex-col gap-4 min-w-[280px]">

                        {/* Type Filter */}
                        <div>
                          <label className="text-xs font-bold text-slate-500 mb-2 block">סוג מטלה:</label>
                          <div className="flex flex-wrap gap-2">
                            {['All', 'Assignment', 'Webwork', 'Exam', 'lab_report', 'other'].map(type => (
                              <button key={type} onClick={() => setActiveTypeFilter(type)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${activeTypeFilter === type ? 'bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-900/30 dark:border-blue-800/50 dark:text-blue-400' : 'bg-slate-50 text-slate-600 border border-slate-200 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-400'}`}>
                                {typeTranslations[type]}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Status Filter */}
                        <div>
                          <label className="text-xs font-bold text-slate-500 mb-2 block">סטטוס:</label>
                          <div className="flex gap-2">
                            <button onClick={() => setHideCompleted(false)} className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${!hideCompleted ? 'bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-900/30 dark:border-blue-800/50 dark:text-blue-400' : 'bg-slate-50 text-slate-600 border border-slate-200 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-400'}`}>הכל</button>
                            <button onClick={() => setHideCompleted(true)} className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${hideCompleted ? 'bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-900/30 dark:border-blue-800/50 dark:text-blue-400' : 'bg-slate-50 text-slate-600 border border-slate-200 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-400'}`}>לא בוצעו</button>
                          </div>
                        </div>

                        {/* Dates Filter */}
                        <div className="border-t border-slate-100 dark:border-slate-700 pt-4 mt-1">
                          <div className="flex justify-between items-center mb-2">
                            <label className="text-xs font-bold text-slate-500">טווח תאריכים:</label>
                            {(dateRange.start || dateRange.end) && (
                              <button onClick={() => setDateRange({ start: '', end: '' })} className="text-[10px] font-bold text-red-500 hover:text-red-600 transition-colors">
                                נקה תאריכים
                              </button>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[10px] text-slate-400 mb-1">מתאריך</label>
                              <input
                                type="date"
                                value={dateRange.start}
                                onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                                className="w-full px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 rounded-lg outline-none text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-400 mb-1">עד תאריך</label>
                              <input
                                type="date"
                                value={dateRange.end}
                                onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                                className="w-full px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 rounded-lg outline-none text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                          </div>
                        </div>

                      </div>
                    )}
                  </div>

                  {/* View Toggle */}
                  <div className="hidden md:flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700 p-1.5 rounded-full shadow-sm">
                    <button onClick={() => setViewMode('cards')} className={`p-1.5 rounded-full transition-all ${viewMode === 'cards' ? 'bg-[#FAF9F6] dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}><LayoutGrid className="w-4 h-4" /></button>
                    <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-full transition-all ${viewMode === 'list' ? 'bg-[#FAF9F6] dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}><List className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>

              {/* Assignment List */}
              {loading ? (<div className="flex justify-center items-center h-40"><RefreshCw className="w-8 h-8 text-blue-500 animate-spin" /></div>)
                : fetchError ? (<div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-[2rem] p-8 text-center transition-colors"><AlertCircle className="w-12 h-12 text-red-400 dark:text-red-500 mx-auto mb-4" /><h3 className="text-lg font-medium text-red-900 dark:text-red-200 mb-1">שגיאת תקשורת</h3><p className="text-red-700 dark:text-red-300 text-sm max-w-md mx-auto">{fetchError}</p></div>)
                  : filteredAssignments.length === 0 ? (<div className="bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700 rounded-[2rem] p-12 text-center shadow-sm"><CheckCircle className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" /><h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-1">הכל נקי!</h3><p className="text-slate-500">אין מטלות קרובות להצגה.</p></div>)
                    : (
                      <div className={viewMode === 'cards' ? "grid grid-cols-1 xl:grid-cols-2 gap-4 flex-1 content-start" : "flex flex-col gap-4 flex-1 content-start"}>
                        {filteredAssignments.map((assignment) => {
                          const courseTheme = getCourseTheme(assignment.courseCode);
                          const isList = viewMode === 'list';

                          return (
                            <div key={assignment.id} className={`relative bg-white dark:bg-slate-800 rounded-[2rem] p-4 sm:p-5 flex flex-col ${isList ? 'sm:flex-row sm:items-center' : 'h-full justify-between'} gap-4 sm:gap-6 border border-slate-200/40 dark:border-slate-700 shadow-[0_4px_20px_rgb(0,0,0,0.03)] transition-all duration-200 group hover:z-50 focus-within:z-50 ${assignment.isCompleted ? 'opacity-50 grayscale-[0.2] hover:opacity-100 hover:grayscale-0' : ''}`}>
                              {/* Colored Right Border indicator */}
                              <div className={`absolute right-0 top-6 bottom-6 w-1.5 rounded-s-md ${courseTheme.dot}`}></div>

                              <div className={`flex items-start ${isList ? 'items-center sm:w-auto w-full' : ''} gap-4 flex-1 min-w-0`}>
                                {/* Checkbox */}
                                <button onClick={() => toggleCompletion(assignment.id)} className={`w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 ml-2 transition-colors ${assignment.isCompleted ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30' : 'border-slate-200 dark:border-slate-600 hover:border-slate-300'}`}>
                                  {assignment.isCompleted && <Check className="w-4 h-4 text-emerald-500" />}
                                </button>

                                {/* Main Info */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-3 mb-1.5">
                                    <h3 className={`text-lg font-black truncate ${assignment.isCompleted ? 'line-through text-slate-500' : 'text-[#1a202c] dark:text-white'}`}>{assignment.title}</h3>
                                    <span className="text-[10px] uppercase font-black tracking-wider px-2.5 py-1 rounded-md bg-[#FAF9F6] dark:bg-slate-900 text-slate-500 border border-slate-100 dark:border-slate-700 shadow-inner shrink-0">
                                      {assignment.type === 'Assignment' ? 'גיליון' : assignment.type === 'Webwork' ? 'וובוורק' : 'מבחן'}
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400 font-medium">
                                    <div className={`w-2 h-2 rounded-sm ${courseTheme.dot}`}></div>
                                    <span>{coursesMap[assignment.courseCode]?.name} <span dir="ltr" className="opacity-60">({assignment.courseCode})</span></span>
                                    <span className="hidden sm:inline opacity-30">•</span>
                                    <span className={`flex items-center gap-1.5 ${(() => {
                                      if (assignment.isCompleted) return '';
                                      const hoursUntilDeadline = (new Date(assignment.deadline).getTime() - Date.now()) / (1000 * 60 * 60);
                                      if (hoursUntilDeadline <= 24) return 'text-rose-500';
                                      if (hoursUntilDeadline <= 72) return 'text-amber-600';
                                      return '';
                                    })()}`}>
                                      <Clock className="w-3.5 h-3.5" /> מועד הגשה סופי: {formatDateTime(assignment.deadline)}
                                    </span>

                                    {/* ✨ Conditional Recommended Deadline */}
                                    {assignment.recommended_deadline && (
                                      <>
                                        <span className="hidden sm:inline opacity-30">•</span>
                                        <span className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
                                          <Calendar className="w-3.5 h-3.5" /> יעד מומלץ: {formatDateTime(assignment.recommended_deadline)}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Actions / Right Side */}
                              <div className={`flex items-center gap-3 sm:gap-4 border-slate-100 dark:border-slate-700 ${isList ? 'sm:ml-4 border-t sm:border-t-0 pt-3 sm:pt-0 shrink-0' : 'border-t pt-4 mt-auto justify-between w-full'}`}>
                                {/* Attachments Button */}
                                <div className="relative group/attach">
                                  <button className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#FAF9F6] dark:bg-slate-900 border border-slate-200/50 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-bold shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                    <Paperclip className="w-4 h-4" /> {assignment.attachments?.length || 0} קבצים
                                  </button>

                                  {/* Hover Menu for Uploads/Files */}
                                  <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl shadow-xl p-2 opacity-0 invisible group-hover/attach:opacity-100 group-hover/attach:visible transition-all z-20">
                                    {token && (
                                      <div className="flex gap-2 mb-2 p-1 border-b border-slate-100 dark:border-slate-700">
                                        <label className={`flex-1 text-center py-1.5 text-xs font-bold bg-blue-50 text-blue-600 rounded-lg cursor-pointer hover:bg-blue-100 ${uploadingId === assignment.id ? 'opacity-50 pointer-events-none' : ''}`}>
                                          <input type="file" className="hidden" disabled={uploadingId === assignment.id} onChange={(e) => handleFileUpload(assignment.id, e, 'assignment')} />
                                          + מטלה
                                        </label>
                                        <label className={`flex-1 text-center py-1.5 text-xs font-bold bg-emerald-50 text-emerald-600 rounded-lg cursor-pointer hover:bg-emerald-100 ${uploadingId === assignment.id ? 'opacity-50 pointer-events-none' : ''}`}>
                                          <input type="file" className="hidden" disabled={uploadingId === assignment.id} onChange={(e) => handleFileUpload(assignment.id, e, 'solution')} />
                                          + חומר עזר
                                        </label>
                                      </div>
                                    )}

                                    {uploadingId === assignment.id && (
                                      <div className="flex justify-center items-center py-2">
                                        <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />
                                      </div>
                                    )}

                                    <div className="max-h-32 overflow-y-auto space-y-1 pr-1 standard-scrollbar">
                                      {/* Create a cloned array, sort it, then map it */}
                                      {[...(assignment.attachments || [])].sort((a, b) => {
                                        // Assignments always go to the top
                                        if (a.category === 'assignment' && b.category !== 'assignment') return -1;
                                        if (b.category === 'assignment' && a.category !== 'assignment') return 1;
                                        return (b.likes || 0) - (a.likes || 0);
                                      }).map(att => renderAttachment(att, assignment.id))}

                                      {(!assignment.attachments || assignment.attachments.length === 0) && uploadingId !== assignment.id && (
                                        <div className="text-xs text-center text-slate-400 py-2">אין קבצים מצורפים</div>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Grade Input */}
                                <div className="flex flex-col items-center justify-center w-[4.5rem] h-[3.5rem] rounded-[1rem] bg-[#FAF9F6] dark:bg-slate-900 border border-slate-200/50 dark:border-slate-700 shadow-inner">
                                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mt-1">ציון</span>
                                  <input type="number" placeholder="--" className="w-full text-center bg-transparent text-lg font-black outline-none text-[#1a202c] dark:text-white placeholder:text-slate-300" value={assignment.grade ?? ''} onChange={(e) => handleGradeUpdate(assignment.id, e.target.value)} />
                                </div>

                                {/* Admin Actions (Hidden until hover) */}
                                {token && (
                                  <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute top-4 left-4">
                                    <button onClick={() => handleDelete(assignment.id)} className="p-1.5 text-slate-400 hover:text-red-600 bg-white dark:bg-slate-800 rounded-md shadow-sm border border-slate-100 dark:border-slate-700"><Trash className="w-3.5 h-3.5" /></button>
                                    <button onClick={() => openEditModal(assignment)} className="p-1.5 text-slate-400 hover:text-blue-600 bg-white dark:bg-slate-800 rounded-md shadow-sm border border-slate-100 dark:border-slate-700"><Edit className="w-3.5 h-3.5" /></button>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

              {/* Grade Summary Component */}
              {(visibleCourses.length > 0 ? visibleCourses : myCourses).length > 0 && assignments.some(a => a.grade !== null) && (
                <div className="mt-8 pt-8 border-t border-slate-200/60 dark:border-slate-700">
                  <h3 className="text-lg font-bold text-[#1a202c] dark:text-slate-50 mb-4 flex items-center gap-2"><Calculator className="w-5 h-5 text-slate-500" /> ציונים מצטברים עד כה</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                    {(visibleCourses.length > 0 ? visibleCourses : myCourses).map(code => {
                      const summary = calculateCourseGrade(code);
                      if (!summary) return null;
                      const themeObj = getCourseTheme(code);
                      return (
                        <div key={`grade-${code}`} className={`p-5 rounded-[1.5rem] border bg-white dark:bg-slate-800 ${themeObj.badgeBorder} shadow-sm relative overflow-hidden`}>
                          <div className={`absolute top-0 right-0 w-full h-1 ${themeObj.dot}`}></div>
                          <div className="flex justify-between items-start mb-3 mt-1">
                            <div className="flex flex-col pr-1">
                              <span className="font-bold text-[#1a202c] dark:text-white text-sm line-clamp-1">{coursesMap[code]?.name || 'קורס מותאם'}</span>
                              <span className="text-xs text-slate-500 font-medium mt-0.5" dir="ltr">{code}</span>
                            </div>
                            <div className="flex gap-1 pl-1">
                              {summary.unconfigured && <span title="יש להגדיר משקלים למטלות בהגדרות הקורס להצגת ציון מצטבר" className="cursor-help"><AlertCircle className="w-4 h-4 text-orange-500" /></span>}

                              {summary.magenStatus === 'full' && (
                                <span title="ציון מגן" className="cursor-default">
                                  <Shield className={`w-4 h-4 ${themeObj.badgeText}`} fill="currentColor" />
                                </span>
                              )}

                              {summary.magenStatus === 'partial' && (
                                <span title="ציון מגן חלקי" className="cursor-default opacity-50">
                                  <Shield className={`w-4 h-4 ${themeObj.badgeText}`} />
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-baseline gap-1.5 pr-1 mt-2" dir="ltr">
                            <span className={`text-3xl font-black leading-none ${themeObj.badgeText.replace('800', '600').replace('300', '400')}`}>{summary.earned}</span>
                            <span className="text-sm font-bold leading-none text-slate-400">/ {summary.possible}</span>
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
      {isAssignmentModalOpen && token && (
        <div className="fixed inset-0 bg-slate-900/50 dark:bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-700">
            <div className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700 px-6 py-4 flex justify-between items-center"><h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">{isEditing ? 'עריכת מטלה' : 'הוספת מטלה חדשה'}</h2><button onClick={() => setIsAssignmentModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-2xl leading-none">&times;</button></div>
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
                    <option value="" disabled>{myCourses.length === 0 ? 'יש להוסיף קורסים תחילה' : 'בחר קורס...'}</option>
                    {myCourses.map(code => (
                      <option key={code} value={code}>{code} - {coursesMap[code]?.name || 'קורס מותאם אישית'}</option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">סוג המטלה</label>
                  <select
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 dark:text-slate-100"
                    value={formData.type}
                    onChange={e => setFormData({ ...formData, type: e.target.value })}
                  >
                    <option value="Assignment">גיליון</option>
                    <option value="Webwork">וובוורק</option>
                    <option value="lab_report">דוח מעבדה</option>
                    <option value="Exam">מבחן</option>
                    <option value="other">אחר</option>
                  </select>
                </div>
              </div>

              <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">כותרת</label><input required type="text" placeholder="לדוגמה: גיליון 1, בוחן אמצע" className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 dark:text-slate-100" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">מועד הגשה סופי</label><input required type="date" className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 dark:text-slate-100" value={formData.deadline} onChange={e => setFormData({ ...formData, deadline: e.target.value })} /></div>
                <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">שעה סופית</label><input type="time" className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 dark:text-slate-100" value={formData.time} onChange={e => setFormData({ ...formData, time: e.target.value })} /></div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-slate-100 dark:border-slate-700 pt-4">
                <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">יעד מומלץ לביצוע <span className="text-xs font-normal opacity-70">(רשות)</span></label><input type="date" className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 dark:text-slate-100" value={formData.recommended_date} onChange={e => setFormData({ ...formData, recommended_date: e.target.value })} /></div>
                <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">שעת יעד</label><input type="time" className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 dark:text-slate-100" value={formData.recommended_time} onChange={e => setFormData({ ...formData, recommended_time: e.target.value })} /></div>
              </div>
              <div className="pt-4 flex gap-3"><button type="button" onClick={() => setIsAssignmentModalOpen(false)} className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 font-medium transition-colors">ביטול</button><button type="submit" className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">שמירה</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Add Course Modal */}
      {isAddCourseModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 dark:bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-700">
            <div className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700 px-6 py-4 flex justify-between items-center"><h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">הוספת קורס חדש</h2><button onClick={() => setIsAddCourseModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-2xl leading-none">&times;</button></div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const codeRegex = /^\d{3}0\d{3}$/;
              if (!codeRegex.test(newCourseCode)) { setCourseCodeError('קוד קורס חייב להיות בפורמט: XXX0XXX (לדוגמה: 1150204)'); return; }
              if (!newCourseName.trim()) { setCourseCodeError('שם הקורס לא יכול להיות ריק'); return; }
              if (myCourses.includes(newCourseCode)) { setCourseCodeError('קורס זה כבר קיים, ניתן לערוך אותו מרשימת "הקורסים שלי"'); return; }

              // Lock the form and clear previous errors
              setIsAddingCourse(true);
              setCourseCodeError('');

              try {
                // If it's a new course, create it in the database first
                if (!coursesMap[newCourseCode]) {
                  if (token) {
                    const newSyl = { name: newCourseName, hw_weight: 0, hw_keep: 0, hw_magen: false, ww_weight: 0, ww_keep: 0, ww_magen: false, exam_weight: 0, exam_magen: false, lab_report_weight: 0, lab_report_keep: 0, lab_report_magen: false };
                    const res = await fetch(`${API_BASE_URL}/courses/${newCourseCode}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                      body: JSON.stringify({ ...newSyl, hw_drop: 0, ww_drop: 0 })
                    });

                    if (!res.ok) throw new Error("Course creation failed");
                    setCoursesMap(prev => ({ ...prev, [newCourseCode]: newSyl }));
                  } else {
                    // Guest Mode Fallback
                    setCoursesMap(prev => ({ ...prev, [newCourseCode]: { name: newCourseName, hw_weight: 0, hw_keep: 0, hw_magen: false, ww_weight: 0, ww_keep: 0, ww_magen: false, lab_report_weight: 0, lab_report_keep: 0, lab_report_magen: false, exam_weight: 0, exam_magen: false } }));
                  }
                }

                // Link the course to the user using our pessimistic function
                const success = await handleAddCourse(newCourseCode);

                if (success) {
                  // Only close the modal if the server said YES
                  setIsAddCourseModalOpen(false);
                  setNewCourseCode('');
                  setNewCourseName('');
                } else {
                  setCourseCodeError('בעיית תקשורת בשמירת הקורס. אנא נסה שוב.');
                }
              } catch (err) {
                setCourseCodeError('שגיאה ביצירת הקורס בשרת. אנא נסה שוב.');
              } finally {
                // Unlock the form
                setIsAddingCourse(false);
              }
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
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddCourseModalOpen(false)}
                  disabled={isAddingCourse}
                  className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 font-medium transition-colors disabled:opacity-50"
                >
                  ביטול
                </button>
                <button
                  type="submit"
                  disabled={isAddingCourse}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex justify-center items-center gap-2 disabled:opacity-70"
                >
                  {isAddingCourse ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'הוספת קורס'}
                </button>
              </div>
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

              {/* Editable Course Code & Name Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">מספר קורס</label>
                  <input
                    required
                    type="text"
                    maxLength={7}
                    className={`w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-lg outline-none text-slate-800 dark:text-slate-100 ${(userProfile?.role === 'admin' || userProfile?.role === 'owner') ? 'focus:ring-2 focus:ring-blue-500' : 'opacity-70 cursor-not-allowed'}`}
                    value={editModalCourseCode}
                    onChange={e => setEditModalCourseCode(e.target.value.toUpperCase())}
                    disabled={!(userProfile?.role === 'admin' || userProfile?.role === 'owner')}
                    title={!(userProfile?.role === 'admin' || userProfile?.role === 'owner') ? "רק מנהלים יכולים לערוך מספרי קורסים" : ""}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">שם הקורס</label>
                  <input required type="text" className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 dark:text-slate-100" value={courseFormData.name} onChange={e => setCourseFormData({ ...courseFormData, name: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-[1fr_1fr_auto] gap-3 border-t border-slate-100 dark:border-slate-700 pt-4 items-end">
                <div><label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">משקל גיליונות (%)</label><input type="number" min="0" max="100" className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 dark:text-slate-100" value={courseFormData.hw_weight} onChange={e => setCourseFormData({ ...courseFormData, hw_weight: parseInt(e.target.value) || 0 })} /></div>
                <div><label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">מספר גיליונות תקפים</label><input type="number" min="0" max="20" className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 dark:text-slate-100" value={courseFormData.hw_keep} onChange={e => setCourseFormData({ ...courseFormData, hw_keep: parseInt(e.target.value) || 0 })} /></div>
                <label className="flex items-center gap-1.5 cursor-pointer pb-2 text-xs font-medium text-slate-700 dark:text-slate-300 w-16"><input type="checkbox" checked={courseFormData.hw_magen} onChange={e => setCourseFormData({ ...courseFormData, hw_magen: e.target.checked })} className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500" /> מגן</label>
              </div>
              <div className="grid grid-cols-[1fr_1fr_auto] gap-3 items-end">
                <div><label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">משקל וובוורק (%)</label><input type="number" min="0" max="100" className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 dark:text-slate-100" value={courseFormData.ww_weight} onChange={e => setCourseFormData({ ...courseFormData, ww_weight: parseInt(e.target.value) || 0 })} /></div>
                <div><label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">מספר וובוורקים תקפים</label><input type="number" min="0" max="20" className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 dark:text-slate-100" value={courseFormData.ww_keep} onChange={e => setCourseFormData({ ...courseFormData, ww_keep: parseInt(e.target.value) || 0 })} /></div>
                <label className="flex items-center gap-1.5 cursor-pointer pb-2 text-xs font-medium text-slate-700 dark:text-slate-300 w-16"><input type="checkbox" checked={courseFormData.ww_magen} onChange={e => setCourseFormData({ ...courseFormData, ww_magen: e.target.checked })} className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500" /> מגן</label>
              </div>

              <div className="grid grid-cols-[1fr_1fr_auto] gap-3 items-end">
                <div><label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">משקל דוחות מעבדה (%)</label><input type="number" min="0" max="100" className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 dark:text-slate-100" value={courseFormData.lab_report_weight} onChange={e => setCourseFormData({ ...courseFormData, lab_report_weight: parseInt(e.target.value) || 0 })} /></div>
                <div><label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">מספר דוחות תקפים</label><input type="number" min="0" max="20" className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 dark:text-slate-100" value={courseFormData.lab_report_keep} onChange={e => setCourseFormData({ ...courseFormData, lab_report_keep: parseInt(e.target.value) || 0 })} /></div>
                <label className="flex items-center gap-1.5 cursor-pointer pb-2 text-xs font-medium text-slate-700 dark:text-slate-300 w-16"><input type="checkbox" checked={courseFormData.lab_report_magen} onChange={e => setCourseFormData({ ...courseFormData, lab_report_magen: e.target.checked })} className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500" /> מגן</label>
              </div>

              <div className="grid grid-cols-[1fr_1fr_auto] gap-3 border-t border-slate-100 dark:border-slate-700 pt-4 items-end">
                <div><label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">משקל בוחן אמצע (%)</label><input type="number" min="0" max="100" className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 dark:text-slate-100" value={courseFormData.exam_weight} onChange={e => setCourseFormData({ ...courseFormData, exam_weight: parseInt(e.target.value) || 0 })} /></div>
                <div></div>
                <label className="flex items-center gap-1.5 cursor-pointer pb-2 text-xs font-medium text-slate-700 dark:text-slate-300 w-16"><input type="checkbox" checked={courseFormData.exam_magen} onChange={e => setCourseFormData({ ...courseFormData, exam_magen: e.target.checked })} className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500" /> מגן</label>
              </div>
              <div className="pt-4 flex gap-3"><button type="button" onClick={() => setIsCourseModalOpen(false)} className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 font-medium transition-colors">ביטול</button><button type="submit" className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">שמירה</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Mobile Filter Modal */}
      {isMobileFilterModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 dark:bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 md:hidden p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden border-t border-slate-100 dark:border-slate-700 max-h-[90vh] flex flex-col">
            <div className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700 px-6 py-4 flex justify-between items-center shrink-0">
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Filter className="w-5 h-5 text-slate-500" /> סינון מטלות
              </h2>
              <button onClick={() => setIsMobileFilterModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-3xl leading-none">&times;</button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto">
              {/* Type Filter */}
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">סוג מטלה:</label>
                <div className="flex flex-wrap gap-2">
                  {assignmentTypes.map(type => (
                    <button
                      key={type}
                      onClick={() => setActiveTypeFilter(type)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${activeTypeFilter === type
                        ? 'bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-900/40 dark:border-blue-700 dark:text-blue-400'
                        : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
                        }`}
                    >
                      {typeTranslations[type]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">סטטוס ביצוע:</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setHideCompleted(false)}
                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${!hideCompleted
                      ? 'bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-900/40 dark:border-blue-700 dark:text-blue-400'
                      : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
                      }`}
                  >
                    הצג הכל
                  </button>
                  <button
                    onClick={() => setHideCompleted(true)}
                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${hideCompleted
                      ? 'bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-900/40 dark:border-blue-700 dark:text-blue-400'
                      : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
                      }`}
                  >
                    רק לא בוצעו
                  </button>
                </div>
              </div>

              {/* Dates Filter */}
              <div>
                <div className="flex justify-between items-end mb-2">
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">טווח תאריכים:</label>
                  {(dateRange.start || dateRange.end) && (
                    <button
                      onClick={() => setDateRange({ start: '', end: '' })}
                      className="text-xs text-red-500 hover:text-red-600 font-bold"
                    >
                      נקה תאריכים
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">מתאריך:</label>
                    <input
                      type="date"
                      value={dateRange.start}
                      onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-lg outline-none text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">עד תאריך:</label>
                    <input
                      type="date"
                      value={dateRange.end}
                      onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-lg outline-none text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex gap-3 shrink-0">
              <button
                onClick={() => {
                  setActiveTypeFilter('All');
                  setHideCompleted(false);
                  setDateRange({ start: '', end: '' });
                }}
                className="px-4 py-3 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 font-bold transition-colors"
              >
                איפוס
              </button>
              <button
                onClick={() => setIsMobileFilterModalOpen(false)}
                className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-colors"
              >
                הצג תוצאות
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard Modal */}
      {isLeaderboardOpen && token && (
        <div className="fixed inset-0 bg-slate-900/50 dark:bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-700 flex flex-col max-h-[90vh]">
            <div className="bg-gradient-to-r from-rose-50 to-orange-50 dark:from-slate-800 dark:to-slate-800 border-b border-slate-100 dark:border-slate-700 px-6 py-4 flex justify-between items-center shrink-0">
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                מובילי הקהילה
              </h2>
              <button onClick={() => setIsLeaderboardOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-2xl leading-none">&times;</button>
            </div>

            {/* The Tab Switcher */}
            {!isLeaderboardLoading && leaderboardData && (
              <div className="flex border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 shrink-0">
                <button
                  onClick={() => setActiveLeaderboardTab('semester')}
                  className={`flex-1 py-2.5 text-sm font-bold border-b-2 transition-colors ${activeLeaderboardTab === 'semester' ? 'border-rose-500 text-rose-600 dark:text-rose-400 bg-white dark:bg-slate-800' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
                >
                  סמסטר נוכחי
                </button>
                <button
                  onClick={() => setActiveLeaderboardTab('all_time')}
                  className={`flex-1 py-2.5 text-sm font-bold border-b-2 transition-colors ${activeLeaderboardTab === 'all_time' ? 'border-rose-500 text-rose-600 dark:text-rose-400 bg-white dark:bg-slate-800' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
                >
                  כל הזמנים
                </button>
              </div>
            )}

            <div className="p-6 overflow-y-auto">
              {isLeaderboardLoading || !leaderboardData ? (
                <div className="flex justify-center items-center py-8">
                  <RefreshCw className="w-6 h-6 text-rose-500 animate-spin" />
                </div>
              ) : (
                <div className="space-y-6">
                  {/* The Podium */}
                  <div className="space-y-3">
                    {leaderboardData[activeLeaderboardTab].top_3.length === 0 ? (
                      <p className="text-center text-sm text-slate-500 dark:text-slate-400 py-4">עדיין אין לייקים בקהילה. היו הראשונים להעלות פתרון!</p>
                    ) : (
                      leaderboardData[activeLeaderboardTab].top_3.map((user, idx) => {
                        const isGold = idx === 0;
                        const isSilver = idx === 1;
                        const isBronze = idx === 2;

                        let badgeColor = "bg-slate-100 text-slate-500";
                        let iconColor = "text-slate-400";

                        if (isGold) { badgeColor = "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"; iconColor = "text-yellow-500"; }
                        if (isSilver) { badgeColor = "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300"; iconColor = "text-slate-400"; }
                        if (isBronze) { badgeColor = "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-500"; iconColor = "text-amber-600"; }

                        return (
                          <div key={user.id} className={`flex items-center justify-between p-3 rounded-xl border ${idx === 0 ? 'border-yellow-200 dark:border-yellow-900/50 shadow-sm' : 'border-slate-100 dark:border-slate-700'}`}>
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${badgeColor}`}>
                                {idx + 1}
                              </div>
                              <img src={user.picture || '/api/placeholder/32/32'} alt="" className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-600" referrerPolicy="no-referrer" />
                              <span className="font-bold text-slate-800 dark:text-slate-100">{user.name}</span>
                            </div>
                            <div className="flex items-center gap-1.5 font-bold">
                              <span className="text-slate-700 dark:text-slate-200">{user.score}</span>
                              <Heart className={`w-4 h-4 fill-current ${iconColor}`} />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* The Current User's Status */}
                  <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 flex items-center justify-center font-bold text-sm text-slate-500 dark:text-slate-400">
                          #{leaderboardData[activeLeaderboardTab].me.rank}
                        </div>
                        <span className="font-bold text-slate-700 dark:text-slate-300">המיקום שלי</span>
                      </div>
                      <div className="flex items-center gap-1.5 font-bold">
                        <span className="text-slate-700 dark:text-slate-200">{leaderboardData[activeLeaderboardTab].me.entry.score}</span>
                        <Heart className="w-4 h-4 fill-current text-rose-500" />
                      </div>
                    </div>
                  </div>

                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Upload / Edit Summary Modal */}
      {isSummaryModalOpen && token && (
        <div className="fixed inset-0 bg-slate-900/50 dark:bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-700">
            <div className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700 px-6 py-4 flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                {editingSummaryId ? 'עריכת סיכום' : 'העלאת סיכום'}
              </h2>
              <button onClick={() => setIsSummaryModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-2xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleSubmitSummary} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">שם הקובץ בתצוגה</label>
                <input
                  required
                  type="text"
                  placeholder="לדוגמה: סיכום הרצאות מלא"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-slate-800 dark:text-slate-100"
                  value={summaryFormData.filename}
                  onChange={e => setSummaryFormData({ ...summaryFormData, filename: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {editingSummaryId ? 'דריסת קובץ (אופציונלי - להחלפת התוכן)' : 'בחירת קובץ'}
                </label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.zip"
                  required={!editingSummaryId}
                  className="w-full text-sm text-slate-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 dark:file:bg-emerald-900/30 dark:file:text-emerald-400 cursor-pointer border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900"
                  onChange={e => {
                    const file = e.target.files?.[0] || null;
                    // Auto-fill the filename input if it's empty!
                    if (file && !editingSummaryId && !summaryFormData.filename) {
                      setSummaryFormData({ filename: file.name.replace(/\.[^/.]+$/, ""), file });
                    } else {
                      setSummaryFormData(prev => ({ ...prev, file }));
                    }
                  }}
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsSummaryModalOpen(false)} className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 font-medium transition-colors">ביטול</button>
                <button type="submit" disabled={isUploadingSummary} className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors flex justify-center items-center gap-2">
                  {isUploadingSummary ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'שמירה'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Degree Progress Modal */}
      {isProgressModalOpen && token && (
        <div className="fixed inset-0 bg-slate-900/50 dark:bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-700">
            <div className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700 px-6 py-4 flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-blue-500" />
                עדכון ממוצע התואר
              </h2>
              <button onClick={() => setIsProgressModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-2xl leading-none">&times;</button>
            </div>

            <form onSubmit={handleProgressUpdate} className="p-6 space-y-5">

              {/* Type Switcher */}
              <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
                <button type="button" onClick={() => setProgressForm(prev => ({ ...prev, is_redo: false }))} className={`flex-1 py-1.5 text-sm font-bold rounded-lg transition-colors ${!progressForm.is_redo ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500'}`}>
                  קורס חדש
                </button>
                <button type="button" onClick={() => setProgressForm(prev => ({ ...prev, is_redo: true }))} className={`flex-1 py-1.5 text-sm font-bold rounded-lg transition-colors ${progressForm.is_redo ? 'bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-sm' : 'text-slate-500'}`}>
                  שיפור ציון (Redo)
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">נקודות זכות לקורס</label>
                  <input required type="number" step="0.5" min="0" placeholder="לדוגמה: 3.5" className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 dark:text-slate-100" value={progressForm.credits} onChange={e => setProgressForm({ ...progressForm, credits: e.target.value })} />
                </div>

                {progressForm.is_redo && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={progressForm.old_was_pass_fail} onChange={e => setProgressForm({ ...progressForm, old_was_pass_fail: e.target.checked })} className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500" />
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">הקורס הקודם היה בינארי (עובר/לא עובר)</span>
                    </label>

                    {!progressForm.old_was_pass_fail && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">ציון קודם</label>
                        <input required type="number" min="0" max="100" placeholder="הציון שברצונך לדרוס" className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-slate-800 dark:text-slate-100" value={progressForm.old_score} onChange={e => setProgressForm({ ...progressForm, old_score: e.target.value })} />
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={progressForm.is_pass_fail} onChange={e => setProgressForm({ ...progressForm, is_pass_fail: e.target.checked })} className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500" />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">קורס בינארי (עובר/לא עובר)</span>
                  </label>

                  {!progressForm.is_pass_fail && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{progressForm.is_redo ? 'ציון חדש' : 'ציון סופי'}</label>
                      <input required type="number" min="0" max="100" placeholder="לדוגמה: 95" className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 dark:text-slate-100" value={progressForm.new_score} onChange={e => setProgressForm({ ...progressForm, new_score: e.target.value })} />
                    </div>
                  )}
                </div>
              </div>

              <button type="submit" disabled={isProgressUpdating} className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors flex justify-center items-center gap-2">
                {isProgressUpdating ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'שמור והוסף לממוצע'}
              </button>

              {/* Typo Correction Tools */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
                <button type="button" onClick={() => handleProgressAction('undo')} disabled={userProfile?.total_credits === userProfile?.previous_total_credits && userProfile?.weighted_sum === userProfile?.previous_weighted_sum && userProfile?.binary_credits === userProfile?.previous_binary_credits} className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-30 transition-colors">
                  ↩ בטל פעולה אחרונה
                </button>
                <button type="button" onClick={() => handleProgressAction('reset')} className="text-xs font-bold text-red-400 hover:text-red-600 transition-colors">
                  איפוס נתונים
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Dynamic Changelog Modal */}
      {showIntroModal && unseenReleases.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">

            <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800/80 border-b border-slate-200 dark:border-slate-700 relative shrink-0">
              <button onClick={() => setShowIntroModal(false)} className="absolute top-4 left-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-white/50 dark:hover:bg-slate-700 transition-colors">
                <X className="w-5 h-5" />
              </button>
              <div className="w-12 h-12 bg-white dark:bg-slate-700 rounded-xl shadow-sm flex items-center justify-center mb-4 text-blue-600 dark:text-blue-400">
                <Coffee className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">מה חדש במערכת?</h2>
              <p className="text-slate-600 dark:text-slate-400 mt-1 font-medium">הנה העדכונים האחרונים שפספסת מאז הביקור האחרון שלך:</p>
            </div>

            <div className="p-6 overflow-y-auto standard-scrollbar space-y-8 flex-1">
              {unseenReleases.map(release => (
                <div key={release.version} className="space-y-4">
                  <div className="flex items-baseline justify-between border-b border-slate-100 dark:border-slate-700 pb-2">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">{release.title}</h3>
                    <span className="text-xs font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">{release.date}</span>
                  </div>
                  <div className="space-y-4">
                    {release.features.map((feature: any, idx: number) => (
                      <div key={idx} className="flex gap-4">
                        <div className="shrink-0 mt-1 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg border border-slate-100 dark:border-slate-700">
                          <DynamicChangelogIcon name={feature.icon} className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 dark:text-white mb-0.5">{feature.title}</h4>
                          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{feature.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-6 border-t border-slate-200 dark:border-slate-700 shrink-0 bg-white dark:bg-slate-800">
              <div className="flex items-center gap-3 mb-4">
                <input
                  type="checkbox"
                  id="dontShowAgain"
                  checked={dontShowAgain}
                  onChange={(e) => setDontShowAgain(e.target.checked)}
                  className="w-4 h-4 border border-slate-300 dark:border-slate-600 rounded focus:ring-2 focus:ring-blue-500 accent-blue-600 cursor-pointer"
                />
                <label htmlFor="dontShowAgain" className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                  הבנתי, אל תציג עדכונים אלו שוב
                </label>
              </div>
              <button
                onClick={handleCloseIntroModal}
                className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg font-bold transition-all shadow-sm active:scale-[0.98]"
              >
                בואו נמשיך!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}