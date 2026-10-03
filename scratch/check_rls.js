const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://sypudmdnehdsrdetogvr.supabase.co';
const supabaseAnonKey = 'sb_publishable_L4O_deHer2fBygBUFxVJSQ_2XFo5XtR';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkRLS() {
  console.log('Checking Row Level Security status on tables...');
  
  // Since we cannot run arbitrary SQL via the client SDK easily without an RPC,
  // we will test inserting a Task without a valid user or direct select.
  // Actually, we can run a select on Task to see if it succeeds.
  
  const tables = [
    'User', 'Task', 'Habit', 'Goal', 'SkillRoadmap', 
    'Skill', 'Note', 'Finance', 'FocusSession', 'Payment', 'CalendarNote'
  ];

  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      console.log(`❌ Table ${table}: Error ->`, error.message);
    } else {
      console.log(`✅ Table ${table}: Access OK (Returned ${data.length} rows)`);
    }
  }
}

checkRLS();
