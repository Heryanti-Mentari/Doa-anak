// cSpell:disable

document.addEventListener('DOMContentLoaded', () => {
  /* =====================
     AUDIO EFFECT
  ===================== */
  const soundConfetti = new Audio('assets/sounds/applause-sound.mp3');
  soundConfetti.volume = 0.6;

  /* =====================
     DATA KUIS
  ===================== */
  const quizList = [
    // Pertanyaan teks biasa
    { type: 'text', question: 'Siapa nabi pertama dan nabi yang pertama kali diturunkan ke bumi?', answer: ['nabi Adam'], level: 1, audio: null },
    { type: 'text', question: 'Siapa nabi yang dikenal dengan kesabaran tinggi?', answer: ['nabi ayub'], level: 2, audio: null },
    { type: 'text', question: 'Sebutkan salah satu Asmaul Husna yang artinya Maha Pengasih?', answer: ['ar rahman'], level: 2, audio: null },
    { type: 'text', question: 'Siapa nabi yang menerima wahyu pertama kali?', answer: ['nabi muhammad'], level: 3, audio: null },

    // Pertanyaan audio
    { type: 'audio', question: 'Dengar doa berikut, ini doa apa?', answer: ['doa sebelum makan'], level: 5, audio: 'assets/sounds/doa_sebelum_makan.mp3' },
    { type: 'audio', question: 'Dengar doa berikut, ini doa apa?', answer: ['doa sebelum tidur'], level: 6, audio: 'assets/sounds/doa_sebelum_tidur.mp3' },
    { type: 'audio', question: 'Dengar doa berikut, ini doa apa?', answer: ['doa kedua orang tua'], level: 7, audio: 'assets/sounds/doa_kedua_ortu.mp3' },
    { type: 'audio', question: 'Dengar doa berikut, ini doa apa?', answer: ['doa keluar kamar'], level: 8, audio: 'assets/sounds/doa_keluar_kamar.mp3' },

    // Pertanyaan teks biasa
    { type: 'text', question: 'Siapa nabi yang dikenal dengan mukjizat membelah laut?', answer: ['nabi musa'], level: 8, audio: null },
    { type: 'text', question: 'Sebutkan salah satu Asmaul Husna yang artinya Maha Penyayang', answer: ['ar rahim'], level: 9, audio: null },
  ];

  /* =====================
     ELEMENT
  ===================== */
  const quizQuestionEl = document.getElementById('quizQuestion');
  const answerBox = document.getElementById('answerBox');
  const resultArea = document.getElementById('resultArea');
  const checkBtn = document.getElementById('checkBtn');
  const voiceBtn = document.getElementById('voiceBtn');

  // Cegah Enter di textarea agar tidak memicu aksi lain
  answerBox.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
    }
  });

  let questions = [...quizList]; // diacak
  let score = 0;
  let currentQuestion = null;
  let answered = false;

  /* =====================
     TEXT TO SPEECH (BOT)
  ===================== */
  function botSpeak(text) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'id-ID';
    utterance.pitch = 1.2;
    utterance.rate = 0.85;
    speechSynthesis.cancel();
    speechSynthesis.speak(utterance);
  }

  /* =====================
     UI BUBBLE
  ===================== */
  function addBubble(text, sender, correct = null) {
    const div = document.createElement('div');
    div.className = sender === 'user' ? 'bubble-user' : 'bubble-bot';
    div.textContent = text;

    if (correct === true) div.style.background = '#c8e6c9';
    if (correct === false) div.style.background = '#ffcdd2';

    resultArea.appendChild(div);
    resultArea.scrollTop = resultArea.scrollHeight;
  }

  /* =====================
     SOAL BERIKUTNYA
  ===================== */
  function nextQuestion() {
    answered = false;
    if (questions.length === 0) {
      showFinal();
      return;
    }

    const index = Math.floor(Math.random() * questions.length);
    const q = questions.splice(index, 1)[0];
    currentQuestion = q;

    quizQuestionEl.textContent = q.question;
    answerBox.value = '';
    resultArea.innerHTML = '';

    if (q.type === 'audio' && q.audio) {
      const audio = new Audio(q.audio);
      audio.play();
    } else {
      botSpeak(q.question);
    }
  }

  /* =====================
     CEK JAWABAN
  ===================== */
  function normalize(text) {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, ''); // hapus titik, koma, dll
  }

  function checkAnswer() {
    if (answered) return;

    const userAns = normalize(answerBox.value || '');
    const correctList = currentQuestion.answer.map((a) => normalize(a));

    resultArea.innerHTML = '';
    addBubble('Jawaban kamu: ' + userAns, 'user');

    if (!userAns) {
      addBubble('Yuk dijawab dulu ya 😊', 'bot');
      botSpeak('Yuk dijawab dulu');
      return;
    }

    answered = true;

    const isCorrect = correctList.some((ans) => userAns.includes(ans) || ans.includes(userAns));

    if (isCorrect) {
      score++;
      addBubble('⭐ Jawaban kamu BENAR! Hebat! 🎉', 'bot', true);
      botSpeak('Jawaban kamu benar. Hebat!');
    } else {
      addBubble('Belum tepat ya 😊 Jawaban yang benar: ' + currentQuestion.answer[0], 'bot', false);
      botSpeak('Belum tepat. Jawabannya adalah ' + currentQuestion.answer[0]);
    }

    // Tombol kontrol
    const btnWrap = document.createElement('div');
    btnWrap.style.marginTop = '10px';
    btnWrap.style.display = 'flex';
    btnWrap.style.gap = '10px';

    const replayBtn = document.createElement('button');
    replayBtn.textContent = '🔊 Dengarkan Lagi';
    replayBtn.className = 'big-btn';
    replayBtn.onclick = () => {
      if (currentQuestion.type === 'audio' && currentQuestion.audio) {
        const audio = new Audio(currentQuestion.audio);
        audio.play();
      } else {
        botSpeak(currentQuestion.question);
      }
    };

    const nextBtn = document.createElement('button');
    nextBtn.textContent = '➡️ Lanjut';
    nextBtn.className = 'big-btn';
    nextBtn.onclick = nextQuestion;

    btnWrap.appendChild(replayBtn);
    btnWrap.appendChild(nextBtn);
    resultArea.appendChild(btnWrap);
  }

  /* =====================
     HASIL AKHIR
  ===================== */
  function showFinal() {
    soundConfetti.currentTime = 0;
    soundConfetti.play().catch(() => {});
    startConfetti(3500);

    quizQuestionEl.textContent = '🎉 KUIS SELESAI 🎉';
    resultArea.innerHTML = '';

    const total = quizList.length;
    const percent = Math.round((score / total) * 100);

    let badge = '💪 Terus Belajar!';
    if (percent >= 80) badge = '🏆 Anak Sholeh Hebat!';
    else if (percent >= 60) badge = '🥈 Pintar & Rajin!';
    else if (percent >= 40) badge = '🥉 Lumayan Bagus!';

    const card = document.createElement('div');
    card.style.padding = '16px';
    card.style.borderRadius = '16px';
    card.style.background = '#fff3cd';
    card.style.textAlign = 'center';

    card.innerHTML = `
      <h2>${badge}</h2>
      <p>Skor kamu</p>
      <h1>${score} / ${total}</h1>
      <p>(${percent}%)</p>
    `;

    const retryBtn = document.createElement('button');
    retryBtn.textContent = '🔄 Ulangi Kuis';
    retryBtn.className = 'big-btn';
    retryBtn.onclick = () => location.reload();

    resultArea.appendChild(card);
    resultArea.appendChild(retryBtn);
  }

  checkBtn.addEventListener('click', checkAnswer);

  /* =====================
     CONFETTI EFFECT
  ===================== */
  const confettiCanvas = document.getElementById('confetti');
  const ctx = confettiCanvas.getContext('2d');

  function resizeCanvas() {
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  let confettiParticles = [];

  function createConfetti() {
    confettiParticles = [];
    for (let i = 0; i < 150; i++) {
      confettiParticles.push({
        x: Math.random() * confettiCanvas.width,
        y: Math.random() * confettiCanvas.height - confettiCanvas.height,
        size: Math.random() * 6 + 4,
        speed: Math.random() * 4 + 2,
        color: `hsl(${Math.random() * 360}, 80%, 60%)`,
        drift: Math.random() * 2 - 1,
      });
    }
  }

  function drawConfetti() {
    ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    confettiParticles.forEach((p) => {
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
      p.y += p.speed;
      p.x += p.drift;

      if (p.y > confettiCanvas.height) {
        p.y = -10;
        p.x = Math.random() * confettiCanvas.width;
      }
    });
  }

  function startConfetti(duration = 3000) {
    createConfetti();
    const start = Date.now();

    (function animate() {
      drawConfetti();
      if (Date.now() - start < duration) {
        requestAnimationFrame(animate);
      } else {
        ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
      }
    })();
  }

  let questionAudio = null;


  /* =====================
     VOICE INPUT
  ===================== */
  let recognition;
  let isListening = false;

  try {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) {
      recognition = new SR();
      recognition.lang = 'id-ID';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onresult = (e) => {
        const transcript = e.results[0][0].transcript.trim();
        answerBox.value = transcript;
        addBubble('Jawaban suara: ' + transcript, 'user');
        isListening = false;
        voiceBtn.textContent = '🎙️';
      };

      recognition.onerror = () => {
        addBubble('Suara tidak terdengar 😢', 'bot');
        isListening = false;
        voiceBtn.textContent = '🎙️';
      };

      recognition.onend = () => {
        isListening = false;
        voiceBtn.textContent = '🎙️';
      };
    }
  } catch {
    recognition = null;
  }

  voiceBtn &&
    voiceBtn.addEventListener('click', () => {
      if (!recognition) {
        alert('Browser tidak mendukung voice input');
        return;
      }
      if (isListening) return;

      answerBox.value = '';
      voiceBtn.textContent = '🎤 Bicara...';
      isListening = true;
      recognition.start();
    });

  /* =====================
     START QUIZ
  ===================== */
  nextQuestion();
});
