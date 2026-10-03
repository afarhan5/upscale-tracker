-- Run these SQL statements in your Supabase SQL Editor to update your tables

-- 1. Add notes column to SkillRoadmap table
ALTER TABLE public."SkillRoadmap" 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- 2. Add currency column to Finance table
ALTER TABLE public."Finance" 
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'INR' NOT NULL;

-- 3. Add OTP columns to User table
ALTER TABLE public."User" 
ADD COLUMN IF NOT EXISTS "otpCode" TEXT,
ADD COLUMN IF NOT EXISTS "otpExpiry" TIMESTAMP WITH TIME ZONE;

-- 4. Add recoveryEmail column and change theme default to light
ALTER TABLE public."User" 
ADD COLUMN IF NOT EXISTS "recoveryEmail" TEXT,
ALTER COLUMN theme SET DEFAULT 'light';
