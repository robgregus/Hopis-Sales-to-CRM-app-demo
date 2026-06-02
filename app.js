const nextButton = document.getElementById('nextButton');
const recordStep1 = document.getElementById('recordStep1');
const recordStep2 = document.getElementById('recordStep2');
const status1 = document.getElementById('status1');
const status2 = document.getElementById('status2');
const step2Card = document.getElementById('step2Card');
const resultSection = document.getElementById('resultSection');
const confirmButton = document.getElementById('confirmButton');
const endScreen = document.getElementById('endScreen');
const quitButton = document.getElementById('quitButton');
const introCard = document.querySelector('.intro-card');
const stepsGrid = document.querySelector('.steps-grid');

const introText = 'I am a note taker. I will ask a few questions about your contact with a customer. You simply talk to me. I will summarize and structure your answers and put them in the CRM. Then you can review and edit them. Tap the NEXT button to begin.';

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
let selectedVoice = null;
let slideTracker = { active: false, startX: 0, step: null, button: null, pointerId: null };

const stepPrompts = {
  step1: 'Step 1: Which customer did you speak with? What progress was made? What challenges remain?',
  step2: 'Step 2: What are the next steps?'
};

function chooseVoice(voices) {
  const englishVoices = voices.filter((voice) => /en(-|_)?/i.test(voice.lang));
  const femaleVoices = englishVoices.filter((voice) => /female|zira|samantha|alloy|serena|aria|karen|anna|rachel|nora/i.test(voice.name));
  return femaleVoices[0] || englishVoices[0] || voices[0];
}

function initVoices() {
  const voices = window.speechSynthesis.getVoices();
  if (voices.length) {
    selectedVoice = chooseVoice(voices);
  }
}

window.speechSynthesis.onvoiceschanged = initVoices;
initVoices();

function speak(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1;
  utterance.pitch = 1;
  utterance.lang = 'en-US';
  if (selectedVoice) {
    utterance.voice = selectedVoice;
  }
  window.speechSynthesis.speak(utterance);
}

function setStepEnabled(stepId) {
  if (stepId === 'step2') {
    console.log('Enabling step 2');
    step2Card.classList.remove('disabled');
    recordStep2.disabled = false;
    recordStep2.classList.remove('disabled');
    status2.textContent = 'Ready for step 2';
    console.log('Step 2 enabled, recordStep2.disabled:', recordStep2.disabled);
  }
}

function updateRecordButtonLabel(button, label) {
  button.textContent = label;
}

function updateRecordingButton(button, active) {
  button.classList.toggle('recording', active);
  if (active) {
    updateRecordButtonLabel(button, 'Stop recording');
  } else {
    updateRecordButtonLabel(button, 'Tap to record');
  }
}

function activateStep1() {
  console.log('activateStep1 called');
  introCard.classList.add('hidden');
  stepsGrid.classList.remove('hidden');
  recordStep1.disabled = false;
  recordStep1.classList.remove('disabled');
  console.log('recordStep1 enabled, disabled attribute:', recordStep1.disabled);
  updateRecordingButton(recordStep1, false);
  setStatus('step1', 'Step 1 is ready. Tap the button to start recording.');
}

function setStatus(step, message) {
  if (step === 'step1') status1.textContent = message;
  if (step === 'step2') status2.textContent = message;
}

function safeText(text) {
  return (text || '').trim();
}

function startRecognition(step) {
  console.log('startRecognition called for step:', step, 'SUPPORTS_SPEECH:', SUPPORTS_SPEECH);
  if (!SUPPORTS_SPEECH) {
    alert('Speech recognition is not supported in this browser. Please use Chrome on Android if possible.');
    return;
  }

  recognizer = new SpeechRecognition();
  recognizer.interimResults = true;
  recognizer.continuous = true;
  recognizer.maxAlternatives = 1;
  recognizer.lang = 'en-US';

  currentTranscript = '';
  isRecording = true;
  activeStep = step;

  const button = step === 'step1' ? recordStep1 : recordStep2;
  updateRecordingButton(button, true);
  setStatus(step, 'Listening... speak now.');

  recognizer.onresult = (event) => {
    console.log('onresult - event results count:', event.results.length);
    let interimTranscript = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      const transcript = result[0].transcript;
      if (result.isFinal) {
        console.log('Final transcript:', transcript);
        currentTranscript += transcript + ' ';
      } else {
        interimTranscript += transcript;
      }
    }
    setStatus(step, 'Listening... ' + (interimTranscript || currentTranscript.trim()));
  };

  recognizer.onerror = (event) => {
    console.error('Speech recognition error', event.error);
    setStatus(step, 'Speech recognition error: ' + event.error);
    stopRecognition();
  };

  recognizer.onend = () => {
    console.log('recognizer onend - isRecording:', isRecording);
    if (isRecording) {
      console.log('User paused, restarting recognizer');
      setStatus(step, 'Listening... (paused briefly)');
      setTimeout(() => {
        if (isRecording && recognizer) {
          recognizer.start();
        }
      }, 100);
    }
  };

  console.log('Starting recognizer.start()');
  recognizer.start();
}

function stopRecognition() {
  console.log('stopRecognition called - currentTranscript:', currentTranscript);
  if (!recognizer) return;
  isRecording = false;
  recognizer.stop();
  const step = activeStep;
  const button = step === 'step1' ? recordStep1 : recordStep2;
  updateRecordingButton(button, false);

  const transcript = safeText(currentTranscript);
  if (step === 'step1') {
    transcripts.step1 = (transcripts.step1 + ' ' + transcript).trim();
    const msg = transcripts.step1 ? 'Recorded step 1. Ready for step 2.' : 'Step 1 was empty. Try again.';
    setStatus(step, msg);
    console.log('Step 1 transcript:', transcripts.step1);
    if (transcripts.step1) {
      console.log('Setting step 2 enabled before speaking');
      setStepEnabled('step2');
      console.log('Speaking step 2 prompt');
      speak('Great. Now step two asks: what are the next steps? Record when ready.');
    }
  } else {
    transcripts.step2 = transcript;
    const msg = transcripts.step2 ? 'Recorded step 2. Summarizing the conversation.' : 'Step 2 was empty. Try again.';
    setStatus(step, msg);
    console.log('Step 2 transcript:', transcripts.step2);
    if (transcripts.step2) {
      console.log('Calling summarizeTranscripts');
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
    alert('Unable to summarize voice data. ' + (error.message || 'Please check the server and API configuration.'));
  }
}

nextButton.addEventListener('click', () => {
  activateStep1();
  nextButton.disabled = true;
  nextButton.classList.add('disabled');
  setTimeout(() => speak('Which customer did you speak with? What progress was made? What challenges remain?'), 300);
});

setStatus('step1', 'Tap NEXT to begin.');

recordStep1.dataset.stepLabel = 'Step 1';
recordStep2.dataset.stepLabel = 'Step 2';
recordStep1.disabled = true;
recordStep1.classList.add('disabled');
recordStep2.disabled = true;
recordStep2.classList.add('disabled');

recordStep1.addEventListener('click', () => {
  console.log('recordStep1 click - disabled:', recordStep1.disabled, 'isRecording:', isRecording);
  if (recordStep1.disabled) return;
  if (isRecording && activeStep === 'step1') {
    console.log('Stopping step1 recording');
    stopRecognition();
    return;
  }
  if (isRecording) return;
  console.log('Starting step1 recording');
  activeStep = 'step1';
  startRecognition('step1');
});

recordStep2.addEventListener('click', () => {
  console.log('recordStep2 click - disabled:', recordStep2.disabled, 'isRecording:', isRecording);
  if (recordStep2.disabled) return;
  if (isRecording && activeStep === 'step2') {
    console.log('Stopping step2 recording');
    stopRecognition();
    return;
  }
  if (isRecording) return;
  console.log('Starting step2 recording');
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
  nextButton.disabled = true;
}
