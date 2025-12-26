document.addEventListener('DOMContentLoaded', () => {
  /* ===============================
     AUDIO HELPERS
  =============================== */
  const loadAudio = (src) => {
    try {
      const a = new Audio(src);
      a.volume = 0.3;
      return a;
    } catch {
      return null;
    }
  };

  const soundClick = loadAudio('assets/sounds/click.mp3');
  const soundFav = loadAudio('assets/sounds/fav.mp3');

  const playSound = (s) => {
    if (!s) return;
    try {
      s.currentTime = 0;
      s.play().catch(() => {});
    } catch {}
  };

  /* ===============================
     DOA AUDIO
  =============================== */
  const doaAudio = new Audio();
  doaAudio.volume = 0.8;
  let isPlayingDoa = false;
  let currentDoaSrc = null;

  function playDoaAudio(src, btn = null) {
    if (!src) return;

    if (currentDoaSrc === src) {
      if (isPlayingDoa) {
        doaAudio.pause();
        isPlayingDoa = false;
        if (btn) btn.textContent = '▶️ Play';
      } else {
        doaAudio.play().catch(() => {});
        isPlayingDoa = true;
        if (btn) btn.textContent = '⏸ Pause';
      }
      return;
    }

    doaAudio.pause();
    doaAudio.currentTime = 0;
    doaAudio.src = src;
    doaAudio.play().catch(() => {});
    currentDoaSrc = src;
    isPlayingDoa = true;
    if (btn) btn.textContent = '⏸ Pause';

    doaAudio.onended = () => {
      isPlayingDoa = false;
      if (btn) btn.textContent = '▶️ Play';
    };
    doaAudio.onerror = () => {
      console.warn('Audio error, fallback ke text-to-speech');
      isPlayingDoa = false;
      if (btn) btn.textContent = '▶️ Play';
    };
  }

  /* ===============================
     STATE
  =============================== */
  let doaList = [];
  let filteredDoa = [];
  let favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
  let isFavMode = false;
  let currentPage = 1;
  const perPage = 4;

  /* ===============================
     DOM
  =============================== */
  const doaListEl = document.getElementById('doaList');
  const searchInput = document.getElementById('searchInput');
  const kategoriSelect = document.getElementById('kategoriSelect');
  const allBtn = document.getElementById('allBtn');
  const favViewBtn = document.getElementById('favViewBtn');
  const paginationEl = document.getElementById('pagination');
  const voiceBtn = document.getElementById('voiceBtn');

  /* ===============================
     TEXT UTILS
  =============================== */
  const escapeHtml = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const normalizeText = (t = '') =>
    t
      .toLowerCase()
      .replace(/[.,!?]/g, '')
      .replace(/\b(doa|tolong|bacakan|ya|dong|apa)\b/g, '')
      .replace(/\s+/g, ' ')
      .trim();

  /* ===============================
     LOAD DATA
  =============================== */
  fetch('data/doa.json')
    .then((r) => r.json())
    .then((data) => {
      doaList = Array.isArray(data) ? data : [];
      renderDoa();
    })
    .catch(() => {
      if (doaListEl) doaListEl.innerHTML = '<p style="text-align:center;color:#999;">Gagal memuat doa.</p>';
    });

  /* ===============================
     RENDER DOA
  =============================== */
  function renderDoa() {
    if (!doaListEl) return;

    const kw = normalizeText(searchInput?.value || '');
    const base = isFavMode ? doaList.filter((d) => favorites.includes(d.id)) : doaList;

    filteredDoa = base.filter((d) => {
      const text = normalizeText(`${d.nama} ${d.latin || ''} ${d.arti || ''} ${(d.keywords || []).join(' ')}`);
      return !kw || text.includes(kw);
    });

    doaListEl.innerHTML = '';

    if (filteredDoa.length === 0) {
      doaListEl.innerHTML = '<p style="text-align:center;color:#999;">Doa tidak ditemukan 😔</p>';
      return;
    }

    const start = (currentPage - 1) * perPage;
    const end = currentPage * perPage;

    filteredDoa.slice(start, end).forEach((d) => {
      const card = document.createElement('div');
      card.className = 'doa-card';
      card.innerHTML = `
        <h3>${escapeHtml(d.nama)}</h3>
        <p><b>Arab:</b> ${escapeHtml(d.arab || '')}</p>
        <p><b>Latin:</b> ${escapeHtml(d.latin || '')}</p>
        <p><b>Arti:</b> ${escapeHtml(d.arti || '')}</p>
        <div class="doa-actions">
          <button class="play1">▶️ Play 1</button>
          <button class="play2">▶️ Play 2</button>
          <button class="fav">${favorites.includes(d.id) ? '⭐ Favorit' : '☆ Simpan'}</button>
        </div>
      `;

      const play1Btn = card.querySelector('.play1');
      const play2Btn = card.querySelector('.play2');
      const favBtn = card.querySelector('.fav');

      play1Btn.onclick = () => {
        playSound(soundClick);
        if (d.audio1) playDoaAudio(d.audio1, play1Btn);
        else speak(`${d.nama}. ${d.latin}. Artinya ${d.arti}`);
      };

      play2Btn.onclick = () => {
        playSound(soundClick);
        if (d.audio2) {
          const audio2 = new Audio(d.audio2);
          audio2.volume = 0.8;
          audio2.onerror = () => {
            console.warn('Audio2 error, fallback ke TTS');
            speak(d.arti); // hanya baca arti
          };
          audio2.play().catch(() => {
            console.warn('Audio2 gagal, fallback ke TTS');
            speak(d.arti); // hanya baca arti
          });
        } else {
          speak(d.arti); // fallback ke TTS kalau file audio2 ga ada
        }
      };

      favBtn.onclick = () => {
        if (favorites.includes(d.id)) favorites = favorites.filter((x) => x !== d.id);
        else favorites.push(d.id);
        localStorage.setItem('favorites', JSON.stringify(favorites));
        renderDoa();
        playSound(soundFav);
      };

      doaListEl.appendChild(card);
    });

    renderPagination();
  }

  /* ===============================
     PAGINATION
  =============================== */
  function renderPagination() {
    if (!paginationEl) return;
    paginationEl.innerHTML = '';

    const pageCount = Math.ceil(filteredDoa.length / perPage);
    if (pageCount <= 1) return;

    for (let i = 1; i <= pageCount; i++) {
      const btn = document.createElement('button');
      btn.textContent = i;
      btn.disabled = i === currentPage;
      btn.onclick = () => {
        currentPage = i;
        renderDoa();
      };
      paginationEl.appendChild(btn);
    }
  }

  /* ===============================
     SPEAK
  =============================== */
  function speak(text) {
    if (!text || !window.speechSynthesis) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'id-ID';
      speechSynthesis.speak(u);
    } catch {}
  }

  /* ===============================
     SEARCH & FILTER
  =============================== */
  if (searchInput)
    searchInput.oninput = () => {
      currentPage = 1;
      renderDoa();
    };
  if (kategoriSelect)
    kategoriSelect.onchange = () => {
      currentPage = 1;
      renderDoa();
    };

  if (allBtn)
    allBtn.onclick = () => {
      isFavMode = false;
      currentPage = 1;
      renderDoa();
    };
  if (favViewBtn)
    favViewBtn.onclick = () => {
      isFavMode = true;
      currentPage = 1;
      renderDoa();
    };

  /* ===============================
     VOICE SEARCH
  =============================== */
  let recognition;
  if (voiceBtn && 'webkitSpeechRecognition' in window) {
    recognition = new webkitSpeechRecognition();
    recognition.lang = 'id-ID';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    voiceBtn.onclick = () => {
      recognition.start();
      voiceBtn.textContent = '🎤 Mendengarkan...';
    };

    recognition.onresult = (event) => {
      const speechResult = event.results[0][0].transcript;
      searchInput.value = speechResult;
      currentPage = 1;
      renderDoa();
      voiceBtn.textContent = '🎤';
    };

    recognition.onerror = () => {
      voiceBtn.textContent = '🎤';
    };

    recognition.onend = () => {
      voiceBtn.textContent = '🎤';
    };
  } else if (voiceBtn) {
    voiceBtn.disabled = true;
    voiceBtn.title = 'Browser tidak mendukung pencarian suara';
  }
});
