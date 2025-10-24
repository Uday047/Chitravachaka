class ChitravachakaApp {
    constructor() {
        this.deferredPrompt = null;
        this.currentStream = null;
        this.backendUrl = 'https://chitravachaka-production.up.railway.app';
        this.currentAudio = null;
        this.currentAudioButton = null;
        this.currentAudioLang = null;
        this.audioPlayers = {};
        this.init();
    }

    async init() {
        console.log('Initializing Chitravachaka App...');
        this.registerServiceWorker();
        this.setupEventListeners();
        this.checkBackendConnection();
        // Welcome voice prompt in Kannada
        setTimeout(() => this.speak("ಚಿತ್ರವಚಕ ಅಪ್ಲಿಕೇಶನ್‌ಗೆ ಸ್ವಾಗತ. ಚಿತ್ರವನ್ನು ಸೆರೆಹಿಡಿಯಲು ಕ್ಯಾಮೆರಾ ಬಟನ್ ಒತ್ತಿರಿ."), 1000);
    }

    async checkBackendConnection() {
        try {
            const res = await fetch(`${this.backendUrl}/`);
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
        const bind = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('click', fn); };
        bind('open-camera', () => this.openCamera());
        bind('upload-image', () => this.uploadImage());
        bind('back-from-camera', () => this.goBack());
        bind('capture-btn', () => this.captureImage());
        bind('back-to-home', () => this.showScreen('initial-screen'));
        bind('error-back', () => this.showScreen('initial-screen'));
        bind('install-btn', () => this.installApp());

        const fileInput = document.getElementById('file-input');
        if (fileInput) fileInput.addEventListener('change', e => this.handleFileUpload(e));

        window.addEventListener('beforeinstallprompt', e => {
            e.preventDefault();
            this.deferredPrompt = e;
            document.getElementById('install-btn')?.classList.remove('hidden');
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
        Object.assign(flash.style, { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'white', opacity: 0 });
        document.body.appendChild(flash);
        flash.animate([{ opacity: 0 }, { opacity: 1 }, { opacity: 0 }], { duration: 250 });
        setTimeout(() => flash.remove(), 300);
    }

    uploadImage() {
        document.getElementById('file-input').click();
    }

    handleFileUpload(e) {
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
            const res = await fetch(`${this.backendUrl}/process/`, { method: 'POST', body: formData });
            if (!res.ok) throw new Error('Backend error');
            const data = await res.json();
            this.showResult(data);
        } catch (err) {
            console.error('Processing failed:', err);
            this.showError('ಚಿತ್ರ ಪ್ರಕ್ರಿಯೆ ವಿಫಲವಾಗಿದೆ. ದಯವಿಟ್ಟು ಸಂಪರ್ಕವನ್ನು ಪರಿಶೀಲಿಸಿ.');
        }
    }

    showResult(data) {
        const kn = data.text_kn || '(ಯಾವುದೇ ಪಠ್ಯ ಕಂಡುಬಂದಿಲ್ಲ)';
        const en = data.text_en || '';
        const hi = data.text_hi || '';

        document.getElementById('result-text').innerHTML = `
            <div class="text-block">
                <div class="text-header"><strong>ಕನ್ನಡ:</strong><button class="copy-btn" data-text="${kn}">📋</button></div>
                <p>${kn}</p>
            </div>
            <div class="text-block">
                <div class="text-header"><strong>English:</strong><button class="copy-btn" data-text="${en}">📋</button></div>
                <p>${en}</p>
            </div>
            <div class="text-block">
                <div class="text-header"><strong>हिन्दी:</strong><button class="copy-btn" data-text="${hi}">📋</button></div>
                <p>${hi}</p>
            </div>
        `;

        const actions = document.querySelector('.result-actions');
        actions.innerHTML = `
            ${data.audio_kn ? `<button class="audio-btn" data-url="${data.audio_kn}" data-lang="kn" id="btn-kn">🔊 ಓದು (ಕನ್ನಡ)</button>` : ''}
            ${data.audio_en ? `<button class="audio-btn" data-url="${data.audio_en}" data-lang="en" id="btn-en">▶️ Play English</button>` : ''}
            ${data.audio_hi ? `<button class="audio-btn" data-url="${data.audio_hi}" data-lang="hi" id="btn-hi">▶️ Play Hindi</button>` : ''}
            <button class="action-btn primary" id="new-scan">🔄 ಮತ್ತೊಮ್ಮೆ ಸ್ಕ್ಯಾನ್ ಮಾಡಿ</button>
        `;

        document.getElementById('new-scan').addEventListener('click', () => this.showScreen('initial-screen'));
        this.addCopyListeners();
        this.addAudioListeners(data);
        this.showScreen('result-screen');

        // ✅ Auto-play Kannada after processing
        if (data.audio_kn) this.playAudio(data.audio_kn, 'kn', true);
    }

    addCopyListeners() {
        document.querySelectorAll('.copy-btn').forEach(btn => {
            btn.onclick = e => {
                const text = e.target.getAttribute('data-text');
                navigator.clipboard.writeText(text);
                this.speak("ಪಠ್ಯ ಕ್ಲಿಪ್‌ಬೋರ್ಡ್‌ಗೆ ನಕಲಿಸಲಾಗಿದೆ");
                e.target.textContent = '✅';
                setTimeout(() => e.target.textContent = '📋', 1500);
            };
        });
    }

    addAudioListeners(data) {
        const audios = {};

        // English
        const btnEN = document.getElementById('btn-en');
        if (btnEN) {
            audios.en = new Audio(`${this.backendUrl}${data.audio_en}`);
            btnEN.addEventListener('click', () => this.toggleAudio(audios.en, btnEN));
            audios.en.onended = () => btnEN.textContent = '▶️ Play English';
        }

        // Hindi
        const btnHI = document.getElementById('btn-hi');
        if (btnHI) {
            audios.hi = new Audio(`${this.backendUrl}${data.audio_hi}`);
            btnHI.addEventListener('click', () => this.toggleAudio(audios.hi, btnHI));
            audios.hi.onended = () => btnHI.textContent = '▶️ Play Hindi';
        }

        this.audioPlayers = audios;
    }

    playAudio(url, lang='kn', autoplay=false) {
        if(this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
            if(this.currentAudioButton && this.currentAudioLang !== 'kn') {
                this.currentAudioButton.textContent = this.currentAudioLang === 'en' ? '▶️ Play English' : '▶️ Play Hindi';
            }
        }

        if(lang === 'kn') {
            const knAudio = new Audio(`${this.backendUrl}${url}`);
            if(autoplay) knAudio.play().catch(e => console.log('Kannada autoplay blocked:', e));
            this.currentAudio = knAudio;
            this.currentAudioLang = 'kn';
            this.currentAudioButton = null; // no button for Kannada
        }
    }

    toggleAudio(audioObj, btn) {
        if(this.currentAudio && this.currentAudio !== audioObj) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
            if(this.currentAudioButton) {
                this.currentAudioButton.textContent = this.currentAudioLang === 'en' ? '▶️ Play English' : '▶️ Play Hindi';
            }
        }

        if(audioObj.paused) {
            audioObj.play();
            btn.textContent = btn.dataset.lang === 'en' ? '⏸️ Pause English' : '⏸️ Pause Hindi';
            this.currentAudio = audioObj;
            this.currentAudioButton = btn;
            this.currentAudioLang = btn.dataset.lang;
        } else {
            audioObj.pause();
            btn.textContent = btn.dataset.lang === 'en' ? '▶️ Play English' : '▶️ Play Hindi';
            this.currentAudio = null;
            this.currentAudioButton = null;
            this.currentAudioLang = null;
        }
    }

    showError(msg) {
        document.getElementById('error-message').textContent = msg;
        this.speak(msg);
        this.showScreen('error-screen');
    }

    showScreen(id) {
        ['initial-screen', 'camera-screen', 'processing-screen', 'result-screen', 'error-screen'].forEach(s => {
            const el = document.getElementById(s);
            if (el) el.classList.add('hidden');
        });
        document.getElementById(id)?.classList.remove('hidden');
        if (id !== 'camera-screen') this.stopCamera();
    }

    stopCamera() {
        if (this.currentStream) {
            this.currentStream.getTracks().forEach(t => t.stop());
            this.currentStream = null;
        }
    }

    async installApp() {
        if (this.deferredPrompt) {
            this.deferredPrompt.prompt();
            await this.deferredPrompt.userChoice;
            this.deferredPrompt = null;
            document.getElementById('install-btn')?.classList.add('hidden');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => window.chitravachakaApp = new ChitravachakaApp());
