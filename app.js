const startButton = document.getElementById('startButton');
const recordStep1 = document.getElementById('recordStep1');
const recordStep2 = document.getElementById('recordStep2');
const status1 = document.getElementById('status1');
const status2 = document.getElementById('status2');
const step2Card = document.getElementById('step2Card');
const resultSection = document.getElementById('resultSection');
const confirmButton = document.getElementById('confirmButton');
const endScreen = document.getElementById('endScreen');
const quitButton = document.getElementById('quitButton');

const companyField = document.getElementById('companyField');
const personField = document.getElementById('personField');
const progressField = document.getElementById('progressField');
const challengesField = document.getElementById('challengesField');
const nextStepsField = document.getElementById('nextStepsField');
const nextStepCategory = document.getElementById('nextStepCategory');

const SUPPORTS_SPEECH = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognizer;
let activeStep = null;
let transcripts = { step1: '', step2: '' };
let currentTranscript = '';
let isRecording = false;

const stepPrompts = {
  step1: 'Step 1: Which customer did you speak with? What progress was made? What challenges remain?',
  step2: 'Step 2: What are the next steps?'
};

function speak(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1;
  utterance.pitch = 1;
  utterance.lang = 'en-US';
  window.speechSynthesis.speak(utterance);
}

function setStepEnabled(stepId) {
  if (stepId === 'step2') {
    step2Card.classList.remove('disabled');
    recordStep2.disabled = false;
    recordStep2.classList.remove('disabled');
    status2.textContent = 'Ready for step 2';
  }
}

function updateRecordingButton(button, active) {
  button.textContent = active ? 'Stop recording' : `Record ${button.dataset.stepLabel}`;
  button.classList.toggle('recording', active);
}

function setStatus(step, message) {
  if (step === 'step1') status1.textContent = message;
  if (step === 'step2') status2.textContent = message;
}

function safeText(text) {
  return (text || '').trim();
}

function startRecognition(step) {
  if (!SUPPORTS_SPEECH) {
    alert('Speech recognition is not supported in this browser. Please use Chrome on Android if possible.');
    return;
  }

  recognizer = new SpeechRecognition();
  recognizer.interimResults = true;
  recognizer.maxAlternatives = 1;
  recognizer.lang = 'en-US';

  currentTranscript = '';
  isRecording = true;
  activeStep = step;

  const button = step === 'step1' ? recordStep1 : recordStep2;
  updateRecordingButton(button, true);
  setStatus(step, 'Listening... speak now.');

  recognizer.onresult = (event) => {
    const lastResult = event.results[event.results.length - 1];
    const transcript = lastResult[0].transcript;
    currentTranscript = transcript;
    setStatus(step, 'Listening... ' + transcript);
  };

  recognizer.onerror = (event) => {
    console.error('Speech recognition error', event.error);
    setStatus(step, 'Speech recognition error: ' + event.error);
    stopRecognition();
  };

  recognizer.onend = () => {
    if (isRecording) {
      stopRecognition();
    }
  };

  recognizer.start();
}

function stopRecognition() {
  if (!recognizer) return;
  isRecording = false;
  recognizer.stop();
  const step = activeStep;
  const button = step === 'step1' ? recordStep1 : recordStep2;
  updateRecordingButton(button, false);

  const transcript = safeText(currentTranscript);
  if (step === 'step1') {
    transcripts.step1 = (transcripts.step1 + ' ' + transcript).trim();
    setStatus(step, transcripts.step1 ? 'Recorded step 1. Ready for step 2.' : 'Step 1 was empty. Try again.');
    if (transcripts.step1) {
      setStepEnabled('step2');
      speak('Great. Now step two asks: what are the next steps? Record when ready.');
    }
  } else {
    transcripts.step2 = transcript;
    setStatus(step, transcripts.step2 ? 'Recorded step 2. Summarizing the conversation.' : 'Step 2 was empty. Try again.');
    if (transcripts.step2) {
      speak('Thanks. I am summarizing the key points now.');
      summarizeTranscripts();
    }
  }
  activeStep = null;
}

function handleTranscriptCompletion(step, content) {
  if (step === 'step1') {
    transcripts.step1 = content;
    setStepEnabled('step2');
    setStatus(step, 'Step 1 complete. Step 2 unlocked.');
    speak('Great. Step 1 is done. Step 2 is now available.');
  } else {
    transcripts.step2 = content;
    setStatus(step, 'Step 2 complete. Summarizing now.');
    summarizeTranscripts();
  }
}

async function summarizeTranscripts() {
  resultSection.classList.add('hidden');

  try {
    const response = await fetch('/.netlify/functions/summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ step1Transcript: transcripts.step1, step2Transcript: transcripts.step2 })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Unknown server error');
    }

    const summary = await response.json();
    companyField.value = summary.company || '';
    personField.value = summary.person || '';
    progressField.value = (summary.progress || []).join('\n');
    challengesField.value = (summary.challenges || []).join('\n');
    nextStepsField.value = (summary.nextSteps || []).join('\n');
    nextStepCategory.value = summary.nextStepCategory || 'action';
    resultSection.classList.remove('hidden');
    speak('I have extracted the summary. Please review and edit if needed.');
  } catch (error) {
    console.error(error);
    alert('Unable to summarize voice data. Please check the server and API configuration.');
  }
}

startButton.addEventListener('click', () => {
  speak('I am a note taker. I will ask a few questions about your contact with a customer. You simply talk to me. I will summarize and structure your answers and put them in the CRM. Simply press the start button to get started.');
  setStatus('step1', 'Step 1 is ready. Press record when you are ready.');
  recordStep1.disabled = false;
  recordStep1.classList.remove('disabled');
});

recordStep1.dataset.stepLabel = 'Step 1';
recordStep2.dataset.stepLabel = 'Step 2';

recordStep1.addEventListener('click', () => {
  if (isRecording && activeStep === 'step1') {
    stopRecognition();
    return;
  }
  if (isRecording) return;
  activeStep = 'step1';
  startRecognition('step1');
});

recordStep2.addEventListener('click', () => {
  if (recordStep2.disabled) return;
  if (isRecording && activeStep === 'step2') {
    stopRecognition();
    return;
  }
  if (isRecording) return;
  activeStep = 'step2';
  startRecognition('step2');
});

confirmButton.addEventListener('click', () => {
  speak('Got it. If I was connected to your CRM I would update the account fields. But I’m not connected, so instead I will head over to the pub. Hope you enjoyed the demo. Ciao.');
  resultSection.classList.add('hidden');
  endScreen.classList.remove('hidden');
});

quitButton.addEventListener('click', () => {
  window.location.reload();
});

if (!SUPPORTS_SPEECH) {
  status1.textContent = 'Speech recognition is unavailable in this browser. Please use a supported mobile browser.';
  status2.textContent = 'Speech recognition is unavailable in this browser. Please use a supported mobile browser.';
  startButton.disabled = true;
}
