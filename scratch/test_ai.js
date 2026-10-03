const geminiKey = process.env.GEMINI_API_KEY || 'your-gemini-key';
const openaiKey = process.env.OPENAI_API_KEY || 'your-openai-key';
const claudeKey = process.env.CLAUDE_API_KEY || 'your-claude-key';

async function testGemini() {
  console.log('Testing Gemini...');
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${geminiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'Hello' }] }] })
    });
    console.log('Gemini Status:', response.status);
    console.log('Gemini Response:', await response.text());
  } catch (e) {
    console.error('Gemini error:', e);
  }
}

async function testOpenAI() {
  console.log('Testing OpenAI...');
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: 'Hello' }], max_tokens: 10 })
    });
    console.log('OpenAI Status:', response.status);
    console.log('OpenAI Response:', await response.text());
  } catch (e) {
    console.error('OpenAI error:', e);
  }
}

async function testClaude() {
  console.log('Testing Claude...');
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': claudeKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: 'claude-3-haiku-20240307', max_tokens: 10, messages: [{ role: 'user', content: 'Hello' }] })
    });
    console.log('Claude Status:', response.status);
    console.log('Claude Response:', await response.text());
  } catch (e) {
    console.error('Claude error:', e);
  }
}

async function main() {
  await testGemini();
  await testOpenAI();
  await testClaude();
}

main();
