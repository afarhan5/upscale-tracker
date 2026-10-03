const geminiKey = process.env.GEMINI_API_KEY || 'your-gemini-key';

async function listModels() {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey}`);
    const data = await response.json();
    if (data.models) {
      console.log('Available models:');
      for (const m of data.models) {
        if (m.supportedGenerationMethods.includes('generateContent')) {
          console.log(`- ${m.name} (${m.displayName})`);
        }
      }
    } else {
      console.log('No models key:', data);
    }
  } catch (e) {
    console.error(e);
  }
}

listModels();
