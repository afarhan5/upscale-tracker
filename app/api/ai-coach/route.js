import { createClient } from '@supabase/supabase-js';

export async function POST(req) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      {
        global: { headers: { Authorization: `Bearer ${token}` } }
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { message, history, context } = await req.json();
    if (!message) {
      return Response.json({ error: 'Message required' }, { status: 400 });
    }

    const openAiKey = process.env.OPENAI_API_KEY;
    const claudeKey = process.env.CLAUDE_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

    let systemPrompt = "You are an expert AI Life Coach. Keep your answers brief, encouraging, and actionable. Use emojis casually.";
    if (context) {
      const stats = `Current User Stats: Tasks: ${context.tasks?.length || 0}, Habits: ${context.habits?.length || 0}, Goals: ${context.goals?.length || 0}, Roadmaps: ${context.roadmaps?.length || 0}. Finance Balance: ${context.finance?.reduce((a, f) => a + (f.type === 'income' ? f.amount : -f.amount), 0) || 0}.`;
      systemPrompt += " " + stats + " Refer to these stats if relevant to the user's career or productivity.";
    }

    const msgs = (history || []).map(m => ({
      role: m.role === 'ai' ? 'assistant' : 'user',
      content: m.text
    })).filter(m => m.content);
    msgs.push({ role: 'user', content: message });

    // Try Gemini
    if (geminiKey) {
      try {
        console.log('--- AI COACH (Gemini Try) ---');
        const formattedMsgs = msgs.map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }]
        }));
        if (formattedMsgs.length > 0 && formattedMsgs[0].role === 'user') {
          formattedMsgs[0].parts[0].text = `[System Message: ${systemPrompt}] \n\n User Message: ${formattedMsgs[0].parts[0].text}`;
        }
        
        const modelsToTry = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
        for (const modelName of modelsToTry) {
          try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiKey}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ contents: formattedMsgs })
            });
            if (response.ok) {
              const data = await response.json();
              const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) {
                console.log(`✅ AI COACH (Gemini Success - ${modelName})`);
                return Response.json({ reply: text });
              }
            }
          } catch (e) {
            console.error(`❌ Gemini ${modelName} Error:`, e.message);
          }
        }
      } catch (e) { console.error('❌ Gemini Exception:', e.message); }
    }

    // Try OpenAI
    if (openAiKey) {
      try {
        console.log('--- AI COACH (OpenAI Try) ---');
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${openAiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'system', content: systemPrompt }, ...msgs], max_tokens: 500 })
        });
        if (response.ok) {
          const data = await response.json();
          console.log('✅ AI COACH (OpenAI Success)');
          return Response.json({ reply: data.choices[0].message.content });
        }
        console.error('❌ OpenAI Error:', await response.text());
      } catch (e) { console.error('❌ OpenAI Exception:', e.message); }
    }

    // Try Claude
    if (claudeKey) {
      try {
        console.log('--- AI COACH (Claude Try) ---');
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'x-api-key': claudeKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
          body: JSON.stringify({ model: 'claude-3-haiku-20240307', max_tokens: 500, system: systemPrompt, messages: msgs })
        });
        if (response.ok) {
          const data = await response.json();
          console.log('✅ AI COACH (Claude Success)');
          return Response.json({ reply: data.content[0].text });
        }
        console.error('❌ Claude Error:', await response.text());
      } catch (e) { console.error('❌ Claude Exception:', e.message); }
    }

    console.warn('⚠️ No AI API available or successful');
    return Response.json({ reply: "I'm currently resting. Please check your API keys or try again later! 🧠💤" });
  } catch (e) {
    console.error('🔥 AI Coach Route Error:', e);
    return Response.json({ error: 'AI Coach Error: ' + e.message }, { status: 500 });
  }
}
