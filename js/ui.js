// UI Rendering Functions

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

const CLASSIFICATIONS = {
  BOOK: { label: 'Book Move', class: 'text-amber-400 border-amber-400/20 bg-amber-400/10', icon: '📖' },
  BRILLIANT: { label: 'Brilliant!!', class: 'text-cyan-400 border-cyan-400/20 bg-cyan-400/10', icon: '!!' },
  GREAT: { label: 'Great Find!', class: 'text-teal-400 border-teal-400/20 bg-teal-400/10', icon: '!' },
  BEST: { label: 'Best Move', class: 'text-emerald-400 border-emerald-400/20 bg-emerald-400/10', icon: '⭐' },
  EXCELLENT: { label: 'Excellent', class: 'text-emerald-400 border-emerald-400/20 bg-emerald-400/10', icon: '✔️' },
  GOOD: { label: 'Good Move', class: 'text-slate-300 border-slate-700 bg-slate-800/50', icon: '👍' },
  INACCURACY: { label: 'Inaccuracy', class: 'text-yellow-400 border-yellow-400/20 bg-yellow-400/10', icon: '?!' },
  MISTAKE: { label: 'Mistake', class: 'text-orange-400 border-orange-400/20 bg-orange-400/10', icon: '?' },
  MISSED_WIN: { label: 'Missed Win', class: 'text-rose-400 border-rose-400/20 bg-rose-400/10', icon: '🏆' },
  BLUNDER: { label: 'Blunder', class: 'text-rose-500 border-rose-500/20 bg-rose-500/10', icon: '??' }
};

function getPieceImageUrl(pieceCode) {
  return `https://lichess1.org/assets/piece/${currentPieceTheme}/${pieceCode}.svg`;
}

function renderChessboard() {
  boardGrid.innerHTML = '';

  const ranks = isFlipped ? [...RANKS].reverse() : RANKS;
  const files = isFlipped ? [...FILES].reverse() : FILES;

  const activeState = gameMoveSequence[currentMoveIndex];
  const tempGame = new window.Chess(activeState?.fen);

  ranks.forEach((rank, rIdx) => {
    files.forEach((file, fIdx) => {
      const square = `${file}${rank}`;
      const isDark = (fIdx + rIdx) % 2 !== 0;

      const cell = document.createElement('div');
      cell.className = `relative w-full h-full flex items-center justify-center cursor-pointer transition-all duration-75 select-none overflow-hidden
        ${isDark ? 'bg-[#334155]' : 'bg-[#94a3b8]'}`;

      if (selectedSquare === square) {
        cell.classList.add('ring-4', 'ring-indigo-400', 'ring-inset', 'z-10');
      }

      if (activeState && activeState.moveObj) {
        if (activeState.moveObj.from === square || activeState.moveObj.to === square) {
          cell.classList.add('after:absolute', 'after:inset-0', 'after:bg-indigo-400/35');
        }
      }

      const piece = tempGame.get(square);
      if (piece) {
        const img = document.createElement('img');
        img.src = getPieceImageUrl(`${piece.color}${piece.type.toUpperCase()}`);
        img.className = "w-[88%] h-[88%] object-contain select-none z-10 pointer-events-none";
        cell.appendChild(img);
      }

      if (rank === (isFlipped ? '8' : '1')) {
        const lbl = document.createElement('span');
        lbl.className = `absolute bottom-0.5 right-1 text-[8px] font-black z-20 pointer-events-none ${isDark ? 'text-[#94a3b8]' : 'text-[#334155]'}`;
        lbl.innerText = file;
        cell.appendChild(lbl);
      }
      if (file === (isFlipped ? 'h' : 'a')) {
        const lbl = document.createElement('span');
        lbl.className = `absolute top-0.5 left-1 text-[8px] font-black z-20 pointer-events-none ${isDark ? 'text-[#94a3b8]' : 'text-[#334155]'}`;
        lbl.innerText = rank;
        cell.appendChild(lbl);
      }

      cell.addEventListener('click', () => handleBoardSquareClick(square));
      boardGrid.appendChild(cell);
    });
  });

  drawSuggestedCoachArrows();
}

function renderGamesHistoryList(games) {
  gamesScroller.innerHTML = '';
  if (games.length === 0) {
    gamesScroller.innerHTML = `<div class="p-8 text-center text-slate-500 text-xs">No matches found.</div>`;
    return;
  }

  games.forEach((g, idx) => {
    const targetUser = usernameInput.value.trim().toLowerCase();
    const isWhite = g.white && g.white.username && g.white.username.toLowerCase() === targetUser;
    const side = isWhite ? 'White' : 'Black';
    const opponent = isWhite ? g.black : g.white;
    const self = isWhite ? g.white : g.black;

    const isWin = self && self.result === 'win';
    const isLoss = opponent && opponent.result === 'win';
    const outcome = isWin ? 'W' : (isLoss ? 'L' : 'D');

    const card = document.createElement('div');
    card.className = "p-3.5 rounded-xl bg-[#0f172a] hover:bg-[#1e293b] border border-[#222f43] cursor-pointer transition-all flex flex-col gap-1.5 select-none shadow hover:border-indigo-500/50";
    card.innerHTML = `
      <div class="flex items-center justify-between">
        <span class="flex items-center gap-2 font-bold text-slate-200 text-xs">
          <span class="w-5 h-5 rounded flex items-center justify-center text-[10px] font-black
            ${outcome === 'W' ? 'bg-emerald-500 text-slate-950' : (outcome === 'L' ? 'bg-rose-500 text-slate-950' : 'bg-slate-600 text-white')}"
          >
            ${outcome}
          </span>
          As ${side}
        </span>
        <span class="text-[10px] text-slate-400 font-extrabold uppercase bg-[#151c2c] px-2 py-0.5 rounded border border-[#222f43]">${g.time_class || 'game'}</span>
      </div>
      <div class="font-extrabold text-slate-100 text-xs truncate">
        vs <span class="text-white">${opponent ? opponent.username : 'Opponent'}</span>
      </div>
    `;

    card.addEventListener('click', () => triggerGameAnalysisSelector(g));
    gamesScroller.appendChild(card);
  });
}

function handleBoardSquareClick(square) {
  if (gameMoveSequence.length === 0) return;

  const activeState = gameMoveSequence[currentMoveIndex];
  const tempGame = new window.Chess(activeState.fen);

  if (selectedSquare) {
    if (selectedSquare === square) {
      selectedSquare = null;
      renderChessboard();
      return;
    }

    try {
      const move = tempGame.move({ from: selectedSquare, to: square, promotion: 'q' });
      if (move) {
        if (isReviewMode) {
          handleRetryValidationAttempt(move);
        } else {
          gameMoveSequence[currentMoveIndex].fen = tempGame.fen();
          gameMoveSequence[currentMoveIndex].san = move.san;
          gameMoveSequence[currentMoveIndex].eval = evaluateBoardStatePositional(tempGame.fen());
          selectedSquare = null;
          
          if (move.captured) playCaptureSound(); else playMoveSound();
          
          renderChessboard();
          updateCoachCommentaryHeader();
        }
        return;
      }
    } catch (err) {}
  }

  const piece = tempGame.get(square);
  if (piece) selectedSquare = square;
  else selectedSquare = null;
  renderChessboard();
}

function drawSuggestedCoachArrows() {
  const rect = boardGrid.getBoundingClientRect();
  boardArrowsCanvas.width = rect.width;
  boardArrowsCanvas.height = rect.height;

  const ctx = boardArrowsCanvas.getContext('2d');
  ctx.clearRect(0, 0, rect.width, rect.height);

  if (isReviewMode) return;

  const activeState = gameMoveSequence[currentMoveIndex];
  if (!activeState || !activeState.eval || !activeState.eval.bestMove) return;

  const moveStr = activeState.eval.bestMove;
  if (moveStr.length < 4) return;

  drawArrowOnCanvas(ctx, moveStr.substring(0, 2), moveStr.substring(2, 4), '#6366f1', rect.width);
}

function drawArrowOnCanvas(ctx, from, to, color, size) {
  const cellW = size / 8;
  const getCenterCoords = (sq) => {
    let fileIdx = FILES.indexOf(sq[0]);
    let rankIdx = RANKS.indexOf(sq[1]);
    if (isFlipped) {
      fileIdx = 7 - fileIdx;
      rankIdx = 7 - rankIdx;
    }
    return { x: fileIdx * cellW + cellW / 2, y: rankIdx * cellW + cellW / 2 };
  };

  const p1 = getCenterCoords(from);
  const p2 = getCenterCoords(to);

  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.globalAlpha = 0.8;

  const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
  const gap = cellW * 0.28;
  const endX = p2.x - gap * Math.cos(angle);
  const endY = p2.y - gap * Math.sin(angle);

  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(endX, endY);
  ctx.stroke();

  const headlen = 12;
  ctx.beginPath();
  ctx.moveTo(endX, endY);
  ctx.lineTo(endX - headlen * Math.cos(angle - Math.PI / 6), endY - headlen * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(endX - headlen * Math.cos(angle + Math.PI / 6), endY - headlen * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();

  ctx.globalAlpha = 1.0;
}

function updateLiveEvaluationSidebar(scoreObj) {
  if (!scoreObj) {
    evalWhiteFill.style.height = '50%';
    evalBlackFill.style.height = '50%';
    return;
  }

  if (scoreObj.type === 'mate') {
    const sign = scoreObj.value < 0 ? -1 : 1;
    evalWhiteFill.style.height = sign > 0 ? '100%' : '0%';
    evalBlackFill.style.height = sign > 0 ? '0%' : '100%';
    return;
  }

  const val = scoreObj.value;
  const clamped = Math.max(-800, Math.min(800, val));
  const percentage = ((clamped + 800) / 1600) * 100;

  evalWhiteFill.style.height = `${percentage}%`;
  evalBlackFill.style.height = `${100 - percentage}%`;
}

function showGamesListView() {
  viewGameReview.classList.add('hidden');
  viewGamesList.classList.remove('hidden');
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}

function showGameReviewPage() {
  viewGamesList.classList.add('hidden');
  viewGameReview.classList.remove('hidden');
  
  setTimeout(() => {
    renderChessboard();
  }, 50);
}

function updateMatchupUI() {
  if (!selectedGame) return;

  const whiteName = selectedGame.white ? selectedGame.white.username : 'White';
  const blackName = selectedGame.black ? selectedGame.black.username : 'Black';

  matchupWhiteName.innerText = whiteName;
  matchupBlackName.innerText = blackName;
}