const axios = require('axios');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
  if (!CLAUDE_API_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'CLAUDE_API_KEY is not configured.' })
    };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (err) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid JSON in request body' })
    };
  }

  const { step1Transcript, step2Transcript } = body;
  const prompt = `You are a smart assistant that extracts essential CRM notes from two voice transcripts.\n\nTranscript 1:\n${step1Transcript}\n\nTranscript 2:\n${step2Transcript}\n\nReturn only valid JSON with these fields:\n- company: name of the customer company or empty string if not mentioned\n- person: contact name or empty string if not mentioned\n- progress: array of bullet points, each under 15 words\n- challenges: array of bullet points, each under 15 words\n- nextSteps: array of bullet points, each under 15 words\n- nextStepCategory: one of call, email, action\n\nIf the transcript does not include company or person, set that value to an empty string. Do not add any explanatory text.`;

  try {
    console.log('Calling Claude API with key length:', CLAUDE_API_KEY.length);
    const response = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 800,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    }, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      timeout: 30000
    });

    console.log('Claude API response status:', response.status);
    const content = response.data.completion?.content?.[0]?.text
      || response.data.content?.[0]?.text
      || response.data.completion?.response
      || response.data.completion?.output
      || '';
    let parsed;

    try {
      parsed = JSON.parse(content.trim());
    } catch (parseError) {
      console.error('Claude parse failed:', parseError.message, 'raw output:', content);
      return {
        statusCode: 502,
        body: JSON.stringify({ error: 'Unable to parse Claude output as JSON.', output: content })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(parsed)
    };
  } catch (error) {
    console.error('Claude request failed:', error.message, 'status:', error.response?.status, 'data:', error.response?.data);
    return {
      statusCode: 502,
      body: JSON.stringify({ error: 'Could not reach Claude API.', details: error.message, apiStatus: error.response?.status })
    };
  }
};
