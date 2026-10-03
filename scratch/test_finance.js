const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://sypudmdnehdsrdetogvr.supabase.co';
const supabaseAnonKey = 'sb_publishable_L4O_deHer2fBygBUFxVJSQ_2XFo5XtR';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testFinance() {
  const { data: users } = await supabase.from('User').select('*');
  if (!users || users.length === 0) {
    console.error('No users found.');
    return;
  }
  const user = users[0];

  console.log('Testing insert into Finance table with currency field...');
  const { data, error } = await supabase
    .from('Finance')
    .insert({
      label: 'Test transaction',
      amount: 100,
      type: 'income',
      category: 'Other',
      currency: 'INR',
      userId: user.id
    })
    .select()
    .single();

  if (error) {
    console.error('❌ Insert failed:', error.message);
  } else {
    console.log('✅ Insert succeeded:', data);
    // cleanup
    await supabase.from('Finance').delete().eq('id', data.id);
  }
}

testFinance();
