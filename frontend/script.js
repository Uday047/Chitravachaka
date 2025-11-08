class ChitravachakaApp {
  constructor() {
    this.deferredPrompt = null;
    this.currentStream = null;
    this.backendUrl = 'https://chitravachaka-production.up.railway.app';
    this.currentAudio = null;
    this.currentAudioButton = null;
    this.currentAudioLang = null;
    this.audioPlayers = {};

    // ✅ Bind methods used as callbacks
    this.handleFileUpload = this.handleFileUpload.bind(this);

    this.init();
  }

  async init() {
    console.log('Initializing Chitravachaka App...');
    this.registerServiceWorker();
    this.setupEventListeners();
    this.checkBackendConnection();
    this.handleSystemBack();
    this.handleAppVisibility();

    setTimeout(() =>
      this.speak("ಚಿತ್ರವಚಕ ಅಪ್ಲಿಕೇಶನ್‌ಗೆ ಸ್ವಾಗತ. ಚಿತ್ರವನ್ನು ಸೆರೆಹಿಡಿಯಲು ಕ್ಯಾಮೆರಾ ಬಟನ್ ಒತ್ತಿರಿ."),
      1000
    );
  }

  async checkBackendConnection() {
    try {
      const res = await fetch(`${this.backendUrl}/`, { mode: 'cors' }); // ✅ force CORS
      console.log(res.ok ? "✅ Backend reachable" : "⚠️ Backend not reachable");
    } catch (e) {
      console.warn("⚠️ Cannot connect to backend. Is FastAPI running?");
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
    if (fileInput) fileInput.addEventListener('change', this.handleFileUpload);

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
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = lang;
      utter.rate = 0.9;
      speechSynthesis.cancel();
      speechSynthesis.speak(utter);
    }
  }

  async openCamera() {
    this.showScreen('camera-screen');
    try {
      this.currentStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
      });
      const cameraView = document.getElementById('camera-view');
      cameraView.srcObject = this.currentStream;
      document.getElementById('camera-placeholder').classList.add('hidden');
      this.speak("ಕ್ಯಾಮೆರಾ ತೆರೆಯಲಾಗಿದೆ. ಚಿತ್ರ ಸೆರೆಹಿಡಿಯಲು ಬಟನ್ ಒತ್ತಿರಿ.");
    } catch (err) {
      console.error('Camera error:', err);
      this.showError('ಕ್ಯಾಮೆರಾ ಪ್ರವೇಶ ಲಭ್ಯವಿಲ್ಲ.');
    }
  }

  captureImage() {
    const video = document.getElementById('camera-view');
    if (!video.srcObject) return this.showError('ಕ್ಯಾಮೆರಾ ಸಿದ್ಧವಿಲ್ಲ.');

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    this.animateCapture();
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

  uploadImage() {
    document.getElementById('file-input').click();
    this.speak("ಗ್ಯಾಲರಿಯಿಂದ ಚಿತ್ರವನ್ನು ಆಯ್ಕೆಮಾಡಿ.");
  }

  handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return this.showError('ದಯವಿಟ್ಟು ಚಿತ್ರ ಫೈಲ್ ಆಯ್ಕೆಮಾಡಿ.');
    if (file.size > 8 * 1024 * 1024) return this.showError('ಚಿತ್ರದ ಗಾತ್ರ 8MB ಗಿಂತ ಹೆಚ್ಚು.');
    this.processImage(file, file.name);
  }

  async processImage(file, filename) {
    this.showScreen('processing-screen');
    this.speak("ಚಿತ್ರ ಪ್ರಕ್ರಿಯೆ ನಡೆಯುತ್ತಿದೆ, ದಯವಿಟ್ಟು ಕಾಯಿರಿ.");
    const formData = new FormData();
    formData.append('file', file, filename);

    try {
      const res = await fetch(`${this.backendUrl}/process/`, {
        method: 'POST',
        body: formData,
        mode: 'cors'
      });
      if (!res.ok) throw new Error('Backend error');
      const data = await res.json();
      this.showResult(data);
    } catch (err) {
      console.error('Processing failed:', err);
      this.showError('ಚಿತ್ರ ಪ್ರಕ್ರಿಯೆ ವಿಫಲವಾಗಿದೆ. ದಯವಿಟ್ಟು ಸಂಪರ್ಕವನ್ನು ಪರಿಶೀಲಿಸಿ.');
    }
  }

  // ----------------------- Keep all other methods unchanged -----------------------
  // showResult, addCopyListeners, addAudioListeners, toggleAudio, showError,
  // showScreen, stopCamera, goBack, handleRescan, handleSystemBack, handleAppVisibility, installApp
}

// ✅ Kannada Voice Recognition setup (unchanged)
if ('webkitSpeechRecognition' in window) {
  const recognition = new webkitSpeechRecognition();
  recognition.lang = 'kn-IN';
  recognition.continuous = true;
  recognition.interimResults = false;
  window.kannadaRecognition = recognition;
  window.voiceRecognitionActive = false;

  recognition.onresult = (event) => {
    const transcript = event.results[event.results.length - 1][0].transcript.trim();
    console.log('🎤 Heard:', transcript);
    window.chitravachakaApp?.speak(`ನೀವು ಹೇಳಿದರು ${transcript}`);

    if (transcript.includes('ಹಿಂದೆ') || transcript.includes('ಬ್ಯಾಕ್')) {
      window.chitravachakaApp?.goBack();
    } else if (transcript.includes('ಸ್ಕ್ಯಾನ್') || transcript.includes('ಹೊಸದು')) {
      window.chitravachakaApp?.handleRescan();
    } else if (transcript.includes('ಕ್ಯಾಮೆರಾ')) {
      window.chitravachakaApp?.openCamera();
    } else if (transcript.includes('ಚಿತ್ರ') || transcript.includes('ಅಪ್ಲೋಡ್')) {
      window.chitravachakaApp?.uploadImage();
    }
  };

  recognition.onerror = (e) => console.warn('🎙️ Mic error:', e.error);
  recognition.onend = () => {
    if (!window.voiceRecognitionActive) return;
    setTimeout(() => recognition.start(), 1500);
  };

  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      try {
        recognition.start();
        window.voiceRecognitionActive = true;
        console.log('🎙️ Kannada mic ON');
      } catch (e) {
        console.log('🎤 Mic permission required:', e);
      }
    }, 2000);
  });
}

document.addEventListener('DOMContentLoaded', () => window.chitravachakaApp = new ChitravachakaApp());
