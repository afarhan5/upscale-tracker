const url = 'https://sypudmdnehdsrdetogvr.supabase.co/rest/v1/';
const key = 'sb_publishable_L4O_deHer2fBygBUFxVJSQ_2XFo5XtR';

async function main() {
  try {
    const res = await fetch(url, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`
      }
    });
    console.log('Status:', res.status, res.statusText);
    const text = await res.text();
    console.log('Response body preview (first 1000 chars):');
    console.log(text.slice(0, 1000));
  } catch (err) {
    console.error(err);
  }
}

main();
