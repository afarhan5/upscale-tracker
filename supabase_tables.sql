-- Create User table
CREATE TABLE IF NOT EXISTS public."User" (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'user' NOT NULL,
  plan TEXT DEFAULT 'free' NOT NULL,
  avatar TEXT,
  phone TEXT,
  bio TEXT,
  profession TEXT,
  age INTEGER,
  theme TEXT DEFAULT 'light' NOT NULL,
  timezone TEXT DEFAULT 'Asia/Kolkata' NOT NULL,
  "emailVerified" BOOLEAN DEFAULT false NOT NULL,
  "phoneVerified" BOOLEAN DEFAULT false NOT NULL,
  "isActive" BOOLEAN DEFAULT true NOT NULL,
  "lastLogin" TIMESTAMP WITH TIME ZONE,
  "otpCode" TEXT,
  "otpExpiry" TIMESTAMP WITH TIME ZONE,
  "recoveryEmail" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create Task table
CREATE TABLE IF NOT EXISTS public."Task" (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  project TEXT DEFAULT 'Personal' NOT NULL,
  priority TEXT DEFAULT 'Medium' NOT NULL,
  status TEXT DEFAULT 'todo' NOT NULL,
  done BOOLEAN DEFAULT false NOT NULL,
  due TEXT DEFAULT 'Today' NOT NULL,
  "startDate" TEXT,
  "endDate" TEXT,
  tags TEXT,
  "startTime" TEXT,
  "reminderTime" TEXT,
  recurring TEXT,
  notes TEXT,
  "userId" TEXT REFERENCES public."User"(id) ON DELETE CASCADE NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create Habit table
CREATE TABLE IF NOT EXISTS public."Habit" (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '✨' NOT NULL,
  streak INTEGER DEFAULT 0 NOT NULL,
  "longestStreak" INTEGER DEFAULT 0 NOT NULL,
  done BOOLEAN DEFAULT false NOT NULL,
  freq TEXT DEFAULT 'Daily' NOT NULL,
  cat TEXT DEFAULT 'Personal' NOT NULL,
  color TEXT DEFAULT '#7c3aed' NOT NULL,
  "startDate" TEXT,
  "endDate" TEXT,
  "goalDays" INTEGER DEFAULT 30 NOT NULL,
  completions INTEGER DEFAULT 0 NOT NULL,
  "reminderTime" TEXT,
  notes TEXT,
  "userId" TEXT REFERENCES public."User"(id) ON DELETE CASCADE NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create Goal table
CREATE TABLE IF NOT EXISTS public."Goal" (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '🎯' NOT NULL,
  progress INTEGER DEFAULT 0 NOT NULL,
  deadline TEXT DEFAULT 'Dec 2026' NOT NULL,
  cat TEXT DEFAULT 'Personal' NOT NULL,
  status TEXT DEFAULT 'active' NOT NULL,
  "startDate" TEXT,
  "endDate" TEXT,
  milestones TEXT,
  notes TEXT,
  attachments TEXT,
  "userId" TEXT REFERENCES public."User"(id) ON DELETE CASCADE NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create SkillRoadmap table
CREATE TABLE IF NOT EXISTS public."SkillRoadmap" (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '🗺️' NOT NULL,
  color TEXT DEFAULT '#7c3aed' NOT NULL,
  notes TEXT,
  "userId" TEXT REFERENCES public."User"(id) ON DELETE CASCADE NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create Skill table
CREATE TABLE IF NOT EXISTS public."Skill" (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  level TEXT DEFAULT 'Beginner' NOT NULL,
  hours INTEGER DEFAULT 0 NOT NULL,
  max INTEGER DEFAULT 200 NOT NULL,
  color TEXT DEFAULT '#7c3aed' NOT NULL,
  "startDate" TEXT,
  "endDate" TEXT,
  "goalHours" INTEGER DEFAULT 200 NOT NULL,
  resources TEXT,
  "roadmapId" INTEGER REFERENCES public."SkillRoadmap"(id),
  notes TEXT,
  "userId" TEXT REFERENCES public."User"(id) ON DELETE CASCADE NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create Note table
CREATE TABLE IF NOT EXISTS public."Note" (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  attachments TEXT,
  "roadmapId" INTEGER REFERENCES public."SkillRoadmap"(id),
  "userId" TEXT REFERENCES public."User"(id) ON DELETE CASCADE NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create Finance table
CREATE TABLE IF NOT EXISTS public."Finance" (
  id SERIAL PRIMARY KEY,
  label TEXT NOT NULL,
  amount DOUBLE PRECISION NOT NULL,
  type TEXT NOT NULL,
  category TEXT DEFAULT 'Other' NOT NULL,
  currency TEXT DEFAULT 'INR' NOT NULL,
  date TEXT,
  note TEXT,
  recurring BOOLEAN DEFAULT false NOT NULL,
  "userId" TEXT REFERENCES public."User"(id) ON DELETE CASCADE NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create FocusSession table
CREATE TABLE IF NOT EXISTS public."FocusSession" (
  id SERIAL PRIMARY KEY,
  duration INTEGER NOT NULL,
  label TEXT DEFAULT 'Focus Session' NOT NULL,
  completed BOOLEAN DEFAULT true NOT NULL,
  "userId" TEXT REFERENCES public."User"(id) ON DELETE CASCADE NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create Payment table
CREATE TABLE IF NOT EXISTS public."Payment" (
  id SERIAL PRIMARY KEY,
  "userId" TEXT REFERENCES public."User"(id) ON DELETE CASCADE NOT NULL,
  amount DOUBLE PRECISION NOT NULL,
  currency TEXT DEFAULT 'INR' NOT NULL,
  gateway TEXT NOT NULL,
  status TEXT DEFAULT 'pending' NOT NULL,
  "orderId" TEXT,
  plan TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create CalendarNote table
CREATE TABLE IF NOT EXISTS public."CalendarNote" (
  id SERIAL PRIMARY KEY,
  date TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  "isHoliday" BOOLEAN DEFAULT false NOT NULL,
  "userId" TEXT REFERENCES public."User"(id) ON DELETE CASCADE NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
