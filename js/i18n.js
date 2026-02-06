/**
 * i18n.js
 * Handles client-side language switching and persistence for CV.
 */
document.addEventListener('DOMContentLoaded', () => {
    const LANG_KEY = 'cv_lang_pref';
    const contentZh = document.getElementById('content-zh');
    const contentEn = document.getElementById('content-en');
    const controlsContainer = document.getElementById('i18n-controls');

    // 1. Detect Preference
    const savedLang = localStorage.getItem(LANG_KEY);
    // Detect browser language (e.g., "en-US" -> "en")
    const browserLang = navigator.language.toLowerCase().startsWith('en') ? 'en' : 'zh';

    let currentLang = savedLang || browserLang;
    if (currentLang !== 'en' && currentLang !== 'zh') currentLang = 'zh';

    console.log(`[i18n] Initial language: ${currentLang} (Saved: ${savedLang}, Browser: ${browserLang})`);

    // 2. Initial Render (Instant, no animation)
    if (currentLang === 'en') {
        showEnInstant();
    } else {
        showZhInstant();
    }

    renderButton();

    // --- Core Functions ---

    function showZhInstant() {
        contentEn.classList.add('hidden', 'opacity-0');
        contentZh.classList.remove('hidden', 'opacity-0');
        contentEn.classList.remove('opacity-100');
        contentZh.classList.add('opacity-100');
    }

    function showEnInstant() {
        contentZh.classList.add('hidden', 'opacity-0');
        contentEn.classList.remove('hidden', 'opacity-0');
        contentZh.classList.remove('opacity-100');
        contentEn.classList.add('opacity-100');
    }

    function switchLanguage(targetLang) {
        if (currentLang === targetLang) return;
        currentLang = targetLang;
        localStorage.setItem(LANG_KEY, targetLang);

        // Animation Logic
        const outgoing = targetLang === 'en' ? contentZh : contentEn;
        const incoming = targetLang === 'en' ? contentEn : contentZh;

        // 1. Fade out outgoing
        outgoing.classList.remove('opacity-100');
        outgoing.classList.add('opacity-0');

        // 2. Wait for fade out, then swap display and fade in incoming
        setTimeout(() => {
            window.scrollTo(0, 0);
            outgoing.classList.add('hidden');
            incoming.classList.remove('hidden');

            // Trigger reflow/repaint to ensure transition happens
            void incoming.offsetWidth;

            incoming.classList.remove('opacity-0');
            incoming.classList.add('opacity-100');
        }, 300); // 300ms matches CSS transition

        renderButton();
    }

    function renderButton() {
        if (!controlsContainer) return;

        controlsContainer.innerHTML = '';
        const btn = document.createElement('button');
        // Resume-style FAB button
        btn.className = "bg-slate-800 hover:bg-slate-700 text-white w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 text-lg font-bold tracking-wider border-2 border-white/20";

        // Label shows the *Target* language (If in ZH, show 'EN')
        btn.textContent = currentLang === 'zh' ? 'EN' : '中';

        btn.onclick = () => {
            const newLang = currentLang === 'zh' ? 'en' : 'zh';
            switchLanguage(newLang);
        };

        controlsContainer.appendChild(btn);
    }
});
