const express = require('express');
const path = require('path');
const { config } = require('dotenv');

config();

const app = express();
const port = process.env.PORT || 3000;
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
const CLAUDE_MODEL = process.env.CLAUDE_MODEL || 'claude-3.5';
const CLAUDE_API_URL = process.env.CLAUDE_API_URL || 'https://api.anthropic.com/v1/complete';

app.use(express.static(path.join(__dirname)));
app.use(express.json());

app.post('/api/summary', async (req, res) => {
  if (!CLAUDE_API_KEY) {
    return res.status(500).json({ error: 'CLAUDE_API_KEY is not configured on the server.' });
  }

  const { step1Transcript, step2Transcript } = req.body;
  const prompt = `You are a smart assistant that extracts essential CRM notes from two voice transcripts.\n\nTranscript 1:\n${step1Transcript}\n\nTranscript 2:\n${step2Transcript}\n\nReturn only valid JSON with these fields:\n- company: name of the customer company or empty string if not mentioned\n- person: contact name or empty string if not mentioned\n- progress: array of bullet points, each under 15 words\n- challenges: array of bullet points, each under 15 words\n- nextSteps: array of bullet points, each under 15 words\n- nextStepCategory: one of call, email, action\n\nIf the transcript does not include company or person, set that value to an empty string. Do not add any explanatory text.\n`;

  try {
    const response = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CLAUDE_API_KEY}`
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        prompt,
        max_tokens: 800,
        temperature: 0.2,
        top_p: 1
      })
    });

    const data = await response.json();
    const completion = data.completion || data?.output || '';
    let parsed;

    try {
      parsed = JSON.parse(completion.trim());
    } catch (parseError) {
      return res.status(502).json({ error: 'Unable to parse Claude output as JSON.', output: completion });
    }

    res.json(parsed);
  } catch (error) {
    console.error('Claude request failed:', error);
    res.status(500).json({ error: 'Could not reach Claude API.', details: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
