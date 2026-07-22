// Coach Commentary & Game Review Logic

const PIECE_NAMES = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

function getPieceFullName(type) {
  return PIECE_NAMES[type] || 'piece';
}

function getMoveSanFromFen(fen, moveStr) {
  try {
    const temp = new window.Chess(fen);
    const move = temp.move({ from: moveStr.substring(0, 2), to: moveStr.substring(2, 4), promotion: 'q' });
    if (move && move.san) return move.san;
  } catch (e) {
    console.warn('Failed to parse move SAN', moveStr, e);
  }
  return moveStr;
}

function getTacticalHintForMove(fen, moveStr) {
  try {
    const position = new window.Chess(fen);
    const from = moveStr.substring(0, 2);
    const to = moveStr.substring(2, 4);
    const move = position.move({ from, to, promotion: 'q' });
    if (!move) return '';

    const after = new window.Chess(position.fen());
    const hints = [];
    const ownColor = move.color;

    if (move.captured) {
      hints.push(`it captures ${getPieceFullName(move.captured)} on ${move.to}`);
    }

    if (after.in_check()) {
      hints.push('it puts the king under real pressure');
    }

    const supportAfter = after.moves({ verbose: true }).filter(m => m.to === to && m.color === ownColor && m.from !== from);
    const rookSupport = supportAfter.some(m => m.piece === 'r');
    const bishopSupport = supportAfter.some(m => m.piece === 'b');
    const knightSupport = supportAfter.some(m => m.piece === 'n');

   
   if (rookSupport && move.piece === 'n') {
          hints.push('your knight lands on a square backed by your rook, so the king can’t safely take it');
        } else if (rookSupport && move.piece === 'b') {
          hints.push('your bishop lands where your rook is ready to back it up');
        } else if (knightSupport && move.piece === 'b') {
          hints.push('your bishop joins forces with a knight');
        } else if (bishopSupport && move.piece === 'n') {
          hints.push('your knight lands where a bishop is ready to support it');
        }

    if (move.flags.includes('c') || move.flags.includes('e')) {
      hints.push('it creates immediate tactical pressure');
    }

    const attackedTargets = after.moves({ verbose: true }).filter(m => m.from === to && m.color === ownColor);
    const targetNames = attackedTargets
      .map(m => m.piece === 'k' ? 'king' : getPieceFullName(m.captured || m.piece))
      .filter(Boolean);
    if (targetNames.length > 0) {
      hints.push(`it threatens ${[...new Set(targetNames)].join(' and ')}`);
    }

    if (hints.length) {
      return `That was stronger because ${hints.join(' and ')}.`;
    }
  } catch (err) {
    console.warn('Tactical hint error:', err);
  }
  return '';
}

function buildCoachAlternativeText(state, suggestedSan, tacticalHint, fallback) {
  if (suggestedSan && suggestedSan !== state.san) {
    return `You played "${state.san}". A stronger idea was ${suggestedSan}.${tacticalHint ? ` ${tacticalHint}` : ''}`;
  }
  return `You played "${state.san}". ${fallback}`;
}

function triggerGameAnalysisSelector(game) {
  selectedGame = game;
  currentMoveIndex = 0;
  isReviewMode = false;
  if (reviewRetryBanner) reviewRetryBanner.classList.add('hidden');

  const targetUser = usernameInput.value.trim().toLowerCase();
  const isWhiteUser = game.white && game.white.username && game.white.username.toLowerCase() === targetUser;

  isFlipped = !isWhiteUser;
  updateMatchupUI();

  const builder = new window.Chess();
  let rawMoves = [];
  try {
    const pgnText = (game.pgn || '').trim();
    const loaded = builder.load_pgn(pgnText);
    if (loaded) {
      rawMoves = builder.history({ verbose: true });
    } else if (game.fen) {
      builder.load(game.fen);
    }
  } catch (e) {
    console.warn("PGN load fallback:", e);
  }
  
  gameMoveSequence = [{
    fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    san: "Start",
    color: 'w',
    moveObj: null,
    eval: null,
    classification: CLASSIFICATIONS.BOOK
  }];

  const rebuilder = new window.Chess();
  for (let i = 0; i < rawMoves.length; i++) {
    const m = rawMoves[i];
    rebuilder.move(m);
    const fenState = rebuilder.fen();

    gameMoveSequence.push({
      fen: fenState,
      san: m.san,
      color: m.color,
      moveObj: m,
      eval: null,
      classification: CLASSIFICATIONS.GOOD
    });
  }

  showGameReviewPage();
  navigateMove(0);

  computeEvalsInBackground(gameMoveSequence).then(() => {
    runAccuracyMetricClassifications();
    updateCoachCommentaryHeader();
    showAlert('Evaluation complete.', 'success');
  }).catch((e) => {
    console.warn('Background eval error:', e);
  });
}

function runAccuracyMetricClassifications() {
  reviewMoments = [];

  for (let i = 1; i < gameMoveSequence.length; i++) {
    const current = gameMoveSequence[i];
    const previous = gameMoveSequence[i - 1];
    const isWhite = current.color === 'w';

    const prevVal = getAbsoluteScoreValue(previous.eval);
    const currVal = getAbsoluteScoreValue(current.eval);

    const loss = isWhite ? (prevVal - currVal) : (currVal - prevVal);
    const absLoss = Math.max(0, loss);

    let category = CLASSIFICATIONS.GOOD;

    if (i <= 6) category = CLASSIFICATIONS.BOOK;
    else if (absLoss <= 15) category = CLASSIFICATIONS.BEST;
    else if (absLoss <= 45) category = CLASSIFICATIONS.EXCELLENT;
    else if (absLoss <= 90) category = CLASSIFICATIONS.GOOD;
    else if (absLoss <= 180) category = CLASSIFICATIONS.INACCURACY;
    else if (absLoss <= 350) {
      category = CLASSIFICATIONS.MISTAKE;
      reviewMoments.push(i);
    } else {
      const isWinningBefore = isWhite ? (prevVal > 180) : (prevVal < -180);
      if (isWinningBefore && absLoss > 300) category = CLASSIFICATIONS.MISSED_WIN;
      else category = CLASSIFICATIONS.BLUNDER;
      reviewMoments.push(i);
    }

    current.classification = category;
  }
}

function startWalkingReviewKeyMoments() {
  if (reviewMoments.length === 0) {
    showAlert("Awesome! No Mistakes or Blunders were made in this match!", "success");
    return;
  }
  isReviewMode = true;
  activeReviewIndex = 0;
  if (reviewRetryBanner) reviewRetryBanner.classList.remove('hidden');
  loadActiveKeyMomentTargetIndex(reviewMoments[0]);
}

function loadActiveKeyMomentTargetIndex(stepIndex) {
  currentMoveIndex = stepIndex - 1;
  selectedSquare = null;

  renderChessboard();

  const actualMistakeMove = gameMoveSequence[stepIndex];
  const category = actualMistakeMove.classification;

  badgeClassText.innerText = `RETRY ${category.label.toUpperCase()}`;
  badgeClassification.className = "text-[9px] font-black px-2 py-0.5 rounded uppercase border bg-amber-400/10 text-amber-400 border-amber-400/20";
  
  const speechMsg = `In this position, you played ${actualMistakeMove.san}. Can you find a stronger follow-up?`;
  txtCoachComment.innerText = speechMsg;
  lblBestMoveVal.innerText = "???";

  speakCoachCommentary(`Challenge! You played ${actualMistakeMove.san}. Can you find a stronger follow-up?`);
}

function handleRetryValidationAttempt(attemptMove) {
  const mistakeIndex = reviewMoments[activeReviewIndex];
  const previousState = gameMoveSequence[mistakeIndex - 1];
  const targetEval = previousState.eval;
  const attemptMoveStr = `${attemptMove.from}${attemptMove.to}`;

  if (attemptMove.captured) playCaptureSound(); else playMoveSound();

  if (attemptMoveStr === targetEval.bestMove) {
    createConfettiCelebrationEffect();
    txtCoachComment.innerHTML = `<span class="text-indigo-400 font-black">🎉 Nice work!</span> You found the most convincing continuation: "${attemptMove.san}."`;
    speakCoachCommentary(`Nice work! You found the most convincing continuation with ${attemptMove.san}.`);

    activeReviewIndex++;
    if (activeReviewIndex < reviewMoments.length) {
      setTimeout(() => {
        loadActiveKeyMomentTargetIndex(reviewMoments[activeReviewIndex]);
      }, 1500);
    } else {
      setTimeout(() => {
        exitRetryMode();
      }, 1500);
    }
  } else {
    txtCoachComment.innerHTML = `<span class="text-rose-400 font-black">❌ Good try.</span> ${attemptMove.san} is a solid attempt. See if you can find a cleaner idea from this position.`;
    speakCoachCommentary(`Good try. ${attemptMove.san} is a solid attempt. Try to find a cleaner idea from this position.`);
    setTimeout(() => renderChessboard(), 1200);
  }
}

function createConfettiCelebrationEffect() {
  const colors = ['#6366f1', '#06b64c', '#fbbf24', '#f87171'];
  for (let i = 0; i < 30; i++) {
    const particle = document.createElement('div');
    particle.className = 'confetti';
    particle.style.left = `${Math.random() * 100}vw`;
    particle.style.top = `0px`;
    particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    document.body.appendChild(particle);
    setTimeout(() => particle.remove(), 1500);
  }
}

function exitRetryMode() {
  isReviewMode = false;
  if (reviewRetryBanner) reviewRetryBanner.classList.add('hidden');
  navigateMove(currentMoveIndex);
}

function navigateMove(index) {
  if (index < 0 || index >= gameMoveSequence.length) return;
  currentMoveIndex = index;
  selectedSquare = null;

  renderChessboard();
  updateCoachCommentaryHeader();
}

function updateCoachCommentaryHeader() {
  if (isReviewMode) return;

  const state = gameMoveSequence[currentMoveIndex];
  if (!state) return;

  updateLiveEvaluationSidebar(state.eval);

  lblMoveNum.innerText = currentMoveIndex === 0 ? "Start Position" : `Move #${currentMoveIndex} (${state.san})`;

  if (currentMoveIndex === 0) {
    badgeClassText.innerText = "OPENING";
    badgeClassification.className = "text-[9px] font-black px-2 py-0.5 rounded uppercase border bg-slate-800 text-slate-300 border-slate-700";
    txtCoachComment.innerText = "This is the opening setup. The position is balanced, so your goal is to finish development and keep the center under control.";
    lblBestMoveVal.innerText = "Balanced";
    return;
  }

  const quality = state.classification;
  badgeClassText.innerText = quality.label;
  badgeClassification.className = `text-[9px] font-black px-2.5 py-0.5 rounded uppercase border ${quality.class}`;

  lblBestMoveVal.innerText = "Review";

  const previousState = currentMoveIndex > 0 ? gameMoveSequence[currentMoveIndex - 1] : null;
  const suggestedMove = previousState && previousState.eval ? previousState.eval.bestMove : '';
  const suggestedSan = suggestedMove && previousState ? getMoveSanFromFen(previousState.fen, suggestedMove) : '';
  const tacticalHint = suggestedMove && previousState ? getTacticalHintForMove(previousState.fen, suggestedMove) : '';

  let text = "";
   let audiotext = "";
  const alternativeHint = suggestedSan && suggestedSan !== state.san
    ? `A stronger idea was ${suggestedSan}.${tacticalHint ? ` ${tacticalHint}` : ''}`
    : null;

  switch (quality) {
    case CLASSIFICATIONS.BOOK:
      text = `You played "${state.san}". Nice opening choice — it keeps the position flexible and helps you finish development.`;
     audiotext=`Nice opening choice`;
      break;
    case CLASSIFICATIONS.BRILLIANT:
      text = `You played "${state.san}". Great tactical vision — it forces the position in your favor and keeps your pieces coordinated.`;
      audiotext=`Great tactical vision`;
      break;
    case CLASSIFICATIONS.GREAT:
      text = `You played "${state.san}". Good idea — it keeps the pressure on and gives you a clear follow-up.`;
     audiotext=`Great tactical vision`;
      break;
    case CLASSIFICATIONS.BEST:
      text = `You played "${state.san}". Excellent. This move keeps your position active while avoiding unnecessary risk.`;
      audiotext=`Excellent move`;
      break;
    case CLASSIFICATIONS.EXCELLENT:
      text = `You played "${state.san}". Very solid — it keeps the structure healthy and maintains your momentum.`;
      audiotext=`Very solid  move`;
      break;
    case CLASSIFICATIONS.GOOD:
      text = `You played "${state.san}". Solid play. There is still a slightly sharper plan available from this position.`;
     audiotext=`Solid play`;
      break;
    case CLASSIFICATIONS.INACCURACY:
      text = alternativeHint || `You played "${state.san}". A cleaner idea was available here.`;
     audiotext=`A cleaner idea was available here.`;
      break;
    case CLASSIFICATIONS.MISTAKE:
      text = alternativeHint || `You played "${state.san}". A more precise move would have avoided the trouble this created.`;
      audiotext=`A more precise move would have avoided the trouble this created.`;
      break;
    case CLASSIFICATIONS.MISSED_WIN:
      text = alternativeHint || `You played "${state.san}". A more direct plan would have pressed your advantage more clearly.`;
      audiotext=`A more direct plan would have pressed your advantage more clearly.`;
      break;
    case CLASSIFICATIONS.BLUNDER:
      text = alternativeHint || `You played "${state.san}". This move leaves the position in a weaker state than necessary.`;
    audiotext=`This move leaves the position in a weaker state`;
      break;
  }

  txtCoachComment.innerText = text;
  speakCoachCommentary(audiotext);
}