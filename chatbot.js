/* SAFE HEADER LOAD (clone) */
/* SAFE HEADER LOAD (FIXED) */
document.addEventListener('DOMContentLoaded', () => {
  const placeholder = document.getElementById('header-placeholder');
  if (!placeholder || placeholder.hasChildNodes()) return;

  fetch('index.html')
    .then(r => r.text())
    .then(html => {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const header = doc.querySelector('header');
      if (header) placeholder.appendChild(header.cloneNode(true));
    })
    .catch(e => console.log('Header fetch failed:', e));
});
let doaData = [];
let doaReady = false;

let doaIndex = [];

fetch('data/doa.json')
  .then((r) => r.json())
  .then((json) => {
    doaData = json;
    doaIndex = [];
    doaReady = true;

    for (const doa of doaData) {
      for (const kw of doa.keywords) {
        doaIndex.push({
          keyword: norm(kw),
          doa,
        });
      }
    }
  })
  .catch((err) => console.error('Gagal load doa.json', err));

/* ---------------------ex-----
   ELEMENTS
   -------------------------- */
const chatArea = document.getElementById('chatArea');
const chatInput = document.getElementById('chatInput');
const chatSend = document.getElementById('chatSend');
const chatMic = document.getElementById('chatMic');
const badgeLabel = document.getElementById('badgeLabel');
const pointsLabel = document.getElementById('pointsLabel');
const modeName = document.getElementById('modeName');
const modeHelp = document.getElementById('modeHelp');
const modeArea = document.getElementById('modeArea');

/* --------------------------
   STORAGE (points & badges)
   -------------------------- */
const STORAGE_KEY = 'doa_anak_progress_v1';
function loadProgress() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { points: 0, badges: [], learned: [] };
  try {
    return JSON.parse(raw);
  } catch (e) {
    return { points: 0, badges: [], learned: [] };
  }
}
let doaAudioPlaying = false;

function saveProgress(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
let state = loadProgress();
function addPoints(n, reason) {
  state.points = (state.points || 0) + n;
  saveProgress(state);
  refreshPointsBadge();

  // ⛔ jangan TTS untuk sistem poin
  addMessage(`+${n} poin (${reason})`, 'bot-system');
}
function refreshPointsBadge() {
  pointsLabel.textContent = `Poin: ${state.points || 0}`;
  // badge tiers
  const p = state.points || 0;
  let b = 'Pemula';
  if (p >= 151) b = '🏆 Bintang Doa';
  else if (p >= 51) b = '⭐ Anak Hebat';
  badgeLabel.textContent = b;
}

/* initialize UI */
refreshPointsBadge();

/* --------------------------
   TTS helper
   -------------------------- */
function renderDoaCard(doa) {
  // STOP chatbot bicara dulu kalau ada audio doa

  // wrapper chat row
  const row = document.createElement('div');
  row.className = 'chat-row bot';

  // card bubble
  const card = document.createElement('div');
  card.className = 'chat-bot doa-card';

  card.innerHTML = `
    <div class="doa-header">
      <strong>${doa.nama}</strong>
      <span class="doa-mic" id="mic-${doa.id}" title="Putar audio doa">🎧</span>
    </div>
    <div class="doa-arab">${doa.arab}</div>
    <div class="doa-latin">${doa.latin}</div>
    <div class="doa-arti">${doa.arti}</div>
  `;

  row.appendChild(card);
  chatArea.appendChild(row);
  chatArea.scrollTop = chatArea.scrollHeight;

  setupDoaAudio(doa);
}
function speak(text) {
  try {
    if (doaAudioPlaying) return;
    if (!window.speechSynthesis) return;

    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'id-ID';
    speechSynthesis.speak(u);
  } catch (e) {
    console.warn('TTS gagal:', e);
  }
}

function setupDoaAudio(doa) {
  const mic = document.getElementById(`mic-${doa.id}`);

  let a1 = doa.audio1 ? new Audio(doa.audio1) : null;
  let a2 = doa.audio2 ? new Audio(doa.audio2) : null;

mic.onclick = async () => {
  try {
    speechSynthesis.cancel(); // stop chatbot sementara
    doaAudioPlaying = true;
    mic.classList.add('pulse');

    if (!a1) {
      stopDoa();
      return;
    }

    await a1.play();

    a1.onended = async () => {
      if (a2) {
        await a2.play();
        a2.onended = stopDoa;
      } else {
        stopDoa();
      }
    };

    a1.onerror = stopDoa;
    if (a2) a2.onerror = stopDoa;
  } catch (err) {
    console.warn('Audio doa gagal diputar:', err);
    stopDoa(); // 🔥 INI YANG SEBELUMNYA KURANG
  }
};


  function stopDoa() {
    doaAudioPlaying = false;
    mic.classList.remove('pulse');
  }
}

function findDoaByName(name) {
  const key = norm(name);
  return doaData.find((d) => norm(d.nama) === key);
}

chatMic.addEventListener('click', () => {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    alert('Browser tidak mendukung rekam suara.');
    return;
  }

  const recognition = new SR();
  recognition.lang = 'id-ID';
  recognition.continuous = false;      // ⬅️ sekali rekam
  recognition.interimResults = false;  // ⬅️ tunggu selesai bicara

  chatMic.textContent = '🎤...';

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    chatInput.value = transcript;
    chatMic.textContent = '🎙️';
    sendMessage(); // ⬅️ LANGSUNG KIRIM
  };

  recognition.onerror = (e) => {
    console.warn('Speech error:', e);
    chatMic.textContent = '🎙️';
  };

  recognition.onend = () => {
    chatMic.textContent = '🎙️';
  };

  recognition.start();
});




/* --------------------------
   UTIL: fuzzy / normalizer / typo-fixer
   -------------------------- */
function norm(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, '')
    .trim();
}
function fuzzyContains(text, key) {
  text = norm(text).replace(/\s+/g, '');
  key = norm(key).replace(/\s+/g, '');
  if (!key) return false;
  // if full substring
  if (text.includes(key)) return true;
  // try partial match
  return text.includes(key) || key.includes(text) || text.includes(key.substring(0, Math.min(4, key.length)));
}
// simple typo map (common)
const typoMap = {
  tidr: 'tidur',
  tdr: 'tidur',
  mkan: 'makan',
  mkn: 'makan',
  sblm: 'sebelum',
  sblmnya: 'sebelum',
  sesdh: 'sesudah',
  sesdhmkn: 'sesudah makan',
  do: 'doa',
  doa2: 'doa',
  bismillahh: 'bismillah',
};
function fixTypos(s) {
  let w = s
    .split(/\s+/)
    .map((tok) => {
      const k = norm(tok);
      return typoMap[k] ? typoMap[k] : tok;
    })
    .join(' ');
  return w;
}

/* --------------------------
   CORE DATA: doa, kuis, stories, tebak
   -------------------------- */
const kuisBank = [
  { q: 'Nabi pertama yang diciptakan oleh Allah adalah siapa?', a: 'nabi adam' },
  { q: 'Nabi yang bisa berbicara sejak bayi untuk membela ibunya adalah siapa?', a: 'nabi isa' },
  { q: 'Kitab suci umat Islam yang diturunkan kepada Nabi Muhammad adalah apa?', a: 'alquran' },
  { q: 'Siapa malaikat yang bertugas menyampaikan wahyu kepada para nabi?', a: 'malaikat jibril' },
  { q: 'Rumah ibadah umat Islam disebut apa?', a: 'masjid' },
  { q: 'Nabi yang mendapat perintah membuat kapal besar untuk menghadapi banjir besar adalah siapa?', a: 'nabi nuh' },
  { q: 'Rukun Islam yang dilakukan dengan berpuasa selama bulan Ramadan adalah rukun Islam ke berapa?', a: '4' },
  { q: 'Siapa nabi terakhir dan penutup para nabi?', a: 'nabi muhammad' },
  { q: 'Bulan dalam Islam yang penuh pahala dan diwajibkan berpuasa adalah bulan apa?', a: 'ramadan' },
  { q: 'Dua malaikat yang mencatat amal baik dan buruk manusia disebut apa?', a: 'raqib atid' },
];
const dongengList = [
  'Ada seekor kelinci sombong, tapi kura-kura sabar mengajarkan arti kerja keras.',
  'Seekor semut menolong burung merpati, lalu mereka teman selamanya.',
  'Burung kecil takut terbang, tapi setelah berani mencoba, ia berhasil.',
];
const tebakList = [
  { q: 'Aku bulat dan muncul pagi hari. Siapa aku?', a: 'matahari' },
  { q: 'Aku suka keju dan kecil. Siapa aku?', a: 'tikus' },
  { q: 'Untuk menghapus tulisan dari kertas. Siapa aku?', a: 'penghapus' },
];

/* --------------------------
   STATE: current mode, learning, quizzes, stories, dzikir
   -------------------------- */
function resetAllState() {
  currentQuiz = null;
  currentLearn = null;
  currentStory = null;
  currentTebak = null;
  dzikirState = null;

  // hentikan audio & TTS
  doaAudioPlaying = false;
  if (window.speechSynthesis) speechSynthesis.cancel();
}
/* --------------------------
   UI helpers
   -------------------------- */
function addMessage(text, sender = 'bot') {
  // wrapper row
  const row = document.createElement('div');
  row.className = `chat-row ${sender}`;

  // bubble
  const bubble = document.createElement('div');
  bubble.className = sender === 'user' ? 'chat-user' : 'chat-bot';
  bubble.textContent = text;

  row.appendChild(bubble);
  chatArea.appendChild(row);

  chatArea.scrollTop = chatArea.scrollHeight;

  if (sender === 'bot' && !doaAudioPlaying) {
    speak(text);
  }
}

function botSay(text) {
  addMessage(text, 'bot');
}
/* --------------------------
   Mode buttons wiring
   -------------------------- */
document.querySelectorAll('.mode-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.mode-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');

    const mode = btn.dataset.mode;
    resetAllState();   // ← TAMBAH INI
    MODE = mode;

    modeName.textContent = mode.charAt(0).toUpperCase() + mode.slice(1);

    // 👇 mapping mode → chat input
    const modeMessageMap = {
      normal: 'normal',
      learn: 'mulai belajar doa',
      quiz: 'kuis',
      story: 'cerita interaktif',
      tebak: 'tebak',
      dzikir: 'dzikir',
      sleep: 'temani tidur',
    };

    const msg = modeMessageMap[mode];
    if (msg) {
      addMessage(msg, 'user');
      setTimeout(() => processMessage(msg), 300);
    }
  });
});

/* default active */
document.getElementById('modeNormal').classList.add('active');

/* --------------------------
   Learning mode: step-by-step
   -------------------------- */
function startLearning(doaKey) {
  const key = doaKey.toLowerCase();
  const d = doaData.find((d) => norm(d.nama) === norm(key));

  if (!d) {
    botSay('Maaf, doa itu belum ada di koleksi. Coba doa lain ya.');
    return;
  }
  const steps = [
    { text: `Kita akan belajar: ${key}`, score: 0 },
    { text: `Arab: ${d.arab}`, score: 0 },
    { text: `Latin: ${d.latin}`, score: 0 },
    {
      text: `Sekarang ulangi bagian Latin setelah aku (ketik apa yang kamu ucapkan).`,
      score: 2,
      expect: d.latin,
    },
  ];
  currentLearn = { key, steps, index: 0 };
  botSay('Mulai mode belajar! Yuk ikuti.');
  nextLearnStep();
}
function nextLearnStep() {
  if (!currentLearn) return;
  const s = currentLearn.steps[currentLearn.index];
  if (!s) {
    botSay('Yeay! Kamu selesai belajar doa ini. Dapat poin +10 🎉');
    addPoints(10, 'selesai belajar');
    state.learned = state.learned || [];
    if (!state.learned.includes(currentLearn.key)) {
      state.learned.push(currentLearn.key);
      saveProgress(state);
    }
    currentLearn = null;
    MODE = 'normal';
    modeHelp.textContent = 'Bot siap jadi temanmu 😊';
    return;
  }
  botSay(s.text);
  // if step expects user repeat, wait for user input (nextLearnStep will be triggered from processing user message)
  if (s.score === 0 && !s.expect) {
    currentLearn.index++;
    setTimeout(nextLearnStep, 1200);
  } else {
    // wait for user to type; mark that we are expecting repetition
    modeHelp.textContent = `Silakan ulangi: ${s.text}`;
  }
}

/* --------------------------
   Quiz mode: pick random, check answer fuzzy
   -------------------------- */
function startQuiz() {
  doaAudioPlaying = false; // 🔥 PAKSA NORMAL
  speechSynthesis.cancel();
  currentQuiz = kuisBank[Math.floor(Math.random() * kuisBank.length)];
  botSay('Pertanyaan kuis: ' + currentQuiz.q);
  modeHelp.textContent = 'Jawab pertanyaan di kotak chat atau pakai suara.';
}
function checkQuizAnswer(user) {
  if (!currentQuiz) return;

  const ans = norm(user);
  const correct = norm(currentQuiz.a);

  const isCorrect =
    ans.includes(correct) ||
    correct.includes(ans) ||
    ans.includes(correct.split(' ')[0]);

  if (isCorrect) {
    botSay('Jawaban kamu BENAR! 🎉 +10 poin');
    addPoints(10, 'kuis benar');
  } else {
    botSay(`Jawaban belum tepat 😅`);
    botSay(`Jawaban yang benar adalah: ${currentQuiz.a}`);
  }

  currentQuiz = null;

  setTimeout(() => {
    botSay('Mau kuis lagi? Ketik "kuis" atau mau tanya yang lain 😊');
  }, 500);
}

/* --------------------------
   Story interactive
   -------------------------- */
const storyTree = {
  start: {
    text: 'Mau cerita tentang (1) Hewan, (2) Petualangan, atau (3) Pahlawan? Ketik 1/2/3.',
    choices: { 1: 'animal', 2: 'adventure', 3: 'hero' },
  },
  animal: { text: 'Ada kelinci dan kura-kura. Kelinci mau pamer. Mau kelanjutan (a) Kelinci belajar, (b) Kelinci kalah?', choices: { a: 'animalLearn', b: 'animalLose' } },
  animalLearn: { text: 'Kelinci belajar dan jadi teman kura-kura. Tamat. +5 poin', end: true, points: 5 },
  animalLose: { text: 'Kelinci kalah dalam lomba, tapi belajar pentingnya sabar. Tamat. +3 poin', end: true, points: 3 },
  adventure: { text: 'Kamu memilih petualangan. Mau naik (a) kapal (b) pesawat?', choices: { a: 'ship', b: 'plane' } },
  ship: { text: 'Di kapal kamu bertemu ikan besar. Tamat. +4 poin', end: true, points: 4 },
  plane: { text: 'Di pesawat ada bintang. Tamat. +4 poin', end: true, points: 4 },
  hero: { text: 'Pahlawan menolong kota. Tamat. +6 poin', end: true, points: 6 },
};
function startStory() {
  currentStory = { node: 'start' };
  botSay(storyTree.start.text);
}
function handleStoryChoice(msg) {
  const node = storyTree[currentStory.node];
  // find choice
  const s = msg.trim().toLowerCase();
  if (node.choices) {
    // accept numeric or letter choices
    let key = null;
    if (s === '1' || s === '2' || s === '3') {
      key = node.choices[s];
    } else {
      // letters a/b etc (map)
      const first = s[0];
      if (node.choices[first]) key = node.choices[first];
      else {
        botSay('Maaf, pilihannya tidak ada. Coba lagi.');
        return;
      }
    }
    currentStory.node = key;
    const next = storyTree[key];
    botSay(next.text);
    if (next.end) {
      addPoints(next.points || 0, 'menyelesaikan cerita');
      currentStory = null;
    } else {
      // more choices: wait for user
    }
  } else {
    botSay('Tidak ada pilihan saat ini.');
  }
}

/* --------------------------
   Dzikir mode
   -------------------------- */
const dzikirPhrases = {
  subhanallah: 'Subhanallah',
  alhamdulillah: 'Alhamdulillah',
  allahuakbar: 'Allahu Akbar',
};
function startDzikir(phraseKey, targetCount = 33) {
  const phrase = dzikirPhrases[phraseKey] || phraseKey;
  dzikirState = { phrase, count: 0, target: targetCount };
  botSay(`Mulai dzikir: ${phrase} sebanyak ${targetCount}x. Ketik 'sudah' setiap selesai 1x atau tekan 'auto' untuk hitungan otomatis.`);
  modeHelp.textContent = "Ketik 'sudah' setiap kali kamu menyelesaikan satu hitungan. Ketik 'auto' untuk biarkan aku hitung (suara).";
}
function advanceDzikir() {
  if (!dzikirState) return;
  dzikirState.count++;
  botSay(`(${dzikirState.count}/${dzikirState.target}) ${dzikirState.phrase}`);
  if (dzikirState.count >= dzikirState.target) {
    botSay('Alhamdulillah, selesai dzikir! +5 poin');
    addPoints(5, 'selesai dzikir');
    dzikirState = null;
  }
}

/* --------------------------
   Sleep mode (temani tidur)
   -------------------------- */
   function startSleepMode(type = 'default') {
  if (type === 'default') {
    botSay('Baik, aku temani tidur ya. Aku bacakan doa tidur dan suara lembut.');
    const d = doaData.find((d) => norm(d.nama) === norm('doa sebelum tidur'));

  if (d) speak(`${d.arab}. ${d.latin}. Artinya: ${d.arti}`);
  // soft lullaby via TTS
  setTimeout(() => speak('Selamat malam. Semoga mimpi indah. Aku akan tetap di sini jika kamu perlu.'), 2500);
  }

  if (type === 'calming') {
    botSay('Tenang ya, kamu aman. Aku di sini menemani 🤍');
    speak('Tarik napas pelan-pelan...');
  }

  if (type === 'doa-only') {
    const d = doaData.find(d => norm(d.nama) === norm('doa sebelum tidur'));
    if (d) speak(`${d.arab}. ${d.latin}. Artinya: ${d.arti}`);
  }

  addPoints(5, 'temani tidur');
}

/* --------------------------
   Tebak-tebakan
   ------------------ -------- */


function startTebak() {
  currentTebak = tebakList[Math.floor(Math.random() * tebakList.length)];
  tebakAttempts = 0;
  botSay('Tebak-tebakan: ' + currentTebak.q);
}

function checkTebak(ans) {
  if (!currentTebak) return;
  tebakAttempts++;
  
  if (fuzzyContains(ans, currentTebak.a)) {
    botSay('Betul! +3 poin 🎉');
    addPoints(3, 'tebak benar');
    currentTebak = null;
    botSay('Mau tebak-tebakan lagi? Ketik "tebak" 😊atau ada yang mau ditanyakan, tanyakan saja?');
  } else if (tebakAttempts >= 2) {
    botSay(`Jawaban yang benar adalah: ${currentTebak.a}`);
    currentTebak = null;
    botSay('Mau tebak-tebakan lagi? Ketik "tebak" 😊 atau ada yang mau ditanyakan, tanyakan saja?');
  } else {
    botSay('Belum tepat, coba lagi ya 😊');
  }
}

/* --------------------------
   Knowledge Q/A (simple)
   -------------------------- */
function askKnowledge(msg) {
  for (const k in { 'kenapa hujan': 1, 'kenapa malam': 1, 'nabi pertama': 1 }) {
    if (fuzzyContains(msg, k)) {
      if (k === 'kenapa hujan') return 'Hujan karena air menguap lalu turun lagi sebagai air hujan.';
      if (k === 'kenapa malam') return 'Karena bumi berputar sehingga beberapa bagian tidak terkena cahaya matahari.';
      if (k === 'nabi pertama') return 'Nabi pertama adalah Nabi Adam AS.';
    }
  }
  return null;
}

/* --------------------------
   Process user message (core)
   -------------------------- */
function detectMood(text) {
  const t = norm(text);
  if (t.includes('sedih') || t.includes('nangis') || t.includes('capek')) return '😢';
  if (t.includes('senang') || t.includes('happy') || t.includes('hore')) return '😄';
  if (t.includes('marah') || t.includes('kesal')) return '😡';
  return '😐';
}

function processMessage(raw) {
  
  if (!doaReady) {
    botSay('Tunggu sebentar ya, doa sedang disiapkan...');
    return;
  }
  const fixed = fixTypos(raw);
  const text = norm(fixed);
// PRIORITAS KHUSUS MODE BELAJAR
const sleepVariants = [
  {
    keywords: ['temani tidur'],
    type: 'default'
  },
  {
    keywords: ['aku takut', 'temani aku', 'takut gelap'],
    type: 'calming'
  },
  {
    keywords: ['bacain doa tidur', 'doa tidur dong'],
    type: 'doa-only'
  }
];


const mood = detectMood(raw);

// cek dulu apakah ada intent penting
const hasIntent =
  fuzzyContains(text, 'doa') ||
  fuzzyContains(text, 'kuis') ||
  fuzzyContains(text, 'dzikir') ||
  fuzzyContains(text, 'cerita') ||
  fuzzyContains(text, 'tebak') 

if (!hasIntent) {
  if (mood === '😢') {
    botSay('Aku dengar kamu lagi sedih. Mau cerita? Aku temani ya 🤍');
    return;
  }
  if (mood === '😄') {
    botSay('Wah, senang dengarnya! Mau main atau belajar? 😄');
    return;
  }
  if (mood === '😡') {
    botSay('Kelihatannya kamu lagi kesal. Tarik napas dulu yuk.');
    return;
  }
}


  // if in learning mode expecting repetition
  if (MODE === 'learn' && currentLearn && currentLearn.steps[currentLearn.index] && currentLearn.steps[currentLearn.index].expect) {
    const expected = norm(currentLearn.steps[currentLearn.index].expect || '');
    // if the user repeats enough
    if (expected && (text.includes(expected.substring(0, 4)) || expected.includes(text))) {
      addPoints(currentLearn.steps[currentLearn.index].score || 1, 'ulang belajar');
      botSay('Bagus! Kamu berhasil mengulangnya 😊');
      currentLearn.index++;
      setTimeout(nextLearnStep, 700);
      return;
    } else {
      botSay('Lumayan, coba ulangi lagi ya. Aku bantu :)');
      return;
    }
  }
// 🔥 PRIORITY: MULAI BELAJAR (HARUS PALING ATAS)
if (
  fuzzyContains(text, 'mulai belajar') ||
  fuzzyContains(text, 'belajar doa')
) {
  resetAllState();          // ← MATIKAN STATE LAMA
  MODE = 'learn';

  // update UI mode (jika ada)
  document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('modeLearn')?.classList.add('active');
  modeName.textContent = 'Belajar';

  // cari doa
  for (const d of doaData) {
    if (fuzzyContains(text, d.nama)) {
      startLearning(d.nama);
      return;
    }
  }

  botSay("Doa apa yang ingin kamu pelajari? Contoh: 'doa sebelum tidur'.");
  return;
}

  // MODE-specific quick actions
if (
  MODE === 'quiz' &&
  currentQuiz &&
  !fuzzyContains(text, 'belajar') &&
  !fuzzyContains(text, 'mulai')
) {
  checkQuizAnswer(raw);
  return;
}
  if (MODE === 'tebak' && currentTebak) {
    checkTebak(raw);
    return;
  }
  if (MODE === 'dzikir' && dzikirState) {
    if (text.includes('sudah') || text.includes('1') || text.includes('ok')) {
      speechSynthesis.cancel();
      advanceDzikir();
      

      return;
    }
    if (text.includes('auto')) {
      // automatic count till target with small delay
      const remaining = dzikirState.target - dzikirState.count;
      botSay('Aku akan bantu hitung otomatis ya...');
      let i = 0;
      const iv = setInterval(() => {
        speechSynthesis.cancel();
        advanceDzikir();

        i++;
        if (dzikirState == null || i >= remaining) clearInterval(iv);
      }, 600);
      return;
    }
  }
  if (MODE === 'story' && currentStory) {
    handleStoryChoice(raw);
    return;
  }

  // General handling (normal, kui mode or fallback in any mode)
  // 1. check simple commands

  if (fuzzyContains(text, 'list doa') || fuzzyContains(text, 'semua doa') || fuzzyContains(text, 'cari doa')) {
    botSay('Beberapa doa yang tersedia: ' + doaData.map((d) => d.nama).join(', '));
    return;
  }

  if (fuzzyContains(text, 'kuis') || fuzzyContains(text, 'mulai kuis')) {
    MODE = 'quiz';
    document.querySelectorAll('.mode-btn').forEach((b) => b.classList.remove('active'));
    document.getElementById('modeQuiz').classList.add('active');
    modeName.textContent = 'Kuis';
    startQuiz();
    return;
  }

  if (fuzzyContains(text, 'dongeng') || fuzzyContains(text, 'cerita')) {
    MODE = 'normal';
    const story = dongengList[Math.floor(Math.random() * dongengList.length)];
    botSay('Oke, dengarkan dongeng singkat: ' + story);
    addPoints(5, 'dengarkan dongeng');
    return;
  }

  if (fuzzyContains(text, 'tebak')) {
    MODE = 'tebak';
    document.querySelectorAll('.mode-btn').forEach((b) => b.classList.remove('active'));
    document.getElementById('modeTebak').classList.add('active');
    modeName.textContent = 'Tebak-tebakan';
    startTebak();
    return;
  }

  if (fuzzyContains(text, 'cerita interaktif') || fuzzyContains(text, 'cerita pilihan') || fuzzyContains(text, 'mulai cerita')) {
    MODE = 'story';
    document.querySelectorAll('.mode-btn').forEach((b) => b.classList.remove('active'));
    document.getElementById('modeStory').classList.add('active');
    modeName.textContent = 'Cerita';
    startStory();
    return;
  }

  if (fuzzyContains(text, 'dzikir') || fuzzyContains(text, 'subhanallah') || fuzzyContains(text, 'alhamdulillah')) {
    MODE = 'dzikir';
    document.querySelectorAll('.mode-btn').forEach((b) => b.classList.remove('active'));
    document.getElementById('modeDzikir').classList.add('active');
    modeName.textContent = 'Dzikir';
    // choose phrase
    if (fuzzyContains(text, 'subhan')) startDzikir('subhanallah', 33);
    else if (fuzzyContains(text, 'alham')) startDzikir('alhamdulillah', 33);
    else startDzikir('subhanallah', 33);
    return;
  }

for (const v of sleepVariants) {
  for (const kw of v.keywords) {
    if (fuzzyContains(text, kw)) {
      MODE = 'sleep';
      document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
      document.getElementById('modeSleep').classList.add('active');
      modeName.textContent = 'Temani Tidur';
      startSleepMode(v.type); // 👈 kirim varian
      return;
    }
  }
}

    if (fuzzyContains(text, 'mulai belajar') || fuzzyContains(text, 'belajar doa')) {
    // try to find which doa
    for (const d of doaData) {
      if (fuzzyContains(text, d.nama)) {
        startLearning(d.nama);

        return;
      }
    }
    // ask which doa
    botSay("Doa mana yang ingin kamu pelajari? Contoh: 'doa sebelum tidur', atau ketik 'list doa'.");
    return;
  }
// === DOA MATCH PRIORITAS ===
let matchedDoa = null;
let bestScore = 0;

for (const item of doaIndex) {
  const key = item.keyword;
  if (!key || key.length < 2) continue; // minimal 2 huruf
  let score = 0;
  if (text.includes(key)) score += 5;
  if (fuzzyContains(text, key)) score += 2;
  if (score > bestScore) {
    bestScore = score;
    matchedDoa = item.doa;
  }
}

if (matchedDoa) {
  renderDoaCard(matchedDoa);
  botSay(`Ini ${matchedDoa.nama} ya 😊`);
  addPoints(5, 'minta doa');
  return; // stop di sini, jangan lanjut ke sleep mode
}



  // knowledge Q/A
  const knowledgeAns = askKnowledge(text);
  if (knowledgeAns) {
    botSay(knowledgeAns);
    addPoints(2, 'tanya sains');
    return;
  }

  // check for explicit doa ask

  // auto-reading request: "bacain aku ini: [text]" or "bacain: ..."
  if (text.startsWith('bacain') || text.startsWith('bacakan')) {
    const parts = rawTextAfter(raw, ':') || rawTextAfter(raw, ' ');
    if (parts) {
      botSay('Baik, aku bacakan ya...');
      speak(parts);
      addPoints(2, 'auto reading');
      return;
    }
  }

  // fallback natural replies
  const casual = ['Wah menarik! Cerita lagi dong 😊', 'Aku dengerin kok, mau cerita apa hari ini?', 'Hehe, lucu juga! Mau dongeng atau kuis?', 'Aku suka ngobrol sama kamu! Mau apa sekarang?'];
  botSay(casual[Math.floor(Math.random() * casual.length)]);
}

/* helper get raw text after a token */
function rawTextAfter(raw, token) {
  try {
    const idx = raw.indexOf(token);
    if (idx >= 0) return raw.slice(idx + token.length).trim();
    return raw.split(' ').slice(1).join(' ').trim();
  } catch (e) {
    return null;
  }
}

/* --------------------------
   sendMessage handler
   -------------------------- */
function sendMessage() {
  const text = chatInput.value.trim();
  if (!text) return;
  addMessage(text, 'user');
  chatInput.value = '';
  // If currently in learning step that expects repetition, processing occurs inside processMessage
  setTimeout(() => processMessage(text), 300);
}

/* wire buttons & enter */
document.getElementById('chatSend').addEventListener('click', sendMessage);
chatInput.addEventListener('keydown', (e) => e.key === 'Enter' && sendMessage());

/* --------------------------
   welcome & optional query param check
   -------------------------- */
setTimeout(() => {
  botSay('Hai teman kecil! Aku Dona. Mau belajar doa, denger dongeng, main tebak-tebakan, atau kuis?');
}, 400);

/* reset progress button */
document.getElementById('resetProgress').addEventListener('click', () => {
  if (confirm('Reset progress? (Poin & Badge akan hilang)')) {
    state = { points: 0, badges: [], learned: [] };
    saveProgress(state);
    refreshPointsBadge();
    botSay('Progress di-reset. Mulai lagi ya!');
  }
});

/* --------------------------
   small utilities & finalize
   -------------------------- */


/* make sure progress shown on load */
refreshPointsBadge();