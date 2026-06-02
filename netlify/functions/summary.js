const axios = require('axios');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
  console.log('Environment check - CLAUDE_API_KEY present:', !!CLAUDE_API_KEY, 'length:', CLAUDE_API_KEY?.length);
  console.log('All env vars:', Object.keys(process.env).filter(k => k.includes('CLAUDE') || k.includes('API')));
  
  if (!CLAUDE_API_KEY || CLAUDE_API_KEY.trim() === '') {
    console.error('CLAUDE_API_KEY is missing or empty');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'CLAUDE_API_KEY is not configured in Netlify environment variables.' })
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
    const trimmedKey = CLAUDE_API_KEY.trim();
    console.log('API Key validation - starts with sk-:', trimmedKey.startsWith('sk-'), 'key length:', trimmedKey.length);
    
    const requestPayload = {
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 800,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    };
    
    console.log('Request payload prepared, calling Claude API endpoint');
    const response = await axios.post('https://api.anthropic.com/v1/messages', requestPayload, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': trimmedKey,
        'anthropic-version': '2023-06-01'
      },
      timeout: 30000
    });

    console.log('Claude API response received, status:', response.status);
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
    const errorDetails = {
      message: error.message,
      code: error.code,
      apiStatus: error.response?.status,
      apiStatusText: error.response?.statusText,
      apiErrorData: error.response?.data,
      isNetworkError: error.message.includes('network') || error.message.includes('getaddrinfo'),
      isTimeoutError: error.code === 'ECONNABORTED'
    };
    console.error('Claude API request failed:', JSON.stringify(errorDetails, null, 2));
    return {
      statusCode: error.response?.status || 502,
      body: JSON.stringify({ 
        error: 'Could not reach Claude API.', 
        details: error.message,
        apiStatus: error.response?.status,
        apiError: error.response?.data?.error
      })
    };
  }
};
