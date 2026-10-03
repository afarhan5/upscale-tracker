const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://sypudmdnehdsrdetogvr.supabase.co';
const supabaseAnonKey = 'sb_publishable_L4O_deHer2fBygBUFxVJSQ_2XFo5XtR';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  console.log('Testing SkillRoadmap insert...');
  
  // First, check if a test user exists
  const { data: users } = await supabase.from('User').select('id').limit(1);
  if (!users || users.length === 0) {
    console.error('❌ No user found in the database. Please sign up first.');
    return;
  }
  const userId = users[0].id;
  console.log('Using test userId:', userId);

  // Insert SkillRoadmap
  const { data: roadmap, error: rError } = await supabase
    .from('SkillRoadmap')
    .insert({
      title: 'Test Roadmap',
      description: 'Test Description',
      icon: '🗺️',
      color: '#7c3aed',
      userId: userId
    })
    .select()
    .single();

  if (rError) {
    console.error('❌ SkillRoadmap Insert Error:', rError);
    return;
  }
  console.log('✅ SkillRoadmap Insert Success:', roadmap);

  // Insert Skill
  const { data: skill, error: sError } = await supabase
    .from('Skill')
    .insert({
      name: 'Test Skill',
      level: 'Beginner',
      hours: 10,
      max: 100,
      goalHours: 100,
      roadmapId: roadmap.id,
      color: '#7c3aed',
      userId: userId
    })
    .select()
    .single();

  if (sError) {
    console.error('❌ Skill Insert Error:', sError);
  } else {
    console.log('✅ Skill Insert Success:', skill);
  }
}

test();
