import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { chromium } from 'playwright';

const {
  GEMINI_API_KEY,
  TIKTOK_CLIENT_KEY,
  TIKTOK_CLIENT_SECRET,
  TIKTOK_REFRESH_TOKEN,
} = process.env;

const GITHUB_PAGES_BASE = 'https://naqgyuu7.github.io/spanish-slides';
const WATERMARK = '@mr.spanish1229';
const HASHTAGS = '#learnspanish #تعلم_اللغة_الاسبانية #تعلم_الاسبانية_للمبتدئين #تعلم_الاسبانية #spain🇪🇸';

// الـ 9 خلفيات المعتمدة فقط من صورك (بالتناوب بين الفاتح والداكن — بدون مسطّر رمادي)
const APPROVED_THEMES = [
  'easynotes',   // أزرق مذكرة
  'dark-grid',   // داكن شبكة
  'lined-cream', // مسطّر كريمي
  'dark-dots',   // داكن منقّط
  'dots-gray',   // نقاط رمادية
  'dark-check',  // داكن مربعات
  'lined-blue',  // مسطّر أزرق
  'dark',        // داكن صافي
  'paper-warm',  // ورق رمادي
];

const THEMES_CSS = `
  .theme-easynotes { background-color:#e6ecf6; background-image:radial-gradient(rgba(30,58,138,.045) 1px,transparent 0),radial-gradient(rgba(15,23,42,.035) 1px,transparent 0),linear-gradient(180deg,rgba(255,255,255,.35) 0%,rgba(226,234,248,.2) 100%); background-size:16px 16px,24px 24px,100% 100%; background-position:0 0,8px 8px,0 0; color:#0f1f38; }
  .theme-paper-warm { background-color:#eceae5; background-image:radial-gradient(rgba(87,83,78,.055) 1px,transparent 0),radial-gradient(rgba(120,113,108,.04) 1px,transparent 0); background-size:14px 14px,22px 22px; background-position:0 0,7px 7px; color:#1c1917; }
  .theme-dots-gray { background-color:#ffffff; background-image:radial-gradient(rgba(148,163,184,.35) 3px,transparent 3px); background-size:36px 36px; background-position:0 0,18px 18px; color:#0f172a; }
  .theme-lined-blue { background-color:#ffffff; background-image:repeating-linear-gradient(to bottom,transparent,transparent 33px,rgba(147,197,253,.55) 33px,rgba(147,197,253,.55) 34.5px); color:#0f172a; }
  .theme-lined-cream { background-color:#fffaf0; background-image:repeating-linear-gradient(to bottom,transparent,transparent 33px,rgba(217,188,145,.45) 33px,rgba(217,188,145,.45) 34.5px); color:#23190f; }
  .theme-dark { background-color:#111827; background-image:radial-gradient(rgba(255,255,255,.05) 1px,transparent 0); background-size:20px 20px; color:#f8fafc; }
  .theme-dark-dots { background-color:#141518; background-image:radial-gradient(rgba(255,255,255,.16) 1.25px,transparent 1.25px); background-size:26px 26px; color:#f8fafc; }
  .theme-dark-grid { background-color:#181a1f; background-image:linear-gradient(to right,rgba(255,255,255,.07) 1px,transparent 1px),linear-gradient(to bottom,rgba(255,255,255,.07) 1px,transparent 1px); background-size:32px 32px; color:#f8fafc; }
  .theme-dark-check { background-color:#13151a; background-image:linear-gradient(45deg,rgba(255,255,255,.035) 25%,transparent 25%,transparent 75%,rgba(255,255,255,.035) 75%,rgba(255,255,255,.035)),linear-gradient(45deg,rgba(255,255,255,.035) 25%,transparent 25%,transparent 75%,rgba(255,255,255,.035) 75%,rgba(255,255,255,.035)); background-size:64px 64px; background-position:0 0,32px 32px; color:#f8fafc; }
`;

const HISTORY_PATH = 'history.json';

const BASE_USED_TOPICS = [
  'أهم 20 صفة وعكسها بالإسبانية',
  'الفرق بين Ser و Estar في الإسبانية',
  'أسماء الإشارة في الإسبانية (الفرق بين Este و Ese و Aquel)',
];

function loadHistory() {
  if (fs.existsSync(HISTORY_PATH)) {
    return JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf8'));
  }
  return {
    nextNumber: 2,
    themeIndex: 0,
    usedTopics: [...BASE_USED_TOPICS],
  };
}

function fixArabicConjunctionSpacing(text) {
  return String(text || '').replace(/(^|\s)و(?=[A-Za-zÀ-ÖØ-öø-ÿ(])/g, '$1و ');
}

function buildClosingSlide(lesson) {
  const category = (lesson.nextCategory || 'درس القواعد').trim();
  const opt1 = fixArabicConjunctionSpacing(
    (lesson.nextOption1 || 'أدوات الربط السحرية: كيف تربط جملك مثل Pero و Porque و Aunque لتتكلم بطلاقة').trim()
  );
  const opt2 = fixArabicConjunctionSpacing(
    (lesson.nextOption2 || 'ضمائر المفعول به المباشر: الفرق بين Lo / La / Los / Las في الجمل اليومية').trim()
  );

  return [
    `# ==💬 ما هو ${category} القادم الذي تفضله في (سلسلة المبتدئين الشاملة)؟==`,
    '',
    `لو أردت أن نتعلم (${opt1})، اكتب ~~(Sí)~~ 🔗`,
    '',
    `ولو أردت أن نتعلم (${opt2})، اكتب ~~(No)~~ ⚡`,
    '',
    'مستني كومنتاتكم تحت! 👇',
    '',
    '📚 وإذا كنت تريد أن تحتفظ بأكثر من 200 ملخص لدروس القناة، مع دليل المبتدئين ودليل القواعد والأزمنة بالعربي من A1 إلى C1 جاهزة في هاتفك للمراجعة بأي وقت، جمعتُها لك في ==المكتبة الشاملة لتعلم اللغات== — ~~الرابط في البايو 🔗✅~~',
  ].join('\n');
}

async function getAvailableGeminiModels() {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?pageSize=100&key=${GEMINI_API_KEY}`
  );
  if (!res.ok) throw new Error(`ListModels Error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const models = (data.models || [])
    .filter(m =>
      m.supportedGenerationMethods?.includes('generateContent') &&
      /^models\/gemini-/i.test(m.name) &&
      !/(embedding|imagen|veo|tts|audio|image|live|robotics|computer-use|gemma|learnlm|aqa)/i.test(m.name)
    )
    .map(m => m.name);

  const score = (name) => {
    let s = 0;
    const verMatch = name.match(/gemini-(\d+)(?:\.(\d+))?/i);
    if (verMatch) {
      s += parseInt(verMatch[1], 10) * 1000 + parseInt(verMatch[2] || '0', 10) * 100;
    }
    if (/flash/i.test(name)) s += 50;
    if (/lite/i.test(name)) s -= 10;
    if (/preview|exp/i.test(name)) s -= 5;
    if (/-\d{3}$|-\d{2}-\d{4}$/.test(name)) s -= 2;
    return s;
  };

  return models.sort((a, b) => score(b) - score(a));
}

async function generateLessonWithGemini(usedTopics) {
  const allUsed = [...new Set([...BASE_USED_TOPICS, ...usedTopics])];

  const prompt = `أنت معلم لغة إسبانية محترف لحساب تيك توك عربي (${WATERMARK}).
اختر موضوعاً تعليمياً جديداً ومهماً جداً للمبتدئين (المستوى A1 أو A2: قواعد أساسية، فروقات شائعة، أزمنة، ضمائر، حروف جر، أو عبارات يومية أساسية) لم يُذكر في هذه القائمة السابقة:
${allUsed.map((t, i) => `${i + 1}. ${t}`).join('\n')}

أعد كائن JSON صالحاً فقط بهذه الحقول:
{
  "topic": "اسم الموضوع باختصار",
  "title": "عنوان هوك قوي ومشوّق لتيك توك (أقل من 85 حرفاً مع إيموجي)",
  "description": "وصف قصير مشوّق بالعربية يشجع على الحفظ والتعليق (سطران كحد أقصى، بدون هاشتاغات)",
  "nextCategory": "نوع الدرس القادم (مثل: درس القواعد أو درس المحادثة أو درس المفردات)",
  "nextOption1": "وصف مشوّق لموضوع درس قادم أول بدون أقواس خارجية (مثل: أدوات الربط السحرية: كيف تربط جملك مثل Pero و Porque و Aunque لتتكلم بطلاقة)",
  "nextOption2": "وصف مشوّق لموضوع درس قادم ثانٍ بدون أقواس خارجية (مثل: ضمائر المفعول به المباشر: الفرق بين Lo / La / Los / Las في الجمل اليومية)",
  "slides": [
    "نص الشريحة 1 (الغلاف مع الهوك)",
    "نص الشريحة 2 (مقدمة + أولاً: الخريطة السريعة)",
    "نص الشريحة 3 (ثانياً: القسم الأول مع أمثلة)",
    "نص الشريحة 4 (ثالثاً: القسم الثاني مع أمثلة)",
    "نص الشريحة 5 (رابعاً: السرّ الذي يخطئ فيه المبتدئون + قاعدة ذهبية)",
    "نص الشريحة 6 (خامساً: محادثة واقعية Diálogo real)"
  ]
}

قواعد صارمة لتطابق أسلوب وشكل الشرائح الـ 6 (لا تكتب شريحة سابعة لأن شريحة الخاتمة تُضاف تلقائياً):
- استخدم فقط التظليل الأصفر ==...== والتظليل السماوي ~~...~~ (لا تستخدم التظليل الوردي نهائياً).
- اترك دائماً مسافة واضحة بين حرف العطف العربي (و) وأي كلمة إسبانية أو قوس (مثال: Este و Ese وليس Este وEse).
- الشريحة 1 (الغلاف + الهوك):
  السطر الأول بالضبط: ## ==تعلم اللغة الإسبانية 🇪🇸==
  ثم سطر فارغ
  ثم سطر الهوك يبدأ بـ # مثل: "# أكبر خطأ يقع فيه 90% من مبتدئي الإسبانية! الفرق الكامل بين (...) حتى لا تخطئ بينهما أبداً 🧠🔥" أو "# كيف تقول (...) بالإسبانية بدون لخبطة؟ الدليل الكامل للمبتدئين 👉🔥"
  ثم سطر فارغ
  ثم السطر الأخير بالضبط: ~~اسحب لليسار لتفهم القاعدة بسهولة 👈~~
- الشريحة 2:
  تبدأ بـ # ~~عنوان الدرس بالعربية (Spanish Title - Nivel A1):~~
  ثم سطر مقدمة قصيرة تشرح الفكرة ببساطة، ثم سطر فارغ، ثم ==🔑 أولاً: الخريطة السريعة ...:==
  ثم 3 نقاط مرقّمة (1. و 2. و 3.) تظلّل فيها الكلمات الإسبانية بـ ~~...~~ وتكتب النطق العربي بالتشكيل بين قوسين بعدها.
- الشريحة 3:
  تبدأ بـ ==👇 ثانياً: [عنوان القسم الأول]:==
  ثم جملة شرح سريعة، ثم 3 أمثلة مرقّمة (1. و 2. و 3.)، لكل مثال:
  سطر العنوان (1. ...)، ثم سطر الجملة الإسبانية وحدها، ثم سطر "الترجمة: ..." ثم سطر "النطق: (النطق العربي بالتشكيل الكامل)."
- الشريحة 4:
  تبدأ بـ ==👉 ثالثاً: [عنوان القسم الثاني أو المقارنة]:==
  وتتضمن نقطتين مرقّمتين (1. و 2.) مع جملتين إسبانيتين لكل نقطة، وبنفس التنسيق (الجملة الإسبانية ثم "الترجمة:" ثم "النطق: (...).").
- الشريحة 5:
  تبدأ بـ ==🤯 رابعاً: السرّ الذي يخطئ فيه المبتدئون (...):==
  شرح مختصر للخطأ الشائع، ثم مثالان مرقّمان (1. و 2.) بالترجمة والنطق، ثم "3. قاعدة ذهبية:" توضّح الصواب والخطأ باستخدام ~~...~~.
- الشريحة 6:
  تبدأ بـ ==🗣️ خامساً: محادثة [الموقف الواقعي] تطبق الدرس (Diálogo real):==
  محادثة واقعية من 4 أدوار قصيرة (مثل أنت / البائع أو أنت / صديقك)، لكل دور:
  الشخص: [الجملة الإسبانية]
  الترجمة: [الترجمة العربية]
  النطق: ([النطق العربي بالتشكيل الكامل]).`;

  const candidates = await getAvailableGeminiModels();
  console.log('Available Gemini models:', candidates.slice(0, 8));
  if (!candidates.length) {
    throw new Error('No Gemini models available for this API key');
  }

  let lastError = '';
  for (const modelName of candidates) {
    console.log(`Trying Gemini model: ${modelName}`);
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.9 },
        }),
      }
    );

    if (!res.ok) {
      lastError = `${modelName} -> ${res.status}: ${await res.text()}`;
      console.warn(`Skipping ${lastError}`);
      continue;
    }

    try {
      const data = await res.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const cleanJson = rawText.replace(/^```(?:json)?\s*|\s*```$/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      if (Array.isArray(parsed.slides) && parsed.slides.length >= 5) {
        const contentSlides = (parsed.slides.length >= 7 ? parsed.slides.slice(0, 6) : parsed.slides)
          .map(fixArabicConjunctionSpacing);
        parsed.slides = [...contentSlides, buildClosingSlide(parsed)];
        console.log(`Lesson generated successfully with ${modelName}`);
        return parsed;
      }
      lastError = `${modelName} returned invalid slides array`;
    } catch (err) {
      lastError = `${modelName} JSON parse error: ${err.message}`;
      console.warn(`Skipping ${lastError}`);
    }
  }

  throw new Error(`All Gemini models failed. Last error: ${lastError}`);
}

function buildRenderHtml(slides, theme) {
  const isDark = theme.startsWith('dark');
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8" />
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@600;700;800&family=Tajawal:wght@500;700;800&display=swap" rel="stylesheet" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Cairo', 'Tajawal', sans-serif; }
  ${THEMES_CSS}
  .hl-yellow { background: #f6ec7e; padding: 1px 6px; border-radius: 4px; -webkit-box-decoration-break: clone; box-decoration-break: clone; }
  .is-dark-theme .hl-yellow { background: rgba(250,204,21,.34); color: #fef08a; }
  .hl-cyan { background: #c2f2e4; padding: 1px 6px; border-radius: 4px; -webkit-box-decoration-break: clone; box-decoration-break: clone; }
  .is-dark-theme .hl-cyan { background: rgba(45,212,191,.30); color: #99f6e4; }
  .hl-pink { background: #fecdd3; padding: 1px 6px; border-radius: 4px; -webkit-box-decoration-break: clone; box-decoration-break: clone; }
  .is-dark-theme .hl-pink { background: rgba(251,113,133,.32); color: #fecdd3; }
  .ltr-run { direction: ltr; unicode-bidi: isolate; display: inline; }
  .slide-canvas-inner { width: 540px; height: 675px; padding: 28px 28px 20px 28px; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; font-size: 21px; line-height: 1.58; font-weight: 700; word-wrap: break-word; }
  .slide-body-content { display: flex; flex-direction: column; gap: 4px; }
  .slide-cover-mode .slide-body-content { margin: auto 0; align-items: center; text-align: center; gap: 18px; }
  .slide-line-title { text-align: center; font-weight: 800; line-height: 1.48; }
  .slide-line-cover { text-align: center; font-weight: 800; line-height: 1.38; margin-bottom: 6px; }
  .slide-line-spacer { height: 0.55em; }
  .slide-footer { display: flex; align-items: center; justify-content: space-between; padding-top: 8px; margin-top: auto; opacity: 0.65; font-size: 14px; font-weight: 700; }
</style>
</head>
<body>
<div id="mount"></div>
<script>
  const SLIDES = ${JSON.stringify(slides)};
  const THEME = ${JSON.stringify(theme)};
  const IS_DARK = ${JSON.stringify(isDark)};
  const WATERMARK = ${JSON.stringify(WATERMARK)};

  function escapeHtml(s){ return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function hasArabic(t){ return /[\\u0600-\\u06FF]/.test(t); }
  function isolateLatinRuns(escaped){
    const re = /(?:[¡¿]\\s*)?[A-Za-zÀ-ÖØ-öø-ÿ](?:[A-Za-zÀ-ÖØ-öø-ÿ0-9\\s,.'’"\\/\\-–—:+¡¿!?]*[A-Za-zÀ-ÖØ-öø-ÿ0-9!?\\.])?/g;
    return escaped.split(/(&[a-zA-Z0-9#]+;)/g).map(seg =>
      (seg.startsWith('&') && seg.endsWith(';')) ? seg : seg.replace(re, m => '<bdi dir="ltr" class="ltr-run">' + m + '</bdi>')
    ).join('');
  }
  function formatInline(raw){
    let h = escapeHtml(raw);
    h = h.replace(/==(.+?)==/g, '<span class="hl-yellow">$1</span>');
    h = h.replace(/~~(.+?)~~/g, '<span class="hl-cyan">$1</span>');
    h = h.replace(/\\+\\+(.+?)\\+\\+/g, '<span class="hl-pink">$1</span>');
    h = h.replace(/\\*\\*(.+?)\\*\\*/g, '<strong>$1</strong>');
    return h.split(/(<[^>]+>)/g).map(p => (p.startsWith('<') && p.endsWith('>')) ? p : isolateLatinRuns(p)).join('');
  }

  window.renderSlide = function(idx) {
    const mount = document.getElementById('mount');
    mount.innerHTML = '';
    const text = SLIDES[idx];
    const lines = text.split('\\n');
    const isCover = lines.some(l => l.trim().startsWith('## '));
    const el = document.createElement('div');
    el.className = 'slide-canvas-inner theme-' + THEME + (IS_DARK ? ' is-dark-theme' : '') + (isCover ? ' slide-cover-mode' : '');
    let currentSize = 21;

    const body = document.createElement('div');
    body.className = 'slide-body-content';

    lines.forEach(line => {
      const tr = line.trim();
      if (!tr) {
        if (!isCover) { const sp = document.createElement('div'); sp.className = 'slide-line-spacer'; body.appendChild(sp); }
        return;
      }
      const p = document.createElement('p');
      const isCoverTitle = tr.startsWith('## ');
      const isTitle = !isCoverTitle && tr.startsWith('# ');
      const clean = isCoverTitle ? tr.slice(3) : (isTitle ? tr.slice(2) : tr);
      if (isCoverTitle) {
        p.className = 'slide-line-cover';
        p.style.fontSize = Math.round(currentSize * 1.9) + 'px';
        p.dir = hasArabic(clean) ? 'rtl' : 'ltr';
      } else if (isTitle) {
        p.className = 'slide-line-title';
        p.style.fontSize = Math.round(currentSize * (isCover ? 1.28 : 1.1)) + 'px';
        p.dir = hasArabic(clean) ? 'rtl' : 'ltr';
      } else {
        p.dir = hasArabic(clean) ? 'rtl' : 'ltr';
        p.style.textAlign = isCover ? 'center' : (hasArabic(clean) ? 'right' : 'left');
      }
      p.innerHTML = formatInline(clean);
      body.appendChild(p);
    });

    const footer = document.createElement('div');
    footer.className = 'slide-footer';
    footer.innerHTML = '<span dir="ltr">' + WATERMARK + '</span><span dir="ltr">' + (idx + 1) + ' / ' + SLIDES.length + '</span>';

    el.appendChild(body);
    el.appendChild(footer);
    mount.appendChild(el);

    const maxAllowedH = 675 - 48 - footer.offsetHeight - 8;
    while (body.scrollHeight > maxAllowedH && currentSize > 12) {
      currentSize = Math.round((currentSize - 0.5) * 10) / 10;
      el.style.fontSize = currentSize + 'px';
      el.style.lineHeight = currentSize <= 16 ? '1.48' : '1.58';
      el.querySelectorAll('.slide-line-cover').forEach(t => t.style.fontSize = Math.round(currentSize * 1.9) + 'px');
      el.querySelectorAll('.slide-line-title').forEach(t => t.style.fontSize = Math.round(currentSize * (isCover ? 1.28 : 1.1)) + 'px');
    }
  };
</script>
</body>
</html>`;
}

async function renderSlidesToJpg(slides, theme, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 540, height: 675 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  await page.setContent(buildRenderHtml(slides, theme), { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  const files = [];
  for (let i = 0; i < slides.length; i++) {
    await page.evaluate(idx => window.renderSlide(idx), i);
    const filename = `${String(i + 1).padStart(2, '0')}.jpg`;
    await page.screenshot({ path: path.join(outDir, filename), type: 'jpeg', quality: 92 });
    files.push(filename);
  }
  await browser.close();
  return files;
}

function gitPush(pathsToAdd, message) {
  execSync('git config user.name "github-actions[bot]"');
  execSync('git config user.email "github-actions[bot]@users.noreply.github.com"');
  execSync(`git add ${pathsToAdd.join(' ')}`);
  const status = execSync('git status --porcelain').toString().trim();
  if (!status) {
    console.log('No git changes to commit.');
    return;
  }
  execSync(`git commit -m "${message}"`);
  execSync('git push');
}

async function waitForGitHubPages(url) {
  for (let attempt = 1; attempt <= 24; attempt++) {
    const res = await fetch(url, { method: 'HEAD' });
    if (res.ok) {
      console.log(`GitHub Pages ready: ${url}`);
      return;
    }
    console.log(`Waiting for GitHub Pages (${attempt}/24)...`);
    await new Promise(r => setTimeout(r, 10000));
  }
  throw new Error(`Timed out waiting for GitHub Pages: ${url}`);
}

async function refreshTikTokToken() {
  const params = new URLSearchParams({
    client_key: TIKTOK_CLIENT_KEY,
    client_secret: TIKTOK_CLIENT_SECRET,
    grant_type: 'refresh_token',
    refresh_token: TIKTOK_REFRESH_TOKEN,
  });
  const res = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(`TikTok Token Refresh Failed: ${JSON.stringify(data)}`);
  }
  return data.access_token;
}

async function sendDraftToTikTok(accessToken, title, description, imageUrls) {
  const res = await fetch('https://open.tiktokapis.com/v2/post/publish/content/init/', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
    },
    body: JSON.stringify({
      post_info: {
        title: title.slice(0, 88),
        description: `${description}\n\n${HASHTAGS}`,
      },
      source_info: {
        source: 'PULL_FROM_URL',
        photo_cover_index: 0,
        photo_images: imageUrls,
      },
      post_mode: 'MEDIA_UPLOAD',
      media_type: 'PHOTO',
    }),
  });
  const data = await res.json();
  if (!res.ok || data.error?.code !== 'ok') {
    throw new Error(`TikTok Publish Failed: ${JSON.stringify(data)}`);
  }
  console.log('TikTok Draft Sent Successfully:', data);
}

async function main() {
  const history = loadHistory();
  const lessonId = `Lesson_${String(history.nextNumber).padStart(2, '0')}_${Date.now()}`;
  const theme = APPROVED_THEMES[history.themeIndex % APPROVED_THEMES.length];

  console.log(`Generating ${lessonId} with theme: ${theme}`);
  const lesson = await generateLessonWithGemini(history.usedTopics);

  const outDir = path.join('slides', lessonId);
  const files = await renderSlidesToJpg(lesson.slides, theme, outDir);

  gitPush([outDir], `Add slides for ${lessonId}`);

  const imageUrls = files.map(f => `${GITHUB_PAGES_BASE}/slides/${lessonId}/${f}`);
  await waitForGitHubPages(imageUrls[0]);

  const accessToken = await refreshTikTokToken();
  await sendDraftToTikTok(accessToken, lesson.title, lesson.description, imageUrls);

  history.nextNumber += 1;
  history.themeIndex = (history.themeIndex + 1) % APPROVED_THEMES.length;
  history.usedTopics.push(lesson.topic);
  fs.writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2), 'utf8');
  gitPush([HISTORY_PATH], `Mark ${lessonId} as sent`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
