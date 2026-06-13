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
let supabaseClient = null;

try {
  if (window.supabase && typeof window.supabase.createClient === 'function') {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  }
} catch (e) {
  console.warn("Failed to initialize Supabase client:", e);
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

// Like Button
const cardActions = document.querySelector('.card-actions');
const btnLike = document.getElementById('btn-like');
const likeCount = document.getElementById('like-count');

// Share Button & Toast
const btnShare = document.getElementById('btn-share');
const toast = document.getElementById('toast');

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

// ===== SHARE URL HELPER =====
function getSharedFactId() {
  const params = new URLSearchParams(window.location.search);
  const idStr = params.get('id');
  return idStr ? parseInt(idStr, 10) : null;
}

function moveSharedFactToFront(factsArray, targetId) {
  const idx = factsArray.findIndex(item => item.id === targetId);
  if (idx > 0) {
    const [item] = factsArray.splice(idx, 1);
    factsArray.unshift(item);
  }
  // idx === 0 means it's already first; idx === -1 means not found (do nothing)
}

// ===== INIT =====
async function init() {
  cardContent.textContent = "로딩 중...";
  detailText.textContent = "";
  if (cardActions) cardActions.style.display = 'none';

  const sharedId = getSharedFactId();

  if (supabaseClient) {
    try {
      // Wrap the thenable in a native Promise to prevent Promise.race incompatibilities
      const fetchPromise = Promise.resolve(
        supabaseClient
          .from('facts')
          .select('id, short, detail, likes')
          .order('id', { ascending: true })
      );

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("서버 응답 시간 초과")), 3500)
      );

      const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);
      if (error) throw error;
      if (data && data.length > 0) {
        shuffledFacts = shuffleArray(data);
        if (sharedId) moveSharedFactToFront(shuffledFacts, sharedId);
        currentIndex = 0;
        
        renderCard(false);
        return;
      }
    } catch (e) {
      console.warn("Supabase fetch failed, falling back to local dataset:", e);
      alert("DB 데이터 조회 실패 (로컬 모드로 전환됩니다):\n" + (e.message || JSON.stringify(e)));
    }
  } else {
    console.warn("Supabase client not initialized");
    alert("Supabase SDK 로드 실패 또는 클라이언트 초기화 실패 (로컬 모드로 전환됩니다).");
  }

  // Fallback to local data.js
  const fallbackData = (typeof FACTS !== 'undefined') ? FACTS : [];
  if (fallbackData.length > 0) {
    // Dynamically assign IDs and default likes to local items so Like/Dislike functions work
    fallbackData.forEach((item, index) => {
      if (!item.id) {
        item.id = index + 1;
      }
      if (item.likes === undefined) {
        item.likes = 0;
      }
    });
    shuffledFacts = shuffleArray(fallbackData);
    if (sharedId) moveSharedFactToFront(shuffledFacts, sharedId);
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
      const btnIcon = btnDetail.querySelector('.btn-icon');
      const btnText = btnDetail.querySelector('span:last-child') || btnDetail.querySelector('span');
      if (!isDetailOpen) {
        cardDetail.classList.remove('open');
        if (btnText) btnText.textContent = '자세히';
        if (btnIcon) btnIcon.textContent = '🔍';
      } else {
        cardDetail.classList.add('open');
        if (btnText) btnText.textContent = '접기';
        if (btnIcon) btnIcon.textContent = '📖';
      }
    }

    // Toggle actions panel and render votes (Always visible if item has ID)
    if (cardActions) {
      if (!item.id) {
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
  if (!item || !btnLike || !likeCount) return;
  const currentVote = getVote(item.id);

  const isActive = currentVote === 'like';
  btnLike.classList.toggle('active', isActive);
  btnLike.querySelector('.action-icon').textContent = isActive ? '❤️' : '🤍';
  likeCount.textContent = item.likes || 0;
}

function setButtonsDisabled(disabled) {
  buttonsDisabled = disabled;
  if (btnLike) btnLike.disabled = disabled;
}

async function handleLikeClick() {
  if (buttonsDisabled) return;
  const item = shuffledFacts[currentIndex];
  if (!item || !item.id) return;

  const currentVote = getVote(item.id);
  setButtonsDisabled(true);

  try {
    if (supabaseClient) {
      if (currentVote === 'like') {
        // Cancel like (-1)
        const { error } = await supabaseClient.rpc('decrement_likes', { row_id: item.id });
        if (error) throw error;
        item.likes = Math.max(0, (item.likes || 0) - 1);
        setVote(item.id, null);
      } else {
        // Neutral to like (+1)
        const { error } = await supabaseClient.rpc('increment_likes', { row_id: item.id });
        if (error) throw error;
        item.likes = (item.likes || 0) + 1;
        setVote(item.id, 'like');
      }
    } else {
      // Local fallback mode voting
      if (currentVote === 'like') {
        item.likes = Math.max(0, (item.likes || 0) - 1);
        setVote(item.id, null);
      } else {
        item.likes = (item.likes || 0) + 1;
        setVote(item.id, 'like');
      }
    }
    updateVoteUI(item);
  } catch (e) {
    console.error("좋아요 처리 실패:", e);
    alert("좋아요 처리 실패: " + (e.message || e));
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
  const btnText = btnDetail.querySelector('span:last-child') || btnDetail.querySelector('span');
  if (btnText) btnText.textContent = isDetailOpen ? '접기' : '자세히';
  const btnIcon = btnDetail.querySelector('.btn-icon');
  if (btnIcon) btnIcon.textContent = isDetailOpen ? '📖' : '🔍';
}

// ===== EVENT LISTENERS =====
if (btnPrev) btnPrev.addEventListener('click', prevCard);
if (btnDetail) btnDetail.addEventListener('click', toggleDetail);
if (btnNext) btnNext.addEventListener('click', nextCard);

if (btnLike) btnLike.addEventListener('click', handleLikeClick);
if (btnShare) btnShare.addEventListener('click', handleShareClick);

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

// ===== SHARE =====
function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2200);
}

async function handleShareClick() {
  const item = shuffledFacts[currentIndex];
  if (!item || !item.id) return;

  const url = new URL(window.location.href);
  url.search = '';
  url.searchParams.set('id', item.id);
  const shareUrl = url.toString();

  // Try native Web Share API (mobile), fall back to clipboard
  if (navigator.share) {
    try {
      await navigator.share({
        title: 'FactBite – 한입 크기 상식',
        text: item.short,
        url: shareUrl
      });
      return;
    } catch (e) {
      // User cancelled or share failed, fall through to clipboard
      if (e.name === 'AbortError') return;
    }
  }

  // Clipboard fallback
  try {
    await navigator.clipboard.writeText(shareUrl);
    showToast('📋 링크가 복사되었습니다!');
  } catch (e) {
    // Final fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = shareUrl;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    showToast('📋 링크가 복사되었습니다!');
  }
}

// ===== START =====
init();
