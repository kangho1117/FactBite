// ===== GLOBAL ERROR HANDLING FOR DEBUGGING =====
window.addEventListener('error', function(e) {
  const errMsg = `오류 발생: ${e.message}\n파일: ${e.filename}\n라인: ${e.lineno}:${e.colno}`;
  console.error(errMsg);
  const contentEl = document.getElementById('card-content');
  if (contentEl) {
    contentEl.innerHTML = `<span style="color: #ff6b6b; font-size: 0.9em; word-break: break-all;">${errMsg.replace(/\n/g, '<br>')}</span>`;
  }
});
window.addEventListener('unhandledrejection', function(e) {
  const errMsg = `비동기 오류 발생: ${e.reason}`;
  console.error(errMsg);
  const contentEl = document.getElementById('card-content');
  if (contentEl) {
    contentEl.innerHTML = `<span style="color: #ff6b6b; font-size: 0.9em; word-break: break-all;">${errMsg}</span>`;
  }
});

// ===== SUPABASE CONFIG =====
const SUPABASE_URL = "https://qwfxkzsxqgadxmpobrib.supabase.co";
const SUPABASE_KEY = "sb_publishable_Ed8gyhILxu7uWq8FXXIkgQ_jm1Alk0s";
let supabase = null;

// Function to dynamically load Supabase JS SDK with a timeout
function loadSupabaseSDK() {
  return new Promise((resolve, reject) => {
    if (window.supabase) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
    script.async = true;

    const timeout = setTimeout(() => {
      script.onload = null;
      script.onerror = null;
      if (script.parentNode) {
        document.head.removeChild(script);
      }
      reject(new Error("Supabase SDK 로드 시간 초과 (네트워크 연결 확인)"));
    }, 2500); // 2.5 seconds timeout

    script.onload = () => {
      clearTimeout(timeout);
      resolve();
    };

    script.onerror = (e) => {
      clearTimeout(timeout);
      reject(new Error("Supabase SDK 로드 실패 (CDN 차단 또는 오프라인)"));
    };

    document.head.appendChild(script);
  });
}

// ===== APP STATE =====
let currentIndex = 0;
let isDetailOpen = false;
let shuffledFacts = [];
let buttonsDisabled = false;

// ===== DOM ELEMENTS =====
const card = document.getElementById('card');
const cardBadge = document.getElementById('card-badge');
const badgeText = document.getElementById('badge-text');
const cardNumber = document.getElementById('card-number');
const cardContent = document.getElementById('card-content');
const cardDetail = document.getElementById('card-detail');
const detailText = document.getElementById('detail-text');
const btnPrev = document.getElementById('btn-prev');
const btnDetail = document.getElementById('btn-detail');
const btnNext = document.getElementById('btn-next');

// Like/Dislike Buttons
const cardActions = document.querySelector('.card-actions');
const btnLike = document.getElementById('btn-like');
const btnDislike = document.getElementById('btn-dislike');
const likeCount = document.getElementById('like-count');

// ===== UTILITY =====
function shuffleArray(arr) {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Safe Local Storage accessors
function getVote(id) {
  try {
    return localStorage.getItem(`vote_${id}`);
  } catch (e) {
    return null;
  }
}

function setVote(id, value) {
  try {
    if (value) {
      localStorage.setItem(`vote_${id}`, value);
    } else {
      localStorage.removeItem(`vote_${id}`);
    }
  } catch (e) {
    // Ignore storage issues (e.g. private browsing cookies disabled)
  }
}

// ===== INIT =====
async function init() {
  cardContent.textContent = "로딩 중...";
  detailText.textContent = "";
  if (cardActions) cardActions.style.display = 'none';

  // Try loading Supabase SDK dynamically and initialize the client
  try {
    await loadSupabaseSDK();
    if (window.supabase && typeof window.supabase.createClient === 'function') {
      supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    }
  } catch (e) {
    console.warn("Failed to load/initialize Supabase SDK, will use local fallback directly:", e);
  }

  if (supabase) {
    try {
      // 3.5 seconds timeout to prevent hanging on network blocks
      const fetchPromise = supabase
        .from('facts')
        .select('id, short, detail, likes')
        .order('id', { ascending: true });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Connection timeout")), 3500)
      );

      const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);
      if (error) throw error;
      if (data && data.length > 0) {
        shuffledFacts = shuffleArray(data);
        currentIndex = 0;
        renderCard(false);
        return;
      }
    } catch (e) {
      console.warn("Supabase fetch failed, falling back to local dataset:", e);
    }
  }

  // Fallback to local data.js
  const fallbackData = (typeof FACTS !== 'undefined') ? FACTS : [];
  if (fallbackData.length > 0) {
    shuffledFacts = shuffleArray(fallbackData);
    currentIndex = 0;
    renderCard(false);
  } else {
    cardContent.textContent = "데이터를 로드하지 못했습니다. 인터넷 연결을 확인해 주세요.";
  }
}

// ===== RENDER =====
function renderCard(animate = true) {
  if (shuffledFacts.length === 0) return;
  const item = shuffledFacts[currentIndex];

  const update = () => {
    // Update badge (Static for facts)
    const badgeIcon = cardBadge.querySelector('.badge-icon');
    if (badgeIcon) badgeIcon.textContent = '📚';
    if (badgeText) badgeText.textContent = '상식';

    // Update number
    if (cardNumber) cardNumber.textContent = `#${currentIndex + 1}`;

    // Update content
    if (cardContent) cardContent.textContent = item.short;

    // Update detail
    if (detailText) detailText.textContent = item.detail;

    // Keep detail state if it was already open
    if (cardDetail && btnDetail) {
      if (!isDetailOpen) {
        cardDetail.classList.remove('open');
        btnDetail.querySelector('span:last-child').textContent = '자세히';
        btnDetail.querySelector('.btn-icon').textContent = '🔍';
      } else {
        cardDetail.classList.add('open');
        btnDetail.querySelector('span:last-child').textContent = '접기';
        btnDetail.querySelector('.btn-icon').textContent = '📖';
      }
    }

    // Toggle actions panel and render votes
    if (cardActions) {
      if (!item.id || !supabase) {
        cardActions.style.display = 'none';
      } else {
        cardActions.style.display = 'flex';
        updateVoteUI(item);
      }
    }
  };

  if (animate && card) {
    card.classList.add('fade-out');
    card.addEventListener('animationend', function handler() {
      card.removeEventListener('animationend', handler);
      update();
      card.classList.remove('fade-out');
      card.classList.add('fade-in');
      card.addEventListener('animationend', function handler2() {
        card.removeEventListener('animationend', handler2);
        card.classList.remove('fade-in');
      });
    });
  } else {
    update();
  }
}

// ===== VOTE STATE & UI UPDATE =====
function updateVoteUI(item) {
  if (!item || !btnLike || !btnDislike || !likeCount) return;
  const currentVote = getVote(item.id);

  btnLike.classList.toggle('active', currentVote === 'like');
  btnDislike.classList.toggle('active', currentVote === 'dislike');
  likeCount.textContent = item.likes || 0;
}

function setButtonsDisabled(disabled) {
  buttonsDisabled = disabled;
  if (btnLike) btnLike.disabled = disabled;
  if (btnDislike) btnDislike.disabled = disabled;
}

async function handleLikeClick() {
  if (buttonsDisabled || !supabase) return;
  const item = shuffledFacts[currentIndex];
  if (!item || !item.id) return;

  const key = `vote_${item.id}`;
  const currentVote = getVote(item.id);

  setButtonsDisabled(true);

  try {
    if (currentVote === 'like') {
      // Cancel like (-1)
      const { error } = await supabase.rpc('decrement_likes', { row_id: item.id });
      if (error) throw error;
      item.likes = Math.max(0, (item.likes || 0) - 1);
      setVote(item.id, null);
    } else if (currentVote === 'dislike') {
      // Change dislike to like (+2)
      await supabase.rpc('increment_likes', { row_id: item.id });
      await supabase.rpc('increment_likes', { row_id: item.id });
      item.likes = (item.likes || 0) + 2;
      setVote(item.id, 'like');
    } else {
      // Neutral to like (+1)
      const { error } = await supabase.rpc('increment_likes', { row_id: item.id });
      if (error) throw error;
      item.likes = (item.likes || 0) + 1;
      setVote(item.id, 'like');
    }
    updateVoteUI(item);
  } catch (e) {
    console.error("좋아요 처리 실패:", e);
  } finally {
    setButtonsDisabled(false);
  }
}

async function handleDislikeClick() {
  if (buttonsDisabled || !supabase) return;
  const item = shuffledFacts[currentIndex];
  if (!item || !item.id) return;

  const currentVote = getVote(item.id);

  setButtonsDisabled(true);

  try {
    if (currentVote === 'dislike') {
      // Cancel dislike (+1)
      const { error } = await supabase.rpc('increment_likes', { row_id: item.id });
      if (error) throw error;
      item.likes = (item.likes || 0) + 1;
      setVote(item.id, null);
    } else if (currentVote === 'like') {
      // Change like to dislike (-2)
      await supabase.rpc('decrement_likes', { row_id: item.id });
      await supabase.rpc('decrement_likes', { row_id: item.id });
      item.likes = Math.max(0, (item.likes || 0) - 2);
      setVote(item.id, 'dislike');
    } else {
      // Neutral to dislike (-1)
      const { error } = await supabase.rpc('decrement_likes', { row_id: item.id });
      if (error) throw error;
      item.likes = Math.max(0, (item.likes || 0) - 1);
      setVote(item.id, 'dislike');
    }
    updateVoteUI(item);
  } catch (e) {
    console.error("싫어요 처리 실패:", e);
  } finally {
    setButtonsDisabled(false);
  }
}

// ===== NEXT =====
function nextCard() {
  if (shuffledFacts.length === 0) return;
  currentIndex = (currentIndex + 1) % shuffledFacts.length;
  renderCard(true);
}

// ===== PREV =====
function prevCard() {
  if (shuffledFacts.length === 0) return;
  currentIndex = (currentIndex - 1 + shuffledFacts.length) % shuffledFacts.length;
  renderCard(true);
}

// ===== DETAIL TOGGLE =====
function toggleDetail() {
  if (!cardDetail || !btnDetail) return;
  isDetailOpen = !isDetailOpen;
  cardDetail.classList.toggle('open', isDetailOpen);
  btnDetail.querySelector('span:last-child').textContent = isDetailOpen ? '접기' : '자세히';
  btnDetail.querySelector('.btn-icon').textContent = isDetailOpen ? '📖' : '🔍';
}

// ===== EVENT LISTENERS =====
if (btnPrev) btnPrev.addEventListener('click', prevCard);
if (btnDetail) btnDetail.addEventListener('click', toggleDetail);
if (btnNext) btnNext.addEventListener('click', nextCard);

if (btnLike) btnLike.addEventListener('click', handleLikeClick);
if (btnDislike) btnDislike.addEventListener('click', handleDislikeClick);

// Mouse follow effect on buttons
document.querySelectorAll('.btn').forEach(btn => {
  btn.addEventListener('mousemove', (e) => {
    const rect = btn.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    btn.style.setProperty('--x', `${x}%`);
    btn.style.setProperty('--y', `${y}%`);
  });
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight' || e.key === ' ') {
    e.preventDefault();
    nextCard();
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault();
    prevCard();
  } else if (e.key === 'ArrowDown' || e.key === 'Enter') {
    e.preventDefault();
    toggleDetail();
  }
});

// ===== START =====
init();
