class ChitravachakaApp {
  constructor() {
    this.deferredPrompt = null;
    this.currentStream = null;
    this.backendUrl = 'https://chitravachaka-production.up.railway.app';
    this.currentAudio = null;
    this.currentAudioButton = null;
    this.currentAudioLang = null;
    this.audioPlayers = {};
    this.waitingForCommand = false; // ✅ NEW: track mic waiting state
    this.init();
  }

  async init() {
    console.log('Initializing Chitravachaka App...');
    this.registerServiceWorker();
    this.setupEventListeners();
    this.checkBackendConnection();
    this.handleSystemBack();
    this.handleAppVisibility();

    // ✅ Step 1: Welcome Voice (Mic OFF)
    setTimeout(() => {
      this.speak("ಚಿತ್ರವಚಕ ಅಪ್ಲಿಕೇಶನ್‌ಗೆ ಸ್ವಾಗತ. ಚಿತ್ರವನ್ನು ಸೆರೆಹಿಡಿಯಲು ಕ್ಯಾಮೆರಾ ಅಥವಾ ಅಪ್ಲೋಡ್ ಆಯ್ಕೆಮಾಡಿ.");
      // ✅ Step 2: Mic ON after welcome voice
      setTimeout(() => this.startListeningForCommand('home'), 5000);
    }, 1000);
  }

  async checkBackendConnection() {
    try {
      const res = await fetch(`${this.backendUrl}/`);
      console.log(res.ok ? "✅ Backend reachable" : "⚠️ Backend not reachable");
    } catch (e) {
      console.warn("⚠️ Cannot connect to backend.");
      this.speak("ಸರ್ವರ್ ಸಂಪರ್ಕದಲ್ಲಿ ದೋಷ. ದಯವಿಟ್ಟು ಪರಿಶೀಲಿಸಿ.");
    }
  }

  registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => console.log('Service worker registered:', reg.scope))
        .catch(err => console.log('SW registration failed:', err));
    }
  }

  setupEventListeners() {
    const bind = (id, fn) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('click', fn);
    };

    bind('open-camera', () => this.openCamera());
    bind('upload-image', () => this.uploadImage());
    bind('back-from-camera', () => this.goBack());
    bind('capture-btn', () => this.captureImage());
    bind('back-to-home', () => this.handleRescan());
    bind('error-back', () => this.handleRescan());
    bind('install-btn', () => this.installApp());

    const fileInput = document.getElementById('file-input');
    if (fileInput) fileInput.addEventListener('change', e => this.handleFileUpload(e));

    window.addEventListener('beforeinstallprompt', e => {
      e.preventDefault();
      this.deferredPrompt = e;
      document.getElementById('install-btn')?.classList.remove('hidden');
    });
  }

  stopAudio() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
    Object.values(this.audioPlayers).forEach(aud => {
      aud.pause();
      aud.currentTime = 0;
    });
  }

  speak(text, lang = 'kn-IN') {
    if ('speechSynthesis' in window) {
      this.stopMic();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = lang;
      utter.rate = 0.9;
      speechSynthesis.cancel();
      speechSynthesis.speak(utter);
      utter.onend = () => {
        if (this.waitingForCommand) this.startMic();
      };
    }
  }

  // ✅ Mic Control
  stopMic() {
    if (window.voiceRecognitionActive && window.kannadaRecognition) {
      window.kannadaRecognition.stop();
      window.voiceRecognitionActive = false;
      console.log("🎙️ Mic OFF");
    }
  }

  startMic() {
    if (!window.voiceRecognitionActive && window.kannadaRecognition) {
      try {
        window.kannadaRecognition.start();
        window.voiceRecognitionActive = true;
        console.log("🎙️ Mic ON");
      } catch (e) {
        console.log("Mic start failed:", e);
      }
    }
  }

  startListeningForCommand(context = 'home') {
    this.waitingForCommand = true;
    this.startMic();
    console.log(`🎧 Waiting for voice command in context: ${context}`);
    window.voiceCommandContext = context;
  }

  async openCamera() {
    this.stopMic();
    this.showScreen('camera-screen');
    try {
      this.currentStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      document.getElementById('camera-view').srcObject = this.currentStream;
      document.getElementById('camera-placeholder').classList.add('hidden');
      // ✅ Step 3
      this.speak("ಕ್ಯಾಮೆರಾ ತೆರೆಯಲಾಗಿದೆ. 'ಫೋಟೋ ತೆಗೆ' ಎಂದು ಹೇಳಿ.");
      setTimeout(() => this.startListeningForCommand('camera'), 4000);
    } catch (err) {
      console.error('Camera error:', err);
      this.showError('ಕ್ಯಾಮೆರಾ ಪ್ರವೇಶ ಲಭ್ಯವಿಲ್ಲ.');
    }
  }

  captureImage() {
    this.stopMic();
    const video = document.getElementById('camera-view');
    if (!video.srcObject) return this.showError('ಕ್ಯಾಮೆರಾ ಸಿದ್ಧವಿಲ್ಲ.');

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    this.animateCapture();
    this.speak("ಚಿತ್ರವನ್ನು ಪ್ರಕ್ರಿಯೆಗೊಳಿಸಲಾಗುತ್ತಿದೆ, ದಯವಿಟ್ಟು ಕ್ಷಣಕೆ ಕಾಯಿರಿ.");
    canvas.toBlob(blob => this.processImage(blob, 'capture.jpg'), 'image/jpeg', 0.9);
  }

  animateCapture() {
    const flash = document.createElement('div');
    Object.assign(flash.style, {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      background: 'white',
      opacity: 0,
      zIndex: 9999
    });
    document.body.appendChild(flash);
    flash.animate([{ opacity: 0 }, { opacity: 1 }, { opacity: 0 }], { duration: 250 });
    setTimeout(() => flash.remove(), 300);
  }

  async processImage(file, filename) {
    this.showScreen('processing-screen');
    const formData = new FormData();
    formData.append('file', file, filename);
    try {
      const res = await fetch(`${this.backendUrl}/process/`, { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Backend error');
      const data = await res.json();

      // ✅ Step 8 — check empty Kannada text
      if (!data.text_kn || data.text_kn.trim() === '') {
        this.speak("ಯಾವುದೇ ಪಠ್ಯ ಕಂಡುಬಂದಿಲ್ಲ.");
        this.handleRescan();
        return;
      }

      this.showResult(data);
    } catch (err) {
      console.error('Processing failed:', err);
      this.showError('ಚಿತ್ರ ಪ್ರಕ್ರಿಯೆ ವಿಫಲವಾಗಿದೆ.');
    }
  }

  addAudioListeners(data) {
    const audios = {};
    const stopMic = () => this.stopMic();
    const startMic = () => this.startListeningForCommand('result');

    const createAudio = (btnId, url, label) => {
      const btn = document.getElementById(btnId);
      if (!btn || !url) return;
      const audio = new Audio(`${this.backendUrl}${url}`);
      audios[label] = audio;

      btn.addEventListener('click', () => this.toggleAudio(audio, btn));
      audio.addEventListener('play', stopMic);
      audio.addEventListener('ended', () => {
        btn.textContent =
          label === 'kn' ? '🔊 ಓದು (ಕನ್ನಡ)' :
          label === 'en' ? '▶️ Play English' : '▶️ Play Hindi';
        startMic();
      });
    };

    createAudio('btn-kn', data.audio_kn, 'kn');
    createAudio('btn-en', data.audio_en, 'en');
    createAudio('btn-hi', data.audio_hi, 'hi');

    this.audioPlayers = audios;

    // ✅ Kannada auto-play → mic OFF, then restart after playback
    if (audios.kn) {
      audios.kn.addEventListener('play', stopMic);
      audios.kn.addEventListener('ended', startMic);
      audios.kn.play().catch(e => console.log('Kannada autoplay blocked:', e));
    }
  }
}

// ✅ Kannada Voice Recognition setup
if ('webkitSpeechRecognition' in window) {
  const recognition = new webkitSpeechRecognition();
  recognition.lang = 'kn-IN';
  recognition.continuous = true;
  recognition.interimResults = false;
  window.kannadaRecognition = recognition;
  window.voiceRecognitionActive = false;

  recognition.onresult = (event) => {
    const text = event.results[event.results.length - 1][0].transcript.trim();
    console.log('🎤 Heard:', text);

    const ctx = window.voiceCommandContext || 'home';
    const app = window.chitravachakaApp;
    if (!app) return;

    if (ctx === 'home') {
      if (text.includes('ಕ್ಯಾಮೆರಾ')) app.openCamera();
      else if (text.includes('ಅಪ್ಲೋಡ್')) app.uploadImage();
    } else if (ctx === 'camera') {
      if (text.includes('ಫೋಟೋ') || text.includes('ಕ್ಲಿಕ್')) app.captureImage();
    } else if (ctx === 'result') {
      if (text.includes('ಹಿಂದೆ') || text.includes('ಹೋಮ್')) {
        app.goBack();
        app.speak("ಹೋಮ್ ಪುಟ ತೆರೆಯಲಾಗಿದೆ.");
        setTimeout(() => app.startListeningForCommand('home'), 4000);
      } else if (text.includes('ರೀಸ್ಕ್ಯಾನ್') || text.includes('ಸ್ಕ್ಯಾನ್')) {
        app.handleRescan();
        setTimeout(() => app.startListeningForCommand('home'), 4000);
      }
    }
  };

  recognition.onend = () => {
    if (window.voiceRecognitionActive) setTimeout(() => recognition.start(), 1200);
  };

  recognition.onerror = (e) => console.warn('Mic error:', e.error);

  document.addEventListener('DOMContentLoaded', () => {
    window.chitravachakaApp = new ChitravachakaApp();
  });
}
