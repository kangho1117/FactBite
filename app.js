// ===== APP STATE =====
let currentIndex = 0;
let isDetailOpen = false;
let shuffledFacts = [];

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
function init() {
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

    // Close detail
    isDetailOpen = false;
    cardDetail.classList.remove('open');
    btnDetail.querySelector('span:last-child').textContent = '자세히';
    btnDetail.querySelector('.btn-icon').textContent = '🔍';
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
