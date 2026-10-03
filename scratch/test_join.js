const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://sypudmdnehdsrdetogvr.supabase.co';
const supabaseAnonKey = 'sb_publishable_L4O_deHer2fBygBUFxVJSQ_2XFo5XtR';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testJoin() {
  const { data: users } = await supabase.from('User').select('*');
  if (!users || users.length === 0) {
    console.error('No users found.');
    return;
  }
  const user = users[0];

  // Insert SkillRoadmap
  const { data: rm, error: rmErr } = await supabase
    .from('SkillRoadmap')
    .insert({
      title: 'Join Test Roadmap',
      userId: user.id
    })
    .select()
    .single();

  if (rmErr) {
    console.error('SkillRoadmap insert failed:', rmErr);
    return;
  }
  console.log('SkillRoadmap inserted:', rm);

  // Insert Note
  const { data: note, error: noteErr } = await supabase
    .from('Note')
    .insert({
      title: 'Test Note for Roadmap',
      content: 'This is some content',
      roadmapId: rm.id,
      userId: user.id
    })
    .select()
    .single();

  if (noteErr) {
    console.error('Note insert failed:', noteErr);
    // Cleanup roadmap
    await supabase.from('SkillRoadmap').delete().eq('id', rm.id);
    return;
  }
  console.log('Note inserted:', note);

  // Query with join
  const { data: joinedData, error: joinErr } = await supabase
    .from('SkillRoadmap')
    .select('*, skills:Skill(*), notes:Note(*)')
    .eq('id', rm.id);

  if (joinErr) {
    console.error('Join query failed:', joinErr);
  } else {
    console.log('Join query succeeded! Data:', JSON.stringify(joinedData, null, 2));
  }

  // Cleanup
  await supabase.from('Note').delete().eq('id', note.id);
  await supabase.from('SkillRoadmap').delete().eq('id', rm.id);
}

testJoin();
