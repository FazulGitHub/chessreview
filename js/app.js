// Global State & App Initialization

let currentPieceTheme = 'staunty';
let selectedGame = null;
let gameMoveSequence = [];
let currentMoveIndex = 0;
let isFlipped = false;
let selectedSquare = null;
let voiceEnabled = false;
let isReviewMode = false;
let reviewMoments = [];
let activeReviewIndex = 0;

// UI Cache references
const viewGamesList = document.getElementById('view-games-list');
const viewGameReview = document.getElementById('view-game-review');
const navBackToListBtn = document.getElementById('nav-back-to-list-btn');

const usernameInput = document.getElementById('username-input');
const fetchBtn = document.getElementById('fetch-btn');
const archiveSelect = document.getElementById('archive-select');
const archiveLbl = document.getElementById('archive-lbl');
const gamesScroller = document.getElementById('games-scroller');
const gamesTotalBadge = document.getElementById('games-total-badge');
const statusAlert = document.getElementById('status-alert');

// Matchup Single-Row elements
const matchupWhiteName = document.getElementById('matchup-white-name');
const matchupBlackName = document.getElementById('matchup-black-name');

// Board & Player info elements
const boardGrid = document.getElementById('board-grid');
const boardArrowsCanvas = document.getElementById('board-arrows-canvas');
const badgeClassification = document.getElementById('badge-classification');
const badgeClassText = document.getElementById('badge-class-text');
const lblMoveNum = document.getElementById('lbl-move-num');
const lblBestMoveVal = document.getElementById('lbl-best-move-val');
const txtCoachComment = document.getElementById('txt-coach-comment');
const speakingIndicator = document.getElementById('speaking-indicator');
const reviewRetryBanner = document.getElementById('review-retry-banner');
const exitRetryBtn = document.getElementById('exit-retry-btn');

// Action Controls
const btnPrev = document.getElementById('ctrl-prev');
const btnNext = document.getElementById('ctrl-next');
const btnActionOptions = document.getElementById('btn-action-options');
const btnStartRetry = document.getElementById('btn-start-retry');
const toggleOptionsBtn = document.getElementById('toggle-options-btn');
const optionsDrawer = document.getElementById('options-drawer');
const closeOptionsBtn = document.getElementById('close-options-btn');
const btnFlip = document.getElementById('ctrl-flip');
const voiceToggleBtn = document.getElementById('voice-toggle-btn');
const pieceThemeSelect = document.getElementById('piece-theme-select');

// Eval Fill
const evalWhiteFill = document.getElementById('eval-white-fill');
const evalBlackFill = document.getElementById('eval-black-fill');

function showAlert(msg, type = 'info') {
  statusAlert.classList.remove('hidden', 'bg-emerald-500/10', 'text-emerald-400', 'border-emerald-500/20', 'bg-rose-500/10', 'text-rose-400', 'border-rose-500/20', 'bg-amber-500/10', 'text-amber-400', 'border-amber-500/20');
  if (type === 'error') statusAlert.classList.add('bg-rose-500/10', 'text-rose-400', 'border-rose-500/20');
  else if (type === 'success') statusAlert.classList.add('bg-emerald-500/10', 'text-emerald-400', 'border-emerald-500/20');
  else statusAlert.classList.add('bg-amber-500/10', 'text-amber-400', 'border-amber-500/20');
  statusAlert.innerText = msg;
}

function bindActionListeners() {
  navBackToListBtn.addEventListener('click', showGamesListView);
  fetchBtn.addEventListener('click', () => queryArchives(usernameInput.value.trim()));
  archiveSelect.addEventListener('change', (e) => downloadGamesFromMonth(e.target.value));

  // Navigation Controls
  btnPrev.addEventListener('click', (e) => {
    e.preventDefault();
    navigateMove(currentMoveIndex - 1);
  });
  btnNext.addEventListener('click', (e) => {
    e.preventDefault();
    navigateMove(currentMoveIndex + 1);
  });
  btnFlip.addEventListener('click', () => {
    isFlipped = !isFlipped;
    renderChessboard();
  });

  // Piece Theme Selector
  pieceThemeSelect.addEventListener('change', (e) => {
    currentPieceTheme = e.target.value;
    renderChessboard();
  });

  // Options Drawer
  btnActionOptions.addEventListener('click', () => optionsDrawer.classList.remove('hidden'));
  toggleOptionsBtn.addEventListener('click', () => optionsDrawer.classList.remove('hidden'));
  closeOptionsBtn.addEventListener('click', () => optionsDrawer.classList.add('hidden'));

  // Retry mistakes from drawer
  btnStartRetry.addEventListener('click', () => {
    optionsDrawer.classList.add('hidden');
    startWalkingReviewKeyMoments();
  });

  

  // Voice Toggle
  voiceToggleBtn.addEventListener('click', () => {
    voiceEnabled = !voiceEnabled;
    if (voiceEnabled) {
      voiceToggleBtn.innerText = "Enabled";
      voiceToggleBtn.className = "bg-indigo-600 text-white font-extrabold text-xs px-3 py-1.5 rounded-lg";
      updateCoachCommentaryHeader();
    } else {
      voiceToggleBtn.innerText = "Disabled";
      voiceToggleBtn.className = "bg-rose-500/20 text-rose-400 font-extrabold text-xs px-3 py-1.5 rounded-lg";
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      speakingIndicator.classList.add('hidden');
    }
  });

  if (exitRetryBtn) exitRetryBtn.addEventListener('click', exitRetryMode);

  window.addEventListener('resize', () => {
    drawSuggestedCoachArrows();
  });
}

// App Initialization
window.addEventListener('DOMContentLoaded', () => {
  if (window.Chess) {
    bindActionListeners();
    queryArchives("fazcheckmate");
  } else {
    showAlert("Fatal Error: Chess rules library could not load.", "error");
  }
});