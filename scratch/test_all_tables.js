const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://sypudmdnehdsrdetogvr.supabase.co';
const supabaseAnonKey = 'sb_publishable_L4O_deHer2fBygBUFxVJSQ_2XFo5XtR';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runTest() {
  console.log('--- TESTING DATABASE SCHEMAS & POLICIES ---');
  
  // Get test user
  const { data: users, error: uErr } = await supabase.from('User').select('*');
  if (uErr) {
    console.error('❌ User table select failed:', uErr.message);
    return;
  }
  if (!users || users.length === 0) {
    console.error('❌ No user found. Please register a user first.');
    return;
  }
  const user = users[0];
  console.log(`Using user: ${user.email} (id: ${user.id})`);

  // 1. SkillRoadmap test
  console.log('Testing SkillRoadmap insert...');
  const { data: newRoadmap, error: rmErr } = await supabase
    .from('SkillRoadmap')
    .insert({
      title: 'Auto Test Roadmap',
      description: 'Auto Test Description',
      icon: '🗺️',
      color: '#7c3aed',
      userId: user.id
    })
    .select()
    .single();

  if (rmErr) {
    console.error('❌ SkillRoadmap Insert Failed:', rmErr.message);
  } else {
    console.log('✅ SkillRoadmap Insert Succeeded:', newRoadmap);
    
    // 2. Skill test
    console.log('Testing Skill insert...');
    const { data: newSkill, error: skErr } = await supabase
      .from('Skill')
      .insert({
        name: 'Auto Test Skill',
        level: 'Intermediate',
        hours: 15,
        max: 200,
        goalHours: 200,
        roadmapId: newRoadmap.id,
        userId: user.id
      })
      .select()
      .single();

    if (skErr) {
      console.error('❌ Skill Insert Failed:', skErr.message);
    } else {
      console.log('✅ Skill Insert Succeeded:', newSkill);
      
      // Cleanup Skill
      const { error: skDelErr } = await supabase.from('Skill').delete().eq('id', newSkill.id);
      console.log(skDelErr ? '❌ Skill Delete Failed' : '✅ Skill Delete Cleaned up');
    }

    // Cleanup Roadmap
    const { error: rmDelErr } = await supabase.from('SkillRoadmap').delete().eq('id', newRoadmap.id);
    console.log(rmDelErr ? '❌ SkillRoadmap Delete Failed' : '✅ SkillRoadmap Delete Cleaned up');
  }

  // 3. Check Select Roadmaps with join
  console.log('Testing Select Roadmaps join query...');
  const { data: roadmapsList, error: rmSelectErr } = await supabase
    .from('SkillRoadmap')
    .select('*, skills:Skill(*), notes:Note(*)')
    .eq('userId', user.id);
  
  if (rmSelectErr) {
    console.error('❌ Select Join Query Failed:', rmSelectErr.message);
  } else {
    console.log('✅ Select Join Query Succeeded:', roadmapsList.length, 'rows');
  }
}

runTest();
