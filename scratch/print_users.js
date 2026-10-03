const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://sypudmdnehdsrdetogvr.supabase.co';
const supabaseAnonKey = 'sb_publishable_L4O_deHer2fBygBUFxVJSQ_2XFo5XtR';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function printUsers() {
  console.log('--- PUBLIC USER TABLE CONTENT ---');
  const { data: users, error } = await supabase.from('User').select('*');
  if (error) {
    console.error('Error fetching users:', error);
  } else {
    console.log(users);
  }
}

printUsers();
