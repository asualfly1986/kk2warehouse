/**
 * Barcode & Audio Service
 * Handles USB Hardware Scanner (Keyboard Wedge), Camera Scanner & Audio Feedback
 */

class AudioService {
    constructor() {
        this.ctx = null;
    }

    initContext() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) {
                this.ctx = new AudioCtx();
            }
        }
        if (this.ctx && this.ctx.state === "suspended") {
            this.ctx.resume();
        }
    }

    playScanSuccess() {
        this.initContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.exponentialRampToValueAtTime(1800, now + 0.08);

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.12);
    }

    playError() {
        this.initContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.setValueAtTime(200, now + 0.1);

        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.25);
    }

    playAlert() {
        this.initContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = "triangle";
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.setValueAtTime(600, now + 0.15);

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.3);
    }
}

class KeyboardBarcodeScanner {
    constructor(onScanCallback) {
        this.onScan = onScanCallback;
        this.buffer = "";
        this.lastKeyTime = 0;
        this.threshold = 50; // ms threshold between keystrokes for hardware scanner
        this.bindEvents();
    }

    bindEvents() {
        window.addEventListener("keydown", (e) => {
            const currentTime = Date.now();

            // Ignore if active element is a normal text input (unless user is scanning into scan field)
            const isInputField = ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName);
            const isScanField = document.activeElement.id === "barcodeInput" || document.activeElement.classList.contains("barcode-field");

            if (isInputField && !isScanField) {
                return;
            }

            if (e.key === "Enter" || e.key === "Tab") {
                if (this.buffer.length >= 4) {
                    const scannedCode = this.buffer.trim();
                    this.buffer = "";
                    if (typeof this.onScan === "function") {
                        this.onScan(scannedCode);
                    }
                    e.preventDefault();
                }
                this.buffer = "";
                return;
            }

            if (e.key.length === 1) { // Single character
                if (currentTime - this.lastKeyTime > this.threshold) {
                    this.buffer = e.key;
                } else {
                    this.buffer += e.key;
                }
                this.lastKeyTime = currentTime;
            }
        });
    }
}

window.audioService = new AudioService();
