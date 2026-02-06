const fs = require('fs-extra');
const { marked } = require('marked');
const path = require('path');

// Configure marked to handle common MD features
marked.setOptions({
    breaks: true,
    gfm: true
});

/**
 * Main build function to generate the bilingual CV HTML.
 * Reads markdown, parses sections, and produces a responsive HTML file.
 * @returns {Promise<void>}
 */
async function build() {
    try {
        const mdPath = path.join(__dirname, '../resume.md');
        const outputPath = path.join(__dirname, '../index.html');

        console.log('Reading resume.md...');
        const rawFileContent = await fs.readFile(mdPath, 'utf-8');

        // Split by Language Marker
        const parts = rawFileContent.split('<!-- LANGUAGE_SPLIT: EN -->');
        const zhMarkdown = parts[0] || '';
        const enMarkdown = parts[1] || ''; // If no split found, dry run with empty

        /**
         * @typedef {Object} SectionData
         * @property {string} primaryName - Main display name.
         * @property {string} legalName - English legal name (for ZH section).
         * @property {string} nickName - English nickname.
         * @property {string} summaryContent - Professional summary HTML.
         * @property {string} contactHtml - Contact info HTML.
         * @property {string} traitsContent - Characteristics section HTML.
         * @property {string} skillsContent - Skills list HTML.
         * @property {string} workContent - Work experience HTML.
         * @property {string} educationContent - Education HTML.
         * @property {string} marginClass - CSS class for print margins.
         */

        /**
         * Helper to process a single language markdown into HTML variables using AST
         * @param {string} mdContent - Raw markdown content for a specific language
         * @param {string} langCode - Language code ('zh' or 'en')
         * @returns {SectionData|null} Processed data object or null if content empty
         */
        function processLanguage(mdContent, langCode) {
            if (!mdContent.trim()) return null;

            // 1. AST Parsing
            const tokens = marked.lexer(mdContent);

            // 2. Group Tokens by Header
            const sections = {};
            let currentSection = 'header'; // Default section (before first header)
            sections[currentSection] = [];

            tokens.forEach(token => {
                if (token.type === 'heading' && (token.depth === 1 || token.depth === 2)) {
                    // Use the header text as the key (normalized)
                    currentSection = token.text.trim();
                    sections[currentSection] = [];
                } else {
                    sections[currentSection].push(token);
                }
            });

            const renderTokens = (tokenList) => {
                if (!tokenList || tokenList.length === 0) return '';
                // Post-process HTML to add target="_blank" and professional styles to all links
                // For SPEC links, we make them smaller and remove bold weight
                return marked.parser(tokenList)
                    .replace(/<a (href="[^"]*")>([\s\S]*?)<\/a>/g, (match, href, content) => {
                        let classes = "transition-colors hover:text-slate-800";
                        if (content.includes('SPEC')) {
                            classes += " text-sm font-normal ml-2 opacity-80";
                        }
                        return `<a ${href} target="_blank" rel="noopener noreferrer" class="${classes}">${content}</a>`;
                    });
            };

            // Helper to find section by fuzzy name
            const findSectionHtml = (keywords) => {
                const key = Object.keys(sections).find(k => {
                    const lowerK = k.toLowerCase();
                    // Skip Meta section for body rendering
                    if (lowerK.includes('meta')) return false;
                    return keywords.some(w => lowerK.includes(w.toLowerCase()));
                });
                return key ? renderTokens(sections[key]) : '';
            };

            // 3. Extract Specific Sections (Robust Matching)

            // --- Header Analysis (Name, Title, Contact) ---
            const headerTokens = sections['header'] || [];

            // Find H1 for Name
            const nameToken = tokens.find(t => t.type === 'heading' && t.depth === 1);
            const fullTitle = nameToken ? nameToken.text.trim() : '劉胤檀 (Ying-Tan Liu) Anton Liu';

            // Find Blockquote for Summary
            const summaryToken = headerTokens.find(t => t.type === 'blockquote');
            const summaryContent = summaryToken ? marked.parser(summaryToken.tokens) : '';

            // --- Meta Section Analysis (New) ---
            const metaHtml = findSectionHtml(['Meta']); // Although we don't render it directly, we parse it
            const metaTokens = sections['Meta'] || [];
            let ogTitle = "Anton Liu - Resume";
            let ogDesc = "Interactive Bilingual Resume";
            let ogImage = "";

            const metaList = metaTokens.find(t => t.type === 'list');
            if (metaList) {
                metaList.items.forEach(item => {
                    const text = item.text;
                    if (text.includes('OG_Title')) ogTitle = text.replace(/^\*\*OG_Title\*\*:\s*/, '').trim();
                    if (text.includes('OG_Description')) ogDesc = text.replace(/^\*\*OG_Description\*\*:\s*/, '').trim();
                    if (text.includes('OG_Image')) ogImage = text.replace(/^\*\*OG_Image\*\*:\s*/, '').trim();
                });
            }

            // Find Contact Info (Assume it's the first List in 'header' or 'Contact'/'聯絡資訊' section)
            // Strategy: Look in 'header' first, then look for explicit 'Contact' related sections
            let contactTokens = headerTokens.find(t => t.type === 'list');

            // If not in header (implicit), check explicit sections
            const contactKeys = Object.keys(sections).find(k => /contact|聯絡/i.test(k));
            if (!contactTokens && contactKeys) {
                contactTokens = sections[contactKeys].find(t => t.type === 'list');
            }

            const contactHtml = contactTokens ? contactTokens.items.map(item => {
                // 1. 直接取得 item 的文字內容
                let text = item.text.trim();

                // 2. 判斷圖示
                let icon = '📌';
                if (/988|Phone|電話/.test(text)) icon = '📱';
                else if (/@|Email|mailto/.test(text)) icon = '✉️';
                else if (/1990|Birthday|生日|DOB/.test(text)) icon = '📅';
                else if (/Portfolio|作品集|Archive/.test(text)) icon = '📁';
                else if (/SPEC/.test(text)) icon = '📄';

                // 3. 移除前面的標題 (例如 **作品集**: )
                const cleanText = text.replace(/^\*\*.*?\*\*[:：]\s*/, '');

                // 4. 檢查內容是否已經自帶 Emoji (例如：[📁 SPEC...])
                if (/^[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}]|^\[[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}]/u.test(cleanText.trim())) {
                    icon = '';
                }

                // 5. 使用 marked.parseInline 讓 Markdown 的連結格式 [文字](URL) 轉為 HTML
                const renderedText = marked.parseInline(cleanText)
                    .replace(/<a /g, '<a target="_blank" rel="noopener noreferrer" class="hover:text-slate-800 transition-colors underline decoration-slate-300" ');

                return `<span class="flex items-center gap-1.5"><span class="text-slate-900">${icon}</span> ${renderedText}</span>`;
            }).join('\n') : '';


            // --- Section Analysis ---


            // --- Section Analysis ---


            const traitsHtml = findSectionHtml(['Trait', '特質']);
            const skillsHtml = findSectionHtml(['Skill', '技能', '專業']);
            const workHtml = findSectionHtml(['Work', 'Experience', '經歷', '履歷']);
            const educationHtml = findSectionHtml(['Education', '學歷']);


            // --- Name Processing ---
            let primaryName = fullTitle;
            let legalName = '';
            let nickName = '';

            if (langCode === 'zh') {
                // Split "# 劉胤檀 (Ying-Tan Liu) Anton Liu"
                const match = fullTitle.match(/^(.*?)\s+(\(.*?)\)\s+(.*)$/);
                if (match) {
                    primaryName = match[1];
                    legalName = match[2] + ')';
                    nickName = match[3];
                } else {
                    // Fallback
                    const nameParts = fullTitle.split(/\s+(.+)/);
                    primaryName = nameParts[0];
                    nickName = nameParts[1] || '';
                }
            } else {
                // Split "# Ying-Tan Liu (Anton)"
                const match = fullTitle.match(/^(.*?)\s+\((.*?)\)$/);
                if (match) {
                    primaryName = match[1];
                    nickName = match[2];
                    if (nickName.startsWith('(') && nickName.endsWith(')')) {
                        // Stripped in regex group? No, match[2] is inside.
                    } else {
                        nickName = `(${nickName})`;
                    }
                }
            }

            // 1.5cm margin class
            const marginClass = 'p-[1.5cm]';

            return {
                primaryName,
                legalName,
                nickName,
                summaryContent,
                contactHtml,
                traitsContent: traitsHtml,
                skillsContent: skillsHtml,
                workContent: workHtml,
                educationContent: educationHtml,
                marginClass,
                ogTitle,
                ogDesc,
                ogImage
            };
        }

        const zhData = processLanguage(zhMarkdown, 'zh');
        const enData = processLanguage(enMarkdown, 'en');

        // Static Labels Map
        const labels = {
            zh: {
                work: "工作經歷",
                traits_title: "", // No title in original
                skills: "核心技能",
                education: "學歷",
                print: "🖨️"
            },
            en: {
                work: "Work Experience",
                traits_title: "",
                skills: "Skills",
                education: "Education",
                print: "🖨️"
            }
        };

        // Render Function for a specific language block
        /**
         * Generates the HTML structure for a language section.
         * @param {SectionData} data - Processed section data.
         * @param {string} lang - Language code ('zh' or 'en').
         * @param {boolean} isHidden - Whether this section should be hidden initially.
         * @returns {string} HTML string.
         */
        function renderBody(data, lang, isHidden) {
            if (!data) return '';

            // Construct name HTML based on components
            let nameHtml = '';
            if (lang === 'zh') {
                nameHtml = `
                    ${data.primaryName}
                    ${data.legalName ? ` <span class="text-2xl font-light text-slate-400 inline-block whitespace-nowrap align-middle lg:ml-1">${data.legalName}</span>` : ''}
                    ${data.nickName ? `<br class="lg:hidden print:hidden"><span class="text-2xl font-light text-slate-400 align-middle lg:ml-8 print:ml-4">${data.nickName}</span>` : ''}
                `;
            } else {
                nameHtml = `
                    ${data.primaryName}
                    ${data.nickName ? ` <span class="text-2xl font-light text-slate-400 align-middle lg:ml-8 print:ml-4">${data.nickName}</span>` : ''}
                `;
            }

            return `
            <div id="content-${lang}" class="grid grid-cols-1 lg:grid-cols-12 h-full flex-grow lang-section transition-opacity duration-300 ${isHidden ? 'hidden opacity-0' : 'opacity-100'}">

                <!-- LEFT COLUMN (Main Content): Col-8 -->
                <!-- Use 'contents' for mobile to allow children to be part of the main grid, enabling reordering -->
                <div class="contents lg:block lg:col-span-8 lg:flex lg:flex-col print:col-span-8 print:block">

                    <!-- HEADER LEFT (Name/Summary/Contact) -->
                    <!-- Mobile Order: 1 -->
                    <header class="order-1 lg:order-none col-span-1 ${data.marginClass} lg:pb-8 lg:pr-8 border-b border-gray-100 relative z-10 print:px-4 print:py-4 bg-white lg:bg-transparent">
                        <h1 class="text-4xl font-black text-slate-800 tracking-tight mb-2 leading-tight">
                            ${nameHtml}
                        </h1>
                        
                        <!-- Separator Line (Restored) -->
                        <div class="w-full h-0.5 bg-slate-800 mt-4 mb-6"></div>

                        <div class="text-base text-slate-600 leading-relaxed mb-6">
                            ${data.summaryContent}
                        </div>

                        <div class="grid grid-cols-2 gap-x-4 gap-y-2 lg:flex lg:flex-wrap lg:gap-x-6 lg:gap-y-2 text-sm font-medium text-slate-500 mt-auto">
                            ${data.contactHtml}
                        </div>
                    </header>

                    <!-- BODY LEFT (Work & Education) -->
                    <!-- Mobile Order: 4 -->
                    <div class="order-4 lg:order-none col-span-1 p-6 pr-6 lg:${data.marginClass} lg:pr-8 lg:pt-8 flex-grow print:px-4 print:pt-8 bg-white lg:bg-transparent">
                        <section>
                            <div class="flex items-center gap-3 mb-8 print:mb-4">
                                <div class="w-8 h-1 bg-slate-800"></div>
                                <h2 class="text-xl font-bold text-slate-800 tracking-widest uppercase" data-i18n="work">${labels[lang].work}</h2>
                            </div>

                            <div class="timeline-line pl-8 markdown-content print:pl-4">
                                ${data.workContent}
                            </div>
                        </section>

                        <section class="mt-12 print:mt-6">
                            <div class="flex items-center gap-3 mb-8 print:mb-4">
                                <div class="w-8 h-1 bg-slate-800"></div>
                                <h2 class="text-xl font-bold text-slate-800 tracking-widest uppercase" data-i18n="education">${labels[lang].education}</h2>
                            </div>

                            <div class="timeline-line pl-8 markdown-content print:pl-4">
                                ${data.educationContent}
                            </div>
                        </section>
                    </div>
                </div>

                <!-- RIGHT COLUMN (Sidebar): Col-4 -->
                <!-- Use 'contents' for mobile reordering -->
                <div class="contents lg:block lg:col-span-4 lg:bg-slate-50 lg:border-l lg:border-slate-100 lg:flex lg:flex-col print:col-span-4 print:border-l print:block">

                    <!-- HEADER RIGHT (Traits) -->
                    <!-- Mobile Order: 2 -->
                    <div class="order-2 lg:order-none col-span-1 p-6 lg:${data.marginClass} lg:pl-8 lg:pt-12 lg:pb-8 border-b border-gray-200/50 bg-slate-100/50 print:px-4 print:py-4">
                        <!-- Traits -->
                        <!-- Mobile: Grid 2 Cols, Desktop: Flex Col -->
                        <div class="grid grid-cols-2 gap-3 lg:flex lg:flex-col items-start traits-list print:flex print:flex-col">
                            ${data.traitsContent.replace(/<li>/g, '<div class="flex items-center gap-3"><span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span><span class="text-lg font-bold text-slate-600 tracking-widest">').replace(/<\/li>/g, '</span></div>').replace(/<ul>|<\/ul>/g, '')}
                        </div>
                    </div>

                    <!-- BODY RIGHT (Skills) -->
                    <!-- Mobile Order: 3 -->
                    <div class="order-3 lg:order-none col-span-1 p-6 lg:${data.marginClass} lg:pl-8 lg:pt-8 flex-grow print:px-4 print:pt-4 bg-slate-50 lg:bg-transparent">
                        <section class="mb-12 print:mb-6">
                            <div class="flex items-center gap-3 mb-6 print:mb-3">
                                <div class="w-6 h-1 bg-slate-400"></div>
                                <h2 class="text-lg font-bold text-slate-700 tracking-widest uppercase" data-i18n="skills">${labels[lang].skills}</h2>
                            </div>
                            <div class="markdown-content sidebar-content">
                                ${data.skillsContent}
                            </div>
                        </section>
                    </div>
                </div>
            </div>`;
        }

        const template = `
<!DOCTYPE html>
<html lang="zh-Hant">
                        <head>
                            <meta charset="UTF-8">
                                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                                    <title>${zhData.primaryName} - CV</title>
    
    <!-- Open Graph / Social Media Meta Tags -->
    <meta property="og:title" content="${zhData.ogTitle}" />
    <meta property="og:description" content="${zhData.ogDesc}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://ytlanton.github.io/cv_yingtanliu/" />
    <meta property="og:site_name" content="${zhData.primaryName}'s Resume" />
    <meta property="og:image" content="${zhData.ogImage}" />

                                    <script src="https://cdn.tailwindcss.com"></script>
                                    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@300;400;500;700&family=Playfair+Display:wght@700&display=swap" rel="stylesheet">
                                        <link rel="stylesheet" href="./css/style.css">
                                            <style>
                                                /* Fade transition support */
                                                .lang-section {transition: opacity 0.3s ease-in-out; }
                                                .hidden {display: none; }
                                                .opacity-0 {opacity: 0; }
                                                .opacity-100 {opacity: 1; }

                                                /* Absolute separation of hidden elements in print */
                                                @media print {
                                                    .hidden { display: none !important; }
                                                    .lang-section:not(.hidden) { display: grid !important; grid-template-columns: repeat(12, minmax(0, 1fr)) !important; }
                                                }

                                                /* A4 Paper Simulation on Desktop */
                                                @media screen and (min-width: 1024px) {
                                                    body {
                                                        background-color: #f1f5f9 !important; /* slate-100 */
                                                        display: flex !important;
                                                        justify-content: center !important;
                                                        align-items: flex-start !important;
                                                        min-height: 100vh !important;
                                                        padding: 40px 0 !important;
                                                    }
                                                    .cv-container {
                                                        width: 210mm !important;
                                                        min-height: 297mm !important;
                                                        background: white !important;
                                                        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25) !important;
                                                        position: relative !important;
                                                    }
                                                }

                                                /* Print Optimization */
                                                @media print {
                                                    @page {
                                                        margin: 15mm; /* Standard print margin */
                                                        size: A4;
                                                    }
                                                    body {
                                                        margin: 0 !important;
                                                        padding: 0 !important;
                                                        background: white !important;
                                                        display: block !important; /* Reset flex */
                                                    }
                                                    .cv-container {
                                                        box-shadow: none !important;
                                                        min-height: auto !important; /* Crucial: Remove forced min-height in print */
                                                        margin: 0 !important;
                                                        padding: 0 !important;
                                                        width: 100% !important;
                                                        max-width: 100% !important;
                                                        overflow: visible !important;
                                                        print-color-adjust: exact;
                                                        -webkit-print-color-adjust: exact;
                                                    }
                                                    /* Ensure footer stays relative or hidden if weird behavior */
                                                    footer {
                                                        position: relative !important;
                                                        bottom: auto !important;
                                                    }
                                                    .no-print, .hidden, .opacity-0 {
                                                        display: none !important;
                                                        opacity: 0 !important;
                                                        height: 0 !important;
                                                        width: 0 !important;
                                                        overflow: hidden !important;
                                                    }
                                                    h1, h2, h3, p, li {
                                                        color: #000 !important;
                                                    }
                                                }
                                            </style>
                                        </head>
                                        <body class="py-0 px-0 print:py-0 print:px-0 print:tracking-tight">
                                            <div class="cv-container w-full mx-auto bg-white shadow-xl relative flex flex-col min-h-screen lg:min-h-[1123px] print:min-h-0 print:h-auto">

                                                <!-- Language Content Blocks -->
                                                ${renderBody(zhData, 'zh', false)}
                                                ${enData ? renderBody(enData, 'en', true) : ''}

                                                <!-- Clean Footer -->
                                                <footer class="h-4 bg-gradient-to-r from-slate-800 to-slate-600 col-span-12 w-full relative z-20 print:hidden"></footer>
                                            </div>

                                            <!-- UI Controls Container -->
                                            <div class="fixed bottom-8 right-8 no-print print:hidden flex flex-col gap-4">

                                                <!-- Language Switcher (Injected via JS, but placeholder here for structure) -->
                                                <div id="i18n-controls"></div>

                                                <button onclick="window.print()" class="bg-slate-800 hover:bg-slate-700 text-white w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-105 active:scale-95" title="Print / Save PDF">
                                                    <span class="text-2xl">🖨️</span>
                                                </button>
                                            </div>

                                            <!-- Scripts -->
                                            <script src="./js/i18n.js"></script>
                                        </body>
                                    </html>
                                    `;

        await fs.writeFile(outputPath, template);
        console.log('Build successful: index.html updated with Dual Language Support.');

    } catch (err) {
        console.error('Build Error:', err);
    }
}

build();
