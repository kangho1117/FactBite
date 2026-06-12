// ===== SUPABASE CONFIG =====
const SUPABASE_URL = "https://qwfxkzsxqgadxmpobrib.supabase.co";
const SUPABASE_KEY = "sb_publishable_Ed8gyhILxu7uWq8FXXIkgQ_jm1Alk0s";
let supabase = null;

if (window.supabase) {
  supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
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

// ===== INIT =====
async function init() {
  cardContent.textContent = "로딩 중...";
  detailText.textContent = "";
  if (cardActions) cardActions.style.display = 'none';

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('facts')
        .select('id, short, detail, likes')
        .order('id', { ascending: true });
        
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
  shuffledFacts = shuffleArray(FACTS);
  currentIndex = 0;
  renderCard(false);
}

// ===== RENDER =====
function renderCard(animate = true) {
  const item = shuffledFacts[currentIndex];

  const update = () => {
    // Update badge (Static for facts)
    const badgeIcon = cardBadge.querySelector('.badge-icon');
    badgeIcon.textContent = '📚';
    badgeText.textContent = '상식';

    // Update number
    cardNumber.textContent = `#${currentIndex + 1}`;

    // Update content
    cardContent.textContent = item.short;

    // Update detail
    detailText.textContent = item.detail;

    // Keep detail state if it was already open
    if (!isDetailOpen) {
      cardDetail.classList.remove('open');
      btnDetail.querySelector('span:last-child').textContent = '자세히';
      btnDetail.querySelector('.btn-icon').textContent = '🔍';
    } else {
      cardDetail.classList.add('open');
      btnDetail.querySelector('span:last-child').textContent = '접기';
      btnDetail.querySelector('.btn-icon').textContent = '📖';
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

  if (animate) {
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
  const key = `vote_${item.id}`;
  const currentVote = localStorage.getItem(key);

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
  const currentVote = localStorage.getItem(key);

  setButtonsDisabled(true);

  try {
    if (currentVote === 'like') {
      // Cancel like (-1)
      const { error } = await supabase.rpc('decrement_likes', { row_id: item.id });
      if (error) throw error;
      item.likes = Math.max(0, (item.likes || 0) - 1);
      localStorage.removeItem(key);
    } else if (currentVote === 'dislike') {
      // Change dislike to like (+2)
      await supabase.rpc('increment_likes', { row_id: item.id });
      await supabase.rpc('increment_likes', { row_id: item.id });
      item.likes = (item.likes || 0) + 2;
      localStorage.setItem(key, 'like');
    } else {
      // Neutral to like (+1)
      const { error } = await supabase.rpc('increment_likes', { row_id: item.id });
      if (error) throw error;
      item.likes = (item.likes || 0) + 1;
      localStorage.setItem(key, 'like');
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

  const key = `vote_${item.id}`;
  const currentVote = localStorage.getItem(key);

  setButtonsDisabled(true);

  try {
    if (currentVote === 'dislike') {
      // Cancel dislike (+1)
      const { error } = await supabase.rpc('increment_likes', { row_id: item.id });
      if (error) throw error;
      item.likes = (item.likes || 0) + 1;
      localStorage.removeItem(key);
    } else if (currentVote === 'like') {
      // Change like to dislike (-2)
      await supabase.rpc('decrement_likes', { row_id: item.id });
      await supabase.rpc('decrement_likes', { row_id: item.id });
      item.likes = Math.max(0, (item.likes || 0) - 2);
      localStorage.setItem(key, 'dislike');
    } else {
      // Neutral to dislike (-1)
      const { error } = await supabase.rpc('decrement_likes', { row_id: item.id });
      if (error) throw error;
      item.likes = Math.max(0, (item.likes || 0) - 1);
      localStorage.setItem(key, 'dislike');
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
  currentIndex = (currentIndex + 1) % shuffledFacts.length;
  renderCard(true);
}

// ===== PREV =====
function prevCard() {
  currentIndex = (currentIndex - 1 + shuffledFacts.length) % shuffledFacts.length;
  renderCard(true);
}

// ===== DETAIL TOGGLE =====
function toggleDetail() {
  isDetailOpen = !isDetailOpen;
  cardDetail.classList.toggle('open', isDetailOpen);
  btnDetail.querySelector('span:last-child').textContent = isDetailOpen ? '접기' : '자세히';
  btnDetail.querySelector('.btn-icon').textContent = isDetailOpen ? '📖' : '🔍';
}

// ===== EVENT LISTENERS =====
btnPrev.addEventListener('click', prevCard);
btnDetail.addEventListener('click', toggleDetail);
btnNext.addEventListener('click', nextCard);

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
