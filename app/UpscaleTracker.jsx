'use client';
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

// ── LOGO SVG ──────────────────────────────────────────
const LogoSVG = ({ size = 36 }) => (
  <img src="/logo.png" alt="Upscale Tracker Logo" 
       style={{ width: size, height: size, objectFit: 'contain', borderRadius: 8 }} 
       onError={(e) => { 
         // Fallback to SVG if logo.png is not added by the user yet
         e.target.style.display='none'; 
         e.target.nextSibling.style.display='block'; 
       }} 
  />
);
const LogoFallbackSVG = ({ size = 36 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" style={{display:'none'}}>
    <defs>
      <linearGradient id="lg1" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#7c3aed"/>
        <stop offset="50%" stopColor="#ec4899"/>
        <stop offset="100%" stopColor="#f97316"/>
      </linearGradient>
    </defs>
    <path d="M10 75 Q25 45 40 60 Q55 75 70 35 Q80 15 90 25" stroke="url(#lg1)" strokeWidth="8" strokeLinecap="round" fill="none"/>
    <path d="M10 85 Q30 60 50 70 Q70 80 90 45" stroke="url(#lg1)" strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.5"/>
    <path d="M75 20 L90 25 L85 38" stroke="url(#lg1)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
  </svg>
);
// We output both, so if img fails, the SVG shows up.
const LogoWrapper = ({ size=36 }) => <><LogoSVG size={size}/><LogoFallbackSVG size={size}/></>;

// ── CURRENCIES ────────────────────────────────────────
const CURRENCIES = [
  { code:"INR",symbol:"₹",name:"Indian Rupee",flag:"🇮🇳" },
  { code:"USD",symbol:"$",name:"US Dollar",flag:"🇺🇸" },
  { code:"EUR",symbol:"€",name:"Euro",flag:"🇪🇺" },
  { code:"GBP",symbol:"£",name:"British Pound",flag:"🇬🇧" },
  { code:"AED",symbol:"د.إ",name:"UAE Dirham",flag:"🇦🇪" },
  { code:"SGD",symbol:"S$",name:"Singapore Dollar",flag:"🇸🇬" },
  { code:"CAD",symbol:"C$",name:"Canadian Dollar",flag:"🇨🇦" },
  { code:"AUD",symbol:"A$",name:"Australian Dollar",flag:"🇦🇺" },
  { code:"JPY",symbol:"¥",name:"Japanese Yen",flag:"🇯🇵" },
  { code:"CNY",symbol:"¥",name:"Chinese Yuan",flag:"🇨🇳" },
];
const getCurrency = (code) => CURRENCIES.find(c=>c.code===code)||CURRENCIES[0];
const formatMoney = (amount,code="INR") => `${getCurrency(code).symbol}${Math.abs(amount||0).toLocaleString()}`;
const isPremium=u=>(u?.role==="admin")||(u?.plan?.startsWith("pro"))||(u?.plan==="enterprise");

// ── MARKDOWN FORMATTER ───────────────────────────────
const parseInlineMarkdown = (text) => {
  if (!text) return "";
  const regex = /(\*\*.*?\*\*|`.*?`|\*.*?\*)/g;
  const splitParts = text.split(regex);
  return splitParts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} style={{ fontWeight: 800 }}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={i} style={{
        fontFamily: "monospace",
        background: "rgba(128,128,128,0.15)",
        padding: "2px 4px",
        borderRadius: "4px",
        fontSize: "12px"
      }}>{part.slice(1, -1)}</code>;
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={i} style={{ fontStyle: "italic" }}>{part.slice(1, -1)}</em>;
    }
    return part;
  });
};

const renderMarkdown = (text, C) => {
  if (!text) return "";
  const lines = text.split("\n");
  return lines.map((line, index) => {
    let cleanLine = line.trim();
    
    // Check blockquote
    if (cleanLine.startsWith(">")) {
      const quoteText = cleanLine.substring(1).trim();
      return (
        <div key={index} style={{
          borderLeft: `3px solid ${C.accent}`,
          paddingLeft: "10px",
          color: C.muted,
          fontStyle: "italic",
          margin: "6px 0",
          lineHeight: "1.5"
        }}>
          {parseInlineMarkdown(quoteText)}
        </div>
      );
    }
    
    // Check headings
    if (cleanLine.startsWith("###")) {
      const headingText = cleanLine.substring(3).trim();
      return (
        <div key={index} style={{
          fontWeight: 800,
          fontSize: "15px",
          color: C.glow,
          marginTop: "10px",
          marginBottom: "4px"
        }}>
          {parseInlineMarkdown(headingText)}
        </div>
      );
    }
    if (cleanLine.startsWith("##")) {
      const headingText = cleanLine.substring(2).trim();
      return (
        <div key={index} style={{
          fontWeight: 900,
          fontSize: "16px",
          color: C.glow,
          marginTop: "12px",
          marginBottom: "6px"
        }}>
          {parseInlineMarkdown(headingText)}
        </div>
      );
    }

    // Check bullet points
    if (cleanLine.startsWith("* ") || cleanLine.startsWith("- ")) {
      const listText = cleanLine.substring(2).trim();
      return (
        <div key={index} style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "6px",
          paddingLeft: "12px",
          margin: "4px 0"
        }}>
          <span style={{ color: C.accent }}>•</span>
          <span>{parseInlineMarkdown(listText)}</span>
        </div>
      );
    }

    // Empty line
    if (cleanLine === "") {
      return <div key={index} style={{ height: "8px" }} />;
    }

    return (
      <div key={index} style={{ margin: "2px 0", lineHeight: "1.6" }}>
        {parseInlineMarkdown(line)}
      </div>
    );
  });
};


// ── THEMES ────────────────────────────────────────────
const themes = {
  dark: {
    bg:"#070711", card:"#0e0e1c", border:"#1e1e35", accent:"#6d28d9",
    glow:"#8b5cf6", gold:"#f59e0b", green:"#10b981", red:"#ef4444",
    blue:"#3b82f6", cyan:"#06b6d4", text:"#f0f0ff", muted:"#6b7280",
    soft:"#13131f", hover:"#1a1a2e", sidebar:"#09091a",
    cardGrad:"linear-gradient(135deg,#0e0e1c,#13131f)",
    inputBg:"#111122",
  },
  light: {
    bg:"#f0f2ff", card:"#ffffff", border:"#dde1f0", accent:"#6d28d9",
    glow:"#7c3aed", gold:"#d97706", green:"#059669", red:"#dc2626",
    blue:"#2563eb", cyan:"#0891b2", text:"#1a1033", muted:"#6b7280",
    soft:"#eef0fb", hover:"#e8eaf6", sidebar:"#ffffff",
    cardGrad:"linear-gradient(135deg,#ffffff,#f4f6ff)",
    inputBg:"#f4f6ff",
  }
};

// ── API ───────────────────────────────────────────────
const getTableName = (path) => {
  if (path.startsWith('/tasks')) return 'Task';
  if (path.startsWith('/habits')) return 'Habit';
  if (path.startsWith('/goals')) return 'Goal';
  if (path.startsWith('/roadmaps')) return 'SkillRoadmap';
  if (path.startsWith('/skills')) return 'Skill';
  if (path.startsWith('/notes')) return 'Note';
  if (path.startsWith('/finance')) return 'Finance';
  if (path.startsWith('/calendar')) return 'CalendarNote';
  if (path.startsWith('/focus')) return 'FocusSession';
  return '';
};

const api = async (path, method="GET", body=null, token=null) => {
  try {
    // Port secure routes to Next.js API Routes (AI coach, payments, OTP)
    if (path.startsWith('/ai-coach') || path.startsWith('/payment/') || path.startsWith('/auth/otp')) {
      const res = await fetch(`${API}${path}`, {
        method,
        headers: { "Content-Type":"application/json", ...(token && { Authorization:`Bearer ${token}` }) },
        ...(body && { body: JSON.stringify(body) }),
      });
      if (res.status === 401) {
        localStorage.removeItem("ut_token");
        localStorage.removeItem("ut_user");
        window.location.reload();
        return { error:"Session expired" };
      }
      return res.json();
    }

    // ── SUPABASE DIRECT OPERATIONS ────────────────────
    
    // Auth routes
    if (path === "/auth/login") {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: body.email,
        password: body.password
      });
      if (error) return { error: error.message };
      // Retrieve profile
      const { data: profile } = await supabase.from('User').select('*').eq('id', data.user.id).single();
      return { token: data.session.access_token, user: profile || data.user };
    }

    if (path === "/auth/register") {
      const { data, error } = await supabase.auth.signUp({
        email: body.email,
        password: body.password,
        options: {
          data: {
            name: body.name,
            profession: body.profession,
            age: body.age
          }
        }
      });
      if (error) return { error: error.message };
      // Give trigger a moment to run and populate public.User
      await new Promise(r => setTimeout(r, 800));
      const { data: profile } = await supabase.from('User').select('*').eq('id', data.user.id).single();
      return { token: data.session?.access_token || '', user: profile || data.user };
    }

    if (path === "/auth/me") {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) return { error: "Session expired" };
      const { data: profile } = await supabase.from('User').select('*').eq('id', user.id).single();
      return profile || user;
    }

    if (path === "/auth/profile") {
      const { data: { user } } = await supabase.auth.getUser();
      let { data, error } = await supabase.from('User').update(body).eq('id', user.id).select().single();
      if (error) {
        if (error.message.includes('recoveryEmail') || error.message.includes('column')) {
          const { recoveryEmail, ...rest } = body;
          const { data: retryData, error: retryError } = await supabase.from('User').update(rest).eq('id', user.id).select().single();
          if (retryError) return { error: retryError.message };
          return { ...retryData, dbWarning: "Profile saved! (To enable Recovery Email, run the SQL update in supabase_update.sql on Supabase)." };
        }
        return { error: error.message };
      }
      return data;
    }

    if (path === "/auth/password") {
      const { error } = await supabase.auth.updateUser({ password: body.newPassword });
      if (error) return { error: error.message };
      return { success: true };
    }

    if (path === "/auth/account") {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('User').delete().eq('id', user.id);
      if (error) return { error: error.message };
      await supabase.auth.signOut();
      return { success: true };
    }

    if (path === "/auth/forgot-password") {
      const { error } = await supabase.auth.resetPasswordForEmail(body.email);
      if (error) return { error: error.message };
      return { success: true, message: "OTP recovery code sent to your email!" };
    }

    if (path === "/auth/reset-password") {
      if (body.otp !== "LINK_VERIFIED") {
        const { data, error: verifyError } = await supabase.auth.verifyOtp({
          email: body.email,
          token: body.otp,
          type: 'recovery'
        });
        if (verifyError) return { error: verifyError.message };
      }
      const { error: updateError } = await supabase.auth.updateUser({
        password: body.newPassword
      });
      if (updateError) return { error: updateError.message };
      return { success: true };
    }

    // Database Reset
    if (path === "/user/reset") {
      const { data: { user } } = await supabase.auth.getUser();
      const uid = user.id;
      await supabase.from('Task').delete().eq('userId', uid);
      await supabase.from('Habit').delete().eq('userId', uid);
      await supabase.from('Goal').delete().eq('userId', uid);
      await supabase.from('Finance').delete().eq('userId', uid);
      await supabase.from('FocusSession').delete().eq('userId', uid);
      await supabase.from('Skill').delete().eq('userId', uid);
      await supabase.from('Note').delete().eq('userId', uid);
      await supabase.from('SkillRoadmap').delete().eq('userId', uid);
      return { ok: true };
    }

    // Analytics route
    if (path === "/analytics") {
      const { data: { user } } = await supabase.auth.getUser();
      const uid = user.id;
      const [tasksRes, habitsRes, goalsRes, skillsRes, financeRes, focusRes] = await Promise.all([
        supabase.from('Task').select('*').eq('userId', uid),
        supabase.from('Habit').select('*').eq('userId', uid),
        supabase.from('Goal').select('*').eq('userId', uid),
        supabase.from('Skill').select('*').eq('userId', uid),
        supabase.from('Finance').select('*').eq('userId', uid),
        supabase.from('FocusSession').select('*').eq('userId', uid),
      ]);
      const tasks = tasksRes.data || [];
      const habits = habitsRes.data || [];
      const goals = goalsRes.data || [];
      const skills = skillsRes.data || [];
      const finance = financeRes.data || [];
      const focus = focusRes.data || [];

      const income = finance.filter(f => f.type === 'income').reduce((a, b) => a + b.amount, 0);
      const expense = finance.filter(f => f.type === 'expense').reduce((a, b) => a + Math.abs(b.amount), 0);

      return {
        tasks: { total: tasks.length, done: tasks.filter(t => t.done).length, rate: tasks.length ? Math.round(tasks.filter(t => t.done).length / tasks.length * 100) : 0 },
        habits: { total: habits.length, done: habits.filter(h => h.done).length, rate: habits.length ? Math.round(habits.filter(h => h.done).length / habits.length * 100) : 0, bestStreak: Math.max(0, ...habits.map(h => h.longestStreak || 0)) },
        goals: { total: goals.length, completed: goals.filter(g => g.progress >= 100).length, avgProgress: goals.length ? Math.round(goals.reduce((a, g) => a + g.progress, 0) / goals.length) : 0 },
        skills: { total: skills.length, totalHours: skills.reduce((a, s) => a + s.hours, 0) },
        finance: { income, expense, savings: income - expense },
        focus: { sessions: focus.length, totalMinutes: Math.round(focus.reduce((a, f) => a + f.duration, 0) / 60) },
      };
    }

    // Admin Routes
    if (path === "/admin/stats") {
      const totalUsersCount = await supabase.from('User').select('*', { count: 'exact', head: true });
      const proUsersCount = await supabase.from('User').select('*', { count: 'exact', head: true }).neq('plan', 'free');
      const totalTasksCount = await supabase.from('Task').select('*', { count: 'exact', head: true });
      const totalHabitsCount = await supabase.from('Habit').select('*', { count: 'exact', head: true });
      const totalGoalsCount = await supabase.from('Goal').select('*', { count: 'exact', head: true });
      const totalFocusRes = await supabase.from('FocusSession').select('duration');
      const totalPaymentsRes = await supabase.from('Payment').select('amount').eq('status', 'completed');
      const recentUsersRes = await supabase.from('User').select('id, name, email, role, plan, createdAt').order('createdAt', { ascending: false }).limit(5);

      const totalFocusHours = Math.round((totalFocusRes.data?.reduce((a, f) => a + f.duration, 0) || 0) / 60);
      const revenue = totalPaymentsRes.data?.reduce((a, p) => a + p.amount, 0) || 0;

      return {
        totalUsers: totalUsersCount.count || 0,
        proUsers: proUsersCount.count || 0,
        freeUsers: (totalUsersCount.count || 0) - (proUsersCount.count || 0),
        totalTasks: totalTasksCount.count || 0,
        totalHabits: totalHabitsCount.count || 0,
        totalGoals: totalGoalsCount.count || 0,
        totalFocusHours,
        revenue,
        recentUsers: recentUsersRes.data || []
      };
    }

    if (path === "/admin/users") {
      const { data: users, error } = await supabase.from('User').select('id, name, email, role, plan, phone, profession, age, isActive, lastLogin, createdAt, tasks:Task(id), habits:Habit(id), goals:Goal(id), focusSessions:FocusSession(id)').order('createdAt', { ascending: false });
      if (error) return { error: error.message };
      return users.map(u => ({
        ...u,
        _count: {
          tasks: u.tasks?.length || 0,
          habits: u.habits?.length || 0,
          goals: u.goals?.length || 0,
          focusSessions: u.focusSessions?.length || 0
        }
      }));
    }

    if (path.startsWith('/admin/users/')) {
      const parts = path.split('/');
      const uid = parts[3];
      
      if (method === 'GET') {
        const { data: user, error } = await supabase.from('User').select('*, tasks:Task(*), habits:Habit(*), goals:Goal(*), skills:Skill(*), finance:Finance(*), focusSessions:FocusSession(*)').eq('id', uid).single();
        if (error) return { error: error.message };
        if (user.tasks) user.tasks = user.tasks.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 10);
        if (user.finance) user.finance = user.finance.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 10);
        if (user.focusSessions) user.focusSessions = user.focusSessions.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 10);
        return user;
      }
      if (method === 'PATCH') {
        const { data, error } = await supabase.from('User').update(body).eq('id', uid).select().single();
        if (error) return { error: error.message };
        return data;
      }
      if (method === 'DELETE') {
        const { error } = await supabase.from('User').delete().eq('id', uid);
        if (error) return { error: error.message };
        return { success: true };
      }
    }

    // CRUD database tables mapping
    const tableName = getTableName(path);
    if (!tableName) return { error: "Unknown path: " + path };

    if (method === "GET") {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { error: "Unauthorized" };

      let query = supabase.from(tableName).select('*').eq('userId', user.id);
      
      if (tableName === 'Task') query = query.order('createdAt', { ascending: false });
      else if (tableName === 'Habit') query = query.order('createdAt', { ascending: true });
      else if (tableName === 'Goal') query = query.order('createdAt', { ascending: false });
      else if (tableName === 'Finance') query = query.order('createdAt', { ascending: false });
      else if (tableName === 'CalendarNote') query = query.order('date', { ascending: true });
      else if (tableName === 'FocusSession') query = query.order('createdAt', { ascending: false }).limit(50);
      else if (tableName === 'Note') query = query.order('updatedAt', { ascending: false });
      else if (tableName === 'SkillRoadmap') {
        query = supabase.from(tableName).select('*, skills:Skill(*), notes:Note(*)').eq('userId', user.id).order('createdAt', { ascending: false });
      }

      const { data, error } = await query;
      if (error) return { error: error.message };
      return data;
    }

    if (method === "POST") {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { error: "Unauthorized" };

      const payload = { ...body, userId: user.id };
      if (tableName === 'Task') payload.done = false;
      if (tableName === 'Habit') {
        if (payload.goalDays !== undefined) payload.goalDays = parseInt(payload.goalDays) || 30;
        if (payload.streak !== undefined) payload.streak = parseInt(payload.streak) || 0;
        if (payload.longestStreak !== undefined) payload.longestStreak = parseInt(payload.longestStreak) || 0;
      }
      if (tableName === 'Skill') {
        if (payload.hours !== undefined) payload.hours = parseInt(payload.hours) || 0;
        if (payload.max !== undefined) payload.max = parseInt(payload.max) || 200;
        if (payload.goalHours !== undefined) payload.goalHours = parseInt(payload.goalHours) || 200;
      }
      if (tableName === 'Finance') {
        if (payload.amount !== undefined) payload.amount = parseFloat(payload.amount) || 0;
        if (payload.recurring !== undefined) payload.recurring = Boolean(payload.recurring);
      }
      if (tableName === 'CalendarNote') {
        if (payload.isHoliday !== undefined) payload.isHoliday = Boolean(payload.isHoliday);
        if (!payload.date) payload.date = new Date().toISOString().split('T')[0];
      }

      let { data, error } = await supabase.from(tableName).insert(payload).select().single();
      if (error && error.message.includes("currency") && tableName === 'Finance') {
        const { currency, ...cleanPayload } = payload;
        const retry = await supabase.from(tableName).insert(cleanPayload).select().single();
        data = retry.data;
        error = retry.error;
      }
      if (error && error.message.includes("notes") && tableName === 'SkillRoadmap') {
        const { notes, ...cleanPayload } = payload;
        const retry = await supabase.from(tableName).insert(cleanPayload).select().single();
        data = retry.data;
        error = retry.error;
      }
      if (error) return { error: error.message };
      return data;
    }

    if (method === "PATCH") {
      const parts = path.split('/');
      const id = parseInt(parts[2]);
      const payload = { ...body };
      
      if (tableName === 'Habit') {
        if (payload.goalDays !== undefined) payload.goalDays = parseInt(payload.goalDays) || 30;
        if (payload.streak !== undefined) payload.streak = parseInt(payload.streak) || 0;
        if (payload.longestStreak !== undefined) payload.longestStreak = parseInt(payload.longestStreak) || 0;
        if (payload.completions !== undefined) payload.completions = parseInt(payload.completions) || 0;
      }
      if (tableName === 'Skill') {
        if (payload.hours !== undefined) payload.hours = parseInt(payload.hours) || 0;
        if (payload.max !== undefined) payload.max = parseInt(payload.max) || 200;
        if (payload.goalHours !== undefined) payload.goalHours = parseInt(payload.goalHours) || 200;
      }
      if (tableName === 'Finance') {
        if (payload.amount !== undefined) payload.amount = parseFloat(payload.amount) || 0;
        if (payload.recurring !== undefined) payload.recurring = Boolean(payload.recurring);
      }

      let { data, error } = await supabase.from(tableName).update(payload).eq('id', id).select().single();
      if (error && error.message.includes("currency") && tableName === 'Finance') {
        const { currency, ...cleanPayload } = payload;
        const retry = await supabase.from(tableName).update(cleanPayload).eq('id', id).select().single();
        data = retry.data;
        error = retry.error;
      }
      if (error && error.message.includes("notes") && tableName === 'SkillRoadmap') {
        const { notes, ...cleanPayload } = payload;
        const retry = await supabase.from(tableName).update(cleanPayload).eq('id', id).select().single();
        data = retry.data;
        error = retry.error;
      }
      if (error) return { error: error.message };
      return data;
    }

    if (method === "DELETE") {
      const parts = path.split('/');
      const id = parseInt(parts[2]);
      const { error } = await supabase.from(tableName).delete().eq('id', id);
      if (error) return { error: error.message };
      return { success: true };
    }

    return { error: "Method not supported: " + method };
  } catch (e) {
    return { error: e.message };
  }
};

// ── DEMO DATA ─────────────────────────────────────────
const DEMO = {
  tasks: [
    {id:-1,title:"Design landing page",project:"Work",priority:"High",done:false,due:"Today",startDate:"2026-03-01",endDate:"2026-03-10",description:"Modern conversion-focused design"},
    {id:-2,title:"Morning workout",project:"Health",priority:"Medium",done:true,due:"Today",startDate:"2026-03-08",endDate:"2026-03-08"},
    {id:-3,title:"Read 20 pages",project:"Learning",priority:"Low",done:false,due:"Today",description:"Atomic Habits ch.4"},
    {id:-4,title:"Client presentation",project:"Work",priority:"High",done:false,due:"Tomorrow"},
  ],
  habits: [
    {id:-1,title:"Morning Meditation",icon:"🧘",streak:12,longestStreak:21,done:true,freq:"Daily",cat:"Mindfulness",color:"#6d28d9",goalDays:30,completions:12},
    {id:-2,title:"Exercise",icon:"💪",streak:8,longestStreak:15,done:false,freq:"Daily",cat:"Health",color:"#10b981",goalDays:30,completions:8},
    {id:-3,title:"Read 20 pages",icon:"📚",streak:5,longestStreak:5,done:false,freq:"Daily",cat:"Learning",color:"#3b82f6",goalDays:60,completions:5},
    {id:-4,title:"Drink 8 glasses water",icon:"💧",streak:15,longestStreak:20,done:true,freq:"Daily",cat:"Health",color:"#06b6d4",goalDays:30,completions:15},
  ],
  goals: [
    {id:-1,title:"Launch SaaS Product",icon:"🚀",progress:65,deadline:"Jun 2026",cat:"Career",status:"active",startDate:"2026-01-01",endDate:"2026-06-30",description:"Build and launch for 1000 users",milestones:'["MVP","Beta","Launch"]'},
    {id:-2,title:"Get Fit — Lose 10kg",icon:"💪",progress:40,deadline:"May 2026",cat:"Health",status:"active"},
    {id:-3,title:"Master Full-Stack Dev",icon:"💻",progress:80,deadline:"Apr 2026",cat:"Learning",status:"active"},
  ],
  roadmaps: [
    {id:-1,title:"Web Development",icon:"💻",color:"#6d28d9",description:"Full stack journey",
      skills:[
        {id:-1,name:"HTML/CSS",level:"Advanced",hours:120,max:150,color:"#f59e0b",goalHours:150,roadmapId:-1},
        {id:-2,name:"JavaScript",level:"Intermediate",hours:80,max:200,color:"#3b82f6",goalHours:200,roadmapId:-1},
        {id:-3,name:"React",level:"Intermediate",hours:60,max:200,color:"#06b6d4",goalHours:200,roadmapId:-1},
      ],
      notes:[{id:-1,title:"Resources",content:"MDN, freeCodeCamp, The Odin Project",roadmapId:-1}]
    },
  ],
  finance: [
    {id:-1,label:"Salary",amount:75000,type:"income",category:"Job",date:"2026-03-01",currency:"INR"},
    {id:-2,label:"Freelance",amount:25000,type:"income",category:"Freelance",date:"2026-03-05",currency:"INR"},
    {id:-3,label:"Rent",amount:15000,type:"expense",category:"Housing",date:"2026-03-01",currency:"INR"},
    {id:-4,label:"Groceries",amount:5000,type:"expense",category:"Food",date:"2026-03-06",currency:"INR"},
    {id:-5,label:"SIP Investment",amount:10000,type:"saving",category:"Investment",date:"2026-03-01",currency:"INR"},
  ],
};

// ── BASE COMPONENTS ───────────────────────────────────
const Spinner = () => <div style={{display:"inline-block",width:18,height:18,border:"2px solid #ffffff33",borderTopColor:"#fff",borderRadius:"50%",animation:"spin 0.7s linear infinite"}} />;

function Toast({toasts}) {
  return (
    <div style={{position:"fixed",bottom:24,right:24,display:"flex",flexDirection:"column",gap:8,zIndex:9999,maxWidth:320}}>
      {toasts.map(t=>(
        <div key={t.id} style={{background:t.type==="error"?"#ef4444":t.type==="warn"?"#f59e0b":"#10b981",color:"#fff",padding:"12px 18px",borderRadius:12,fontWeight:700,fontSize:13,boxShadow:"0 4px 24px #0008",animation:"slideIn 0.3s ease"}}>
          {t.type==="error"?"⚠️":t.type==="warn"?"⚡":"✓"} {t.msg}
        </div>
      ))}
    </div>
  );
}

function Modal({title,onClose,children,C,wide}) {
  return (
    <div style={{position:"fixed",inset:0,background:"#000b",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:16}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:20,padding:28,width:"100%",maxWidth:wide?640:480,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 24px 64px #0009"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}>
          <h3 style={{margin:0,fontSize:17,fontWeight:800,color:C.text}}>{title}</h3>
          <button onClick={onClose} style={{background:C.soft,border:"none",color:C.muted,cursor:"pointer",fontSize:15,width:32,height:32,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({label,children,C}) {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:5}}>
      {label&&<label style={{fontSize:11,color:C.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:0.8}}>{label}</label>}
      {children}
    </div>
  );
}

function Input({C,...props}) {
  const [focused,setFocused]=useState(false);
  return (
    <input {...props} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}
      style={{padding:"10px 14px",borderRadius:10,border:`1.5px solid ${focused?C.accent:C.border}`,background:C.inputBg,color:C.text,fontSize:14,outline:"none",width:"100%",transition:"border-color 0.2s",fontFamily:"inherit",...props.style}}/>
  );
}

function Textarea({C,...props}) {
  return <textarea {...props} style={{padding:"10px 14px",borderRadius:10,border:`1.5px solid ${C.border}`,background:C.inputBg,color:C.text,fontSize:14,outline:"none",width:"100%",minHeight:80,resize:"vertical",fontFamily:"inherit",...props.style}}/>;
}

function Select({C,options,...props}) {
  return (
    <select {...props} style={{padding:"10px 14px",borderRadius:10,border:`1.5px solid ${C.border}`,background:C.inputBg,color:C.text,fontSize:14,outline:"none",width:"100%",cursor:"pointer",fontFamily:"inherit"}}>
      {options.map(o=>typeof o==="string"?<option key={o} value={o}>{o}</option>:<option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function Btn({children,onClick,variant="primary",size="md",C,disabled,style:s}) {
  const [hover,setHover]=useState(false);
  const pad=size==="sm"?"6px 14px":size==="lg"?"14px 28px":"10px 20px";
  const bg=variant==="primary"?(hover?C.glow:C.accent):variant==="danger"?(hover?"#dc2626":C.red):hover?C.soft:"transparent";
  const border=variant==="outline"?`1.5px solid ${C.border}`:"none";
  const col=["ghost","outline"].includes(variant)?C.muted:"#fff";
  return (
    <button onClick={onClick} disabled={disabled} onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}
      style={{padding:pad,borderRadius:10,border,background:bg,color:col,fontWeight:700,cursor:disabled?"not-allowed":"pointer",fontSize:size==="sm"?12:14,opacity:disabled?0.6:1,transition:"all 0.15s",display:"flex",alignItems:"center",gap:6,fontFamily:"inherit",...s}}>
      {children}
    </button>
  );
}

function ProgressBar({value,C,color,height=6}) {
  return (
    <div style={{height,background:C.border,borderRadius:99,overflow:"hidden"}}>
      <div style={{width:`${Math.min(100,Math.max(0,value))}%`,height:"100%",background:color||`linear-gradient(90deg,${C.accent},${C.glow})`,borderRadius:99,transition:"width 0.6s ease"}}/>
    </div>
  );
}

function Badge({text,color,bg}) {
  return <span style={{fontSize:10,color,background:bg||`${color}22`,padding:"3px 8px",borderRadius:99,fontWeight:700,whiteSpace:"nowrap"}}>{text}</span>;
}

function EmojiSug({onSelect,C,show}){
  const ems=["🎯","✨","🔥","✅","🧘","🏃","💧","🍎","💻","📚","💰","✈️","🏠","📅","⏰","📈","🏆","🌱","🧠","🎨","👔","🏀","🎸","🚗","🚢","🌍","💡","✉️","🔐","🔑"];
  return(
    <div style={{maxHeight:show?200:0,overflow:"hidden",transition:"all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",opacity:show?1:0,marginTop:show?6:0}}>
      <div style={{display:"flex",flexWrap:"wrap",gap:4,padding:8,background:C.soft,borderRadius:10,border:`1px solid ${C.border}`}}>
        {ems.map(e=><button key={e} onClick={()=>onSelect(e)} style={{padding:6,background:"transparent",border:"none",fontSize:18,cursor:"pointer",borderRadius:6,transition:"transform 0.1s"}} onMouseEnter={el=>el.currentTarget.style.transform="scale(1.2)"} onMouseLeave={el=>el.currentTarget.style.transform="scale(1)"}>{e}</button>)}
      </div>
    </div>
  );
}

function StatCard({icon,label,value,sub,color,C}) {
  return (
    <div className="stat-card" style={{background:C.cardGrad,border:`1px solid ${C.border}`,borderRadius:16,padding:"16px 18px",transition:"transform 0.2s"}} onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"} onMouseLeave={e=>e.currentTarget.style.transform="none"}>
      <div style={{fontSize:20}}>{icon}</div>
      <div className="stat-card-value" style={{fontSize:24,fontWeight:900,color:color||C.text,margin:"6px 0 2px",lineHeight:1,overflowWrap:"anywhere"}}>{value}</div>
      <div style={{fontSize:12,fontWeight:600,color:C.text}}>{label}</div>
      {sub&&<div style={{fontSize:10,color:C.muted,marginTop:2}}>{sub}</div>}
    </div>
  );
}

// ── LIVE CLOCK ────────────────────────────────────────
function LiveClock({C}) {
  const [now,setNow]=useState(new Date());
  useEffect(()=>{const t=setInterval(()=>setNow(new Date()),1000);return()=>clearInterval(t);},[]);
  const h=now.getHours(),m=now.getMinutes(),s=now.getSeconds();
  const ampm=h>=12?"PM":"AM",h12=h%12||12,f=n=>String(n).padStart(2,"0");
  const days=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const months=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return (
    <div style={{textAlign:"center"}}>
      <div style={{fontSize:40,fontWeight:900,color:C.text,fontFamily:"monospace",letterSpacing:2,lineHeight:1}}>
        {f(h12)}:{f(m)}<span style={{fontSize:24,color:C.muted}}>:{f(s)}</span>
        <span style={{fontSize:16,color:C.glow,marginLeft:8}}>{ampm}</span>
      </div>
      <div style={{fontSize:12,color:C.muted,marginTop:4}}>{days[now.getDay()]}, {months[now.getMonth()]} {now.getDate()}, {now.getFullYear()}</div>
    </div>
  );
}

function TopbarClock({C}) {
  const [now,setNow]=useState(new Date());
  useEffect(()=>{const t=setInterval(()=>setNow(new Date()),1000);return()=>clearInterval(t);},[]);
  const h=now.getHours(),m=now.getMinutes(),ampm=h>=12?"PM":"AM",h12=h%12||12;
  const days=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const months=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return (
    <div style={{display:"flex",alignItems:"center",gap:6}}>
      <div className="hide-xs" style={{fontSize:11,color:C.muted,display:"flex",alignItems:"center",gap:3}}>
        <span>📅</span><span>{days[now.getDay()]}, {months[now.getMonth()]} {now.getDate()}</span>
      </div>
      <div style={{fontSize:11,fontWeight:700,color:C.text,background:C.soft,padding:"3px 8px",borderRadius:7,fontFamily:"monospace",display:"flex",alignItems:"center",gap:4}}>
        <span style={{fontSize:14}}>🕐</span> {h12}:{String(m).padStart(2,"0")} {ampm}
      </div>
    </div>
  );
}

// ── MINI CALENDAR ─────────────────────────────────────
function MiniCalendar({C,selectedDate,onSelect,highlightDates=[]}) {
  const [viewDate,setViewDate]=useState(selectedDate?new Date(selectedDate):new Date());
  const today=new Date(),year=viewDate.getFullYear(),month=viewDate.getMonth();
  const monthNames=["January","February","March","April","May","June","July","August","September","October","November","December"];
  const dayNames=["Su","Mo","Tu","We","Th","Fr","Sa"];
  const firstDay=new Date(year,month,1).getDay();
  const daysInMonth=new Date(year,month+1,0).getDate();
  const isToday=d=>today.getDate()===d&&today.getMonth()===month&&today.getFullYear()===year;
  const isSelected=d=>{
    if(!selectedDate||!d)return false;
    const str=`${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    return selectedDate.startsWith(str);
  };
  const isHL=d=>{
    if(!d||!highlightDates||highlightDates.length===0)return false;
    const str=`${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    return highlightDates.some(hd=>hd&&String(hd).startsWith(str));
  };
  const selectDay=d=>{const ds=`${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;onSelect&&onSelect(ds);};
  const cells=[];for(let i=0;i<firstDay;i++)cells.push(null);for(let d=1;d<=daysInMonth;d++)cells.push(d);
  return (
    <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:14,userSelect:"none",minWidth:240}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <button onClick={()=>setViewDate(new Date(year,month-1,1))} style={{width:26,height:26,borderRadius:7,border:`1px solid ${C.border}`,background:C.soft,color:C.text,cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}>‹</button>
        <span style={{fontSize:13,fontWeight:800,color:C.text}}>{monthNames[month]} {year}</span>
        <button onClick={()=>setViewDate(new Date(year,month+1,1))} style={{width:26,height:26,borderRadius:7,border:`1px solid ${C.border}`,background:C.soft,color:C.text,cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}>›</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:1,marginBottom:4}}>
        {dayNames.map(d=><div key={d} style={{textAlign:"center",fontSize:9,color:C.muted,fontWeight:700,padding:"2px 0"}}>{d}</div>)}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:1}}>
        {cells.map((d,i)=>(
          <button key={i} onClick={()=>d&&selectDay(d)} disabled={!d}
            style={{width:"100%",aspectRatio:"1",borderRadius:7,border:"none",fontSize:11,fontWeight:isToday(d)||isSelected(d)?800:400,cursor:d?"pointer":"default",background:isSelected(d)?C.accent:isToday(d)?`${C.accent}33`:isHL(d)?`${C.gold}22`:"transparent",color:isSelected(d)?"#fff":isToday(d)?C.glow:d?C.text:"transparent",position:"relative",transition:"all 0.1s"}}>
            {d||""}
            {d&&isHL(d)&&!isSelected(d)&&<span style={{position:"absolute",bottom:1,left:"50%",transform:"translateX(-50%)",width:3,height:3,borderRadius:"50%",background:C.gold,display:"block"}}/>}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── DATE-TIME PICKER ──────────────────────────────────
function DateTimePicker({C,value,onChange,label,includeTime=false,placeholder}) {
  const [open,setOpen]=useState(false);
  const [time,setTime]=useState("09:00");
  const [isMobile,setIsMobile]=useState(false);
  const [popPos,setPopPos]=useState({top:"auto",bottom:"auto",left:"auto",right:"auto"});
  const ref=useRef(null);

  useEffect(()=>{
    const h=e=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false);};
    document.addEventListener("mousedown",h);return()=>document.removeEventListener("mousedown",h);
  },[]);

  const checkViewport=useCallback(()=>{
    const mobile=window.innerWidth <= 600;
    setIsMobile(mobile);
    if(ref.current){
      const rect=ref.current.getBoundingClientRect();
      const screenW=window.innerWidth;
      const screenH=window.innerHeight;

      // Vertical positioning: check space below vs space above
      const spaceBelow=screenH - rect.bottom;
      const spaceAbove=rect.top;
      const shouldFlipUp=(spaceBelow < 300 && spaceAbove > 180) || rect.top > screenH * 0.42;

      let vPos={};
      if(shouldFlipUp){
        vPos={bottom:`${Math.max(10, screenH - rect.top + 6)}px`,top:"auto"};
      } else {
        vPos={top:`${Math.max(10, rect.bottom + 6)}px`,bottom:"auto"};
      }

      // Horizontal positioning: check if field is in right half of parent container or screen
      const pRect = ref.current.parentElement?.getBoundingClientRect();
      const isRightHalf = rect.left > screenW / 2 || (pRect && (rect.left + rect.width / 2 > pRect.left + pRect.width / 2 + 10));

      let hPos={};
      if(isRightHalf){
        const rightVal=Math.max(12, screenW - rect.right);
        hPos={right:`${rightVal}px`,left:"auto"};
      } else {
        const leftVal=Math.max(12, rect.left);
        hPos={left:`${leftVal}px`,right:"auto"};
      }

      setPopPos({...vPos,...hPos});
    }
  },[]);

  useEffect(()=>{
    if(open){
      checkViewport();
      window.addEventListener("resize",checkViewport);
      window.addEventListener("scroll",checkViewport,true);
      return()=>{
        window.removeEventListener("resize",checkViewport);
        window.removeEventListener("scroll",checkViewport,true);
      };
    }
  },[open,checkViewport]);

  const handleSelect=dateStr=>{if(includeTime){onChange(`${dateStr}T${time}`);}else{onChange(dateStr);setOpen(false);}};
  const displayValue=()=>{if(!value)return placeholder||"Pick date";const d=new Date(value);if(isNaN(d))return value;return d.toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})+(includeTime?` ${d.getHours().toString().padStart(2,"0")}:${d.getMinutes().toString().padStart(2,"0")}`:"");};
  return (
    <div ref={ref} style={{position:"relative",width:"100%"}}>
      <button type="button" onClick={()=>setOpen(o=>!o)} style={{width:"100%",padding:"8px 10px",borderRadius:10,border:`1.5px solid ${open?C.accent:C.border}`,background:C.inputBg,color:value?C.text:C.muted,fontSize:12,fontWeight:600,textAlign:"left",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",fontFamily:"inherit",whiteSpace:"nowrap",overflow:"hidden"}}>
        <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",lineHeight:1.2}}>{displayValue()}</span>
        <span style={{flexShrink:0,fontSize:13,marginLeft:4}}>📅</span>
      </button>
      {open&&(
        isMobile ? (
          <div style={{position:"fixed",inset:0,background:"#0008",zIndex:10000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={e=>e.target===e.currentTarget&&setOpen(false)}>
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:20,padding:16,boxShadow:"0 20px 60px #000c",maxWidth:320,width:"100%",display:"flex",flexDirection:"column",alignItems:"center",animation:"fadeUp 0.2s ease"}}>
              <div style={{width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <span style={{fontSize:13,fontWeight:800,color:C.text}}>{placeholder||"Select Date"}</span>
                <button type="button" onClick={()=>setOpen(false)} style={{background:C.soft,border:"none",color:C.muted,borderRadius:6,width:26,height:26,cursor:"pointer",fontSize:13}}>✕</button>
              </div>
              <MiniCalendar C={C} selectedDate={value?.split("T")[0]} onSelect={handleSelect}/>
              {includeTime&&(
                <div style={{marginTop:10,width:"100%"}}>
                  <div style={{fontSize:11,color:C.muted,fontWeight:700,marginBottom:5}}>TIME</div>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    <input type="time" value={time} onChange={e=>setTime(e.target.value)} style={{flex:1,padding:"8px 10px",borderRadius:8,border:`1px solid ${C.border}`,background:C.inputBg,color:C.text,fontSize:13,outline:"none"}}/>
                    <button type="button" onClick={()=>{if(value){onChange(`${value.split("T")[0]}T${time}`);setOpen(false);}}} style={{padding:"8px 12px",borderRadius:8,border:"none",background:C.accent,color:"#fff",fontWeight:700,cursor:"pointer",fontSize:12}}>Set</button>
                  </div>
                </div>
              )}
              {value&&<button type="button" onClick={()=>{onChange("");setOpen(false);}} style={{width:"100%",marginTop:10,padding:"8px",borderRadius:8,border:`1px solid ${C.border}`,background:"transparent",color:C.muted,cursor:"pointer",fontSize:12}}>Clear Date</button>}
            </div>
          </div>
        ) : (
          <div style={{
            position:"fixed",
            top: popPos.top,
            bottom: popPos.bottom,
            left: popPos.left,
            right: popPos.right,
            zIndex: 10000,
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 16,
            padding: 12,
            boxShadow: "0 16px 48px #000c",
            maxWidth: "calc(100vw - 24px)",
            width: "max-content"
          }}>
            <MiniCalendar C={C} selectedDate={value?.split("T")[0]} onSelect={handleSelect}/>
            {includeTime&&(
              <div style={{marginTop:10,padding:"0 4px"}}>
                <div style={{fontSize:11,color:C.muted,fontWeight:700,marginBottom:5}}>TIME</div>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  <input type="time" value={time} onChange={e=>setTime(e.target.value)} style={{flex:1,padding:"8px 10px",borderRadius:8,border:`1px solid ${C.border}`,background:C.inputBg,color:C.text,fontSize:13,outline:"none"}}/>
                  <button type="button" onClick={()=>{if(value){onChange(`${value.split("T")[0]}T${time}`);setOpen(false);}}} style={{padding:"8px 12px",borderRadius:8,border:"none",background:C.accent,color:"#fff",fontWeight:700,cursor:"pointer",fontSize:12}}>Set</button>
                </div>
              </div>
            )}
            {value&&<button type="button" onClick={()=>{onChange("");setOpen(false);}} style={{width:"100%",marginTop:8,padding:"6px",borderRadius:8,border:`1px solid ${C.border}`,background:"transparent",color:C.muted,cursor:"pointer",fontSize:11}}>Clear</button>}
          </div>
        )
      )}
    </div>
  );
}

// ── TIME PICKER ───────────────────────────────────────
function TimePicker({C,value,onChange}) {
  const [open,setOpen]=useState(false);
  const [isMobile,setIsMobile]=useState(false);
  const [popPos,setPopPos]=useState({top:"auto",bottom:"auto",left:"auto",right:"auto"});
  const ref=useRef(null);
  const hours=Array.from({length:24},(_,i)=>i);
  const minutes=[0,5,10,15,20,25,30,35,40,45,50,55];
  const [selH,setSelH]=useState(value?parseInt(value.split(":")[0]):9);
  const [selM,setSelM]=useState(value?parseInt(value.split(":")[1]):0);
  useEffect(()=>{const h=e=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false);};document.addEventListener("mousedown",h);return()=>document.removeEventListener("mousedown",h);},[]);

  const checkViewport=useCallback(()=>{
    const mobile=window.innerWidth <= 600;
    setIsMobile(mobile);
    if(ref.current){
      const rect=ref.current.getBoundingClientRect();
      const screenW=window.innerWidth;
      const screenH=window.innerHeight;

      // Vertical positioning
      const spaceBelow=screenH - rect.bottom;
      const spaceAbove=rect.top;
      const shouldFlipUp=(spaceBelow < 250 && spaceAbove > 180) || rect.top > screenH * 0.42;

      let vPos={};
      if(shouldFlipUp){
        vPos={bottom:`${Math.max(10, screenH - rect.top + 6)}px`,top:"auto"};
      } else {
        vPos={top:`${Math.max(10, rect.bottom + 6)}px`,bottom:"auto"};
      }

      // Horizontal positioning
      const pRect = ref.current.parentElement?.getBoundingClientRect();
      const isRightHalf = rect.left > screenW / 2 || (pRect && (rect.left + rect.width / 2 > pRect.left + pRect.width / 2 + 10));

      let hPos={};
      if(isRightHalf){
        const rightVal=Math.max(12, screenW - rect.right);
        hPos={right:`${rightVal}px`,left:"auto"};
      } else {
        const leftVal=Math.max(12, rect.left);
        hPos={left:`${leftVal}px`,right:"auto"};
      }

      setPopPos({...vPos,...hPos});
    }
  },[]);

  useEffect(()=>{
    if(open){
      checkViewport();
      window.addEventListener("resize",checkViewport);
      window.addEventListener("scroll",checkViewport,true);
      return()=>{
        window.removeEventListener("resize",checkViewport);
        window.removeEventListener("scroll",checkViewport,true);
      };
    }
  },[open,checkViewport]);

  const confirm=()=>{onChange(`${String(selH).padStart(2,"0")}:${String(selM).padStart(2,"0")}`);setOpen(false);};
  const fmt12=h=>{const ampm=h>=12?"PM":"AM",h12=h%12||12;return`${h12} ${ampm}`;};
  return (
    <div ref={ref} style={{position:"relative",width:"100%"}}>
      <button type="button" onClick={()=>setOpen(o=>!o)} style={{width:"100%",padding:"8px 10px",borderRadius:10,border:`1.5px solid ${open?C.accent:C.border}`,background:C.inputBg,color:value?C.text:C.muted,fontSize:12,fontWeight:600,textAlign:"left",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",fontFamily:"inherit",whiteSpace:"nowrap",overflow:"hidden"}}>
        <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",lineHeight:1.2}}>{value?`${fmt12(parseInt(value.split(":")[0]))} ${String(parseInt(value.split(":")[1])).padStart(2,"0")}m`:"Pick time"}</span>
        <span style={{flexShrink:0,fontSize:13,marginLeft:4}}>🕐</span>
      </button>
      {open&&(
        isMobile ? (
          <div style={{position:"fixed",inset:0,background:"#0008",zIndex:10000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={e=>e.target===e.currentTarget&&setOpen(false)}>
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:20,padding:16,boxShadow:"0 20px 60px #000c",width:260,maxWidth:"calc(100vw - 32px)",animation:"fadeUp 0.2s ease"}}>
              <div style={{width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <span style={{fontSize:13,fontWeight:800,color:C.text}}>Select Time</span>
                <button type="button" onClick={()=>setOpen(false)} style={{background:C.soft,border:"none",color:C.muted,borderRadius:6,width:26,height:26,cursor:"pointer",fontSize:13}}>✕</button>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <div>
                  <div style={{fontSize:10,color:C.muted,fontWeight:700,marginBottom:6,textTransform:"uppercase"}}>Hour</div>
                  <div style={{maxHeight:150,overflowY:"auto",display:"flex",flexDirection:"column",gap:2}}>
                    {hours.map(h=><button type="button" key={h} onClick={()=>setSelH(h)} style={{padding:"4px 8px",borderRadius:7,border:"none",background:selH===h?C.accent:"transparent",color:selH===h?"#fff":C.text,cursor:"pointer",fontSize:12,textAlign:"left",fontWeight:selH===h?700:400}}>{fmt12(h)}</button>)}
                  </div>
                </div>
                <div>
                  <div style={{fontSize:10,color:C.muted,fontWeight:700,marginBottom:6,textTransform:"uppercase"}}>Min</div>
                  <div style={{display:"flex",flexDirection:"column",gap:2}}>
                    {minutes.map(m=><button type="button" key={m} onClick={()=>setSelM(m)} style={{padding:"4px 8px",borderRadius:7,border:"none",background:selM===m?C.accent:"transparent",color:selM===m?"#fff":C.text,cursor:"pointer",fontSize:12,textAlign:"left",fontWeight:selM===m?700:400}}>:{String(m).padStart(2,"0")}</button>)}
                  </div>
                </div>
              </div>
              <button type="button" onClick={confirm} style={{width:"100%",marginTop:14,padding:"10px",borderRadius:10,border:"none",background:C.accent,color:"#fff",fontWeight:700,cursor:"pointer",fontSize:13}}>Set Time ✓</button>
            </div>
          </div>
        ) : (
          <div style={{
            position:"fixed",
            top: popPos.top,
            bottom: popPos.bottom,
            left: popPos.left,
            right: popPos.right,
            zIndex: 10000,
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 16,
            padding: 14,
            boxShadow: "0 16px 48px #000c",
            width: 220,
            maxWidth: "calc(100vw - 24px)"
          }}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <div>
                <div style={{fontSize:10,color:C.muted,fontWeight:700,marginBottom:6,textTransform:"uppercase"}}>Hour</div>
                <div style={{maxHeight:150,overflowY:"auto",display:"flex",flexDirection:"column",gap:2}}>
                  {hours.map(h=><button type="button" key={h} onClick={()=>setSelH(h)} style={{padding:"4px 8px",borderRadius:7,border:"none",background:selH===h?C.accent:"transparent",color:selH===h?"#fff":C.text,cursor:"pointer",fontSize:12,textAlign:"left",fontWeight:selH===h?700:400}}>{fmt12(h)}</button>)}
                </div>
              </div>
              <div>
                <div style={{fontSize:10,color:C.muted,fontWeight:700,marginBottom:6,textTransform:"uppercase"}}>Min</div>
                <div style={{display:"flex",flexDirection:"column",gap:2}}>
                  {minutes.map(m=><button type="button" key={m} onClick={()=>setSelM(m)} style={{padding:"4px 8px",borderRadius:7,border:"none",background:selM===m?C.accent:"transparent",color:selM===m?"#fff":C.text,cursor:"pointer",fontSize:12,textAlign:"left",fontWeight:selM===m?700:400}}>:{String(m).padStart(2,"0")}</button>)}
                </div>
              </div>
            </div>
            <button type="button" onClick={confirm} style={{width:"100%",marginTop:10,padding:"8px",borderRadius:8,border:"none",background:C.accent,color:"#fff",fontWeight:700,cursor:"pointer",fontSize:12}}>Set Time ✓</button>
          </div>
        )
      )}
    </div>
  );
}

// ── PREMIUM GATE ──────────────────────────────────────
function PremiumGate({C,onUpgrade}) {
  return (
    <div style={{background:C.card,border:`2px solid ${C.gold}44`,borderRadius:20,padding:48,textAlign:"center",maxWidth:480,margin:"40px auto"}}>
      <div style={{fontSize:56,marginBottom:16}}>🔒</div>
      <h3 style={{color:C.gold,fontSize:20,fontWeight:900,margin:"0 0 10px"}}>Premium Feature</h3>
      <p style={{color:C.muted,fontSize:14,margin:"0 0 28px",lineHeight:1.6}}>Upgrade to Pro to unlock AI Coach, Advanced Analytics, and unlimited everything.</p>
      <button onClick={onUpgrade} style={{padding:"13px 28px",borderRadius:12,border:"none",background:`linear-gradient(135deg,${C.accent},${C.blue})`,color:"#fff",fontWeight:800,cursor:"pointer",fontSize:14,width:"100%"}}>⚡ Upgrade Now</button>
    </div>
  );
}

// ── RICH TEXT EDITOR ──────────────────────────────────
function RichTextEditor({C,value,onChange,placeholder}) {
  const editorRef=useRef(null);
  useEffect(()=>{
    if(editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || "";
    }
  },[value]);

  const exec=(cmd,val=null)=>{
    document.execCommand(cmd,false,val);
    if(editorRef.current) onChange(editorRef.current.innerHTML);
  };

  const insertSymbol=(s)=>{
    const span=`<span style="font-family:monospace;font-size:20px;display:inline-block;padding:4px">${s}</span>`;
    exec("insertHTML",span);
  };

  const insertImage=()=>{
    const url=prompt("Enter image URL:");
    if(url) exec("insertImage",url);
  };

  const insertMultimedia = async (e) => {
    const files = Array.from(e.target.files);
    for (const f of files) {
      const r = new FileReader();
      r.onload = () => {
        if (f.type.startsWith("image")) {
          const img = `<img src="${r.result}" style="max-width:100%;border-radius:12px;cursor:nwse-resize;display:block;margin:10px 0" onclick="this.style.width=prompt('Enter width (e.g. 50%, 300px):',this.style.width||'100%')"/>`;
          exec("insertHTML", img);
        } else if (f.type.startsWith("video")) {
          const vid = `<video src="${r.result}" controls style="max-width:100%;border-radius:12px;display:block;margin:10px 0"></video>`;
          exec("insertHTML", vid);
        } else if (f.type === "application/pdf") {
          const pdf = `<object data="${r.result}" type="application/pdf" style="width:100%;height:500px;border-radius:12px;margin:10px 0"></object>`;
          exec("insertHTML", pdf);
        } else {
          const a = `<a href="${r.result}" download="${f.name}" style="color:#2563eb;font-weight:bold;display:block;margin:10px 0">📎 Download ${f.name}</a>`;
          exec("insertHTML", a);
        }
      };
      r.readAsDataURL(f);
    }
  };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:8,background:C.inputBg,border:`1.5px solid ${C.border}`,borderRadius:12,overflow:"hidden"}}>
      <div style={{display:"flex",gap:4,padding:6,background:C.soft,borderBottom:`1px solid ${C.border}`,flexWrap:"wrap",alignItems:"center"}}>
        <button onClick={()=>exec("bold")} style={{padding:"6px 10px",borderRadius:6,border:"none",background:C.card,color:C.text,cursor:"pointer",fontSize:13,fontWeight:900}}>B</button>
        <button onClick={()=>exec("italic")} style={{padding:"6px 10px",borderRadius:6,border:"none",background:C.card,color:C.text,cursor:"pointer",fontSize:13,fontStyle:"italic"}}>I</button>
        <button onClick={()=>exec("underline")} style={{padding:"6px 10px",borderRadius:6,border:"none",background:C.card,color:C.text,cursor:"pointer",fontSize:13,textDecoration:"underline"}}>U</button>
        <select defaultValue="3" onChange={(e)=>exec("fontSize",e.target.value)} style={{background:C.card,color:C.text,border:"none",borderRadius:6,padding:"4px 8px",fontSize:12}}>
          <option value="1">Small</option>
          <option value="3">Normal</option>
          <option value="5">Large</option>
          <option value="7">Huge</option>
        </select>
        <input type="color" onChange={(e)=>exec("foreColor",e.target.value)} style={{width:30,height:30,border:"none",background:"none",cursor:"pointer"}} title="Text Color"/>
        <div style={{width:1,height:24,background:C.border,margin:"0 4px"}}/>
        {["―","□","▭","○","|","||","+","#"].map(s=>(
          <button key={s} onClick={()=>insertSymbol(s)} style={{padding:"6px 10px",borderRadius:6,border:"none",background:C.card,color:C.text,cursor:"pointer",fontSize:13}}>{s}</button>
        ))}
        <div style={{width:1,height:24,background:C.border,margin:"0 4px"}}/>
        <label style={{padding:"6px 10px",borderRadius:6,border:"none",background:C.card,color:C.text,cursor:"pointer",fontSize:13}} title="Upload Media">
          📎 <input type="file" hidden accept="image/*,video/*,.pdf" multiple onChange={insertMultimedia}/>
        </label>
      </div>
      <div 
        ref={editorRef}
        contentEditable
        onInput={(e)=>onChange(e.currentTarget.innerHTML)}
        placeholder={placeholder}
        style={{minHeight:300,padding:16,color:C.text,fontSize:14,lineHeight:1.6,outline:"none",overflowY:"auto"}}
      />
    </div>
  );
}

// ── AUTH PAGES ────────────────────────────────────────
function AuthPage({onLogin,addToast,theme,setTheme}) {
  const [tab,setTab]=useState("signin");
  const [form,setForm]=useState({name:"",email:"",password:"",profession:"",age:""});
  const [loading,setLoading]=useState(false);
  const [forgotOpen,setForgotOpen]=useState(false);
  const [forgotStep,setForgotStep]=useState(1);
  const [forgotEmail,setForgotEmail]=useState("");
  const [otpCode,setOtpCode]=useState("");
  const [newPass,setNewPass]=useState("");
  
  // Custom states for enhancements
  const [professionDropdownOpen, setProfessionDropdownOpen] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [changePrimaryEmail, setChangePrimaryEmail] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setForgotEmail(session?.user?.email || "");
        setForgotOpen(true);
        setForgotStep(2);
        setOtpCode("LINK_VERIFIED");
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleAuth=async()=>{
    if(!form.email||!form.password){addToast("Fill all fields","error");return;}
    if(tab==="signup"&&!form.name){addToast("Name required","error");return;}
    try{
      setLoading(true);
      const res=await api(tab==="signin"?"/auth/login":"/auth/register","POST",form);
      setLoading(false);
      if(!res||res.error||!res.token){
        addToast(res?.error||"Unable to sign in. Please check your details or try again in a moment.","error");
        return;
      }
      addToast(tab==="signin"?"Welcome back! 👋":"Account created! 🎉","success");
      if(tab==="signup") addToast("Confirmation email sent! Please verify your account.","info");
      onLogin(res.token,res.user);
    }catch(e){
      setLoading(false);
      addToast("Network error while signing in. Please verify the server is running.", "error");
    }
  };

  const sendForgotOtp=async()=>{
    if(!forgotEmail){addToast("Enter email","error");return;}
    setLoading(true);
    const res=await api("/auth/forgot-password","POST",{email:forgotEmail});
    setLoading(false);
    if(res.error){addToast(res.error,"error");return;}
    addToast("OTP sent! Check your email.","success");
    setForgotStep(2);
  };

  const verifyOtpAndReset=async()=>{
    if(!otpCode||!newPass){addToast("Fill all fields","error");return;}
    setLoading(true);
    const res=await api("/auth/reset-password","POST",{email:forgotEmail,otp:otpCode,newPassword:newPass});
    setLoading(false);
    if(res.error){addToast(res.error,"error");return;}
    addToast("Password reset! Login now.","success");
    setForgotOpen(false);setForgotStep(1);setTab("signin");
  };

  // Account Recovery handlers
  const sendRecoveryOtp=async()=>{
    if(!forgotEmail){addToast("Enter recovery email","error");return;}
    setLoading(true);
    const res=await api("/auth/recovery","POST",{action:"send-otp",recoveryEmail:forgotEmail});
    setLoading(false);
    if(res.error){addToast(res.error,"error");return;}
    addToast(res.message || "OTP sent! Check your recovery email.","success");
    if(res.devOtp) {
      addToast(`[DEV MODE] Recovery OTP: ${res.devOtp}`, "info");
    }
    setForgotStep(2);
  };

  const verifyRecoveryOtpAndReset=async()=>{
    if(!otpCode||!newPass){addToast("Fill all fields","error");return;}
    setLoading(true);
    const res=await api("/auth/recovery","POST",{
      action:"verify-reset",
      recoveryEmail:forgotEmail,
      otp:otpCode,
      newPassword:newPass,
      changePrimaryEmail:changePrimaryEmail
    });
    setLoading(false);
    if(res.error){addToast(res.error,"error");return;}
    addToast(res.message || "Account recovered successfully!","success");
    setForgotOpen(false);setForgotStep(1);setRecoveryMode(false);setTab("signin");
  };

  const C=themes[theme]||themes.light;
  const features=[
    {icon:"🎯",text:"Track goals & habits with streaks"},
    {icon:"🧠",text:"AI Life Coach powered by Claude"},
    {icon:"📊",text:"Smart analytics & insights"},
    {icon:"💰",text:"Personal finance tracker"},
    {icon:"⏰",text:"Pomodoro focus timer"},
    {icon:"❤️",text:"Track your daily health & wellness"},
    {icon:"🗺️",text:"Skill roadmap builder"},
    {icon:"📝",text:"To‑Do notes for quick ideas"},
  ];

  return (
    <div style={{minHeight:"100vh",background:`radial-gradient(ellipse at 60% 0%,${C.accent}22 0%,transparent 60%),radial-gradient(ellipse at 0% 100%,${C.blue}15 0%,transparent 60%),${C.bg}`,display:"flex",flexDirection:"column"}}>
      {/* Top nav */}
      <div className="auth-top" style={{padding:"14px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <LogoSVG size={32}/>
          <span style={{fontSize:18,fontWeight:900,background:"linear-gradient(135deg,#8b5cf6,#ec4899,#f97316)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",whiteSpace:"nowrap"}}>Upscale Tracker</span>
        </div>
        <div className="auth-top-right" style={{display:"flex",gap:8,alignItems:"center",flexShrink:0}}>
          <span style={{color:C.muted,fontSize:12,whiteSpace:"nowrap"}}>Already have an account?</span>
          <button onClick={()=>setTab("signin")} style={{padding:"6px 14px",borderRadius:9,border:`1.5px solid ${C.border}`,background:"transparent",color:C.text,cursor:"pointer",fontWeight:600,fontSize:12,whiteSpace:"nowrap",flexShrink:0}}>Sign In</button>
          <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} style={{padding:"6px",borderRadius:9,border:`1.5px solid ${C.border}`,background:"transparent",color:C.text,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,width:34,height:34,flexShrink:0,transition:"transform 0.2s"}} title="Toggle Light/Dark Mode" onMouseEnter={e=>e.currentTarget.style.transform="scale(1.05)"} onMouseLeave={e=>e.currentTarget.style.transform="none"}>
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="auth-grid" style={{flex:1,display:"grid",gridTemplateColumns:"1fr 1fr",gap:0,maxWidth:1100,margin:"0 auto",padding:"20px 32px",alignItems:"center",width:"100%"}}>
        {/* Left side - hero */}
        <div className="auth-hero" style={{padding:"0 40px 0 0",display:"flex",flexDirection:"column",justifyContent:"center"}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:8,background:`${C.accent}22`,border:`1px solid ${C.accent}44`,borderRadius:99,padding:"6px 14px",marginBottom:24,width:"fit-content"}}>
            <span style={{width:6,height:6,borderRadius:"50%",background:C.green,display:"inline-block",boxShadow:`0 0 10px ${C.green}`}}/>
            <span style={{fontSize:12,color:C.glow,fontWeight:700}}>Premium AI Life OS</span>
          </div>
          <h1 style={{fontSize:"clamp(36px,5vw,56px)",fontWeight:950,color:C.accent,letterSpacing:"-1px",lineHeight:1.1,margin:"0 0 16px",whiteSpace:"nowrap"}}>
            Upscale Tracker
          </h1>
          <p style={{fontSize:"clamp(20px,2vw,24px)",color:C.text,lineHeight:1.4,margin:"0 0 32px",maxWidth:480,fontWeight:600}}>
            Track habits, conquer goals, and organize your chaotic life effortlessly.
          </p>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
            {features.map((f,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"14px 16px",borderRadius:16,background:C.card,border:`1px solid ${C.border}`,boxShadow:theme==="dark"?"0 4px 20px #0002":"0 4px 20px rgba(0,0,0,0.05)",transition:"transform 0.2s"}} onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"} onMouseLeave={e=>e.currentTarget.style.transform="none"}>
                <span style={{fontSize:22,background:theme==="dark"?"#8b5cf630":"#8b5cf618",border:`1px solid ${C.accent}30`,width:40,height:40,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{f.icon}</span>
                <span style={{fontSize:13,fontWeight:700,color:C.text,lineHeight:1.3}}>{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right side - form */}
        <div>
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:24,padding:"clamp(24px,4vw,40px)",boxShadow:theme==="dark"?"0 24px 64px #0006":"0 24px 64px rgba(0,0,0,0.1)",maxWidth:480,margin:"0 auto"}}>
            <div style={{display:"flex",gap:4,background:C.soft,borderRadius:12,padding:4,marginBottom:28}}>
              {["signin","signup"].map(t=>(
                <button key={t} onClick={()=>{setTab(t); setProfessionDropdownOpen(false);}}
                  style={{flex:1,padding:"10px",borderRadius:9,border:"none",background:tab===t?C.accent:"transparent",color:tab===t?"#fff":C.muted,fontWeight:700,cursor:"pointer",fontSize:14,transition:"all 0.2s"}}>
                  {t==="signin"?"Sign In":"Sign Up"}
                </button>
              ))}
            </div>

            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              {tab==="signup"&&(
                <>
                  <Field label="Full Name" C={C}>
                    <Input C={C} value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Your full name"/>
                  </Field>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                    <Field label="Profession" C={C}>
                      <div style={{position:"relative"}}>
                        <button type="button" onClick={(e) => {
                          e.preventDefault();
                          setProfessionDropdownOpen(!professionDropdownOpen);
                        }} style={{
                          padding:"10px 14px",
                          borderRadius:10,
                          border:`1.5px solid ${C.border}`,
                          background:C.inputBg,
                          color:form.profession ? C.text : C.muted,
                          fontSize:14,
                          outline:"none",
                          width:"100%",
                          cursor:"pointer",
                          fontFamily:"inherit",
                          textAlign:"left",
                          display:"flex",
                          justifyContent:"space-between",
                          alignItems:"center"
                        }}>
                          <span>{form.profession || "Select Profession"}</span>
                          <span style={{fontSize:10}}>▼</span>
                        </button>
                        {professionDropdownOpen && (
                          <div style={{
                            position:"absolute",
                            top:"105%",
                            left:0,
                            right:0,
                            maxHeight:"200px",
                            overflowY:"auto",
                            background:C.card,
                            border:`1.5px solid ${C.border}`,
                            borderRadius:10,
                            zIndex:100,
                            boxShadow:"0 10px 25px rgba(0,0,0,0.2)"
                          }}>
                            {[
                              {label:"Select Profession",value:""},
                              "Software Developer","Designer","Student","Entrepreneur","Engineer","Doctor / Medical","Analyst","Sales / Marketing","Manager","Teacher","Lawyer","Accountant","Freelancer","Content Creator","Artist / Musician","Other"
                            ].map((o, idx) => {
                              const label = typeof o === "string" ? o : o.label;
                              const value = typeof o === "string" ? o : o.value;
                              return (
                                <div key={idx} 
                                  onClick={() => {
                                    setForm({...form, profession: value});
                                    setProfessionDropdownOpen(false);
                                  }}
                                  style={{
                                    padding:"10px 14px",
                                    fontSize:13,
                                    color:C.text,
                                    cursor:"pointer",
                                    background:form.profession === value ? `${C.accent}22` : "transparent",
                                    transition:"background 0.15s"
                                  }}
                                  onMouseEnter={e => e.currentTarget.style.background = C.hover}
                                  onMouseLeave={e => e.currentTarget.style.background = form.profession === value ? `${C.accent}22` : "transparent"}
                                >
                                  {label}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      {form.profession==="Other"&&<Input C={C} value={form.otherProfession||""} onChange={e=>setForm({...form,otherProfession:e.target.value})} placeholder="Specify profession" style={{marginTop:6}}/>}
                    </Field>
                    <Field label="Age" C={C}>
                      <Input C={C} type="number" value={form.age||""} onChange={e=>setForm({...form,age:e.target.value})} placeholder="Your age" min={1} max={120}/>
                    </Field>
                  </div>
                </>
              )}
              <Field label="Email" C={C}>
                <Input C={C} type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="you@example.com"/>
              </Field>
              <Field label="Password" C={C}>
                <Input C={C} type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} placeholder="Min 6 characters" onKeyDown={e=>e.key==="Enter"&&handleAuth()}/>
              </Field>
              {tab==="signin"&&(
                <button onClick={()=>{setForgotOpen(true); setRecoveryMode(false); setForgotStep(1); setForgotEmail("");}} style={{background:"none",border:"none",color:C.glow,cursor:"pointer",fontSize:12,textAlign:"right",padding:0,fontWeight:600}}>Forgot password?</button>
              )}
              <button onClick={handleAuth} disabled={loading}
                style={{padding:"13px",borderRadius:12,border:"none",background:`linear-gradient(135deg,${C.accent},${C.blue})`,color:"#fff",fontWeight:800,cursor:loading?"not-allowed":"pointer",fontSize:15,opacity:loading?0.8:1,transition:"opacity 0.2s",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                {loading?<Spinner/>:null}
                {loading?"Please wait...":(tab==="signin"?"Sign In →":"Create Account →")}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal / Account Recovery Modal */}
      {forgotOpen&&(
        <div style={{position:"fixed",inset:0,background:"#000b",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}}>
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:20,padding:32,width:"100%",maxWidth:400,boxShadow:"0 24px 64px #0009"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <h3 style={{margin:0,color:C.text,fontSize:16,fontWeight:800}}>{recoveryMode ? "Account Recovery" : (forgotStep===1?"Forgot Password":"Reset Password")}</h3>
              <button onClick={()=>{setForgotOpen(false);setForgotStep(1);setRecoveryMode(false);}} style={{background:C.soft,border:"none",color:C.muted,cursor:"pointer",width:30,height:30,borderRadius:8,fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
            </div>
            {forgotStep===1?(
              <div style={{display:"flex",flexDirection:"column",gap:14}}>
                {recoveryMode ? (
                  <>
                    <p style={{color:C.muted,fontSize:13,margin:0,lineHeight:1.5}}>Enter your registered <strong>Recovery Email</strong>. We will search for your account and send an OTP code.</p>
                    <Field label="Recovery Email" C={C}><Input C={C} type="email" value={forgotEmail} onChange={e=>setForgotEmail(e.target.value)} placeholder="recovery@example.com"/></Field>
                    <button onClick={sendRecoveryOtp} disabled={loading} style={{padding:"12px",borderRadius:10,border:"none",background:C.accent,color:"#fff",fontWeight:700,cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>{loading?<Spinner/>:null}{loading?"Searching...":"Send Recovery OTP →"}</button>
                    <button onClick={()=>{setRecoveryMode(false); setForgotEmail("");}} style={{background:"none",border:"none",color:C.glow,cursor:"pointer",fontSize:12,fontWeight:600}}>Back to standard reset</button>
                  </>
                ) : (
                  <>
                    <p style={{color:C.muted,fontSize:13,margin:0,lineHeight:1.5}}>Enter your email address. We'll send an OTP to reset your password.</p>
                    <Field label="Email" C={C}><Input C={C} type="email" value={forgotEmail} onChange={e=>setForgotEmail(e.target.value)} placeholder="your@email.com"/></Field>
                    <button onClick={sendForgotOtp} disabled={loading} style={{padding:"12px",borderRadius:10,border:"none",background:C.accent,color:"#fff",fontWeight:700,cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>{loading?<Spinner/>:null}{loading?"Sending...":"Send OTP →"}</button>
                    <div style={{borderTop:`1px dashed ${C.border}`,margin:"8px 0"}} />
                    <button onClick={()=>{setRecoveryMode(true); setForgotEmail("");}} style={{background:"none",border:"none",color:C.glow,cursor:"pointer",fontSize:12,fontWeight:600}}>Lost access to primary email? Use Recovery Email</button>
                  </>
                )}
              </div>
            ):(
              <div style={{display:"flex",flexDirection:"column",gap:14}}>
                <p style={{color:C.muted,fontSize:13,margin:0}}>
                  {otpCode === "LINK_VERIFIED" 
                    ? "Your recovery link has been verified." 
                    : `Enter the OTP sent to ${forgotEmail}`}
                </p>
                {otpCode !== "LINK_VERIFIED" ? (
                  <Field label="OTP Code" C={C}><Input C={C} value={otpCode} onChange={e=>setOtpCode(e.target.value)} placeholder="6-digit code" maxLength={6}/></Field>
                ) : (
                  <div style={{background:`${C.green}18`,border:`1px solid ${C.green}44`,padding:"10px 14px",borderRadius:10,color:C.green,fontSize:12,fontWeight:700}}>
                    ✓ Recovery link verified successfully! Please enter your new password below.
                  </div>
                )}
                <Field label="New Password" C={C}><Input C={C} type="password" value={newPass} onChange={e=>setNewPass(e.target.value)} placeholder="Min 6 characters"/></Field>
                {recoveryMode && (
                  <label style={{display:"flex",alignItems:"center",gap:8,fontSize:12,color:C.text,cursor:"pointer",userSelect:"none",margin:"4px 0"}}>
                    <input type="checkbox" checked={changePrimaryEmail} onChange={e=>setChangePrimaryEmail(e.target.checked)} style={{cursor:"pointer"}}/>
                    <span>My primary email is hacked (change my login email to this recovery email)</span>
                  </label>
                )}
                <button onClick={recoveryMode ? verifyRecoveryOtpAndReset : verifyOtpAndReset} disabled={loading} style={{padding:"12px",borderRadius:10,border:"none",background:C.accent,color:"#fff",fontWeight:700,cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>{loading?<Spinner/>:null}{loading?"Verifying...":"Reset Password ✓"}</button>
                <button onClick={()=>{setForgotOpen(false);setForgotStep(1);setOtpCode("");setRecoveryMode(false);}} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:12}}>Cancel</button>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @media (max-width:768px){
          .auth-grid{grid-template-columns:1fr!important;padding:16px!important;}
          .auth-hero{display:none!important;}
          .auth-top{flex-direction:column!important;align-items:flex-start!important;padding:14px 16px!important;}
          .auth-top-right{width:100%;justify-content:space-between;}
        }
      `}</style>
    </div>
  );
}

// ── PROFILE PAGE ──────────────────────────────────────
function ProfilePage({user,token,C,onUpdate,onBack,onReset,addToast,currency,setCurrency}) {
  const [tab,setTab]=useState("profile");
  const [form,setForm]=useState({name:user?.name||"",phone:user?.phone||"",bio:user?.bio||"",timezone:user?.timezone||"Asia/Kolkata",recoveryEmail:user?.recoveryEmail||""});
  const [passForm,setPassForm]=useState({current:"",newPass:"",confirm:""});
  const [deleteEmail,setDeleteEmail]=useState("");
  const [deletePassword,setDeletePassword]=useState("");
  const [loading,setLoading]=useState(false);
  const [saveIndicator,setSaveIndicator]=useState({status:"idle",msg:""});
  const [avatarUrl,setAvatarUrl]=useState(user?.avatar||"");
  const [imageFile,setImageFile]=useState(null);
  const fileRef=useRef(null);
  const [passOtpSent,setPassOtpSent]=useState(false);
  const [passOtpCode,setPassOtpCode]=useState("");
  const [delOtpSent,setDelOtpSent]=useState(false);
  const [delOtpCode,setDelOtpCode]=useState("");

  const AVATARS=["👤","🦁","🐯","🦊","🐺","🦝","🦄","🦕","🦅","🦉","🐬","🦋","⭐","⚡","🔥","💎"];
  const timezones=["Asia/Kolkata","America/New_York","America/Los_Angeles","Europe/London","Europe/Paris","Asia/Tokyo","Asia/Singapore","Australia/Sydney","America/Chicago","Asia/Dubai"];

  const handleFileUpload=(e)=>{
    const file=e.target.files[0];
    if(!file)return;
    const reader=new FileReader();
    reader.onloadend=()=>{setAvatarUrl(reader.result);setImageFile(file);};
    reader.readAsDataURL(file);
  };

  const saveProfile=async()=>{
    setLoading(true);
    setSaveIndicator({status:"saving",msg:"Saving..."});
    try{
      const payload={...form,avatar:avatarUrl};
      const res=await api("/auth/profile","PATCH",payload,token);
      if(res.error){
        setSaveIndicator({status:"error",msg:res.error});
        addToast(res.error,"error");
        return;
      }
      onUpdate(res);
      if (res.dbWarning) {
        setSaveIndicator({status:"saved",msg:res.dbWarning});
        addToast(res.dbWarning,"warn");
      } else {
        setSaveIndicator({status:"saved",msg:"Changes saved ✓"});
        addToast("Profile updated! ✅","success");
      }
      setTimeout(()=>setSaveIndicator({status:"idle",msg:""}),4000);
    } finally {
      setLoading(false);
    }
  };

  const requestPassOtp = async () => {
    if (!passForm.current || !passForm.newPass) { addToast("Fill all fields", "error"); return; }
    if (passForm.newPass !== passForm.confirm) { addToast("Passwords don't match", "error"); return; }
    if (passForm.newPass.length < 6) { addToast("Min 6 characters", "error"); return; }
    
    setLoading(true);
    const res = await api("/auth/otp", "POST", { action: "send", type: "change-password" }, token);
    setLoading(false);
    
    if (res.error) {
      addToast(res.error, "error");
    } else {
      addToast(res.message || "OTP sent to email!", "success");
      if (res.devOtp) {
        addToast(`[DEV ONLY] OTP Code: ${res.devOtp}`, "info");
      }
      setPassOtpSent(true);
    }
  };

  const verifyPassOtpAndChange = async () => {
    if (!passOtpCode) { addToast("Enter OTP code", "error"); return; }
    setLoading(true);
    
    const verifyRes = await api("/auth/otp", "POST", { action: "verify", otp: passOtpCode, type: "change-password" }, token);
    if (verifyRes.error) {
      setLoading(false);
      addToast(verifyRes.error, "error");
      return;
    }
    
    const res = await api("/auth/password", "PATCH", { currentPassword: passForm.current, newPassword: passForm.newPass }, token);
    setLoading(false);
    
    if (res.error) {
      addToast(res.error, "error");
    } else {
      addToast("Password changed successfully! 🔐", "success");
      setPassForm({ current: "", newPass: "", confirm: "" });
      setPassOtpSent(false);
      setPassOtpCode("");
    }
  };

  const requestDeleteOtp = async () => {
    if (deleteEmail !== user?.email) { addToast("Email doesn't match", "error"); return; }
    if (!deletePassword) { addToast("Enter your password to confirm", "error"); return; }
    
    setLoading(true);
    const res = await api("/auth/otp", "POST", { action: "send", type: "delete-account" }, token);
    setLoading(false);
    
    if (res.error) {
      addToast(res.error, "error");
    } else {
      addToast(res.message || "OTP sent to email!", "success");
      if (res.devOtp) {
        addToast(`[DEV ONLY] OTP Code: ${res.devOtp}`, "info");
      }
      setDelOtpSent(true);
    }
  };

  const verifyDeleteOtpAndConfirm = async () => {
    if (!delOtpCode) { addToast("Enter OTP code", "error"); return; }
    setLoading(true);
    
    const verifyRes = await api("/auth/otp", "POST", { action: "verify", otp: delOtpCode, type: "delete-account" }, token);
    if (verifyRes.error) {
      setLoading(false);
      addToast(verifyRes.error, "error");
      return;
    }
    
    const res = await api("/auth/account", "DELETE", { password: deletePassword }, token);
    setLoading(false);
    
    if (res.error) {
      addToast(res.error, "error");
    } else {
      addToast("Account deleted successfully.", "success");
      localStorage.removeItem("ut_token");
      localStorage.removeItem("ut_user");
      window.location.reload();
    }
  };

  const tabs=[{id:"profile",label:"👤 Profile"},{id:"avatar",label:"🎨 Avatar"},{id:"password",label:"🔐 Password"},{id:"danger",label:"⚠️ Danger"}];

  return (
    <div style={{minHeight:"100vh",background:C.bg,padding:"0 0 40px"}}>
      <div style={{padding:"16px 24px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:12,background:C.card}}>
        <button onClick={onBack} style={{background:C.soft,border:`1px solid ${C.border}`,color:C.muted,cursor:"pointer",padding:"8px 16px",borderRadius:10,display:"flex",alignItems:"center",gap:6,fontSize:13,fontWeight:600}}>← Back</button>
        <h2 style={{margin:0,fontSize:17,fontWeight:800,color:C.text}}>Account Settings</h2>
      </div>

      <div style={{maxWidth:640,margin:"0 auto",padding:"24px 20px"}}>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:24}}>
          {tabs.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)}
              style={{padding:"9px 16px",borderRadius:10,border:`1.5px solid ${tab===t.id?C.accent:C.border}`,background:tab===t.id?C.accent:"transparent",color:tab===t.id?"#fff":C.muted,cursor:"pointer",fontWeight:700,fontSize:13}}>
              {t.label}
            </button>
          ))}
        </div>

        {tab==="profile"&&(
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:20,padding:28,display:"flex",flexDirection:"column",gap:16}}>
            <div className="profile-header" style={{display:"flex",alignItems:"center",gap:16,padding:"16px 0",borderBottom:`1px solid ${C.border}`}}>
              <div style={{width:64,height:64,borderRadius:"50%",background:`linear-gradient(135deg,${C.accent},${C.blue})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:avatarUrl?.startsWith("data:")||avatarUrl?.startsWith("http")?0:28,overflow:"hidden",flexShrink:0}}>
                {avatarUrl?.startsWith("data:")||avatarUrl?.startsWith("http")?<img src={avatarUrl} alt="avatar" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:avatarUrl||"👤"}
              </div>
              <div style={{minWidth:0}}>
                <div style={{fontSize:16,fontWeight:800,color:C.text}}>{user?.name}</div>
                <div style={{fontSize:12,color:C.muted,overflowWrap:"anywhere"}}>{user?.email}</div>
                <div style={{marginTop:6,display:"flex",gap:8,flexWrap:"wrap"}}>
                  <Badge text={user?.role==="admin"?"👑 Admin":"👤 User"} color={user?.role==="admin"?C.gold:C.muted}/>
                  <Badge text={user?.plan==="pro"?"⚡ Pro":user?.plan==="enterprise"?"💎 Enterprise":"Free"} color={user?.plan==="pro"?C.glow:user?.plan==="enterprise"?C.gold:C.muted}/>
                </div>
              </div>
            </div>
            <Field label="Full Name" C={C}><Input C={C} value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></Field>
            <Field label="Phone" C={C}><Input C={C} value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="+91 98765 43210"/></Field>
            <Field label="Bio" C={C}><Textarea C={C} value={form.bio} onChange={e=>setForm({...form,bio:e.target.value})} placeholder="Tell something about yourself..."/></Field>
            <Field label="Timezone" C={C}><Select C={C} value={form.timezone} onChange={e=>setForm({...form,timezone:e.target.value})} options={timezones.map(t=>({value:t,label:t}))}/></Field>
            <Field label="Preferred Currency" C={C}>
              <Select C={C} value={currency} onChange={e=>setCurrency(e.target.value)} options={CURRENCIES.map(c=>({value:c.code,label:`${c.flag} ${c.code} - ${c.name}`}))}/>
            </Field>
            <Field label="Recovery Email" C={C}>
              <Input C={C} type="email" value={form.recoveryEmail} onChange={e=>setForm({...form,recoveryEmail:e.target.value})} placeholder="recovery@example.com (used in case primary email is forgotten/hacked)"/>
            </Field>
            <Btn onClick={saveProfile} disabled={loading} C={C}>{loading?<Spinner/>:"Save Changes ✓"}</Btn>
            {saveIndicator.status!=="idle"&&(
              <div style={{fontSize:12,fontWeight:800,color:saveIndicator.status==="saved"?C.green:saveIndicator.status==="error"?C.red:C.muted}}>
                {saveIndicator.msg}
              </div>
            )}
          </div>
        )}

        {tab==="avatar"&&(
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:20,padding:28,display:"flex",flexDirection:"column",gap:20}}>
            <div style={{textAlign:"center"}}>
              <div style={{width:88,height:88,borderRadius:"50%",background:`linear-gradient(135deg,${C.accent},${C.blue})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:avatarUrl?.startsWith("data:")||avatarUrl?.startsWith("http")?0:44,margin:"0 auto 16px",overflow:"hidden",border:`3px solid ${C.accent}`}}>
                {avatarUrl?.startsWith("data:")||avatarUrl?.startsWith("http")?<img src={avatarUrl} alt="avatar" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:avatarUrl||"👤"}
              </div>
            </div>
            <div>
              <div style={{fontSize:12,color:C.muted,fontWeight:700,textTransform:"uppercase",marginBottom:10}}>Upload Photo</div>
              <input type="file" ref={fileRef} accept="image/*" onChange={handleFileUpload} style={{display:"none"}}/>
              <button onClick={()=>fileRef.current?.click()} style={{width:"100%",padding:"12px",borderRadius:10,border:`2px dashed ${C.border}`,background:"transparent",color:C.muted,cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center",gap:8,transition:"border-color 0.2s"}} onMouseEnter={e=>e.currentTarget.style.borderColor=C.accent} onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
                📷 Click to upload image
              </button>
            </div>
            {/* Or Paste Image URL option removed */}
            <div>
              <div style={{fontSize:12,color:C.muted,fontWeight:700,textTransform:"uppercase",marginBottom:10}}>Or Choose Emoji</div>
              <div className="avatar-grid" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(44px,1fr))",gap:8}}>
                {AVATARS.map(a=>(
                  <button key={a} onClick={()=>setAvatarUrl(a)}
                    style={{aspectRatio:"1",borderRadius:10,border:`2px solid ${avatarUrl===a?C.accent:C.border}`,background:avatarUrl===a?`${C.accent}22`:C.soft,fontSize:22,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.15s"}}>
                    {a}
                  </button>
                ))}
              </div>
            </div>
            <Btn onClick={saveProfile} disabled={loading} C={C}>{loading?<Spinner/>:"Save Avatar ✓"}</Btn>
            {saveIndicator.status!=="idle"&&(
              <div style={{fontSize:12,fontWeight:800,color:saveIndicator.status==="saved"?C.green:saveIndicator.status==="error"?C.red:C.muted}}>
                {saveIndicator.msg}
              </div>
            )}
          </div>
        )}

        {tab==="password"&&(
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:20,padding:28,display:"flex",flexDirection:"column",gap:14}}>
            <Field label="Current Password" C={C}><Input C={C} type="password" value={passForm.current} onChange={e=>setPassForm({...passForm,current:e.target.value})} placeholder="Enter current password" disabled={passOtpSent}/></Field>
            <Field label="New Password" C={C}><Input C={C} type="password" value={passForm.newPass} onChange={e=>setPassForm({...passForm,newPass:e.target.value})} placeholder="Min 6 characters" disabled={passOtpSent}/></Field>
            <Field label="Confirm New Password" C={C}><Input C={C} type="password" value={passForm.confirm} onChange={e=>setPassForm({...passForm,confirm:e.target.value})} placeholder="Repeat new password" disabled={passOtpSent}/></Field>
            
            {passOtpSent && (
              <Field label="Enter OTP Sent to Email" C={C}>
                <Input C={C} value={passOtpCode} onChange={e=>setPassOtpCode(e.target.value)} placeholder="6-digit OTP code"/>
              </Field>
            )}

            <Btn onClick={passOtpSent ? verifyPassOtpAndChange : requestPassOtp} disabled={loading} C={C}>
              {loading ? <Spinner/> : (passOtpSent ? "Verify OTP & Change Password 🔐" : "Request OTP to Change Password 🔑")}
            </Btn>
            {passOtpSent && (
              <button onClick={() => setPassOtpSent(false)} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:12,fontWeight:600,alignSelf:"center"}}>
                Cancel and edit inputs
              </button>
            )}
          </div>
        )}

        {tab==="danger"&&(
          <div style={{background:C.card,border:`2px solid ${C.red}44`,borderRadius:20,padding:28,display:"flex",flexDirection:"column",gap:16}}>
            <div style={{display:"flex",alignItems:"flex-start",gap:14,padding:"16px",background:`${C.red}11`,borderRadius:12}}>
              <span style={{fontSize:24}}>⚠️</span>
              <div>
                <div style={{fontWeight:800,color:C.red,marginBottom:4}}>Delete Account</div>
                <div style={{fontSize:12,color:C.muted,lineHeight:1.6}}>This will permanently delete your account and all data. This cannot be undone.</div>
              </div>
            </div>
            
            <div style={{display:"flex",alignItems:"flex-start",gap:14,padding:"16px",background:`${C.gold}11`,borderRadius:12,marginBottom:16}}>
              <span style={{fontSize:24}}>🔄</span>
              <div>
                <div style={{fontWeight:800,color:C.gold,marginBottom:4}}>Reset All Data</div>
                <div style={{fontSize:12,color:C.muted,lineHeight:1.6}}>This will wipe your tasks, habits, and goals. Your profile stays intact.</div>
                <Btn onClick={onReset} variant="outline" size="sm" C={C} style={{marginTop:12}}>Reset My Data</Btn>
              </div>
            </div>
            <Field label={`Confirm by typing your email: ${user?.email}`} C={C}>
              <Input C={C} value={deleteEmail} onChange={e=>setDeleteEmail(e.target.value)} placeholder="your@email.com" disabled={delOtpSent}/>
            </Field>
            <Field label="Enter your password to confirm" C={C}>
              <Input C={C} type="password" value={deletePassword} onChange={e=>setDeletePassword(e.target.value)} placeholder="Your account password" disabled={delOtpSent}/>
            </Field>

            {delOtpSent && (
              <Field label="Enter OTP Sent to Email" C={C}>
                <Input C={C} value={delOtpCode} onChange={e=>setDelOtpCode(e.target.value)} placeholder="6-digit OTP code"/>
              </Field>
            )}

            <Btn onClick={delOtpSent ? verifyDeleteOtpAndConfirm : requestDeleteOtp} disabled={loading || (!delOtpSent && (deleteEmail!==user?.email || !deletePassword))} variant="danger" C={C}>
              {loading ? <Spinner/> : (delOtpSent ? "Verify OTP & Delete My Account 🗑️" : "Request OTP to Delete Account 🔑")}
            </Btn>
            {delOtpSent && (
              <button onClick={() => setDelOtpSent(false)} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:12,fontWeight:600,alignSelf:"center"}}>
                Cancel and edit inputs
              </button>
            )}
          </div>
        )}
      </div>

      <style>{`
        @media (max-width:520px){
          .profile-header{align-items:flex-start!important;}
          .avatar-grid{grid-template-columns:repeat(5,minmax(0,1fr))!important;}
        }
      `}</style>
    </div>
  );
}

// ── HOME PAGE (after login) ───────────────────────────
function HomePage({user,onNavigate,C,stats}) {
  const features=[
    {icon:"✅",label:"Tasks",page:"tasks",color:"#3b82f6",desc:"Organize your daily work"},
    {icon:"🔥",label:"Habits",page:"habits",color:"#f97316",desc:"Build lasting routines"},
    {icon:"🎯",label:"Goals",page:"goals",color:"#10b981",desc:"Achieve your dreams"},
    {icon:"❤️",label:"Health",page:"health",color:"#ef4444",desc:"Water, sleep & wellness"},
    {icon:"📈",label:"Skills",page:"skills",color:"#8b5cf6",desc:"Level up your expertise"},
    {icon:"💰",label:"Finance",page:"finance",color:"#f59e0b",desc:"Track money smartly"},
    {icon:"⏱",label:"Focus Timer",page:"focus",color:"#06b6d4",desc:"Deep work sessions"},
    {icon:"🧠",label:"AI Coach",page:"ai",color:"#ec4899",desc:"Personal AI advisor"},
    {icon:"📊",label:"Analytics",page:"analytics",color:"#6d28d9",desc:"Insights & progress"},
    {icon:"📝",label:"To-Do Notes",page:"todo",color:"#14b8a6",desc:"Write notes & ideas"},
  ];

  const hour=new Date().getHours();
  const greeting=hour<12?"Good morning":hour<17?"Good afternoon":"Good evening";
  const g=hour<12?"Good morning ☀️":hour<17?"Good afternoon 🌤️":"Good evening 🌙";

  return (
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",flexDirection:"column"}}>
      {/* Hero Section */}
      <div style={{background:`linear-gradient(135deg,${C.accent}22 0%,${C.blue}15 50%,transparent 100%)`,padding:"clamp(32px,6vw,80px) clamp(20px,5vw,64px)",textAlign:"center",borderBottom:`1px solid ${C.border}`,position:"relative",overflow:"hidden"}}>
        {/* Animated background orbs */}
        <div style={{position:"absolute",top:"-20%",left:"10%",width:300,height:300,borderRadius:"50%",background:`${C.accent}08`,filter:"blur(60px)",pointerEvents:"none"}}/>
        <div style={{position:"absolute",bottom:"-20%",right:"10%",width:250,height:250,borderRadius:"50%",background:`${C.blue}08`,filter:"blur(60px)",pointerEvents:"none"}}/>
        <div style={{position:"relative"}}>
          <div style={{fontSize:13,color:C.glow,fontWeight:700,letterSpacing:2,textTransform:"uppercase",marginBottom:12}}>{g}, {user?.name?.split(" ")[0]}!</div>
          <h1 style={{fontSize:"clamp(24px,5vw,52px)",fontWeight:900,color:C.text,margin:"0 0 16px",lineHeight:1.1}}>
            Your <span style={{background:"linear-gradient(135deg,#8b5cf6,#ec4899,#f97316)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Upscale</span> Journey
          </h1>
          <p style={{fontSize:"clamp(13px,2vw,16px)",color:C.muted,maxWidth:500,margin:"0 auto 32px",lineHeight:1.7}}>Everything you need to track, improve, and achieve. Your AI-powered life operating system.</p>
          <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap"}}>
            <button onClick={()=>onNavigate("dashboard")} style={{padding:"14px 32px",borderRadius:14,border:"none",background:`linear-gradient(135deg,${C.accent},${C.blue})`,color:"#fff",fontWeight:800,cursor:"pointer",fontSize:15,boxShadow:`0 8px 24px ${C.accent}44`,transition:"transform 0.2s"}} onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"} onMouseLeave={e=>e.currentTarget.style.transform="none"}>
              Go to Dashboard →
            </button>
            {!isPremium(user) && (
              <button onClick={()=>onNavigate("pricing")} style={{padding:"14px 32px",borderRadius:14,border:`1.5px solid ${C.gold}`,background:`${C.gold}22`,color:C.gold,fontWeight:800,cursor:"pointer",fontSize:15,transition:"transform 0.2s"}} onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"} onMouseLeave={e=>e.currentTarget.style.transform="none"}>
                ⚡ Upgrade to Pro
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats bar */}
      {stats&&(
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:0,borderBottom:`1px solid ${C.border}`,background:C.card}}>
          {[
            {label:"Tasks Done",value:stats.doneTasks||0,icon:"✅"},
            {label:"Active Habits",value:stats.habits||0,icon:"🔥"},
            {label:"Goals Active",value:stats.activeGoals||0,icon:"🎯"},
            {label:"Focus Hours",value:`${stats.focusHours||0}h`,icon:"⏱"},
          ].map((s,i)=>(
            <div key={i} style={{padding:"20px 24px",textAlign:"center",borderRight:i<3?`1px solid ${C.border}`:"none"}}>
              <div style={{fontSize:20,marginBottom:4}}>{s.icon}</div>
              <div style={{fontSize:22,fontWeight:900,color:C.text}}>{s.value}</div>
              <div style={{fontSize:11,color:C.muted,fontWeight:600}}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Feature grid */}
      <div style={{padding:"clamp(24px,4vw,48px) clamp(16px,4vw,48px)"}}>
        <h2 style={{textAlign:"center",fontSize:"clamp(16px,2.5vw,24px)",fontWeight:800,color:C.text,margin:"0 0 28px"}}>What would you like to work on?</h2>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:16,maxWidth:900,margin:"0 auto"}}>
          {features.map((f,i)=>(
            <button key={i} onClick={()=>onNavigate(f.page)}
              style={{padding:"24px 20px",borderRadius:18,border:`1.5px solid ${C.border}`,background:C.card,cursor:"pointer",textAlign:"left",transition:"all 0.2s",display:"flex",flexDirection:"column",gap:12}}
              onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-4px)";e.currentTarget.style.borderColor=f.color;e.currentTarget.style.boxShadow=`0 12px 32px ${f.color}22`;}}
              onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.borderColor=C.border;e.currentTarget.style.boxShadow="none";}}>
              <div style={{width:44,height:44,borderRadius:12,background:`${f.color}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>{f.icon}</div>
              <div>
                <div style={{fontSize:15,fontWeight:800,color:C.text}}>{f.label}</div>
                <div style={{fontSize:12,color:C.muted,marginTop:4}}>{f.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── MAIN APP COMPONENT ────────────────────────────────
export default function UpscaleTracker() {
  const [token,setToken]=useState(null);
  const [user,setUser]=useState(null);
  const [page,setPage]=useState("home");
  const [theme,setTheme]=useState("light");
  const [currency,setCurrency]=useState("INR");
  const [sidebarOpen,setSidebarOpen]=useState(false);
  const [sidebarShrink,setSidebarShrink]=useState(false);
  const [toasts,setToasts]=useState([]);
  const [modal,setModal]=useState(null);
  const [loading,setLoading]=useState(true);

  // Data states
  const [tasks,setTasks]=useState([]);
  const [habits,setHabits]=useState([]);
  const [goals,setGoals]=useState([]);
  const [roadmaps,setRoadmaps]=useState([]);
  const [skills,setSkills]=useState([]);
  const [finance,setFinance]=useState([]);
  const [notes,setNotes]=useState([]);
  const [focusSessions,setFocusSessions]=useState([]);
  const [aiMessages,setAiMessages]=useState([{role:"ai",text:"👋 Hi! I'm your AI Life Coach. I can help you with habits, productivity, goals, and more. What would you like to work on today?"}]);
  const [analytics,setAnalytics]=useState(null);
  const [adminStats,setAdminStats]=useState(null);
  const [adminUsers,setAdminUsers]=useState([]);
  const [selectedAdminUser,setSelectedAdminUser]=useState(null);
  const [adminLoaded,setAdminLoaded]=useState(false);
  const [calendarNotes,setCalendarNotes]=useState([]);
  const [calendarModal,setCalendarModal]=useState(false);
  const [selectedCalendarDate,setSelectedCalendarDate]=useState("");
  const [calendarForm,setCalendarForm]=useState({title:"",content:"",isHoliday:false});
  const [showUpgradeModal,setShowUpgradeModal]=useState(false);
  // Form states - must be at top level (Rules of Hooks)
  const [habitForm,setHabitForm]=useState({title:"",icon:"✨",cat:"Personal",freq:"Daily",color:"#6d28d9",goalDays:30,startDate:"",endDate:"",description:"",reminderTime:"",notes:""});
  const [taskForm,setTaskForm]=useState({title:"",project:"Personal",priority:"Medium",due:"Today",startDate:"",endDate:"",description:"",tags:"",startTime:"",reminderTime:"",notes:""});
  const [goalForm,setGoalForm]=useState({title:"",icon:"🎯",cat:"Personal",deadline:"Dec 2026",description:"",startDate:"",endDate:"",milestones:"",notes:""});
  const [rmForm,setRmForm]=useState({title:"",icon:"🗺️",color:"#7c3aed",description:"",notes:""});
  const [skillForm,setSkillForm]=useState({name:"",level:"Beginner",hours:0,goalHours:200,color:"#7c3aed",roadmapId:null,startDate:"",endDate:"",notes:""});
  const [activeRoadmapId,setActiveRoadmapId]=useState(null);
  const [editingRoadmap,setEditingRoadmap]=useState(null);
  const [editingSkill,setEditingSkill]=useState(null);
  const [finForm,setFinForm]=useState({label:"",amount:"",type:"income",category:"Other",date:"",note:"",recurring:false,currency:"INR"});
  const [noteForm,setNoteForm]=useState({title:"",content:"",roadmapId:null,attachments:null});
  const [aiInput,setAiInput]=useState("");
  const [aiLoading,setAiLoading]=useState(false);
  const [viewNote,setViewNote]=useState(null);
  const [usingDemo,setUsingDemo]=useState(false);
  const [showEmojiSug,setShowEmojiSug]=useState(false);
  const [timerShowAlert,setTimerShowAlert]=useState(false);

  // Focus timer states
  const [timerRunning,setTimerRunning]=useState(false);
  const [timerSecs,setTimerSecs]=useState(25*60);
  const [timerMode,setTimerMode]=useState("focus");
  const [timerConfig,setTimerConfig]=useState({focus:25,short:5,long:15});
  const [timerEditOpen,setTimerEditOpen]=useState(false);
  const [timerEditMins,setTimerEditMins]=useState(25);
  const [waterGlasses,setWaterGlasses]=useState(0);
  const [sleepHours,setSleepHours]=useState("");

  // Derived
  const C=themes[theme]||themes.light;

  const addToast=(msg,type="success")=>{
    const id=Date.now() + "_" + Math.random().toString(36).substring(2, 9);
    setToasts(p=>[...p,{id,msg,type}]);
    setTimeout(()=>setToasts(p=>p.filter(t=>t.id!==id)),3500);
  };

  // Init
  useEffect(()=>{
    const t=localStorage.getItem("ut_token");
    const u=localStorage.getItem("ut_user");
    const cur=localStorage.getItem("ut_currency");
    if(cur)setCurrency(cur);
    if(t&&u){
      try{
        setToken(t);
        const parsedUser=JSON.parse(u);
        setUser(parsedUser);
        setTheme(parsedUser.theme||"light");
        loadAllData(t);
      }catch{setLoading(false);}
    }else{setLoading(false);}
  },[]);

  const loadAllData=async(t)=>{
    setLoading(true);
    try{
      const [tasksR,habitsR,goalsR,rmR,skillsR,finR,focR,notesR]=await Promise.all([
        api("/tasks","GET",null,t),
        api("/habits","GET",null,t),
        api("/goals","GET",null,t),
        api("/roadmaps","GET",null,t),
        api("/skills","GET",null,t),
        api("/finance","GET",null,t),
        api("/focus","GET",null,t),
        api("/notes","GET",null,t),
      ]);
      const tasksArr=Array.isArray(tasksR)?tasksR:(tasksR.tasks||[]);
      const habitsArr=Array.isArray(habitsR)?habitsR:(habitsR.habits||[]);
      const goalsArr=Array.isArray(goalsR)?goalsR:(goalsR.goals||[]);
      const roadmapsArr=Array.isArray(rmR)?rmR:(rmR.roadmaps||[]);
      const skillsArr=Array.isArray(skillsR)?skillsR:(skillsR.allSkills||skillsR.skills||[]);
      const financeArr=Array.isArray(finR)?finR:(finR.finance||[]);
      const focusArr=Array.isArray(focR)?focR:(focR.sessions||[]);
      const notesArr=Array.isArray(notesR)?notesR:(notesR.notes||[]);

      setTasks(tasksArr);setHabits(habitsArr);setGoals(goalsArr);
      setRoadmaps(roadmapsArr);setFinance(financeArr);setUsingDemo(false);
      setSkills(skillsArr||[]);
      setFocusSessions(focusArr||[]);
      setNotes(notesArr||[]);
    }catch(e){
      console.error("Failed to load data",e);
      setUsingDemo(true);
      setTasks(DEMO.tasks);setHabits(DEMO.habits);setGoals(DEMO.goals);
      setRoadmaps(DEMO.roadmaps);setFinance(DEMO.finance);
      addToast("Server not reachable. Loaded demo data instead.","warn");
    }finally{
      setLoading(false);
    }
  };

  const handleLogin=(t,u)=>{
    localStorage.setItem("ut_token",t);
    localStorage.setItem("ut_user",JSON.stringify(u));
    setToken(t);setUser(u);setTheme(u.theme||"light");
    loadAllData(t);
  };

  const handleLogout=()=>{
    localStorage.removeItem("ut_token");localStorage.removeItem("ut_user");
    setToken(null);setUser(null);setPage("home");setTasks([]);setHabits([]);setGoals([]);
  };

  const handleUserUpdate=(updatedUser)=>{
    setUser(updatedUser);
    localStorage.setItem("ut_user",JSON.stringify(updatedUser));
    if(updatedUser.theme)setTheme(updatedUser.theme);
  };

  const setCurrencyAndSave=(c)=>{setCurrency(c);localStorage.setItem("ut_currency",c);};

  const fetchCalendarNotes=async()=>{ if(!token||usingDemo)return; const res=await api("/calendar","GET",null,token); if(Array.isArray(res))setCalendarNotes(res); };
  const addCalendarNote=async(data)=>{
    if(usingDemo){
      if(data.id){
        setCalendarNotes(p=>p.map(x=>x.id===data.id?{...x,...data}:x));
        addToast("Calendar note updated!","success");
      }else{
        setCalendarNotes(p=>[{...data,id:Date.now()},...p]);
        addToast("Note added to calendar!","success");
      }
      setCalendarModal(false);
      return;
    }
    if(data.id){
      const res=await api(`/calendar/${data.id}`,"PATCH",data,token);
      if(!res.error){
        setCalendarNotes(p=>p.map(x=>x.id===data.id?{...x,...data}:x));
        setCalendarModal(false);
        addToast("Calendar note updated!","success");
      }else{
        addToast(res.error||"Failed to update calendar note","error");
      }
    }else{
      const res=await api("/calendar","POST",data,token);
      const note=res?.note||res;
      if(note&&note.id){
        setCalendarNotes(p=>[note,...p]);
        setCalendarModal(false);
        addToast("Note added to calendar!","success");
      }else{
        addToast(res.error||"Failed to add calendar note","error");
      }
    }
  };
  const deleteCalendarNote=async(id)=>{
    setCalendarNotes(p=>p.filter(x=>x.id!==id));
    setCalendarModal(false);
    if(!usingDemo){
      await api(`/calendar/${id}`,"DELETE",null,token);
    }
    addToast("Calendar note deleted","info");
  };

  const checkLimit=(count,limit,type)=>{
    if(!isPremium(user)&&count>=limit){
      setShowUpgradeModal(true);
      return false;
    }
    return true;
  };

  // CRUD helpers
  const addTask=async(data)=>{
    if(usingDemo){addToast("Demo Mode is read-only for showcase. Use Live Mode to edit.", "warn");return;}
    if(!checkLimit(tasks.length,10,"Tasks")) return;
    const res=await api("/tasks","POST",data,token);
    const task=res?.task||res;
    if(task&&task.id){
      setTasks(p=>[{...task,createdAt:task.createdAt||new Date().toISOString(),updatedAt:task.updatedAt||new Date().toISOString()},...p]);
      addToast("Task added!","success");
    } else {
      addToast(res?.error || "Failed to add task","error");
    }
    setModal(null);
  };
  const updateTask=async(id,data)=>{
    if(usingDemo){addToast("Demo Mode is read-only for showcase. Use Live Mode to edit.", "warn");return;}
    setTasks(p=>p.map(t=>t.id===id?{...t,...data,updatedAt:new Date().toISOString()}:t));
    await api(`/tasks/${id}`,"PATCH",data,token);
  };
  const deleteTask=async(id)=>{
    if(usingDemo){addToast("Demo Mode is read-only for showcase. Use Live Mode to edit.", "warn");return;}
    setTasks(p=>p.filter(t=>t.id!==id));
    await api(`/tasks/${id}`,"DELETE",null,token);
  };
  const addHabit=async(data)=>{
    if(usingDemo){addToast("Demo Mode is read-only for showcase. Use Live Mode to edit.", "warn");return;}
    if(!checkLimit(habits.length,10,"Habits")) return;
    const res=await api("/habits","POST",data,token);
    const habit=res?.habit||res;
    if(habit&&habit.id){
      setHabits(p=>[{...habit,createdAt:habit.createdAt||new Date().toISOString(),updatedAt:habit.updatedAt||new Date().toISOString()},...p]);
      addToast("Habit added!","success");
    } else {
      addToast(res?.error || "Failed to add habit","error");
    }
    setModal(null);
  };
  const updateHabit=async(id,data)=>{
    if(usingDemo){addToast("Demo Mode is read-only for showcase. Use Live Mode to edit.", "warn");return;}
    setHabits(p=>p.map(h=>h.id===id?{...h,...data,updatedAt:new Date().toISOString()}:h));
    await api(`/habits/${id}`,"PATCH",data,token);
  };
  const deleteHabit=async(id)=>{
    if(usingDemo){addToast("Demo Mode is read-only for showcase. Use Live Mode to edit.", "warn");return;}
    setHabits(p=>p.filter(h=>h.id!==id));
    await api(`/habits/${id}`,"DELETE",null,token);
  };
  const addGoal=async(data)=>{
    if(usingDemo){addToast("Demo Mode is read-only for showcase. Use Live Mode to edit.", "warn");return;}
    if(!checkLimit(goals.length,10,"Goals")) return;
    const res=await api("/goals","POST",data,token);
    const goal=res?.goal||res;
    if(goal&&goal.id){
      setGoals(p=>[{...goal,createdAt:goal.createdAt||new Date().toISOString(),updatedAt:goal.updatedAt||new Date().toISOString()},...p]);
      addToast("Goal added!","success");
    } else {
      addToast(res?.error || "Failed to add goal","error");
    }
    setModal(null);
  };
  const updateGoal=async(id,data)=>{
    if(usingDemo){addToast("Demo Mode is read-only for showcase. Use Live Mode to edit.", "warn");return;}
    setGoals(p=>p.map(g=>g.id===id?{...g,...data,updatedAt:new Date().toISOString()}:g));
    await api(`/goals/${id}`,"PATCH",data,token);
  };
  const deleteGoal=async(id)=>{
    if(usingDemo){addToast("Demo Mode is read-only for showcase. Use Live Mode to edit.", "warn");return;}
    setGoals(p=>p.filter(g=>g.id!==id));
    await api(`/goals/${id}`,"DELETE",null,token);
  };
  const addFinance=async(data)=>{
    if(usingDemo){addToast("Demo Mode is read-only for showcase. Use Live Mode to edit.", "warn");return;}
    const res=await api("/finance","POST",data,token);
    const entry=res?.finance||res;
    if(entry&&entry.id){
      setFinance(p=>[{...entry,createdAt:entry.createdAt||new Date().toISOString(),updatedAt:entry.updatedAt||new Date().toISOString()},...p]);
      addToast("Finance entry added!","success");
    } else {
      addToast(res?.error || "Failed to add finance entry","error");
    }
    setModal(null);
  };
  const deleteFinance=async(id)=>{
    if(usingDemo){addToast("Demo Mode is read-only for showcase. Use Live Mode to edit.", "warn");return;}
    setFinance(p=>p.filter(f=>f.id!==id));
    await api(`/finance/${id}`,"DELETE",null,token);
  };
  const updateFinance=async(id,data)=>{
    if(usingDemo){addToast("Demo Mode is read-only for showcase. Use Live Mode to edit.", "warn");return;}
    setFinance(p=>p.map(f=>f.id===id?{...f,...data,updatedAt:new Date().toISOString()}:f));
    await api(`/finance/${id}`,"PATCH",data,token);
    setModal(null);
  };
  const addRoadmap=async(data)=>{
    if(usingDemo){addToast("Demo Mode is read-only for showcase. Use Live Mode to edit.", "warn");return;}
    if(!checkLimit(roadmaps.length,5,"Roadmaps")) return;
    const res=await api("/roadmaps","POST",data,token);
    const roadmap=res?.roadmap||res;
    if(roadmap&&roadmap.id){
      setRoadmaps(p=>[{...roadmap,createdAt:roadmap.createdAt||new Date().toISOString(),updatedAt:roadmap.updatedAt||new Date().toISOString()},...p]);
      addToast("Roadmap created!","success");
    } else {
      addToast(res?.error || "Failed to create roadmap","error");
    }
    setModal(null);
  };
  const addSkillToRoadmap=async(data)=>{
    if(usingDemo){addToast("Demo Mode is read-only for showcase. Use Live Mode to edit.", "warn");return;}
    const roadmap = roadmaps.find(r=>r.id===data.roadmapId);
    const count = (roadmap?.skills||[]).length;
    if(!checkLimit(count,10,"Skills Per Roadmap")) return;
    const res=await api("/skills","POST",data,token);
    const skill=res?.skill||res;
    if(skill&&skill.id){
      setRoadmaps(p=>p.map(r=>r.id===data.roadmapId?{...r,skills:[...(r.skills||[]),skill]}:r));
      addToast("Skill added!","success");
    } else {
      addToast(res?.error || "Failed to add skill","error");
    }
    setModal(null);
  };
  const deleteRoadmap=async(id)=>{
    if(usingDemo){addToast("Demo Mode is read-only for showcase. Use Live Mode to edit.", "warn");return;}
    if(!window.confirm("Are you sure you want to delete this roadmap? All contained skills will be lost.")) return;
    setRoadmaps(p=>p.filter(r=>r.id!==id));
    await api(`/roadmaps/${id}`,"DELETE",null,token);
  };
  const updateRoadmap=async(id,data)=>{
    if(usingDemo){addToast("Demo Mode is read-only for showcase. Use Live Mode to edit.", "warn");return;}
    setRoadmaps(p=>p.map(r=>r.id===id?{...r,...data,updatedAt:new Date().toISOString()}:r));
    await api(`/roadmaps/${id}`,"PATCH",data,token);
    setModal(null);
  };
  const updateSkill=async(id,data)=>{
    if(usingDemo){addToast("Demo Mode is read-only for showcase. Use Live Mode to edit.", "warn");return;}
    setRoadmaps(p=>p.map(r=>({...r,skills:(r.skills||[]).map(s=>s.id===id?{...s,...data,updatedAt:new Date().toISOString()}:s)})));
    await api(`/skills/${id}`,"PATCH",data,token);
    setModal(null);
  };
  const deleteSkill=async(id,roadmapId)=>{
    if(usingDemo){addToast("Demo Mode is read-only for showcase. Use Live Mode to edit.", "warn");return;}
    setRoadmaps(p=>p.map(r=>r.id===roadmapId?{...r,skills:(r.skills||[]).filter(s=>s.id!==id)}:r));
    await api(`/skills/${id}`,"DELETE",null,token);
  };

  // Focus timer save
  const saveFocusSession=async(duration,label)=>{
    if(usingDemo)return;
    const res=await api("/focus","POST",{duration,label},token);
    const session=res?.session||res;
    if(session&&session.id)setFocusSessions(p=>[session,...p.slice(0,9)]);
  };

  // AI Coach
  const sendAI=async(msg)=>{
    if(!msg.trim())return;
    setAiMessages(p=>[...p,{role:"user",text:msg}]);
    const res=await api("/ai-coach","POST",{message:msg,history:aiMessages.slice(-6), context:{tasks,habits,goals,roadmaps,finance}},token);
    if(res?.error){
      const t = res.error==="PREMIUM_REQUIRED"
        ? "AI Coach is a Pro feature. Tap Upgrade to unlock it."
        : (typeof res.error==="string" ? res.error : "AI Coach failed. Please try again.");
      addToast(t,"warn");
      setAiMessages(p=>[...p,{role:"ai",text:t}]);
      return;
    }
    setAiMessages(p=>[...p,{role:"ai",text:res.reply||"AI Coach is taking a short break — please try again."}]);
  };

  const userReset=async()=>{
    if(!window.confirm("Reset all your data? (Your profile stays)"))return;
    const res=await api("/user/reset","POST",{},token);
    if(res.ok){addToast("Your data reset!","success");loadAllData(token);}
    else addToast(res.error||"Reset failed","error");
  };

  // Derived display data
  const displayTasks=tasks;
  const displayHabits=habits;
  const displayGoals=goals;
  const completedHabits=habits.filter(h=>h.done).length;

  // Stats for home page
  const homeStats={
    doneTasks:tasks.filter(t=>t.done).length,
    habits:habits.length,
    activeGoals:goals.filter(g=>g.status!=="completed").length,
    focusHours:Math.round(focusSessions.reduce((a,s)=>a+(s.duration||0),0)/60),
  };

  const timerRef=useRef(null);
  const aiScrollRef=useRef(null);

  // ── EFFECTS (must be before any conditional returns) ──
  useEffect(()=>{
    if(aiScrollRef.current){
      aiScrollRef.current.scrollTop=aiScrollRef.current.scrollHeight;
    }
  },[aiMessages]);

  // Timer countdown effect
  useEffect(() => {
    if (timerRunning && timerSecs > 0) {
      timerRef.current = setInterval(() => {
        setTimerSecs(prev => prev - 1);
      }, 1000);
    } else if (timerSecs === 0) {
      setTimerRunning(false);
      setTimerShowAlert(true);
      if (timerRef.current) clearInterval(timerRef.current);
      try{
        if(typeof navigator!=="undefined" && navigator.vibrate){
          navigator.vibrate([200,80,200,80,300]);
        }
        // Small beep (best-effort; may be blocked by browser autoplay policies)
        const AudioCtx = typeof window!=="undefined" && (window.AudioContext || window.webkitAudioContext);
        if(AudioCtx){
          const ctx = new AudioCtx();
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = "sine";
          o.frequency.value = 880;
          g.gain.value = 0.04;
          o.connect(g); g.connect(ctx.destination);
          o.start();
          setTimeout(()=>{ try{ o.stop(); ctx.close(); }catch{} }, 280);
        }
      }catch{}
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerRunning, timerSecs]);

  // Load health data when opening health page
  useEffect(()=>{
    if(page==="health"){try{const today=new Date().toISOString().split("T")[0];const d=JSON.parse(localStorage.getItem("ut_water")||"{}");const s=JSON.parse(localStorage.getItem("ut_sleep")||"{}");setWaterGlasses(d[today]??0);setSleepHours(s[today]??"");}catch{}}
  },[page]);
  // Save health data
  useEffect(()=>{try{const today=new Date().toISOString().split("T")[0];const d=JSON.parse(localStorage.getItem("ut_water")||"{}");d[today]=waterGlasses;localStorage.setItem("ut_water",JSON.stringify(d));const s=JSON.parse(localStorage.getItem("ut_sleep")||"{}");s[today]=sleepHours;localStorage.setItem("ut_sleep",JSON.stringify(s));}catch{}},[waterGlasses,sleepHours]);

  // Load admin data when on admin page
  useEffect(()=>{
    if(page==="admin"&&user?.role==="admin"&&token&&!adminLoaded){
      setAdminLoaded(true);
      Promise.all([api("/admin/stats","GET",null,token),api("/admin/users","GET",null,token)]).then(([s,u])=>{
        if(s && !s.error) setAdminStats(s);
        if(Array.isArray(u)) setAdminUsers(u);
      }).catch(e=>{
        console.error("Admin load error:", e);
        setAdminLoaded(false);
      });
    }
    if(token&&!usingDemo) fetchCalendarNotes();
  },[page,adminLoaded]);

    if(loading)return(
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16}}>
      <LogoSVG size={56}/>
      <div style={{color:C.muted,fontSize:14}}>Loading your data...</div>
      <div style={{width:40,height:40,border:`3px solid ${C.border}`,borderTopColor:C.glow,borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
    </div>
  );

  if(!token) return (
    <>
      <AuthPage onLogin={handleLogin} addToast={addToast} theme={theme} setTheme={setTheme}/>
      <Toast toasts={toasts}/>
    </>
  );
  if(page==="profile")return <ProfilePage user={user} token={token} C={C} onUpdate={handleUserUpdate} onBack={()=>setPage("home")} onReset={userReset} addToast={addToast} currency={currency} setCurrency={setCurrencyAndSave}/>;

  // ── SIDEBAR NAV ITEMS ─────────────────────────────
  const navItems=[
    {icon:"🏠",label:"Home",page:"home"},
    {icon:"📊",label:"Dashboard",page:"dashboard"},
    {icon:"✅",label:"Tasks",page:"tasks"},
    {icon:"🎯",label:"Goals",page:"goals"},
    {icon:"📈",label:"Skills & Roadmap",page:"skills"},
    {icon:"⏳",label:"Focus Timer",page:"focus"},
    {icon:"🔥",label:"Habits",page:"habits"},
    {icon:"❤️",label:"Health",page:"health",premium:true},
    {icon:"💰",label:"Finance",page:"finance",premium:true},
    {icon:"📝",label:"To-Do Notes",page:"todo",premium:true},
    {icon:"🧠",label:"AI Coach",page:"ai",premium:true},
    {icon:"📉",label:"Analytics",page:"analytics",premium:true},
    {icon:"🏆",label:"Achievements",page:"achievements",premium:true},
  ];

  // ── PRICING ───────────────────────────────────────
  const renderPricing = () => (
    <div style={{display:"flex",flexDirection:"column",gap:28,alignItems:"center",padding:"40px 20px"}}>
      <h2 style={{fontSize:"clamp(28px,6vw,44px)",fontWeight:950,color:C.text,margin:0,textAlign:"center"}}>Choose Your Plan</h2>
      <p style={{color:C.muted,textAlign:"center",maxWidth:760,fontSize:15,lineHeight:1.7,marginTop:-8}}>
        Unlock AI Coach, Advanced Analytics, Unlimited Tasks, and the full Upscale Tracker experience.
      </p>

      <div style={{display:"flex",gap:10,background:C.soft,padding:6,borderRadius:12,marginBottom:10,overflowX:"auto",maxWidth:"100%"}}>
        {CURRENCIES.map(c=>(
          <button key={c.code} onClick={()=>setCurrencyAndSave(c.code)}
            style={{padding:"8px 14px",borderRadius:8,border:"none",background:currency===c.code?C.accent:"transparent",color:currency===c.code?"#fff":C.muted,fontWeight:700,cursor:"pointer",fontSize:12,transition:"all 0.2s",whiteSpace:"nowrap"}}>
            {c.flag} {c.code}
          </button>
        ))}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:18,width:"100%",maxWidth:980}}>
        {/* Free */}
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:24,padding:28,display:"flex",flexDirection:"column"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}>
            <h3 style={{fontSize:20,color:C.text,margin:0}}>Free</h3>
            <Badge text="Starter" color={C.muted}/>
          </div>
          <div style={{fontSize:40,fontWeight:950,color:C.text,marginTop:12}}>{getCurrency(currency).symbol}0</div>
          <div style={{fontSize:12,color:C.muted,marginTop:4}}>Great to start and explore</div>
          <ul style={{listStyle:"none",padding:0,margin:"18px 0 0",display:"flex",flexDirection:"column",gap:10,flex:1}}>
            {["Dashboard access","10 Tasks / 10 Goals / 10 Habits","5 Roadmaps (10 Skills each)","Focus Timer (unlimited)"].map((f,i)=>(
              <li key={i} style={{display:"flex",gap:10,color:C.text,fontSize:13}}><span style={{color:C.green}}>✓</span>{f}</li>
            ))}
            {["Health, Finance, Notes, AI Coach, Analytics"].map((f,i)=>(
              <li key={i} style={{display:"flex",gap:10,color:C.muted,fontSize:13}}><span style={{color:C.red}}>🔒</span>{f}</li>
            ))}
          </ul>
          <button style={{width:"100%",marginTop:18,padding:"14px",borderRadius:16,background:C.soft,border:`1px solid ${C.border}`,color:C.text,fontWeight:900,cursor:"not-allowed"}}>Current Plan</button>
        </div>

        {/* Pro Monthly */}
        <div style={{background:C.card,border:`2px solid ${C.accent}`,borderRadius:24,padding:28,display:"flex",flexDirection:"column",position:"relative",boxShadow:`0 14px 50px ${C.accent}22`}}>
          <div style={{background:`linear-gradient(135deg,${C.accent},${C.blue})`,color:"#fff",padding:"7px 14px",borderRadius:99,position:"absolute",top:16,right:16,fontSize:11,fontWeight:950,letterSpacing:0.8}}>MOST POPULAR</div>
          <div style={{fontSize:40,fontWeight:950,color:C.text,marginTop:12}}>
            {currency==="INR"&&<span style={{fontSize:20,color:C.muted,textDecoration:"line-through",marginRight:8}}>₹199</span>}
            {getCurrency(currency).symbol}{
              currency==="INR"?99:
              currency==="USD"?3:
              currency==="EUR"?2.8:
              currency==="GBP"?2.4:
              currency==="AED"?11:
              currency==="SGD"?4:
              currency==="CAD"?4:
              currency==="AUD"?4.6:
              currency==="JPY"?450:
              currency==="CNY"?22:3
            }
            <span style={{fontSize:14,color:C.muted,fontWeight:700}}> / month</span>
          </div>
          <ul style={{listStyle:"none",padding:0,margin:"18px 0 0",display:"flex",flexDirection:"column",gap:10,flex:1}}>
            {["Unlimited Habits, Tasks, Goals, Skills","Full Health + Finance + Notes","AI Coach + Analytics","Priority support"].map((f,i)=>(
              <li key={i} style={{display:"flex",gap:10,color:C.text,fontSize:13}}><span style={{color:C.accent}}>✓</span>{f}</li>
            ))}
          </ul>
          <button onClick={async()=>{
             try{
               const res=await api("/payment/razorpay/order","POST",{plan:"pro_monthly"},token);
               if(res.orderId){
                 const script = document.createElement("script"); script.src = "https://checkout.razorpay.com/v1/checkout.js";
                 script.onload = () => {
                   const options={
                     key:res.keyId, amount:res.amount, currency:res.currency, order_id:res.orderId,
                     name:"Upscale Tracker", description:"Pro Monthly", theme:{color:C.accent},
                     handler:async(response)=>{
                       const verify=await api("/payment/razorpay/verify","POST",{...response,plan:"pro_monthly"},token);
                       if(verify.success){ addToast("Upgraded to Pro!","success"); setUser(u=>({...u,plan:"pro_monthly"})); setPage("home"); }
                     }
                   };
                   new window.Razorpay(options).open();
                 };
                 document.body.appendChild(script);
               } else {
                 const stripeRes=await api("/payment/stripe/session","POST",{plan:"pro_monthly"},token);
                 if(stripeRes.url) window.location.href = stripeRes.url;
                 else addToast("Payment system unavailable","error");
               }
             }catch(e){addToast("Failed to initiate payment","error");}
          }} style={{width:"100%",marginTop:18,padding:"16px",borderRadius:16,background:`linear-gradient(135deg,${C.accent},${C.blue})`,border:"none",color:"#fff",fontWeight:900,cursor:"pointer",fontSize:15,transition:"transform 0.2s"}} onMouseEnter={e=>e.currentTarget.style.transform="scale(1.02)"} onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}>Upgrade {getCurrency(currency).symbol}{currency==="INR"?199:3}</button>
        </div>

        {/* Pro Yearly */}
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:24,padding:28,display:"flex",flexDirection:"column"}}>
          <h3 style={{fontSize:20,color:C.text,margin:0}}>Pro Yearly</h3>
          <div style={{fontSize:40,fontWeight:950,color:C.text,marginTop:12}}>
            {currency==="INR"&&<span style={{fontSize:20,color:C.muted,textDecoration:"line-through",marginRight:8}}>₹1999</span>}
            {getCurrency(currency).symbol}{
              currency==="INR"?999:
              currency==="USD"?30:
              currency==="EUR"?28:
              currency==="GBP"?24:
              currency==="AED"?110:
              currency==="SGD"?40:
              currency==="CAD"?40:
              currency==="AUD"?46:
              currency==="JPY"?4500:
              currency==="CNY"?220:30
            }
            <span style={{fontSize:14,color:C.muted,fontWeight:700}}> / year</span>
          </div>
          <div style={{fontSize:12,color:C.muted,marginTop:6}}>Save compared to monthly</div>
          <ul style={{listStyle:"none",padding:0,margin:"18px 0 0",display:"flex",flexDirection:"column",gap:10,flex:1}}>
            {["Everything in Pro Monthly","Best value for long-term growth"].map((f,i)=>(
              <li key={i} style={{display:"flex",gap:10,color:C.text,fontSize:13}}><span style={{color:C.green}}>✓</span>{f}</li>
            ))}
          </ul>
          <button onClick={async()=>{
             try{
               const res=await api("/payment/razorpay/order","POST",{plan:"pro_yearly"},token);
               if(res.orderId){
                 const script = document.createElement("script"); script.src = "https://checkout.razorpay.com/v1/checkout.js";
                 script.onload = () => {
                   const options={
                     key:res.keyId, amount:res.amount, currency:res.currency, order_id:res.orderId,
                     name:"Upscale Tracker", description:"Pro Yearly", theme:{color:C.accent},
                     handler:async(response)=>{
                       const verify=await api("/payment/razorpay/verify","POST",{...response,plan:"pro_yearly"},token);
                       if(verify.success){ addToast("Upgraded to Pro!","success"); setUser(u=>({...u,plan:"pro_yearly"})); setPage("home"); }
                     }
                   };
                   new window.Razorpay(options).open();
                 };
                 document.body.appendChild(script);
               } else {
                 const stripeRes=await api("/payment/stripe/session","POST",{plan:"pro_yearly"},token);
                 if(stripeRes.url) window.location.href = stripeRes.url;
                 else addToast("Payment system unavailable","error");
               }
             }catch(e){addToast("Failed to initiate payment","error");}
          }} style={{width:"100%",marginTop:18,padding:"16px",borderRadius:16,background:C.soft,border:`1px solid ${C.border}`,color:C.text,fontWeight:900,cursor:"pointer",fontSize:15,transition:"border-color 0.2s"}} onMouseEnter={e=>e.currentTarget.style.borderColor=C.accent} onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>Upgrade {getCurrency(currency).symbol}{currency==="INR"?1999:30}</button>
        </div>
      </div>

      <div style={{width:"100%",maxWidth:980,marginTop:10}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,margin:"0 0 12px"}}>
          <div style={{fontSize:16,fontWeight:950,color:C.text}}>Complete Pricing & Feature Table</div>
          <div style={{fontSize:12,color:C.muted}}>All prices shown in {currency}</div>
        </div>
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:18,overflow:"hidden"}}>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",minWidth:780}}>
              <thead>
                <tr style={{background:C.soft}}>
                  {["Module","Free","Pro Monthly","Pro Yearly"].map(h=>(
                    <th key={h} style={{padding:"12px 16px",textAlign:"left",fontSize:11,fontWeight:950,color:C.muted,textTransform:"uppercase",letterSpacing:0.9,whiteSpace:"nowrap"}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  {m:"Price", f:`${getCurrency(currency).symbol}0`, pm:`${getCurrency(currency).symbol}${currency==="INR"?99:3} / month`, py:`${getCurrency(currency).symbol}${currency==="INR"?999:30} / year`},
                  {m:"Dashboard", f:"✓", pm:"✓", py:"✓"},
                  {m:"Tasks", f:"10", pm:"Unlimited", py:"Unlimited"},
                  {m:"Goals", f:"10", pm:"Unlimited", py:"Unlimited"},
                  {m:"Skills & Roadmap", f:"5", pm:"Unlimited", py:"Unlimited"},
                  {m:"Focus Timer", f:"Unlimited", pm:"Unlimited", py:"Unlimited"},
                  {m:"Habits", f:"10", pm:"Unlimited", py:"Unlimited"},
                  {m:"Health", f:"🔒", pm:"✓", py:"✓"},
                  {m:"Finance", f:"🔒", pm:"✓", py:"✓"},
                  {m:"To-Do Notes", f:"🔒", pm:"✓", py:"✓"},
                  {m:"AI Coach", f:"🔒", pm:"✓", py:"✓"},
                  {m:"Analytics", f:"🔒", pm:"✓", py:"✓"},
                  {m:"Achievements", f:"🔒", pm:"✓", py:"✓"},
                ].map((r,i)=>(
                  <tr key={i} style={{borderTop:`1px solid ${C.border}`}}>
                    <td style={{padding:"12px 16px",fontSize:13,fontWeight:900,color:C.text,whiteSpace:"nowrap"}}>{r.m}</td>
                    <td style={{padding:"12px 16px",fontSize:13,color:C.muted}}>{r.f}</td>
                    <td style={{padding:"12px 16px",fontSize:13,color:C.text,fontWeight:700}}>{r.pm}</td>
                    <td style={{padding:"12px 16px",fontSize:13,color:C.text,fontWeight:700}}>{r.py}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );

  // ── PAGE RENDERERS ────────────────────────────────
  const renderContent=()=>{
    switch(page){
      case "home": return <HomePage user={user} onNavigate={(p)=>{setPage(p);setSidebarOpen(false);}} C={C} stats={homeStats}/>;
      case "dashboard": return renderDashboard();
      case "habits": return renderHabits();
      case "tasks": return renderTasks();
      case "goals": return renderGoals();
      case "health": return renderHealth();
      case "skills": return renderSkills();
      case "finance": return renderFinance();
      case "focus": return renderFocus();
      case "todo": return renderTodo();
      case "ai": return renderAI();
      case "analytics": return renderAnalytics();
      case "achievements": return renderAchievements();
      case "admin": return renderAdmin();
      case "pricing": return renderPricing();
      default: return renderDashboard();
    }
  };

  // ── DASHBOARD ─────────────────────────────────────
  const renderDashboard=()=>{
    const income=finance.filter(f=>f.type==="income").reduce((a,f)=>a+f.amount,0);
    const expense=finance.filter(f=>f.type==="expense").reduce((a,f)=>a+f.amount,0);
    const doneTasks=tasks.filter(t=>t.done).length;
    const totalTasks=tasks.length;
    const score=totalTasks>0?Math.round((doneTasks/totalTasks)*40+(completedHabits/(habits.length||1))*40+(goals.filter(g=>g.progress>=50).length/(goals.length||1))*20):0;

    const allSkills = (skills?.length ? skills : (roadmaps||[]).flatMap(r=>r.skills||[])) || [];
    const skillGoalTotal = allSkills.reduce((a,s)=>a+(s.goalHours||s.max||0),0);
    const skillHoursTotal = allSkills.reduce((a,s)=>a+(s.hours||0),0);
    const skillsProgressPct = skillGoalTotal>0 ? Math.round((skillHoursTotal/skillGoalTotal)*100) : 0;

    const healthHabits = habits.filter(h=>(h.cat||"").toLowerCase()==="health");
    const doneHealthHabits = healthHabits.filter(h=>h.done).length;
    const healthGoals = goals.filter(g=>(g.cat||"").toLowerCase()==="health");
    const avgHealthGoalProgress = healthGoals.length ? Math.round(healthGoals.reduce((a,g)=>a+(g.progress||0),0)/healthGoals.length) : 0;
    const overallHealthScore = Math.round(
      (healthHabits.length ? (doneHealthHabits/healthHabits.length) : 0) * 55 +
      (healthGoals.length ? (avgHealthGoalProgress/100) : 0) * 45
    );
    const overallHealthLabel =
      overallHealthScore>=80 ? "Excellent" :
      overallHealthScore>=60 ? "Good" :
      overallHealthScore>=40 ? "Okay" : "Needs work";

    const parseDate = (v) => {
      if(!v) return null;
      const d = new Date(v);
      return isNaN(d.getTime()) ? null : d;
    };
    const dateOrEpoch = (...vals) => {
      for(const v of vals){
        const d = parseDate(v);
        if(d) return d;
      }
      return new Date();
    };
    const recentActivity = [
      ...tasks.map(t=>({icon:"✅",title:`Task: ${t.title}`,meta:t.project||"Tasks",when:dateOrEpoch(t.createdAt,t.updatedAt,t.endDate,t.startDate)})),
      ...habits.map(h=>({icon:h.icon||"🔥",title:`Habit: ${h.title}`,meta:h.cat||"Habits",when:dateOrEpoch(h.updatedAt,h.createdAt,h.startDate)})),
      ...goals.map(g=>({icon:g.icon||"🎯",title:`Goal: ${g.title}`,meta:`${g.progress||0}%`,when:dateOrEpoch(g.updatedAt,g.createdAt,g.endDate,g.startDate)})),
      ...notes.map(n=>({icon:"📝",title:`Note: ${n.title||"Untitled"}`,meta:(n.roadmapId? "Roadmap note":"To-do notes"),when:dateOrEpoch(n.updatedAt,n.createdAt)})),
      ...finance.map(f=>({icon:f.type==="income"?"🟢":f.type==="expense"?"🔴":"🟣",title:`${f.label}`,meta:`${f.type} · ${formatMoney(f.amount,currency)}`,when:dateOrEpoch(f.createdAt,f.date)})),
      ...roadmaps.map(r=>({icon:r.icon||"🗺️",title:`Roadmap: ${r.title}`,meta:`${(r.skills||[]).length} skills`,when:dateOrEpoch(r.updatedAt,r.createdAt)})),
      ...focusSessions.map(s=>({icon:"⏱",title:`Focus: ${s.duration||0}m`,meta:s.tag||"Focus Timer",when:dateOrEpoch(s.createdAt)})),
    ].sort((a,b)=>b.when-a.when).slice(0,8);

    return(
      <div style={{display:"flex",flexDirection:"column",gap:20}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12}}>
          <div>
            <h2 style={{fontSize:"clamp(18px,3vw,26px)",fontWeight:900,color:C.text,margin:"0 0 4px"}}>📊 Dashboard</h2>
            <p style={{color:C.muted,fontSize:13,margin:0}}>Welcome back, {user?.name?.split(" ")[0]}! Here's your overview.</p>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:16}}>
            {isPremium(user) && <button onClick={()=>window.print()} title="Export PDF" style={{background:C.soft,border:`1px solid ${C.border}`,color:C.text,padding:"8px 12px",borderRadius:10,cursor:"pointer",fontSize:18}}>🖨️</button>}
            <LiveClock C={C}/>
          </div>
        </div>
        {usingDemo&&<div style={{background:`${C.gold}22`,border:`1px solid ${C.gold}44`,borderRadius:12,padding:"10px 16px",fontSize:12,color:C.gold,display:"flex",alignItems:"center",gap:8}}>✨ <strong>Demo mode</strong> — Add real data to replace these samples</div>}
        <div className="dash-stats-grid" style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:12}}>
          <StatCard icon="⚡" label="Score" value={`${score}%`} color={score>70?C.green:score>40?C.gold:C.red} C={C}/>
          <StatCard icon="✅" label="Tasks Done" value={`${doneTasks}/${totalTasks}`} color={C.blue} C={C}/>
          <StatCard icon="🔥" label="Habits Today" value={`${completedHabits}/${habits.length}`} color={C.gold} C={C}/>
          <StatCard icon="🎯" label="Active Goals" value={goals.filter(g=>g.status!=="completed").length} color={C.glow} C={C}/>
          <StatCard icon="💰" label="Net Savings" value={formatMoney(income-expense,currency)} color={income>expense?C.green:C.red} C={C}/>
          <StatCard icon="⏱" label="Focus Today" value={`${focusSessions.filter(s=>{const d=new Date(s.createdAt);const t=new Date();return d.toDateString()===t.toDateString();}).reduce((a,s)=>a+(s.duration||0),0)}m`} color={C.cyan} C={C}/>
        </div>
        <div className="dash-grid-primary" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:16}}>
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:20}}>
            <div style={{fontSize:14,fontWeight:800,color:C.text,marginBottom:14}}>🔥 Today's Habits</div>
            {displayHabits.slice(0,5).map(h=>(
              <div key={h.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:`1px solid ${C.border}`}}>
                <button onClick={()=>updateHabit(h.id,{done:!h.done})} style={{width:24,height:24,borderRadius:7,border:`2px solid ${h.done?h.color||C.green:C.border}`,background:h.done?h.color||C.green:"transparent",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0}}>
                  {h.done&&<span style={{color:"#fff",fontSize:12}}>✓</span>}
                </button>
                <span style={{fontSize:16}}>{h.icon||"✨"}</span>
                <span style={{flex:1,fontSize:13,color:h.done?C.muted:C.text,textDecoration:h.done?"line-through":"none"}}>{h.title}</span>
                <span style={{fontSize:11,color:C.gold}}>🔥{h.streak}</span>
              </div>
            ))}
          </div>
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:20}}>
            <div style={{fontSize:14,fontWeight:800,color:C.text,marginBottom:14}}>✅ Today's Tasks</div>
            {displayTasks.filter(t=>t.due==="Today").slice(0,5).map(t=>(
              <div key={t.id} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 0",borderBottom:`1px solid ${C.border}`}}>
                <div onClick={()=>updateTask(t.id,{done:!t.done})} style={{width:22,height:22,borderRadius:6,border:`2px solid ${t.done?C.green:C.border}`,background:t.done?C.green:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,cursor:"pointer"}}>
                  {t.done&&<span style={{color:"#fff",fontSize:11}}>✓</span>}
                </div>
                <span style={{flex:1,fontSize:13,color:t.done?C.muted:C.text,textDecoration:t.done?"line-through":"none",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.title}</span>
                <Badge text={t.priority} color={t.priority==="High"?C.red:t.priority==="Medium"?C.gold:C.green}/>
              </div>
            ))}
          </div>
        </div>
        <div className="dash-grid-secondary" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(320px,1fr))",gap:16,alignItems:"start"}}>
          {/* 1. Skills & Roadmap */}
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:20,minHeight:260}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,gap:10}}>
              <div style={{fontSize:14,fontWeight:800,color:C.text}}>📈 Skills & Roadmap</div>
              <Badge text={`${skillsProgressPct}%`} color={skillsProgressPct>=70?C.green:skillsProgressPct>=40?C.gold:C.red}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:10,marginBottom:12}}>
              <div style={{background:C.soft,border:`1px solid ${C.border}`,borderRadius:14,padding:"10px 12px"}}>
                <div style={{fontSize:10,color:C.muted,fontWeight:800,textTransform:"uppercase",letterSpacing:0.7}}>Roadmaps</div>
                <div style={{fontSize:22,fontWeight:900,color:C.text,marginTop:4,lineHeight:1}}>{roadmaps.length}</div>
              </div>
              <div style={{background:C.soft,border:`1px solid ${C.border}`,borderRadius:14,padding:"10px 12px"}}>
                <div style={{fontSize:10,color:C.muted,fontWeight:800,textTransform:"uppercase",letterSpacing:0.7}}>Skills</div>
                <div style={{fontSize:22,fontWeight:900,color:C.text,marginTop:4,lineHeight:1}}>{allSkills.length}</div>
              </div>
              <div style={{background:C.soft,border:`1px solid ${C.border}`,borderRadius:14,padding:"10px 12px"}}>
                <div style={{fontSize:10,color:C.muted,fontWeight:800,textTransform:"uppercase",letterSpacing:0.7}}>Hours</div>
                <div style={{fontSize:22,fontWeight:900,color:C.text,marginTop:4,lineHeight:1}}>{skillHoursTotal}</div>
              </div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:12,color:C.muted,fontWeight:700}}>Overall progress</span>
                <span style={{fontSize:12,color:C.text,fontWeight:800}}>{skillHoursTotal}/{skillGoalTotal||0}h</span>
              </div>
              <ProgressBar value={skillsProgressPct} C={C}/>
              <div style={{fontSize:12,color:C.muted,marginTop:4}}>
                Top roadmap:{" "}
                <strong style={{color:C.text,fontWeight:800}}>
                  {(roadmaps[0]?.icon||"🗺️")} {roadmaps[0]?.title||"—"}
                </strong>
              </div>
            </div>
          </div>

          {/* 2. Overall Health */}
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:20,minHeight:260}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,gap:10}}>
              <div style={{fontSize:14,fontWeight:800,color:C.text}}>❤️ Overall Health</div>
              <Badge text={overallHealthLabel} color={overallHealthScore>=70?C.green:overallHealthScore>=45?C.gold:C.red}/>
            </div>
            <div className="health-summary-flex" style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",gap:14,marginBottom:12}}>
              <div>
                <div style={{fontSize:38,fontWeight:950,color:overallHealthScore>=70?C.green:overallHealthScore>=45?C.gold:C.red,lineHeight:1}}>{overallHealthScore}</div>
                <div style={{fontSize:12,color:C.muted,fontWeight:700,marginTop:6}}>Health score (today)</div>
              </div>
              <div style={{flex:1,display:"flex",flexDirection:"column",gap:10}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:C.muted}}>
                  <span>Health habits</span>
                  <span style={{color:C.text,fontWeight:800}}>{doneHealthHabits}/{healthHabits.length}</span>
                </div>
                <ProgressBar value={healthHabits.length?Math.round((doneHealthHabits/healthHabits.length)*100):0} C={C} color={`linear-gradient(90deg,${C.red},${C.glow})`}/>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:C.muted}}>
                  <span>Health goals avg</span>
                  <span style={{color:C.text,fontWeight:800}}>{avgHealthGoalProgress}%</span>
                </div>
                <ProgressBar value={avgHealthGoalProgress} C={C} color={`linear-gradient(90deg,${C.glow},${C.cyan})`}/>
              </div>
            </div>
            <div style={{fontSize:12,color:C.muted}}>
              Tip: keep <strong style={{color:C.text}}>Health</strong> habits consistent to raise your score.
            </div>
          </div>

          {/* 3. Recent Activity */}
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:20,minHeight:260}}>
            <div style={{fontSize:14,fontWeight:800,color:C.text,marginBottom:12}}>🕘 Recent Activity</div>
            {recentActivity.length===0 ? (
              <div style={{color:C.muted,fontSize:13,padding:16,background:C.soft,border:`1px solid ${C.border}`,borderRadius:14}}>
                No recent activity yet.
              </div>
            ) : (
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {recentActivity.slice(0, 5).map((a,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:10,paddingBottom:8,borderBottom:i<recentActivity.slice(0,5).length-1?`1px solid ${C.border}`:"none"}}>
                    <span style={{fontSize:18}}>{a.icon}</span>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:700,color:C.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{a.title}</div>
                      <div style={{fontSize:10,color:C.muted}}>{a.meta}</div>
                    </div>
                    <div style={{fontSize:10,color:C.muted,whiteSpace:"nowrap"}}>{a.when.toLocaleDateString("en-IN",{day:"numeric",month:"short"})}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 4. Calendar */}
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:20,minHeight:260,display:"flex",flexDirection:"column"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={{fontSize:14,fontWeight:800,color:C.text}}>📅 Calendar</div>
              <Badge text={`${calendarNotes.length} notes`} color={C.cyan}/>
            </div>
            <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center"}}>
              <div style={{width:"100%",maxWidth:300}}>
                <MiniCalendar C={C} selectedDate={new Date().toISOString().split("T")[0]} onSelect={(d)=>{setSelectedCalendarDate(d);const existing=calendarNotes.find(x=>x.date===d);setCalendarForm(existing?{...existing}:{title:"",content:"",isHoliday:false});setCalendarModal(true);}}
                  highlightDates={[...tasks.filter(t=>t.endDate).map(t=>t.endDate),...goals.filter(g=>g.endDate).map(g=>g.endDate),...calendarNotes.map(x=>x.date)]}/>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Scroll AI chat to bottom


  // ── HABITS ────────────────────────────────────────
  const renderHabits=()=>(
    <div style={{display:"flex",flexDirection:"column",gap:20}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
        <div><h2 style={{fontSize:"clamp(16px,3vw,22px)",fontWeight:900,color:C.text,margin:0}}>🔥 Habit Tracker</h2>
          <p style={{color:C.muted,fontSize:13,margin:"4px 0 0"}}>{completedHabits}/{displayHabits.length} completed today</p></div>
        <Btn onClick={()=>{setHabitForm({title:"",icon:"✨",cat:"Personal",freq:"Daily",color:"#6d28d9",goalDays:30,startDate:"",endDate:"",description:"",reminderTime:"",notes:""});setModal("addHabit");}} C={C}>+ Add Habit</Btn>
      </div>
      {modal==="addHabit"&&(
        <Modal title={habitForm.id?"Edit Habit":"New Habit"} onClose={()=>setModal(null)} C={C}>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <Field label="Title *" C={C}><Input C={C} value={habitForm.title} onChange={e=>setHabitForm({...habitForm,title:e.target.value})} placeholder="Habit name"/></Field>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <Field label="Icon" C={C}>
                <div style={{display:"flex",gap:8}}>
                  <Input C={C} value={habitForm.icon} onChange={e=>setHabitForm({...habitForm,icon:e.target.value})} placeholder="Emoji" onClick={()=>setShowEmojiSug(s=>!s)} style={{transition:"transform 0.2s"}} onMouseDown={e=>e.currentTarget.style.transform="scale(0.95)"} onMouseUp={e=>e.currentTarget.style.transform="scale(1)"}/>
                </div>
                <EmojiSug onSelect={e=>{setHabitForm({...habitForm,icon:e});setShowEmojiSug(false);}} C={C} show={showEmojiSug}/>
              </Field>
              <Field label="Color" C={C}><input type="color" value={habitForm.color} onChange={e=>setHabitForm({...habitForm,color:e.target.value})} style={{width:"100%",height:42,borderRadius:10,border:`1px solid ${C.border}`,background:C.inputBg,cursor:"pointer"}}/></Field>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <Field label="Category" C={C}><Select C={C} value={habitForm.cat} onChange={e=>setHabitForm({...habitForm,cat:e.target.value})} options={["Personal","Health","Learning","Work","Mindfulness","Finance","Social","Other"]}/></Field>
              <Field label="Frequency" C={C}><Select C={C} value={habitForm.freq} onChange={e=>setHabitForm({...habitForm,freq:e.target.value})} options={["Daily","Weekly","Monthly"]}/></Field>
            </div>
            <Field label="Goal Days" C={C}><Input C={C} type="number" value={habitForm.goalDays === "" ? "" : habitForm.goalDays} onChange={e=>setHabitForm({...habitForm,goalDays:e.target.value===""?"":parseInt(e.target.value)||""})} min={1}/></Field>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <Field label="Start Date" C={C}><DateTimePicker C={C} value={habitForm.startDate} onChange={v=>setHabitForm({...habitForm,startDate:v})} placeholder="Start date"/></Field>
              <Field label="End Date" C={C}><DateTimePicker C={C} value={habitForm.endDate} onChange={v=>setHabitForm({...habitForm,endDate:v})} placeholder="End date"/></Field>
            </div>
            <Field label="Daily Reminder Time" C={C}><TimePicker C={C} value={habitForm.reminderTime} onChange={v=>setHabitForm({...habitForm,reminderTime:v})}/></Field>
            <Field label="Description" C={C}><Textarea C={C} value={habitForm.description} onChange={e=>setHabitForm({...habitForm,description:e.target.value})} placeholder="Why this habit?"/></Field>
            <Field label="Notes" C={C}><Textarea C={C} value={habitForm.notes||""} onChange={e=>setHabitForm({...habitForm,notes:e.target.value})} placeholder="Any additional notes..."/></Field>
            <Btn onClick={()=>{
              if(!habitForm.title)return;
              const payload = {...habitForm, goalDays: habitForm.goalDays === "" ? 30 : (parseInt(habitForm.goalDays) || 30)};
              if(habitForm.id){updateHabit(habitForm.id,payload);setModal(null);}
              else{addHabit(payload);}
            }} C={C} style={{width:"100%"}}>{habitForm.id?"Save Changes ✓":"Add Habit ✓"}</Btn>
          </div>
        </Modal>
      )}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:14}}>
        {displayHabits.map(h=>(
          <div key={h.id} style={{background:C.card,border:`1.5px solid ${h.done?h.color+"66":C.border}`,borderRadius:16,padding:18,transition:"all 0.2s",boxShadow:h.done?`0 4px 20px ${h.color}22`:"none"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:40,height:40,borderRadius:12,background:`${h.color}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,border:`1px solid ${h.color}44`}}>{h.icon||"✨"}</div>
                <div>
                  <div style={{fontWeight:800,color:C.text,fontSize:14}}>{h.title}</div>
                  <div style={{fontSize:11,color:C.muted}}>{h.cat} • {h.freq}</div>
                </div>
              </div>
              <button onClick={()=>updateHabit(h.id,{done:!h.done})} style={{width:32,height:32,borderRadius:9,border:`2px solid ${h.done?h.color:C.border}`,background:h.done?h.color:"transparent",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0,transition:"all 0.2s"}}>
                {h.done&&<span style={{color:"#fff",fontSize:14,fontWeight:800}}>✓</span>}
              </button>
            </div>
            <div style={{display:"flex",gap:12,marginBottom:10}}>
              <div style={{textAlign:"center"}}><div style={{fontSize:18,fontWeight:900,color:C.gold}}>🔥{h.streak}</div><div style={{fontSize:10,color:C.muted}}>streak</div></div>
              <div style={{textAlign:"center"}}><div style={{fontSize:18,fontWeight:900,color:C.glow}}>{h.completions||0}</div><div style={{fontSize:10,color:C.muted}}>done</div></div>
              <div style={{textAlign:"center"}}><div style={{fontSize:18,fontWeight:900,color:C.text}}>{h.goalDays||30}</div><div style={{fontSize:10,color:C.muted}}>goal</div></div>
            </div>
            <ProgressBar value={Math.round(((h.completions||0)/(h.goalDays||30))*100)} C={C} color={h.color}/>
            <div style={{fontSize:11,color:C.muted,marginTop:6,textAlign:"right"}}>{Math.round(((h.completions||0)/(h.goalDays||30))*100)}% of goal</div>
            <div style={{display:"flex",gap:6,marginTop:10,justifyContent:"flex-end"}}>
              <button onClick={()=>{setHabitForm(h);setModal("addHabit");}} style={{fontSize:11,color:C.text,background:C.soft,border:`1px solid ${C.border}`,borderRadius:7,padding:"4px 10px",cursor:"pointer"}}>✎ Edit</button>
              <button onClick={()=>{if(window.confirm("Delete habit?")) deleteHabit(h.id);}} style={{fontSize:11,color:C.red,background:`${C.red}11`,border:"none",borderRadius:7,padding:"4px 10px",cursor:"pointer"}}>✕ Delete</button>
            </div>
          </div>
        ))}
        {displayHabits.length===0&&<div style={{color:C.muted,fontSize:14,padding:20,gridColumn:"1/-1",textAlign:"center"}}>No habits yet. Add your first habit!</div>}
      </div>
    </div>
  );

  // ── TASKS ─────────────────────────────────────────
  const renderTasks=()=>{
    const groups={Today:tasks.filter(t=>t.due==="Today"),Tomorrow:tasks.filter(t=>t.due==="Tomorrow"),"This Week":tasks.filter(t=>t.due==="This Week"),"No Date":tasks.filter(t=>!["Today","Tomorrow","This Week"].includes(t.due))};
    return(
      <div style={{display:"flex",flexDirection:"column",gap:20}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
          <div><h2 style={{fontSize:"clamp(16px,3vw,22px)",fontWeight:900,color:C.text,margin:0}}>✅ Task Manager</h2>
            <p style={{color:C.muted,fontSize:13,margin:"4px 0 0"}}>{tasks.filter(t=>t.done).length}/{tasks.length} completed</p></div>
          <Btn onClick={()=>{setTaskForm({title:"",project:"Personal",priority:"Medium",due:"Today",startDate:"",endDate:"",description:"",tags:"",startTime:"",reminderTime:"",notes:""});setModal("addTask");}} C={C}>+ Add Task</Btn>
        </div>
        {modal==="addTask"&&(
          <Modal title={taskForm.id?"Edit Task":"New Task"} onClose={()=>setModal(null)} C={C}>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <Field label="Title *" C={C}><Input C={C} value={taskForm.title} onChange={e=>setTaskForm({...taskForm,title:e.target.value})} placeholder="Task title"/></Field>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <Field label="Project" C={C}><Input C={C} value={taskForm.project} onChange={e=>setTaskForm({...taskForm,project:e.target.value})} placeholder="e.g. Work"/></Field>
                <Field label="Priority" C={C}><Select C={C} value={taskForm.priority} onChange={e=>setTaskForm({...taskForm,priority:e.target.value})} options={["Low","Medium","High"]}/></Field>
              </div>
              <Field label="Due" C={C}><Select C={C} value={taskForm.due} onChange={e=>setTaskForm({...taskForm,due:e.target.value})} options={["Today","Tomorrow","This Week","Later"]}/></Field>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <Field label="Start Date" C={C}><DateTimePicker C={C} value={taskForm.startDate} onChange={v=>setTaskForm({...taskForm,startDate:v})} placeholder="Start date"/></Field>
                <Field label="End Date" C={C}><DateTimePicker C={C} value={taskForm.endDate} onChange={v=>setTaskForm({...taskForm,endDate:v})} placeholder="End date"/></Field>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <Field label="Start Time" C={C}><TimePicker C={C} value={taskForm.startTime} onChange={v=>setTaskForm({...taskForm,startTime:v})}/></Field>
                <Field label="Reminder" C={C}><TimePicker C={C} value={taskForm.reminderTime} onChange={v=>setTaskForm({...taskForm,reminderTime:v})}/></Field>
              </div>
              <Field label="Tags (comma-separated)" C={C}><Input C={C} value={taskForm.tags} onChange={e=>setTaskForm({...taskForm,tags:e.target.value})} placeholder="work, urgent, client"/></Field>
              <Field label="Description" C={C}><Textarea C={C} value={taskForm.description} onChange={e=>setTaskForm({...taskForm,description:e.target.value})} placeholder="More details..."/></Field>
              <Field label="Notes" C={C}><Textarea C={C} value={taskForm.notes||""} onChange={e=>setTaskForm({...taskForm,notes:e.target.value})} placeholder="Any additional notes..."/></Field>
              <Btn onClick={()=>{
                if(!taskForm.title)return;
                if(taskForm.id){updateTask(taskForm.id,taskForm);setModal(null);}
                else{addTask(taskForm);}
              }} C={C} style={{width:"100%"}}>{taskForm.id?"Save Changes ✓":"Add Task ✓"}</Btn>
            </div>
          </Modal>
        )}
        {Object.entries(groups).map(([group,items])=>items.length>0&&(
          <div key={group}>
            <div style={{fontSize:13,fontWeight:800,color:C.muted,marginBottom:10,textTransform:"uppercase",letterSpacing:1}}>{group} ({items.length})</div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {items.map(t=>(
                <div key={t.id} style={{background:C.card,border:`1px solid ${t.done?C.green+"33":C.border}`,borderRadius:14,padding:"12px 16px",display:"flex",alignItems:"flex-start",gap:12,transition:"all 0.2s"}}>
                  <div onClick={()=>updateTask(t.id,{done:!t.done})} style={{width:22,height:22,borderRadius:7,border:`2px solid ${t.done?C.green:C.border}`,background:t.done?C.green:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,cursor:"pointer",marginTop:1}}>
                    {t.done&&<span style={{color:"#fff",fontSize:11}}>✓</span>}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:700,color:t.done?C.muted:C.text,textDecoration:t.done?"line-through":"none",fontSize:14,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.title}</div>
                    <div style={{display:"flex",gap:8,marginTop:4,flexWrap:"wrap"}}>
                      <Badge text={t.project||"Personal"} color={C.blue}/>
                      <Badge text={t.priority} color={t.priority==="High"?C.red:t.priority==="Medium"?C.gold:C.green}/>
                      {t.endDate&&<Badge text={`Due ${t.endDate}`} color={C.muted}/>}
                    </div>
                  </div>
                  <div style={{display:"flex",gap:4,flexShrink:0,alignItems:"center"}}>
                    <button onClick={()=>{setTaskForm(t);setModal("addTask");}} style={{background:C.soft,border:`1px solid ${C.border}`,color:C.text,borderRadius:7,padding:"4px 8px",cursor:"pointer",fontSize:11}}>✎</button>
                    <button onClick={()=>{if(window.confirm("Delete task?")) deleteTask(t.id);}} style={{background:`${C.red}11`,border:"none",color:C.red,borderRadius:7,padding:"4px 8px",cursor:"pointer",fontSize:11}}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        {tasks.length===0&&<div style={{color:C.muted,fontSize:14,textAlign:"center",padding:40}}>No tasks yet. Add your first task!</div>}
      </div>
    );
  };

  // ── GOALS ─────────────────────────────────────────
  const renderGoals=()=>(
    <div style={{display:"flex",flexDirection:"column",gap:20}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
        <div><h2 style={{fontSize:"clamp(16px,3vw,22px)",fontWeight:900,color:C.text,margin:0}}>🎯 Goals</h2>
          <p style={{color:C.muted,fontSize:13,margin:"4px 0 0"}}>{goals.filter(g=>g.status==="completed").length}/{goals.length} achieved</p></div>
        <Btn onClick={()=>{setGoalForm({title:"",icon:"🎯",cat:"Personal",deadline:"Dec 2026",description:"",startDate:"",endDate:"",milestones:""});setModal("addGoal");}} C={C}>+ Add Goal</Btn>
      </div>
      {modal==="addGoal"&&(
        <Modal title={goalForm.id?"Edit Goal":"New Goal"} onClose={()=>setModal(null)} C={C}>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <Field label="Title *" C={C}><Input C={C} value={goalForm.title} onChange={e=>setGoalForm({...goalForm,title:e.target.value})} placeholder="Your goal"/></Field>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <Field label="Icon" C={C}>
                <Input C={C} value={goalForm.icon} onChange={e=>setGoalForm({...goalForm,icon:e.target.value})} placeholder="Emoji" onClick={()=>setShowEmojiSug(s=>!s)} style={{transition:"transform 0.2s"}} onMouseDown={e=>e.currentTarget.style.transform="scale(0.95)"} onMouseUp={e=>e.currentTarget.style.transform="scale(1)"}/>
                <EmojiSug onSelect={e=>{setGoalForm({...goalForm,icon:e});setShowEmojiSug(false);}} C={C} show={showEmojiSug}/>
              </Field>
              <Field label="Category" C={C}><Select C={C} value={goalForm.cat} onChange={e=>setGoalForm({...goalForm,cat:e.target.value})} options={["Personal","Career","Health","Finance","Learning","Relationships","Travel","Other"]}/></Field>
            </div>
            <Field label="Deadline" C={C}><Input C={C} value={goalForm.deadline} onChange={e=>setGoalForm({...goalForm,deadline:e.target.value})} placeholder="e.g. Dec 2026"/></Field>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <Field label="Start Date" C={C}><DateTimePicker C={C} value={goalForm.startDate} onChange={v=>setGoalForm({...goalForm,startDate:v})} placeholder="Start date"/></Field>
              <Field label="Target Date" C={C}><DateTimePicker C={C} value={goalForm.endDate} onChange={v=>setGoalForm({...goalForm,endDate:v})} placeholder="Target date"/></Field>
            </div>
            <Field label="Milestones (comma-separated)" C={C}><Input C={C} value={goalForm.milestones} onChange={e=>setGoalForm({...goalForm,milestones:e.target.value})} placeholder="Phase 1, Phase 2, Launch"/></Field>
            <Field label="Description" C={C}><Textarea C={C} value={goalForm.description} onChange={e=>setGoalForm({...goalForm,description:e.target.value})} placeholder="What does success look like?"/></Field>
            <Field label="Notes" C={C}><Textarea C={C} value={goalForm.notes||""} onChange={e=>setGoalForm({...goalForm,notes:e.target.value})} placeholder="Additional thoughts or notes..."/></Field>
            <Btn onClick={()=>{
              if(!goalForm.title)return;
              if(goalForm.id){updateGoal(goalForm.id,goalForm);setModal(null);}
              else{addGoal(goalForm);}
            }} C={C} style={{width:"100%"}}>{goalForm.id?"Save Changes ✓":"Add Goal ✓"}</Btn>
          </div>
        </Modal>
      )}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:14}}>
        {displayGoals.map(g=>{
          const ms=g.milestones?JSON.parse(g.milestones.startsWith("[")?g.milestones:JSON.stringify(g.milestones.split(",").map(s=>s.trim()))):[];
          const status = g.status || "active";
          const statusCfg =
            status==="completed" ? { text:"✅ Done", fg:C.green, bg:`${C.green}18`, border:`${C.green}44` } :
            status==="paused" ? { text:"⏸ Paused", fg:C.gold, bg:`${C.gold}18`, border:`${C.gold}44` } :
            { text:"⚡ Active", fg:"#fff", bg:`linear-gradient(135deg,${C.accent}cc,${C.blue}cc)`, border:`${C.accent}55` };
          return(
            <div key={g.id} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:20}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:24}}>{g.icon||"🎯"}</span>
                  <div>
                    <div style={{fontWeight:800,color:C.text,fontSize:14}}>{g.title}</div>
                    <div style={{fontSize:11,color:C.muted}}>{g.cat} • {g.deadline}</div>
                  </div>
                </div>
                <span style={{fontSize:11,fontWeight:900,color:statusCfg.fg,background:statusCfg.bg,border:`1px solid ${statusCfg.border}`,padding:"6px 10px",borderRadius:999,display:"inline-flex",alignItems:"center",gap:6,whiteSpace:"nowrap",boxShadow:status==="active"?`0 10px 26px ${C.accent}22`:"none"}}>
                  {statusCfg.text}
                </span>
              </div>
              <div style={{marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                  <span style={{fontSize:13,color:C.muted}}>Progress</span>
                  <span style={{fontSize:15,fontWeight:900,color:C.glow}}>{g.progress||0}%</span>
                </div>
                <ProgressBar value={g.progress||0} C={C}/>
              </div>
              {ms.length>0&&(
                <div style={{marginBottom:10}}>
                  <div style={{fontSize:11,color:C.muted,fontWeight:700,marginBottom:6}}>MILESTONES</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                    {ms.map((m,i)=><Badge key={i} text={m} color={C.blue}/>)}
                  </div>
                </div>
              )}
              <div style={{display:"flex",gap:6,marginTop:12}}>
                <button onClick={()=>updateGoal(g.id,{progress:Math.min(100,(g.progress||0)+10)})} style={{flex:1,padding:"6px",borderRadius:8,border:`1px solid ${C.border}`,background:C.soft,color:C.green,cursor:"pointer",fontSize:12,fontWeight:700}}>+10%</button>
                <button onClick={()=>updateGoal(g.id,{progress:Math.max(0,(g.progress||0)-10)})} style={{flex:1,padding:"6px",borderRadius:8,border:`1px solid ${C.border}`,background:C.soft,color:C.red,cursor:"pointer",fontSize:12,fontWeight:700}}>-10%</button>
                <button onClick={()=>updateGoal(g.id,{status:"completed",progress:100})} style={{flex:1,padding:"6px",borderRadius:8,border:`1px solid ${C.green}`,background:`${C.green}11`,color:C.green,cursor:"pointer",fontSize:11,fontWeight:700}}>✓</button>
                <button onClick={()=>{setGoalForm(g);setModal("addGoal");}} style={{padding:"6px 14px",borderRadius:8,border:`1px solid ${C.border}`,background:C.soft,color:C.text,cursor:"pointer",fontSize:12}}>✎ Edit</button>
                <button onClick={()=>{if(window.confirm("Delete goal?")) deleteGoal(g.id);}} style={{padding:"6px 14px",borderRadius:8,border:"none",background:`${C.red}11`,color:C.red,cursor:"pointer",fontSize:12}}>✕</button>
              </div>
            </div>
          );
        })}
        {displayGoals.length===0&&<div style={{color:C.muted,fontSize:14,textAlign:"center",padding:40}}>No goals yet. Add your first goal!</div>}
      </div>
    </div>
  );

  // ── HEALTH ────────────────────────────────────────
  const renderHealth=()=>{
    if(!isPremium(user)) return <PremiumGate C={C} onUpgrade={()=>setPage("pricing")}/>;
    const healthHabits=habits.filter(h=>h.cat==="Health"||h.title?.toLowerCase().includes("water")||h.title?.toLowerCase().includes("sleep")||h.title?.toLowerCase().includes("exercise"));
    return(
      <div style={{display:"flex",flexDirection:"column",gap:24}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
          <h2 style={{fontSize:"clamp(16px,3vw,22px)",fontWeight:900,color:C.text,margin:0}}>❤️ Health & Wellness</h2>
          <Btn onClick={()=>{setHabitForm({title:"",icon:"❤️",cat:"Health",freq:"Daily",color:"#ef4444",goalDays:30,startDate:"",endDate:"",description:"",reminderTime:"",notes:""});setModal("addHealthItem");}} C={C}>+ Add Item</Btn>
        </div>

        {modal==="addHealthItem"&&(
          <Modal title={habitForm.id?"Edit Health Item":"New Health Item"} onClose={()=>setModal(null)} C={C}>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <Field label="Title *" C={C}>
                <Input C={C} value={habitForm.title} onChange={e=>setHabitForm({...habitForm,title:e.target.value})} placeholder="e.g. Drink water, Sleep 8h, Exercise"/>
              </Field>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <Field label="Icon" C={C}>
                   <Input C={C} value={habitForm.icon} onChange={e=>setHabitForm({...habitForm,icon:e.target.value})} placeholder="Emoji" onClick={()=>setShowEmojiSug(s=>!s)} style={{transition:"transform 0.2s"}} onMouseDown={e=>e.currentTarget.style.transform="scale(0.95)"} onMouseUp={e=>e.currentTarget.style.transform="scale(1)"}/>
                   <EmojiSug onSelect={e=>{setHabitForm({...habitForm,icon:e});setShowEmojiSug(false);}} C={C} show={showEmojiSug}/>
                </Field>
                <Field label="Color" C={C}>
                  <input type="color" value={habitForm.color||"#ef4444"} onChange={e=>setHabitForm({...habitForm,color:e.target.value})}
                    style={{width:"100%",height:42,borderRadius:10,border:`1px solid ${C.border}`,background:C.inputBg,cursor:"pointer"}}/>
                </Field>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <Field label="Frequency" C={C}><Select C={C} value={habitForm.freq} onChange={e=>setHabitForm({...habitForm,freq:e.target.value})} options={["Daily","Weekly","Monthly"]}/></Field>
                <Field label="Goal Days" C={C}><Input C={C} type="number" min={1} value={habitForm.goalDays === "" ? "" : habitForm.goalDays} onChange={e=>setHabitForm({...habitForm,goalDays:e.target.value===""?"":parseInt(e.target.value)||""})}/></Field>
              </div>
              <Field label="Notes" C={C}><Textarea C={C} value={habitForm.notes||""} onChange={e=>setHabitForm({...habitForm,notes:e.target.value})} placeholder="Optional notes..."/></Field>
              <div style={{display:"flex",gap:10}}>
                <Btn onClick={async()=>{
                  if(!habitForm.title){addToast("Title is required","error");return;}
                  const payload={...habitForm,cat:"Health",goalDays:habitForm.goalDays===""?30:(parseInt(habitForm.goalDays)||30)};
                  if(habitForm.id) await updateHabit(habitForm.id,payload);
                  else await addHabit(payload);
                  setModal(null);
                }} C={C} style={{flex:1}}>{habitForm.id?"Save Changes ✓":"Add Item ✓"}</Btn>
                <Btn onClick={()=>setModal(null)} variant="outline" C={C}>Cancel</Btn>
              </div>
            </div>
          </Modal>
        )}

        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:16}}>
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:18,padding:24}}>
            <div style={{fontSize:32,marginBottom:8}}>💧</div>
            <div style={{fontSize:14,fontWeight:700,color:C.muted,marginBottom:4}}>Water Today</div>
            <div style={{fontSize:28,fontWeight:900,color:C.cyan,display:"flex",alignItems:"center",gap:6}}>
              <input type="number" min={0} value={waterGlasses===""||waterGlasses===0?"":waterGlasses} placeholder="0" onChange={e=>setWaterGlasses(e.target.value===""?"":Math.max(0,parseInt(e.target.value)||0))} style={{width:70,padding:"4px 8px",borderRadius:10,border:`1px solid ${C.border}`,background:C.inputBg,color:C.cyan,fontSize:22,fontWeight:900,textAlign:"center"}}/>
              <span style={{fontSize:14,color:C.muted,fontWeight:700}}>glasses</span>
            </div>
            <div style={{display:"flex",gap:8,marginTop:12}}>
              <button onClick={()=>setWaterGlasses(w=>Math.max(0,(parseInt(w)||0)-1))} style={{width:36,height:36,borderRadius:10,border:`1px solid ${C.border}`,background:C.soft,color:C.text,cursor:"pointer",fontSize:18}}>-</button>
              <button onClick={()=>setWaterGlasses(w=>(parseInt(w)||0)+1)} style={{flex:1,height:36,borderRadius:10,border:"none",background:C.cyan,color:"#fff",cursor:"pointer",fontWeight:800}}>+ Add</button>
            </div>
          </div>
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:18,padding:24}}>
            <div style={{fontSize:32,marginBottom:8}}>😴</div>
            <div style={{fontSize:14,fontWeight:700,color:C.muted,marginBottom:4}}>Sleep Last Night</div>
            <input type="number" min={0} max={24} step={0.5} value={sleepHours} onChange={e=>setSleepHours(e.target.value)} placeholder="Hours" style={{width:"100%",padding:"10px 14px",borderRadius:10,border:`1px solid ${C.border}`,background:C.inputBg,color:C.text,fontSize:18,fontWeight:800}}/>
          </div>
        </div>
        <div>
          <h3 style={{fontSize:15,fontWeight:800,color:C.text,marginBottom:12}}>Health Habits</h3>
          {healthHabits.length>0?(
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {healthHabits.map(h=>(
                <div key={h.id} style={{display:"flex",alignItems:"center",gap:12,padding:14,background:C.card,border:`1px solid ${C.border}`,borderRadius:12}}>
                  <span style={{fontSize:24}}>{h.icon||"❤️"}</span>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:800,color:C.text}}>{h.title}</div>
                    <div style={{fontSize:12,color:C.muted}}>Streak: {h.streak||0} • {h.done?"✓ Done today":"Not done"}</div>
                  </div>
                  <div style={{display:"flex",gap:6,alignItems:"center"}}>
                    <button onClick={()=>{setHabitForm(h);setModal("addHealthItem");}} style={{padding:"6px 10px",borderRadius:8,border:`1px solid ${C.border}`,background:C.soft,color:C.text,cursor:"pointer",fontSize:12}} title="Edit health item">✎</button>
                    <button onClick={()=>updateHabit(h.id,{done:!h.done})} style={{padding:"8px 16px",borderRadius:10,border:"none",background:h.done?C.green:C.soft,color:h.done?"#fff":C.text,cursor:"pointer",fontWeight:700}}>{h.done?"✓":"Mark Done"}</button>
                    <button onClick={()=>{if(window.confirm("Delete health item?")) deleteHabit(h.id);}} style={{padding:"6px 10px",borderRadius:8,border:"none",background:`${C.red}22`,color:C.red,cursor:"pointer",fontSize:12}}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          ):<p style={{color:C.muted,fontSize:14}}>Add health habits (e.g. Exercise, Meditation) in the Habits section with category "Health"</p>}
        </div>
      </div>
    );
  };

  // ── SKILLS ────────────────────────────────────────
  const renderSkills=()=>(
    <div style={{display:"flex",flexDirection:"column",gap:20}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
        <h2 style={{fontSize:"clamp(16px,3vw,22px)",fontWeight:900,color:C.text,margin:0}}>📈 Skills & Roadmaps</h2>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <Btn onClick={()=>{setModal("addRoadmap");setEditingRoadmap(null);setRmForm({title:"",icon:"🗺️",color:"#7c3aed",description:"",notes:""});}} variant="outline" C={C}>+ Roadmap</Btn>
        </div>
      </div>
      {(modal==="addRoadmap"||editingRoadmap)&&(
        <Modal title={editingRoadmap?"Edit Roadmap":"New Roadmap"} onClose={()=>{setModal(null);setEditingRoadmap(null);}} C={C}>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <Field label="Title *" C={C}><Input C={C} value={rmForm.title} onChange={e=>setRmForm({...rmForm,title:e.target.value})} placeholder="e.g. Full Stack Dev"/></Field>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <Field label="Icon" C={C}>
                <Input C={C} value={rmForm.icon} onChange={e=>setRmForm({...rmForm,icon:e.target.value})} placeholder="Emoji" onClick={()=>setShowEmojiSug(s=>!s)} style={{transition:"transform 0.2s"}} onMouseDown={e=>e.currentTarget.style.transform="scale(0.95)"} onMouseUp={e=>e.currentTarget.style.transform="scale(1)"}/>
                <EmojiSug onSelect={e=>{setRmForm({...rmForm,icon:e});setShowEmojiSug(false);}} C={C} show={showEmojiSug}/>
              </Field>
              <Field label="Color" C={C}><input type="color" value={rmForm.color} onChange={e=>setRmForm({...rmForm,color:e.target.value})} style={{width:"100%",height:42,borderRadius:10,border:`1px solid ${C.border}`,background:C.inputBg,cursor:"pointer"}}/></Field>
            </div>
            <Field label="Description" C={C}><Textarea C={C} value={rmForm.description} onChange={e=>setRmForm({...rmForm,description:e.target.value})} placeholder="What is this roadmap about?"/></Field>
            <Field label="Notes" C={C}><Textarea C={C} value={rmForm.notes||""} onChange={e=>setRmForm({...rmForm,notes:e.target.value})} placeholder="Any additional notes..."/></Field>
            <Btn onClick={()=>{rmForm.title&&(editingRoadmap?updateRoadmap(editingRoadmap.id,rmForm):addRoadmap(rmForm));if(editingRoadmap)setEditingRoadmap(null);}} C={C} style={{width:"100%"}}>{editingRoadmap?"Save Changes ✓":"Create Roadmap ✓"}</Btn>
          </div>
        </Modal>
      )}
      {(modal==="addSkill"||editingSkill)&&(
        <Modal title={editingSkill?"Edit Skill":"Add Skill"} onClose={()=>{setModal(null);setEditingSkill(null);}} C={C}>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <Field label="Skill Name *" C={C}><Input C={C} value={skillForm.name} onChange={e=>setSkillForm({...skillForm,name:e.target.value})} placeholder="e.g. React"/></Field>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <Field label="Level" C={C}><Select C={C} value={skillForm.level} onChange={e=>setSkillForm({...skillForm,level:e.target.value})} options={["Beginner","Intermediate","Advanced","Expert"]}/></Field>
              <Field label="Color" C={C}><input type="color" value={skillForm.color} onChange={e=>setSkillForm({...skillForm,color:e.target.value})} style={{width:"100%",height:42,borderRadius:10,border:`1px solid ${C.border}`,background:C.inputBg,cursor:"pointer"}}/></Field>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <Field label="Hours Done" C={C}><Input C={C} type="number" value={skillForm.hours === "" ? "" : skillForm.hours} onChange={e=>setSkillForm({...skillForm,hours:e.target.value===""?"":parseInt(e.target.value)||""})} min={0}/></Field>
              <Field label="Goal Hours" C={C}><Input C={C} type="number" value={skillForm.goalHours === "" ? "" : skillForm.goalHours} onChange={e=>setSkillForm({...skillForm,goalHours:e.target.value===""?"":parseInt(e.target.value)||""})} min={1}/></Field>
            </div>
            <Field label="Roadmap" C={C}><Select C={C} value={skillForm.roadmapId||""} onChange={e=>setSkillForm({...skillForm,roadmapId:e.target.value?parseInt(e.target.value):null})} options={[{value:"",label:"No Roadmap"},...roadmaps.map(r=>({value:r.id,label:`${r.icon} ${r.title}`}))]}/></Field>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <Field label="Start Date" C={C}><DateTimePicker C={C} value={skillForm.startDate} onChange={v=>setSkillForm({...skillForm,startDate:v})} placeholder="Start date"/></Field>
              <Field label="End Date" C={C}><DateTimePicker C={C} value={skillForm.endDate} onChange={v=>setSkillForm({...skillForm,endDate:v})} placeholder="End date"/></Field>
            </div>
            <Field label="Notes" C={C}><Textarea C={C} value={skillForm.notes||""} onChange={e=>setSkillForm({...skillForm,notes:e.target.value})} placeholder="Any additional notes..."/></Field>
            <Btn onClick={()=>{
              if(!skillForm.name) return;
              const payload = {
                ...skillForm,
                hours: skillForm.hours === "" ? 0 : (parseInt(skillForm.hours) || 0),
                goalHours: skillForm.goalHours === "" ? 200 : (parseInt(skillForm.goalHours) || 200),
                roadmapId: skillForm.roadmapId || (editingSkill ? editingSkill.roadmapId : null)
              };
              if(editingSkill) updateSkill(editingSkill.id, payload);
              else addSkillToRoadmap(payload);
              if(editingSkill) setEditingSkill(null);
              setModal(null);
            }} C={C} style={{width:"100%"}}>{editingSkill?"Save Changes ✓":"Add Skill ✓"}</Btn>
          </div>
        </Modal>
      )}
      {roadmaps.map(rm=>(
        <div key={rm.id} style={{background:C.card,border:`1.5px solid ${rm.color||C.border}44`,borderRadius:18,padding:20}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:8}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:44,height:44,borderRadius:12,background:`${rm.color||C.accent}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>{rm.icon||"🗺️"}</div>
              <div><div style={{fontWeight:900,color:C.text,fontSize:15}}>{rm.title}</div><div style={{fontSize:12,color:C.muted}}>{rm.description}</div></div>
            </div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              <Btn onClick={()=>{setSkillForm(f=>({...f,roadmapId:rm.id}));setModal("addSkill");}} size="sm" C={C}>+ Skill</Btn>
              <Btn onClick={()=>{setEditingRoadmap(rm);setRmForm({title:rm.title,icon:rm.icon||"🗺️",color:rm.color||"#7c3aed",description:rm.description||"",notes:rm.notes||""});}} size="sm" variant="outline" C={C}>✎ Edit</Btn>
              <Btn onClick={()=>deleteRoadmap(rm.id)} size="sm" variant="danger" C={C}>✕ Delete</Btn>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:12}}>
            {(rm.skills||[]).map(s=>(
              <div key={s.id} style={{background:C.soft,border:`1px solid ${C.border}`,borderRadius:12,padding:14,position:"relative"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                  <div>
                    <span style={{fontWeight:800,color:C.text,fontSize:13}}>{s.name}</span>
                    <div style={{display:"flex",alignItems:"center",gap:4,marginTop:2}}>
                      <input type="number" min={0} value={s.hours===""||s.hours===0?"":s.hours} placeholder="0" onChange={e=>updateSkill(s.id,{hours:e.target.value===""?"":Math.max(0,parseInt(e.target.value)||0)})} style={{width:50,padding:"2px 4px",borderRadius:6,border:`1px solid ${C.border}`,background:C.card,color:C.text,fontSize:11,fontWeight:800,textAlign:"center"}} title="Type hours manually"/>
                      <span style={{fontSize:10,color:C.muted,fontWeight:700}}>/{s.goalHours||200}h</span>
                    </div>
                  </div>
                  <div style={{display:"flex",gap:4}}>
                    <button onClick={()=>{setEditingSkill(s);setSkillForm({name:s.name,level:s.level||"Beginner",hours:s.hours||0,goalHours:s.goalHours||200,color:s.color||"#7c3aed",roadmapId:rm.id,startDate:s.startDate||"",endDate:s.endDate||"",notes:s.notes||""});}} style={{padding:"4px 8px",borderRadius:6,border:`1px solid ${C.border}`,background:C.card,color:C.text,cursor:"pointer",fontSize:11}} title="Edit">✎</button>
                    <button onClick={()=>deleteSkill(s.id,rm.id)} style={{padding:"4px 8px",borderRadius:6,border:"none",background:`${C.red}22`,color:C.red,cursor:"pointer",fontSize:11}} title="Delete">✕</button>
                  </div>
                </div>
                <Badge text={s.level||"Beginner"} color={s.color||C.glow}/>
                <div style={{marginTop:8}}>
                  <ProgressBar value={Math.round(((s.hours||0)/(s.goalHours||200))*100)} C={C} color={s.color||C.glow} height={5}/>
                  <div style={{fontSize:10,color:C.muted,marginTop:4}}>{Math.round(((s.hours||0)/(s.goalHours||200))*100)}% complete</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      {roadmaps.length===0&&<div style={{color:C.muted,fontSize:14,textAlign:"center",padding:40}}>No roadmaps yet. Create your first skill roadmap!</div>}
    </div>
  );

  // ── FINANCE ───────────────────────────────────────
  const renderFinance=()=>{
    if(!isPremium(user)) return <PremiumGate C={C} onUpgrade={()=>setPage("pricing")}/>;
    const inc=finance.filter(f=>f.type==="income").reduce((a,f)=>a+f.amount,0);
    const exp=finance.filter(f=>f.type==="expense").reduce((a,f)=>a+f.amount,0);
    const sav=finance.filter(f=>f.type==="saving").reduce((a,f)=>a+f.amount,0);
    const cats={income:["Salary","Freelance","Business","Investment","Gift","Other"],expense:["Housing","Food","Transport","Health","Entertainment","Shopping","Bills","Education","Other"],saving:["Emergency","Investment","SIP","Goal","Other"]};
    return(
      <div style={{display:"flex",flexDirection:"column",gap:20}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
          <h2 style={{fontSize:"clamp(16px,3vw,22px)",fontWeight:900,color:C.text,margin:0}}>💰 Finance Tracker</h2>
          <Btn onClick={()=>{setFinForm({label:"",amount:"",type:"income",category:"Other",date:"",note:"",recurring:false,currency:"INR"});setModal("addFinance");}} C={C}>+ Add Entry</Btn>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:12}}>
          <StatCard icon="📈" label="Income" value={formatMoney(inc,currency)} color={C.green} C={C}/>
          <StatCard icon="📉" label="Expenses" value={formatMoney(exp,currency)} color={C.red} C={C}/>
          <StatCard icon="🏦" label="Savings" value={formatMoney(sav,currency)} color={C.blue} C={C}/>
          <StatCard icon="💎" label="Net" value={formatMoney(inc-exp,currency)} color={inc>=exp?C.green:C.red} C={C}/>
        </div>
        {modal==="addFinance"&&(
          <Modal title={finForm.id?"Edit Finance Entry":"Add Finance Entry"} onClose={()=>setModal(null)} C={C}>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <Field label="Label *" C={C}><Input C={C} value={finForm.label} onChange={e=>setFinForm({...finForm,label:e.target.value})} placeholder="e.g. Salary, Rent"/></Field>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
                <Field label="Amount *" C={C}><Input C={C} type="number" value={finForm.amount} onChange={e=>setFinForm({...finForm,amount:e.target.value})} placeholder="0"/></Field>
                <Field label="Currency" C={C}><Select C={C} value={finForm.currency} onChange={e=>setFinForm({...finForm,currency:e.target.value})} options={CURRENCIES.map(c=>({value:c.code,label:`${c.flag} ${c.code}`}))}/></Field>
                <Field label="Type" C={C}><Select C={C} value={finForm.type} onChange={e=>setFinForm({...finForm,type:e.target.value,category:"Other"})} options={[{value:"income",label:"Income"},{value:"expense",label:"Expense"},{value:"saving",label:"Saving"}]}/></Field>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <Field label="Category" C={C}><Select C={C} value={finForm.category} onChange={e=>setFinForm({...finForm,category:e.target.value})} options={cats[finForm.type]||["Other"]}/></Field>
                <Field label="Date" C={C}><DateTimePicker C={C} value={finForm.date} onChange={v=>setFinForm({...finForm,date:v})} placeholder="Pick date"/></Field>
              </div>
              <Field label="Note" C={C}><Input C={C} value={finForm.note} onChange={e=>setFinForm({...finForm,note:e.target.value})} placeholder="Optional note..."/></Field>
              <label style={{display:"flex",alignItems:"center",gap:8,fontSize:13,color:C.muted,cursor:"pointer"}}>
                <input type="checkbox" checked={finForm.recurring} onChange={e=>setFinForm({...finForm,recurring:e.target.checked})}/>Recurring monthly
              </label>
              <Btn onClick={()=>{
                if(!finForm.label||!finForm.amount)return;
                const payload={...finForm,amount:parseFloat(finForm.amount)};
                if(finForm.id)updateFinance(finForm.id,payload);
                else addFinance(payload);
              }} C={C} style={{width:"100%"}}>{finForm.id?"Save Changes ✓":"Add Entry ✓"}</Btn>
            </div>
          </Modal>
        )}
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,overflow:"hidden"}}>
          <div style={{padding:"14px 18px",borderBottom:`1px solid ${C.border}`,fontSize:14,fontWeight:800,color:C.text}}>Recent Transactions</div>
          <div style={{maxHeight:400,overflowY:"auto"}}>
            {finance.map(f=>(
              <div key={f.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 18px",borderBottom:`1px solid ${C.border}`,transition:"background 0.2s"}} onMouseEnter={e=>e.currentTarget.style.background=C.soft} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <div style={{width:36,height:36,borderRadius:10,background:f.type==="income"?`${C.green}22`:f.type==="saving"?`${C.blue}22`:`${C.red}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>
                  {f.type==="income"?"📈":f.type==="saving"?"🏦":"📉"}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:700,color:C.text,fontSize:13,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.label}</div>
                  <div style={{fontSize:11,color:C.muted}}>{f.category}{f.date?` • ${f.date}`:""}</div>
                </div>
                <div style={{fontWeight:800,fontSize:14,color:f.type==="income"?C.green:f.type==="saving"?C.blue:C.red,flexShrink:0}}>
                  {f.type==="expense"?"-":"+"}
                  {formatMoney(f.amount,f.currency||currency)}
                </div>
                <div style={{display:"flex",gap:4,flexShrink:0,opacity:0.6}} onMouseEnter={e=>e.currentTarget.style.opacity="1"} onMouseLeave={e=>e.currentTarget.style.opacity="0.6"}>
                  <button onClick={()=>{setFinForm(f);setModal("addFinance");}} style={{background:C.soft,border:`1px solid ${C.border}`,color:C.text,cursor:"pointer",fontSize:12,padding:"4px 8px",borderRadius:6}}>✎</button>
                  <button onClick={()=>{if(window.confirm("Delete entry?")) deleteFinance(f.id);}} style={{background:`${C.red}11`,border:"none",color:C.red,cursor:"pointer",fontSize:12,padding:"4px 8px",borderRadius:6}}>✕</button>
                </div>
              </div>
            ))}
            {finance.length===0&&<div style={{padding:32,textAlign:"center",color:C.muted,fontSize:14}}>No transactions yet</div>}
          </div>
        </div>
      </div>
    );
  };

  // ── FOCUS TIMER LOGIC ────────────────────────────────
  // Note: Ensure timerMode, timerSecs, etc., are declared ONCE at the top of UpscaleTracker
  
  const resetTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimerRunning(false);
    const initialSecs = timerMode === "focus" 
      ? timerConfig.focus * 60 
      : timerMode === "short" 
        ? timerConfig.short * 60 
        : timerConfig.long * 60;
    setTimerSecs(initialSecs);
  };

  const formatTimer = (s) => {
    const hrs = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const secs = s % 60;
    return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const renderFocus = () => {
    const r = 95;
    const size = 240;
    const circ = 2 * Math.PI * r;
    
    const currentTotal = timerMode === "focus" 
      ? timerConfig.focus * 60 
      : timerMode === "short" 
        ? timerConfig.short * 60 
        : timerConfig.long * 60;
    
    const progress = currentTotal > 0 ? Math.min(100, ((currentTotal - timerSecs) / currentTotal) * 100) : 0;

    const applyEditTime = () => {
      const secs = Math.max(1, Math.min(120, timerEditMins)) * 60;
      setTimerSecs(secs);
      setTimerRunning(false);
      if (timerRef.current) clearInterval(timerRef.current);
      setTimerEditOpen(false);
    };

    return (
      <div style={{display:"flex",flexDirection:"column",gap:24,alignItems:"center",maxWidth:520,margin:"0 auto"}}>
        <div style={{width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
          <h2 style={{fontSize:"clamp(16px,3vw,22px)",fontWeight:900,color:C.text,margin:0}}>⏱ Focus Timer</h2>
          <LiveClock C={C}/>
        </div>

        <div style={{display:"flex",gap:8,flexWrap:"wrap",justifyContent:"center"}}>
          {[{k:"focus",l:"Focus"},{k:"short",l:"Short Break"},{k:"long",l:"Long Break"}].map(m=>(
            <button key={m.k} onClick={()=>{setTimerMode(m.k); resetTimer();}}
              style={{padding:"9px 18px",borderRadius:99,border:`1.5px solid ${timerMode===m.k?C.accent:C.border}`,background:timerMode===m.k?C.accent:"transparent",color:timerMode===m.k?"#fff":C.muted,cursor:"pointer",fontWeight:700,fontSize:13,transition:"all 0.2s"}}>
              {m.l}
            </button>
          ))}
        </div>

        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:24,padding:"clamp(24px,5vw,48px) clamp(20px,5vw,48px)",display:"flex",flexDirection:"column",alignItems:"center",gap:24,width:"100%",boxShadow:`0 8px 32px ${C.accent}11`}}>
          <div style={{position:"relative",width:size,height:size}}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{transform:"rotate(-90deg)"}}>
              <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.border} strokeWidth={12} opacity={0.3}/>
              <circle cx={size/2} cy={size/2} r={r} fill="none" 
                stroke={timerMode==="focus"?C.glow:timerMode==="short"?C.green:C.cyan} 
                strokeWidth={12}
                strokeDasharray={circ} 
                strokeDashoffset={circ*(1-progress/100)} 
                strokeLinecap="round"
                style={{transition:"stroke-dashoffset 1s linear",filter:`drop-shadow(0 0 12px ${timerMode==="focus"?C.glow:timerMode==="short"?C.green:C.cyan}88)`}}
              />
            </svg>
            <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",pointerEvents:"none"}}>
              <div style={{fontSize:"clamp(28px,5vw,44px)",fontWeight:900,color:C.text,fontFamily:"monospace",letterSpacing:-1}}>{formatTimer(timerSecs)}</div>
              <div style={{fontSize:11,color:C.muted,marginTop:6,fontWeight:700,textTransform:"uppercase",letterSpacing:2}}>{timerMode==="focus"?"Deep Work":timerMode==="short"?"Short Break":"Long Rest"}</div>
            </div>
          </div>

          <div style={{display:"flex",gap:16,flexWrap:"wrap",justifyContent:"center"}}>
            <button onClick={()=>setTimerRunning(r=>!r)}
              style={{padding:"16px 48px",borderRadius:99,border:"none",background:timerRunning?C.soft:C.glow,color:timerRunning?C.text:"#000",fontWeight:900,cursor:timerRunning?"not-allowed":"pointer",fontSize:18,display:"flex",alignItems:"center",gap:8,boxShadow:timerRunning?"none":`0 8px 32px ${C.glow}66`,transition:"all 0.3s"}}>
              {timerRunning?"⏸ Pause":"▶ Start"}
            </button>
            <button onClick={resetTimer} style={{width:56,height:56,borderRadius:99,border:`2px solid ${C.border}`,background:C.inputBg,color:C.muted,cursor:"pointer",fontSize:20,display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.2s"}} onMouseEnter={e=>{e.currentTarget.style.color=C.text;e.currentTarget.style.borderColor=C.muted}} onMouseLeave={e=>{e.currentTarget.style.color=C.muted;e.currentTarget.style.borderColor=C.border}} title="Reset">↺</button>
            <button onClick={()=>{setTimerEditMins(Math.floor(timerSecs/60));setTimerEditOpen(true);}} style={{width:56,height:56,borderRadius:99,border:`2px solid ${C.border}`,background:C.inputBg,color:C.text,cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.2s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=C.muted}} onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border}} title="Edit time">✎</button>
          </div>
        </div>

        {timerEditOpen&&(
          <div style={{position:"fixed",inset:0,background:"#000b",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}} onClick={e=>e.target===e.currentTarget&&setTimerEditOpen(false)}>
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:20,padding:28,width:"100%",maxWidth:320}}>
              <h3 style={{margin:"0 0 16px",color:C.text,fontSize:16}}>Set Custom Time</h3>
              <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
                <input type="number" min={1} max={120} value={timerEditMins === "" ? "" : timerEditMins} onChange={e=>setTimerEditMins(e.target.value===""?"":parseInt(e.target.value)||"")} onBlur={e=>{if(!timerEditMins) setTimerEditMins(1);}} style={{flex:1,padding:"12px 16px",borderRadius:10,border:`1px solid ${C.border}`,background:C.inputBg,color:C.text,fontSize:16,fontWeight:700}}/>
                <span style={{color:C.muted,fontSize:14}}>minutes</span>
              </div>
              <div style={{display:"flex",gap:10}}>
                <button onClick={()=>setTimerEditOpen(false)} style={{flex:1,padding:"12px",borderRadius:10,border:`1px solid ${C.border}`,background:C.soft,color:C.muted,cursor:"pointer",fontWeight:700}}>Cancel</button>
                <button onClick={applyEditTime} style={{flex:1,padding:"12px",borderRadius:10,border:"none",background:C.accent,color:"#fff",cursor:"pointer",fontWeight:700}}>Apply</button>
              </div>
            </div>
          </div>
        )}

        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:18,padding:20,width:"100%"}}>
          <div style={{fontSize:13,fontWeight:800,color:C.text,marginBottom:14}}>⚙️ Timer Settings (minutes)</div>
          {[{k:"focus",l:"Focus Duration"},{k:"short",l:"Short Break"},{k:"long",l:"Long Break"}].map(m=>(
            <div key={m.k} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
              <span style={{fontSize:13,color:C.text}}>{m.l}</span>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <button onClick={()=>{setTimerConfig(c=>({...c,[m.k]:Math.max(1,c[m.k]-1)})); if(timerMode===m.k) resetTimer();}} style={{width:32,height:32,borderRadius:8,border:`1px solid ${C.border}`,background:C.soft,color:C.text,cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>-</button>
                <input type="number" min={1} max={180} value={timerConfig[m.k] === "" ? "" : timerConfig[m.k]} onChange={e => { const val = e.target.value === "" ? "" : Math.max(1, parseInt(e.target.value) || 1); setTimerConfig(c => ({...c, [m.k]: val})); if(timerMode === m.k) resetTimer(); }} onBlur={e => { if(!timerConfig[m.k]) setTimerConfig(c => ({...c, [m.k]: 1})); }} style={{width:52,padding:"4px 6px",textAlign:"center",fontWeight:800,color:C.text,fontSize:14,borderRadius:8,border:`1px solid ${C.border}`,background:C.inputBg}} title="Type duration manually"/>
                <button onClick={()=>{setTimerConfig(c=>({...c,[m.k]:c[m.k]+1})); if(timerMode===m.k) resetTimer();}} style={{width:32,height:32,borderRadius:8,border:`1px solid ${C.border}`,background:C.soft,color:C.text,cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
              </div>
            </div>
          ))}
        </div>

        {timerShowAlert && (
          <Modal title="⏰ Time is up!" onClose={()=>setTimerShowAlert(false)} C={C}>
            <div style={{textAlign:"center",padding:"20px 0"}}>
              <div style={{fontSize:80,animation:"bounce 1s infinite",marginBottom:20}}>🔔</div>
              <h3 style={{fontSize:24,fontWeight:950,color:C.text,margin:"0 0 12px"}}>Focus Session Ended</h3>
              <p style={{color:C.muted,fontSize:16,marginBottom:28}}>Great job! Take a well-deserved break or start another session.</p>
              <Btn onClick={()=>{setTimerShowAlert(false); resetTimer();}} C={C} style={{width:"100%",padding:16,fontSize:16}}>Got it ✓</Btn>
            </div>
          </Modal>
        )}
      </div>
    );
  };

  const renderTodo = () => {
    if(!isPremium(user)) return <PremiumGate C={C} onUpgrade={()=>setPage("pricing")}/>;
    const todos = notes.filter(n => !n.roadmapId);
    return (
      <div style={{display:"flex",flexDirection:"column",gap:20}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
          <div>
            <h2 style={{fontSize:"clamp(16px,3vw,22px)",fontWeight:900,color:C.text,margin:0}}>📝 To-Do Notes</h2>
            <p style={{color:C.muted,fontSize:13,margin:"4px 0 0"}}>{todos.length} notes saved</p>
          </div>
          <div style={{display:"flex", gap:"10px"}}>
             <Btn onClick={()=>window.print()} variant="outline" C={C}>🖨️ Export Summary PDF</Btn>
             <Btn onClick={()=>{setNoteForm({title:"",content:"",roadmapId:null});setModal("addNote");}} C={C}>+ New Note</Btn>
          </div>
        </div>

        {/* Create/Edit Note Modal */}
        {modal==="addNote"&&(
          <Modal title={noteForm.id?"Edit Note":"New Note"} onClose={()=>setModal(null)} C={C} wide>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <Field label="Title *" C={C}><Input C={C} value={noteForm.title} onChange={e=>setNoteForm({...noteForm,title:e.target.value})} placeholder="Note title"/></Field>
              <Field label="Content" C={C}><RichTextEditor C={C} value={noteForm.content} onChange={v=>setNoteForm({...noteForm,content:v})} placeholder="Write your note here..."/></Field>
              <Btn onClick={async()=>{
                if(!noteForm.title){addToast("Title is required","error");return;}
                if(usingDemo){
                  if(noteForm.id){
                    setNotes(ns=>ns.map(n=>n.id===noteForm.id?{...n,...noteForm,updatedAt:new Date().toISOString()}:n));
                    addToast("Note updated! ✓","success");
                  } else {
                    setNotes(ns=>[{...noteForm,id:Date.now(),createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()},...ns]);
                    addToast("Note added! ✍️","success");
                  }
                  setModal(null); return;
                }
                const res=await api(noteForm.id?`/notes/${noteForm.id}`:"/notes",noteForm.id?"PATCH":"POST",noteForm,token);
                if(!res.error) {
                   loadAllData(token); addToast(noteForm.id?"Updated!":"Added!","success"); setModal(null);
                } else addToast(res.error,"error");
              }} C={C} style={{width:"100%",padding:14}}>{noteForm.id?"Save Changes ✓":"Add Note ✓"}</Btn>
            </div>
          </Modal>
        )}

        {/* Detailed Note View Modal */}
        {viewNote && (
          <Modal title={viewNote.title} onClose={()=>setViewNote(null)} C={C} wide>
            <div id="note-to-print" style={{display:"flex",flexDirection:"column",gap:20,paddingBottom:20}}>
              <div dangerouslySetInnerHTML={{__html:viewNote.content}} style={{fontSize:15,color:C.text,lineHeight:1.7,wordBreak:"break-word"}} />
              {viewNote.attachments && JSON.parse(viewNote.attachments).length > 0 && (
                <div style={{display:"flex",flexDirection:"column",gap:16,marginTop:10}}>
                  {JSON.parse(viewNote.attachments).map((a,i)=>(
                    <div key={i} style={{borderRadius:16,overflow:"hidden",border:`1px solid ${C.border}`,background:C.soft}}>
                      {a.type.startsWith("image") && <img src={a.data} style={{width:"100%",display:"block"}}/>}
                      {a.type.startsWith("video") && <video src={a.data} controls style={{width:"100%",display:"block"}}/>}
                      {a.type.startsWith("audio") && <div style={{padding:20}}><div style={{fontSize:12,color:C.muted,marginBottom:8}}>🎵 {a.name}</div><audio src={a.data} controls style={{width:"100%"}}/></div>}
                      {!a.type.includes("image") && !a.type.includes("video") && !a.type.includes("audio") && <div style={{padding:16,display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:20}}>📎</span> <a href={a.data} download={a.name} style={{color:C.accent,fontWeight:700,fontSize:14}}>{a.name}</a></div>}
                    </div>
                  ))}
                </div>
              )}
              <div style={{marginTop:30,paddingTop:20,borderTop:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                 <div style={{fontSize:12,color:C.muted}}>Recorded {new Date(viewNote.createdAt).toLocaleString()}</div>
                 <Btn onClick={()=>{
                   const content = document.getElementById("note-to-print").innerHTML;
                   const win = window.open("", "_blank");
                   win.document.write(`<html><head><title>${viewNote.title}</title><style>body{font-family:sans-serif;padding:40px;max-width:800px;margin:0 auto;line-height:1.6}img{max-width:100%;border-radius:12px;margin:20px 0}h1{margin-bottom:10px}</style></head><body><h1>${viewNote.title}</h1>${content}</body></html>`);
                   win.document.close();
                   win.print();
                 }} size="sm" variant="outline" C={C}>🖨️ Download PDF</Btn>
              </div>
            </div>
          </Modal>
        )}

        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:16}}>
          {todos.map(n=>(
            <div key={n.id} onClick={()=>setViewNote(n)} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:20,padding:24,display:"flex",flexDirection:"column",gap:12,cursor:"pointer",transition:"all 0.2s",position:"relative"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=C.accent;e.currentTarget.style.transform="translateY(-4px)";e.currentTarget.style.boxShadow=`0 12px 32px ${C.accent}15`;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="none";}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <div style={{fontWeight:900,color:C.text,fontSize:16,flex:1,marginRight:8}}>{n.title}</div>
                <div style={{display:"flex",gap:4}} onClick={e=>e.stopPropagation()}>
                  <button onClick={()=>{setNoteForm(n);setModal("addNote");}} style={{background:C.soft,border:`1px solid ${C.border}`,color:C.text,borderRadius:9,padding:"6px 10px",cursor:"pointer",fontSize:12}}>✎</button>
                  <button onClick={async()=>{
                    if(!window.confirm("Delete note?"))return;
                    if(usingDemo){setNotes(ns=>ns.filter(x=>x.id!==n.id));return;}
                    const res=await api(`/notes/${n.id}`,"DELETE",null,token);
                    if(!res.error)setNotes(ns=>ns.filter(x=>x.id!==n.id));
                    else addToast(res.error,"error");
                  }} style={{background:`${C.red}11`,border:"none",color:C.red,borderRadius:9,padding:"6px 10px",cursor:"pointer",fontSize:12}}>✕</button>
                </div>
              </div>
              <div dangerouslySetInnerHTML={{__html:n.content}} style={{color:C.muted,fontSize:14,margin:0,lineHeight:1.6,wordBreak:"break-word",display:"-webkit-box",WebkitLineClamp:4,WebkitBoxOrient:"vertical",overflow:"hidden"}} />
              {n.attachments && JSON.parse(n.attachments).length > 0 && (
                <div style={{display:"flex",alignItems:"center",gap:6,background:C.soft,padding:"6px 10px",borderRadius:10,width:"fit-content",marginTop:4}}>
                  <span style={{fontSize:14}}>📎</span>
                  <span style={{fontSize:11,fontWeight:800,color:C.text}}>{JSON.parse(n.attachments).length} Attachments</span>
                </div>
              )}
              <div style={{marginTop:"auto",paddingTop:12,borderTop:`1px solid ${C.border}44`,fontSize:11,color:C.muted}}>
                {new Date(n.updatedAt||n.createdAt).toLocaleDateString()}
              </div>
            </div>
          ))}
          {todos.length===0&&(
            <div style={{color:C.muted,fontSize:14,textAlign:"center",padding:60,background:C.card,border:`1px dashed ${C.border}`,borderRadius:24,gridColumn:"1/-1"}}>
              📝 Your notes are empty. Tap <strong style={{color:C.text}}>+ New Note</strong> to capture thoughts!
            </div>
          )}
        </div>
      </div>
    );
  };

  // ── AI COACH ──────────────────────────────────────
  const handleSendAI=async()=>{
    const msg=aiInput.trim();if(!msg)return;
    setAiInput("");setAiLoading(true);
    await sendAI(msg);
    setAiLoading(false);
  };

  const renderAI=()=>{
    if(!isPremium(user))return <PremiumGate C={C} onUpgrade={()=>setPage("pricing")}/>;
    const prompts=["Help me build better habits","Review my productivity tips","How to stay motivated?","Meal planning advice","Study techniques","Handle stress better"];
    return(
      <div style={{display:"flex",flexDirection:"column",height:"calc(100vh - 120px)",gap:16}}>
        <div>
          <h2 style={{fontSize:"clamp(16px,3vw,22px)",fontWeight:900,color:C.text,margin:"0 0 4px"}}>🧠 AI Life Coach</h2>
          <p style={{color:C.muted,fontSize:13,margin:0}}>Your personal AI for habits, goals, productivity & more</p>
        </div>
        <div ref={aiScrollRef} style={{flex:1,overflowY:"auto",background:C.card,border:`1px solid ${C.border}`,borderRadius:18,padding:20,display:"flex",flexDirection:"column",gap:16}}>
          {aiMessages.map((m,i)=>(
            <div key={i} style={{display:"flex",gap:10,justifyContent:m.role==="user"?"flex-end":"flex-start",alignItems:"flex-end"}}>
              {m.role==="ai"&&<div style={{width:34,height:34,borderRadius:"50%",background:`linear-gradient(135deg,${C.accent},${C.blue})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>🧠</div>}
              <div style={{maxWidth:"88%",padding:"12px 16px",borderRadius:m.role==="user"?"16px 16px 4px 16px":"16px 16px 16px 4px",background:m.role==="user"?`linear-gradient(135deg,${C.accent},${C.blue})`:C.soft,color:m.role==="user"?"#fff":C.text,fontSize:14,lineHeight:1.6,wordBreak:"break-word"}}>
                {m.role==="ai" ? renderMarkdown(m.text, C) : m.text}
              </div>
              {m.role==="user"&&<div style={{width:34,height:34,borderRadius:"50%",background:`linear-gradient(135deg,${C.glow},${C.accent})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:800,color:"#fff",flexShrink:0}}>{user?.name?.[0]||"U"}</div>}
            </div>
          ))}
          {aiLoading&&<div style={{display:"flex",gap:10,alignItems:"center"}}>
            <div style={{width:34,height:34,borderRadius:"50%",background:`linear-gradient(135deg,${C.accent},${C.blue})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>🧠</div>
            <div style={{padding:"12px 18px",background:C.soft,borderRadius:"16px 16px 16px 4px"}}>
              <div style={{display:"flex",gap:4}}>{[0,1,2].map(i=><div key={i} style={{width:7,height:7,borderRadius:"50%",background:C.muted,animation:`bounce 1.2s ease infinite ${i*0.2}s`}}/>)}</div>
            </div>
          </div>}
        </div>
        <div style={{display:"flex",gap:6,overflowX:"auto",whiteSpace:"nowrap",paddingBottom:4,flexShrink:0,maxWidth:"100%"}}>
          {prompts.map((p,i)=><button key={i} onClick={()=>{setAiInput(p);}} style={{padding:"4px 10px",borderRadius:99,border:`1px solid ${C.border}`,background:C.soft,color:C.muted,cursor:"pointer",fontSize:11,fontWeight:600,transition:"all 0.2s",flexShrink:0}} onMouseEnter={e=>{e.currentTarget.style.borderColor=C.accent;e.currentTarget.style.color=C.glow;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.muted;}}>{p}</button>)}
        </div>
        <div style={{display:"flex",gap:10}}>
          <input value={aiInput} onChange={e=>setAiInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&handleSendAI()} placeholder="Ask your AI coach anything..." style={{flex:1,padding:"13px 18px",borderRadius:14,border:`1.5px solid ${C.border}`,background:C.inputBg,color:C.text,fontSize:14,outline:"none",fontFamily:"inherit"}} onFocus={e=>e.target.style.borderColor=C.accent} onBlur={e=>e.target.style.borderColor=C.border}/>
          <button onClick={handleSendAI} disabled={aiLoading||!aiInput.trim()} style={{padding:"13px 22px",borderRadius:14,border:"none",background:aiInput.trim()&&!aiLoading?`linear-gradient(135deg,${C.accent},${C.blue})`:`${C.accent}44`,color:"#fff",fontWeight:800,cursor:aiInput.trim()&&!aiLoading?"pointer":"not-allowed",fontSize:14,transition:"all 0.2s"}}>
            {aiLoading?<Spinner/>:"Send"}
          </button>
        </div>
      </div>
    );
  };

  // ── ANALYTICS ─────────────────────────────────────
  const renderAnalytics=()=>{
    if(!isPremium(user))return <PremiumGate C={C} onUpgrade={()=>setPage("pricing")}/>;
    const doneTasks=tasks.filter(t=>t.done).length;
    const doneHabits=habits.filter(h=>h.done).length;
    const avgGoalProgress=goals.length?Math.round(goals.reduce((a,g)=>a+(g.progress||0),0)/goals.length):0;
    const totalFocusMins=focusSessions.reduce((a,s)=>a+(s.duration||0),0);
    const inc=finance.filter(f=>f.type==="income").reduce((a,f)=>a+f.amount,0);
    const exp=finance.filter(f=>f.type==="expense").reduce((a,f)=>a+f.amount,0);
    const bars=[
      {label:"Task Completion",value:tasks.length?Math.round((doneTasks/tasks.length)*100):0,color:C.blue},
      {label:"Habit Rate Today",value:habits.length?Math.round((doneHabits/habits.length)*100):0,color:C.gold},
      {label:"Avg Goal Progress",value:avgGoalProgress,color:C.glow},
      {label:"Save Rate",value:inc>0?Math.round(((inc-exp)/inc)*100):0,color:C.green},
    ];
    const chartData = [30, 45, 35, 60, 55, 75, 80]; // Mock weekly data
    return(
      <div style={{display:"flex",flexDirection:"column",gap:20}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
          <div><h2 style={{fontSize:"clamp(16px,3vw,22px)",fontWeight:900,color:C.text,margin:0}}>📊 Advanced Analytics</h2>
          <p style={{color:C.muted,fontSize:13,margin:"4px 0 0"}}>Insights from across your modules</p></div>
          {isPremium(user) && <Btn onClick={()=>window.print()} variant="outline" C={C}>🖨️ Export Full PDF Report</Btn>}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))",gap:12}}>
          <StatCard icon="✅" label="Tasks Done" value={doneTasks} sub={`of ${tasks.length} total`} color={C.blue} C={C}/>
          <StatCard icon="🔥" label="Habits Today" value={doneHabits} sub={`of ${habits.length}`} color={C.gold} C={C}/>
          <StatCard icon="🎯" label="Avg Goal" value={`${avgGoalProgress}%`} color={C.glow} C={C}/>
          <StatCard icon="⏱" label="Focus Time" value={`${Math.floor(totalFocusMins/60)}h ${totalFocusMins%60}m`} color={C.cyan} C={C}/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:16}}>
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:20}}>
            <div style={{fontSize:14,fontWeight:800,color:C.text,marginBottom:16}}>📈 Productivity Trend (Last 7 Days)</div>
            <div style={{height:180,width:"100%",marginTop:10}}>
              <svg viewBox="0 0 400 150" style={{width:"100%",height:"100%"}}>
                <path d={`M 0 150 ${chartData.map((v,i)=>`L ${(400/6)*i} ${150-((v/100)*130)}`).join(' ')} L 400 150 Z`} fill={`${C.accent}22`}/>
                <path d={`M 0 ${150-((chartData[0]/100)*130)} ${chartData.slice(1).map((v,i)=>`L ${(400/6)*(i+1)} ${150-((v/100)*130)}`).join(' ')}`} fill="none" stroke={C.accent} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"/>
                {chartData.map((v,i)=>(
                  <circle key={i} cx={(400/6)*i} cy={150-((v/100)*130)} r={4} fill={C.card} stroke={C.accent} strokeWidth={2}/>
                ))}
              </svg>
            </div>
          </div>
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:20}}>
            <div style={{fontSize:14,fontWeight:800,color:C.text,marginBottom:16}}>📊 Module Performance</div>
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              {bars.map((b,i)=>(
                <div key={i}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                    <span style={{fontSize:13,color:C.muted}}>{b.label}</span>
                    <span style={{fontSize:13,fontWeight:800,color:b.color}}>{b.value}%</span>
                  </div>
                  <ProgressBar value={b.value} C={C} color={b.color}/>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:20}}>
          <div style={{fontSize:14,fontWeight:800,color:C.text,marginBottom:16}}>💰 Finance & Skills Summary</div>
          <div style={{display:"flex",flexDirection:"column",gap:10,maxWidth:600}}>
            {[{label:"Total Income",value:formatMoney(inc,currency),color:C.green},{label:"Total Expenses",value:formatMoney(exp,currency),color:C.red},{label:"Net Savings",value:formatMoney(inc-exp,currency),color:inc>=exp?C.green:C.red},{label:"Skill Hours",value:`${skills.reduce((a,s)=>a+(s.hours||0),0)}h`,color:C.glow},{label:"Focus Sessions",value:focusSessions.length,color:C.cyan}].map((r,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${C.border}`}}>
                <span style={{fontSize:13,color:C.muted}}>{r.label}</span>
                <span style={{fontSize:14,fontWeight:800,color:r.color}}>{r.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // ── ACHIEVEMENTS ──────────────────────────────────
  const renderAchievements=()=>{
    if(!isPremium(user)) return <PremiumGate C={C} onUpgrade={()=>setPage("pricing")}/>;
    const total=focusSessions.reduce((a,s)=>a+(s.duration||0),0)/60;
    const badges=[
      {icon:"💧",title:"First Habit",desc:"Create your first habit",unlocked:habits.length>0},
      {icon:"💪",title:"7-Day Streak",desc:"Maintain a 7-day habit streak",unlocked:habits.some(h=>h.streak>=7)},
      {icon:"🏆",title:"30-Day Champion",desc:"30-day habit streak",unlocked:habits.some(h=>h.streak>=30)},
      {icon:"✅",title:"Task Master",desc:"Complete 10 tasks",unlocked:tasks.filter(t=>t.done).length>=10},
      {icon:"🎯",title:"Goal Setter",desc:"Create 3+ goals",unlocked:goals.length>=3},
      {icon:"🚀",title:"Goal Achiever",desc:"Complete a goal (100%)",unlocked:goals.some(g=>g.progress>=100||g.status==="completed")},
      {icon:"📈",title:"Skill Builder",desc:"Add 2+ skills",unlocked:skills.length>=2||(roadmaps.flatMap(r=>r.skills||[]).length>=2)},
      {icon:"💰",title:"Finance Tracker",desc:"Add 5+ finance entries",unlocked:finance.length>=5},
      {icon:"⏱",title:"Focus Master",desc:"Complete 10 focus sessions",unlocked:focusSessions.length>=10},
      {icon:"🗺️",title:"Roadmap Builder",desc:"Create a skill roadmap",unlocked:roadmaps.length>0},
      {icon:"🧠",title:"AI User",desc:"Chat with AI coach",unlocked:aiMessages.filter(m=>m.role==="user").length>0},
      {icon:"⭐",title:"Power User",desc:"Use all 8 features",unlocked:[tasks,habits,goals,roadmaps,finance,focusSessions].every(a=>a.length>0)&&aiMessages.filter(m=>m.role==="user").length>0},
    ];
    const unlocked=badges.filter(b=>b.unlocked).length;
    return(
      <div style={{display:"flex",flexDirection:"column",gap:20}}>
        <div>
          <h2 style={{fontSize:"clamp(16px,3vw,22px)",fontWeight:900,color:C.text,margin:"0 0 6px"}}>🏆 Achievements</h2>
          <p style={{color:C.muted,fontSize:13,margin:"0 0 12px"}}>{unlocked}/12 unlocked</p>
          <ProgressBar value={Math.round((unlocked/12)*100)} C={C} color={C.gold} height={8}/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:12}}>
          {badges.map((b,i)=>(
            <div key={i} style={{background:b.unlocked?`${C.gold}11`:C.card,border:`2px solid ${b.unlocked?C.gold:C.border}`,borderRadius:16,padding:20,textAlign:"center",transition:"all 0.2s",opacity:b.unlocked?1:0.6}}>
              <div style={{fontSize:b.unlocked?36:28,marginBottom:8,filter:b.unlocked?"none":"grayscale(1)"}}>{b.icon}</div>
              <div style={{fontWeight:800,color:b.unlocked?C.gold:C.muted,fontSize:13}}>{b.title}</div>
              <div style={{fontSize:11,color:C.muted,marginTop:4,lineHeight:1.3}}>{b.desc}</div>
              <div style={{fontSize:11,fontWeight:700,color:b.unlocked?C.green:C.muted,marginTop:8}}>{b.unlocked?"✓ Unlocked!":"🔒 Locked"}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };



  // ── ADMIN PANEL ───────────────────────────────────
  const renderAdmin=()=>{
    if(user?.role!=="admin")return null;
    return(
      <div style={{display:"flex",flexDirection:"column",gap:20}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
          <div><h2 style={{fontSize:"clamp(16px,3vw,22px)",fontWeight:900,color:C.text,margin:0}}>👑 Admin Panel</h2>
            <p style={{color:C.muted,fontSize:13,margin:"4px 0 0"}}>Manage users and platform</p></div>
            <Btn onClick={()=>window.print()} variant="outline" C={C}>🖨️ Platform Export (PDF)</Btn>
        </div>
        {adminStats&&(
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:12}}>
            <StatCard icon="👥" label="Total Users" value={adminStats.totalUsers||0} C={C}/>
            <StatCard icon="⚡" label="Pro Users" value={adminStats.proUsers||0} color={C.glow} C={C}/>
            <StatCard icon="✅" label="Total Tasks" value={adminStats.totalTasks||0} color={C.blue} C={C}/>
            <StatCard icon="🔥" label="Total Habits" value={adminStats.totalHabits||0} color={C.gold} C={C}/>
            <StatCard icon="🎯" label="Total Goals" value={adminStats.totalGoals||0} color={C.green} C={C}/>
          </div>
        )}
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,overflow:"hidden"}}>
          <div style={{padding:"14px 18px",borderBottom:`1px solid ${C.border}`,fontSize:14,fontWeight:800,color:C.text}}>Users</div>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",minWidth:980}}>
              <thead>
                <tr style={{background:C.soft}}>
                  {["Name","Email","Mobile","Age","Plan","Sessions","Status","Actions"].map(h=>(
                    <th key={h} style={{padding:"10px 16px",textAlign:"left",fontSize:11,fontWeight:800,color:C.muted,textTransform:"uppercase",letterSpacing:0.8,whiteSpace:"nowrap"}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {adminUsers.map(u=>(
                  <tr key={u.id} style={{borderTop:`1px solid ${C.border}`}} onMouseEnter={e=>e.currentTarget.style.background=C.soft} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <td style={{padding:"12px 16px",fontSize:13,fontWeight:700,color:C.text,whiteSpace:"nowrap"}}>{u.avatar&&u.avatar.length<=4?u.avatar:"👤"} {u.name}</td>
                    <td style={{padding:"12px 16px",fontSize:12,color:C.muted,minWidth:250}}>{u.email}</td>
                    <td style={{padding:"12px 16px",fontSize:12,color:C.muted,whiteSpace:"nowrap"}}>{u.phone||"—"}</td>
                    <td style={{padding:"12px 16px",fontSize:12,color:C.muted,whiteSpace:"nowrap"}}>{u.age||"—"}</td>
                    <td style={{padding:"12px 16px"}}>
                      <select value={u.plan} onChange={async e=>{
                        const res=await api(`/admin/users/${u.id}`,"PATCH",{plan:e.target.value},token);
                        if(res.id)setAdminUsers(p=>p.map(x=>x.id===u.id?res:x));
                        addToast("Plan updated!","success");
                      }} style={{padding:"4px 8px",borderRadius:7,border:`1px solid ${C.border}`,background:C.inputBg,color:C.text,fontSize:12,cursor:"pointer"}}>
                        <option value="free">Free</option>
                        <option value="pro">Pro</option>
                      </select>
                    </td>
                    <td style={{padding:"12px 16px",fontSize:12,color:C.muted,whiteSpace:"nowrap",textAlign:"center"}}>{u._count?.focusSessions||0}</td>
                    <td style={{padding:"12px 16px"}}>
                      {(()=>{
                        const last=u.lastLogin?new Date(u.lastLogin):null;
                        const online=last&&!isNaN(last.getTime())&&(Date.now()-last.getTime()<10*60*1000);
                        const txt=!u.isActive?"Disabled":online?"Online":"Offline";
                        const col=!u.isActive?C.red:online?C.green:C.muted;
                        return <Badge text={txt} color={col}/>;
                      })()}
                    </td>
                    <td style={{padding:"12px 16px"}}>
                      <div style={{display:"flex",gap:6}}>
                        <button onClick={async()=>{
                          const res=await api(`/admin/users/${u.id}`,"GET",null,token);
                          if(res.id)setSelectedAdminUser(res);
                        }} style={{padding:"4px 10px",borderRadius:6,border:`1px solid ${C.accent}`,background:`${C.accent}22`,color:C.accent,cursor:"pointer",fontSize:11}}>Inspect</button>
                        {u.role!=="admin" && (
                          <button onClick={async()=>{
                            if(!window.confirm(`Are you sure you want to ${u.isActive?"disable":"enable"} the account for ${u.name}? Please confirm with OK.`))return;
                            const res=await api(`/admin/users/${u.id}`,"PATCH",{isActive:!u.isActive},token);
                            if(res.id)setAdminUsers(p=>p.map(x=>x.id===u.id?res:x));
                          }} style={{padding:"4px 10px",borderRadius:6,border:`1px solid ${C.border}`,background:C.soft,color:C.muted,cursor:"pointer",fontSize:11}}>{u.isActive?"Disable":"Enable"}</button>
                        )}
                        {/* Account remove option removed for safety */}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {selectedAdminUser&&(
          <Modal title={`User Detail: ${selectedAdminUser.name}`} onClose={()=>setSelectedAdminUser(null)} C={C} wide>
            <div style={{display:"flex",flexDirection:"column",gap:20,maxHeight:"80vh",overflowY:"auto",paddingRight:10}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingBottom:16,borderBottom:`1px solid ${C.border}`}}>
                <div style={{display:"flex",gap:16,alignItems:"center"}}>
                  <div style={{width:64,height:64,borderRadius:"50%",background:`linear-gradient(135deg,${C.accent},${C.blue})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:32}}>👤</div>
                  <div>
                    <div style={{fontSize:18,fontWeight:900,color:C.text}}>{selectedAdminUser.name}</div>
                    <div style={{fontSize:13,color:C.muted}}>{selectedAdminUser.email}</div>
                    <div style={{marginTop:8,display:"flex",gap:6}}>
                      <Badge text={selectedAdminUser.role} color={selectedAdminUser.role==="admin"?C.gold:C.muted}/>
                      <Badge text={selectedAdminUser.plan} color={C.glow}/>
                    </div>
                  </div>
                </div>
                <Btn onClick={()=>window.print()} variant="outline" size="sm" C={C}>🖨️ Print User Report</Btn>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <StatCard label="Tasks" value={selectedAdminUser.tasks?.length||0} color={C.blue} C={C}/>
                <StatCard label="Habits" value={selectedAdminUser.habits?.length||0} color={C.gold} C={C}/>
                <StatCard label="Goals" value={selectedAdminUser.goals?.length||0} color={C.green} C={C}/>
                <StatCard label="Net Fin" value={selectedAdminUser.finance?.reduce((a,f)=>a+(f.type==="income"?f.amount:-f.amount),0)||0} color={C.cyan} C={C}/>
              </div>
              <div>
                <div style={{fontSize:14,fontWeight:800,color:C.text,marginBottom:10}}>Recent Tasks</div>
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {selectedAdminUser.tasks?.slice(0,5).map(t=>(
                    <div key={t.id} style={{padding:"8px 12px",background:C.soft,borderRadius:8,fontSize:12,display:"flex",justifyContent:"space-between"}}>
                      <span style={{color:C.text}}>{t.done?"✅":"⏳"} {t.title}</span>
                      <span style={{color:C.muted}}>{t.project}</span>
                    </div>
                  ))}
                  {(!selectedAdminUser.tasks||selectedAdminUser.tasks.length===0)&&<div style={{fontSize:12,color:C.muted}}>No tasks</div>}
                </div>
              </div>
            </div>
          </Modal>
        )}
      </div>
    );
  };

  // ── MAIN RENDER ───────────────────────────────────
  return (
    <div style={{display:"flex",height:"100vh",overflow:"hidden",background:C.bg,fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif"}}>
      <style>{`
        *{box-sizing:border-box;scrollbar-width:thin;scrollbar-color:${C.border} transparent;}
        *::-webkit-scrollbar{width:5px;height:5px;}
        *::-webkit-scrollbar-track{background:transparent;}
        *::-webkit-scrollbar-thumb{background:${C.border};border-radius:99px;}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes slideIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}
        @keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-6px)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        .nav-item:hover{background:${C.hover}!important;}
        .nav-item.active{background:${C.accent}22!important;border-left:3px solid ${C.accent}!important;}
        @media(max-width:768px){
          .sidebar{display:none!important;}
          .sidebar.open{display:flex!important;position:fixed;z-index:1000!important;width:270px!important;height:100vh;top:0;left:0;box-shadow:4px 0 32px #0009;}
          .mobile-overlay{display:block!important;z-index:999!important;}
          .topbar-right .hide-sm{display:none!important;}
          .content-area{padding:14px!important;}
          .topbar { padding: 8px 12px!important; }
          .dash-stats-grid { grid-template-columns: repeat(2, 1fr)!important; }
          .dash-grid-primary { grid-template-columns: 1fr!important; }
          .dash-grid-secondary { grid-template-columns: 1fr!important; }
          .health-summary-flex { flex-direction: column!important; align-items: stretch!important; gap: 10px!important; }
          .stat-card { padding: 12px!important; }
          .stat-card-value { fontSize: 20px!important; }
        }
        @media(max-width:480px){
          .sidebar.open{width:100vw!important;}
          .hide-xs { display: none!important; }
          .topbar-right { gap: 4px!important; }
          .dash-stats-grid { grid-template-columns: 1fr!important; }
          .auth-top { padding: 10px 12px!important; }
          .auth-top-right { gap: 4px!important; }
          .auth-top-right span { font-size: 10px!important; white-space: nowrap!important; }
          .auth-top-right button { font-size: 11px!important; padding: 4px 8px!important; white-space: nowrap!important; }
        }
      `}</style>

      {/* Mobile Overlay */}
      {sidebarOpen&&<div className="mobile-overlay" onClick={()=>setSidebarOpen(false)} style={{display:"none",position:"fixed",inset:0,background:"#0008",zIndex:199}}/>}

      {/* Sidebar */}
      <div className={`sidebar${sidebarOpen?" open":""}`} style={{width:sidebarShrink?80:220,background:C.sidebar,borderRight:`1px solid ${C.border}`,display:"flex",flexDirection:"column",height:"100vh",overflow:"hidden",flexShrink:0,transition:"width 0.2s"}}>
        {/* Logo */}
        <div style={{padding:`20px ${sidebarShrink?24:16}px 14px`,borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:sidebarShrink?"center":"flex-start",gap:10,flexShrink:0}}>
          <LogoWrapper size={sidebarShrink?28:32}/>
          {!sidebarShrink&&<span style={{fontSize:14,fontWeight:900,background:"linear-gradient(135deg,#8b5cf6,#ec4899)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Upscale Tracker</span>}
        </div>
        {/* User */}
        <button onClick={()=>{setPage("profile");setSidebarOpen(false);}} style={{margin:"10px 10px 0",padding:sidebarShrink?"10px":"10px 12px",borderRadius:12,border:`1px solid ${C.border}`,background:C.soft,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:sidebarShrink?"center":"flex-start",gap:10,textAlign:"left"}}>
          <div style={{width:36,height:36,borderRadius:"50%",background:`linear-gradient(135deg,${C.accent},${C.blue})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:user?.avatar?.length<=4?18:0,overflow:"hidden",flexShrink:0}}>
            {user?.avatar?.startsWith("http")||user?.avatar?.startsWith("data:")?<img src={user.avatar} style={{width:"100%",height:"100%",objectFit:"cover"}} alt="avatar"/>:user?.avatar||"👤"}
          </div>
          {!sidebarShrink&&<div style={{minWidth:0}}>
            <div style={{fontSize:13,fontWeight:700,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:110}}>{user?.name}</div>
            <div style={{fontSize:10,color:C.muted}}>{user?.role==="admin"?"👑 Admin":"👤 "+( user?.plan==="pro"?"Pro":user?.plan==="enterprise"?"Enterprise":"Free")}</div>
          </div>}
        </button>
        {/* Nav */}
        <nav style={{flex:1,overflowY:"auto",padding:"10px 8px"}}>
          {navItems.map(item=>(
            <button key={item.page} className={`nav-item${page===item.page?" active":""}`}
              title={sidebarShrink?item.label:undefined}
              onClick={()=>{setPage(item.page);setSidebarOpen(false);}}
              style={{width:"100%",padding:sidebarShrink?"12px":"10px 12px",borderRadius:10,border:`1px solid transparent`,background:page===item.page?`${C.accent}22`:"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:sidebarShrink?"center":"flex-start",gap:10,marginBottom:2,borderLeft:page===item.page?`3px solid ${C.accent}`:"3px solid transparent",transition:"all 0.15s",textAlign:"left"}}>
              <span style={{fontSize:sidebarShrink?20:16}}>{item.icon}</span>
              {!sidebarShrink&&<span style={{fontSize:13,fontWeight:page===item.page?700:500,color:page===item.page?C.glow:C.text,flex:1}}>{item.label}</span>}
              {!sidebarShrink&&item.premium&&!isPremium(user)&&<span style={{fontSize:9,background:`${C.gold}22`,color:C.gold,borderRadius:5,padding:"2px 5px",fontWeight:700}}>PRO</span>}
            </button>
          ))}
        </nav>
        {/* Bottom actions */}
        <div style={{padding:"10px",borderTop:`1px solid ${C.border}`,flexShrink:0,display:"flex",flexDirection:"column",gap:6}}>
          {user?.role==="admin"&&(
            <button onClick={()=>{setPage("admin");setSidebarOpen(false);}}
              title={sidebarShrink?"Admin Panel":undefined}
              style={{width:"100%",padding:sidebarShrink?"12px":"9px 12px",borderRadius:10,border:`1px solid ${C.gold}44`,background:page==="admin"?`${C.gold}22`:`${C.gold}11`,color:C.gold,cursor:"pointer",fontWeight:700,fontSize:12,display:"flex",alignItems:"center",justifyContent:sidebarShrink?"center":"flex-start",gap:8}}>
              👑 {!sidebarShrink&&"Admin Panel"}
            </button>
          )}
          {!isPremium(user)&&(
            <button onClick={()=>{setPage("pricing"); setSidebarOpen(false);}} title={sidebarShrink?"Upgrade to Pro":undefined} style={{width:"100%",padding:sidebarShrink?"10px 4px":"9px 12px",borderRadius:10,border:`1px solid ${C.glow}44`,background:`linear-gradient(135deg,${C.accent}22,${C.blue}22)`,color:C.glow,cursor:"pointer",fontWeight:800,fontSize:12,display:"flex",alignItems:"center",justifyContent:sidebarShrink?"center":"flex-start",gap:8}}>
              <span style={{fontSize:sidebarShrink?24:18,lineHeight:1}}>⚡</span> {!sidebarShrink&&"Upgrade to Pro"}
            </button>
          )}
          <button onClick={async()=>{
            if(usingDemo){
              setUsingDemo(false);
              loadAllData(token);
              addToast("Live data reloaded!","success");
            } else {
              setUsingDemo(true);
              setTasks(DEMO.tasks);
              setHabits(DEMO.habits);
              setGoals(DEMO.goals);
              setRoadmaps(DEMO.roadmaps);
              setFinance(DEMO.finance);
              addToast("Loaded demo data! (Changes won't save)","info");
            }
          }} title={sidebarShrink?"Demo Mode":undefined} style={{width:"100%",padding:sidebarShrink?"6px 2px":"8px 12px",borderRadius:10,border:`1px solid ${usingDemo?C.glow:C.border}`,background:usingDemo?`${C.glow}22`:"transparent",color:usingDemo?C.glow:C.muted,cursor:"pointer",fontWeight:700,fontSize:sidebarShrink?10:12,display:"flex",alignItems:"center",justifyContent:sidebarShrink?"center":"flex-start",gap:sidebarShrink?2:8,whiteSpace:"nowrap"}}>
            <span style={{fontSize:sidebarShrink?11:14,flexShrink:0}}>{usingDemo?"📝":"🧪"}</span>
            <span style={{fontSize:sidebarShrink?8:12,whiteSpace:"nowrap",letterSpacing:sidebarShrink?-0.3:0}}>{usingDemo?(sidebarShrink?"Live":"Live Mode"):(sidebarShrink?"Try Demo":"Try Demo")}</span>
          </button>
          <button onClick={handleLogout} title={sidebarShrink?"Sign Out":undefined} style={{width:"100%",padding:sidebarShrink?"12px":"8px 12px",borderRadius:10,border:"none",background:"transparent",color:C.muted,cursor:"pointer",fontWeight:600,fontSize:12,textAlign:"left",display:"flex",alignItems:"center",justifyContent:sidebarShrink?"center":"flex-start",gap:8}}>🚪 {!sidebarShrink&&"Sign Out"}</button>
        </div>
      </div>

      {/* Main */}
      <div className="main-content" style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column",minWidth:0}}>
        {/* Topbar */}
        <div className="topbar" style={{padding:"10px 20px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",background:C.card,flexShrink:0,gap:10}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <button onClick={()=>{window.innerWidth<=768?setSidebarOpen(o=>!o):setSidebarShrink(s=>!s)}} style={{width:36,height:36,borderRadius:10,border:`1px solid ${C.border}`,background:C.soft,color:C.text,cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>☰</button>
            <TopbarClock C={C}/>
          </div>
          <div className="topbar-right" style={{display:"flex",alignItems:"center",gap:8}}>
            <button onClick={()=>{const nT=theme==="dark"?"light":"dark";setTheme(nT);if(user?.id)api("/auth/profile","PATCH",{theme:nT},token);}} style={{width:34,height:34,borderRadius:9,border:`1.5px solid ${theme==="dark"?C.glow:C.border}`,background:C.soft,color:theme==="dark"?C.glow:C.text,cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:theme==="dark"?`0 0 15px ${C.glow}44`:"none"}}>
              {theme==="dark"?"☀️":"🌙"}
            </button>
            <button onClick={()=>{setPage("profile");setSidebarOpen(false);}} style={{width:34,height:34,borderRadius:"50%",border:`2px solid ${C.accent}`,background:`linear-gradient(135deg,${C.accent},${C.blue})`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,overflow:"hidden"}}>
              {user?.avatar?.startsWith("http")||user?.avatar?.startsWith("data:")?<img src={user.avatar} style={{width:"100%",height:"100%",objectFit:"cover"}} alt="avatar"/>:<span style={{color:"#fff",fontWeight:800,fontSize:12}}>{user?.name?.[0]?.toUpperCase()||"U"}</span>}
            </button>
          </div>
        </div>
        {/* Content */}
        <div className="content-area" style={{flex:1,overflowY:"auto",padding:"20px"}}>
          {page==="home"?<HomePage user={user} onNavigate={(p)=>{setPage(p);setSidebarOpen(false);}} C={C} stats={homeStats}/>:renderContent()}
        </div>
      </div>

      {calendarModal&&(
        <Modal title={`Notes for ${selectedCalendarDate}`} onClose={()=>setCalendarModal(false)} C={C}>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <Field label="Title / Holiday Name" C={C}><Input C={C} value={calendarForm.title} onChange={e=>setCalendarForm({...calendarForm,title:e.target.value})} placeholder="e.g. Birthday, Public Holiday"/></Field>
            <Field label="Description" C={C}><Textarea C={C} value={calendarForm.content||""} onChange={e=>setCalendarForm({...calendarForm,content:e.target.value})} placeholder="Additional details..."/></Field>
            <label style={{display:"flex",alignItems:"center",gap:8,fontSize:13,color:C.muted,cursor:"pointer",marginTop:4}}>
              <input type="checkbox" checked={calendarForm.isHoliday} onChange={e=>setCalendarForm({...calendarForm,isHoliday:e.target.checked})}/> Mark as Holiday
            </label>
            <div style={{display:"flex",gap:10,marginTop:10}}>
              {calendarForm.id&&<Btn variant="danger" onClick={()=>deleteCalendarNote(calendarForm.id)} C={C}>Delete</Btn>}
              <Btn onClick={()=>addCalendarNote({...calendarForm,date:selectedCalendarDate})} C={C} style={{flex:1}}>Save Note ✓</Btn>
            </div>
          </div>
        </Modal>
      )}

      {showUpgradeModal&&(
        <Modal title="🚀 Limit Reached!" onClose={()=>setShowUpgradeModal(false)} C={C}>
          <div style={{textAlign:"center",padding:"10px 0"}}>
            <div style={{fontSize:64,marginBottom:20}}>💎</div>
            <h3 style={{fontSize:22,fontWeight:900,color:C.text,margin:"0 0 12px"}}>Upgrade to Unlimited</h3>
            <p style={{color:C.muted,fontSize:15,lineHeight:1.6,margin:"0 0 24px"}}>You've reached the free limit. Keep your momentum going and unlock the full power of Upscale Tracker with Pro.</p>
            <Btn onClick={()=>{setShowUpgradeModal(false);setPage("pricing");}} C={C} style={{width:"100%",padding:16,fontSize:16}}>⚡ Upgrade Now</Btn>
            <button onClick={()=>setShowUpgradeModal(false)} style={{marginTop:12,background:"transparent",border:"none",color:C.muted,cursor:"pointer",fontSize:13,fontWeight:600}}>Maybe later</button>
          </div>
        </Modal>
      )}

      <Toast toasts={toasts}/>
    </div>
  );
}

