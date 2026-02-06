# CV Generator Project Specification

## 1. 專案概述 (Project Overview)
本專案為一個 **Markdown-to-HTML 履歷生成器**。旨在透過單一 Markdown 數據源 (`resume.md`)，自動生成具備 **響應式設計 (RWD)**、**雙語系切換 (One-Click Switch)** 與 **列印最佳化 (Print Optimized)** 的靜態履歷網頁。

### 核心目標 (Goals)
1.  **數據驅動 (Data-Driven)**：內容與樣式分離，履歷內容全權由 Markdown 管理。
2.  **雙語整合 (Bilingual)**：單一檔案撰寫中英雙語，前端即時切換。
3.  **專業呈現 (Professional)**：
    -   **Web**: 現代化 RWD 佈局，閱讀體驗佳。
    -   **Print**: 精準模擬 A4 紙張樣式，無需額外調整即可列印 PDF。

---

## 2. 技術架構 (Tech Stack)

### Core
-   **Runtime**: Node.js (用於建置腳本)
-   **Content Source**: Markdown (`resume.md`)
-   **Data Parsing**: `marked` (AST Parser), `fs-extra`

### Frontend
-   **Structure**: Semantic HTML5
-   **Styling**: 
    -   **Tailwind CSS (CDN)**: 負責佈局、間距、響應式斷點。
    -   **Custom CSS (`style.css`)**: 負責時間軸 (Timeline)、Markdown 內容樣式、列印專用樣式。
-   **Logic**: Vanilla JavaScript (`i18n.js`) 負責語系切換與狀態持久化。

---

## 3. 數據架構 (Data Architecture)

### 3.1 數據源 (`resume.md`)
所有的履歷內容皆存於 `resume.md`，並透過特定標記分隔語言區塊。

-   **分隔符 (Delimiter)**: `<!-- LANGUAGE_SPLIT: EN -->`
    -   **上半部**: 中文內容 (Default: zh-Hant)
    -   **下半部**: 英文內容 (en)

### 3.2 解析邏輯 (Parsing Logic)
建置腳本 (`build.js`) 使用 AST (Abstract Syntax Tree) 解析 Markdown，並依據 **H1/H2 標題** 自動歸類內容區塊：

| 區塊名稱 | 識別關鍵字 (Keywords) | 內容用途 |
| :--- | :--- | :--- |
| **Header** | (Before First H1/H2) | 姓名、職稱、摘要 (Blockquote)、聯絡資訊 (List) |
| **Work** | Work, Experience, 經歷, 履歷 | 工作經驗 (時間軸樣式) |
| **Education** | Education, 學歷 | 學歷資訊 |
| **Skills** | Skill, 技能, 專業 | 側邊欄技能列表 |
| **Traits** | Trait, 特質 | 側邊欄特質標籤 |

### 3.3 自動化處理 (Auto-Processing)
-   **Icon Injection**: 自動偵測聯絡資訊中的關鍵字 (Phone/Email/Birthday/Github) 並注入對應 Emoji 或 Icon。
-   **Link Security**: 所有外部連結自動添加 hover 樣式。

---

## 4. 前端規格 (Frontend Specifications)

### 4.1 佈局系統 (Layout System)
採用 **Mobile-First** 策略，利用 Tailwind Grid 系統實現響應式佈局。

#### Breakpoints
-   **Mobile (< 1024px)**: 單欄流式佈局 (Stack Layout)
    -   順序：Header -> Traits -> Skills -> Work/Education
    -   透過 CSS `order-*` 屬產調整視覺順序。
-   **Desktop (>= 1024px)**: 12欄 Grid 佈局 (Two-Column)
    -   **Left Column (col-span-8)**: 姓名、摘要、聯絡資訊 (Header)、工作經歷、學歷。
    -   **Right Column (col-span-4)**: 核心特質 (Traits)、專業技能 (Skills)。
    -   **Style**: 模擬 A4 紙張懸浮於背景上 (Box Shadow + Centered)。

### 4.2 雙語系切換 (I18n Framework)
-   **機制**: 透過 `js/i18n.js` 控制 DOM 元素的顯隱 (`hidden`, `opacity`)。
-   **切換特效**: Cross-fade (淡入淡出，300ms transition)。
-   **持久化**: 使用 `localStorage` 紀錄使用者偏好 (`cv_lang_pref`)。
-   **自動偵測**: 首次加載優先讀取 Storage，無紀錄則偵測 Browser Language。

### 4.3 列印優化 (Print Optimization)
專為「列印成 PDF」設計的 CSS (`@media print`)：
-   **版面重置**: 移除所有背景色、陰影、懸浮效果，強制白底黑字。
-   **尺寸控制**: 
    -   設定 `@page { margin: 15mm; size: A4; }`。
    -   強制容器寬度 100%，移除 min-height 限制。
-   **隱藏元素**: 自動隱藏控制按鈕 (FAB)、Footer 等非內容元素。
-   **分頁控制**: 
    -   `break-inside: avoid`: 防止段落 (p) 或列表項 (li) 被切斷。
    -   確保標題 (H2/H3) 與後續內容保持在一起。

---

## 5. 建置流程 (Build Process)

執行指令：`node scripts/build.js`

1.  **Read**: 讀取 `resume.md`。
2.  **Split**: 依據 `<!-- LANGUAGE_SPLIT: EN -->` 切割為 ZH/EN 兩份 Raw Markdown。
3.  **Parse**: 分別對 ZH/EN 進行 AST 解析與區塊分類 (Header/Work/Skills...)。
4.  **Inject**: 將解析後的 HTML 片段注入 `index.html` 模板字串。
5.  **Write**: 輸出完整的 `index.html`。

---

## 6. 檔案結構 (File Structure)

```text
/
├── resume.md           # [Data] 履歷內容源文件
├── index.html          # [Output] 生成的靜態網頁 (Do not edit manually)
├── SPEC_DRAFT.md       # [Spec] 專案規格書
├── package.json        # [Config] 專案依賴與腳本
│
├── scripts/
│   └── build.js        # [Build] 建置腳本 (Node.js)
│
├── css/
│   └── style.css       # [Style] 自定義樣式 (Timeline, Print, Markdown)
│
└── js/
    └── i18n.js         # [Script] 語系切換邏輯
```
