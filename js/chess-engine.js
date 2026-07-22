// Chess Evaluation Engine

const PIECE_VALS = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

function evaluateStaticPosition(chessInst) {
  if (chessInst.in_checkmate()) {
    return chessInst.turn() === 'w' ? -9999 : 9999;
  }
  if (chessInst.in_draw() || chessInst.in_stalemate()) {
    return 0;
  }

  let score = 0;
  const board = chessInst.board();

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece) {
        const val = PIECE_VALS[piece.type] || 100;
        const isCenter = (r === 3 || r === 4) && (c === 3 || c === 4);
        const centerBonus = isCenter ? 20 : 0;

        if (piece.color === 'w') {
          score += val + centerBonus;
        } else {
          score -= val + centerBonus;
        }
      }
    }
  }
  return score;
}

function evaluateCandidateMove(checker, move, isWhite) {
  const targetSquare = move.to;
  const movingPieceVal = PIECE_VALS[move.piece] || 100;
  const capturedPieceVal = move.captured ? (PIECE_VALS[move.captured] || 0) : 0;

  checker.move(move);
  let evalScore = evaluateStaticPosition(checker);

  const oppMoves = checker.moves({ verbose: true });
  const attacksOnTarget = oppMoves.filter(m => m.to === targetSquare);

  if (attacksOnTarget.length > 0) {
    attacksOnTarget.sort((a, b) => (PIECE_VALS[a.piece] || 100) - (PIECE_VALS[b.piece] || 100));
    const cheapestAttacker = attacksOnTarget[0];
    const oppAttackerVal = PIECE_VALS[cheapestAttacker.piece] || 100;

    checker.move(cheapestAttacker);
    const ourRecaptures = checker.moves({ verbose: true }).filter(m => m.to === targetSquare);
    const isDefendedByUs = ourRecaptures.length > 0;
    checker.undo();

    if (!isDefendedByUs) {
      const netLoss = movingPieceVal - capturedPieceVal;
      if (netLoss > 0) {
        evalScore += isWhite ? -netLoss : netLoss;
      }
    } else {
      if (movingPieceVal > capturedPieceVal + 100) {
        const netTradeLoss = (movingPieceVal - capturedPieceVal) - oppAttackerVal;
        if (netTradeLoss > 0) {
          evalScore += isWhite ? -netTradeLoss : netTradeLoss;
        }
      }
    }
  }

  checker.undo();
  return evalScore;
}

function evaluateBoardStatePositional(fen, maxDepth = 2) {
  try {
    const root = new window.Chess(fen);

    if (root.in_checkmate()) {
      return { type: 'mate', value: root.turn() === 'w' ? -9999 : 9999, bestMove: '' };
    }
    if (root.in_draw() || root.in_stalemate()) {
      return { type: 'cp', value: 0, bestMove: '' };
    }

    const isRootWhite = root.turn() === 'w';
    let topBestMove = null;

    function minimax(node, depth, alpha, beta, maximizing) {
      if (depth === 0) {
        return evaluateStaticPosition(node);
      }

      const moves = node.moves({ verbose: true });
      if (moves.length === 0) return evaluateStaticPosition(node);

      if (maximizing) {
        let maxEval = -Infinity;
        for (let m of moves) {
          node.move(m);
          const evalScore = minimax(node, depth - 1, alpha, beta, false);
          node.undo();
          if (evalScore > maxEval) {
            maxEval = evalScore;
            if (depth === maxDepth) topBestMove = m;
          }
          alpha = Math.max(alpha, evalScore);
          if (beta <= alpha) break;
        }
        return maxEval;
      } else {
        let minEval = Infinity;
        for (let m of moves) {
          node.move(m);
          const evalScore = minimax(node, depth - 1, alpha, beta, true);
          node.undo();
          if (evalScore < minEval) {
            minEval = evalScore;
            if (depth === maxDepth) topBestMove = m;
          }
          beta = Math.min(beta, evalScore);
          if (beta <= alpha) break;
        }
        return minEval;
      }
    }

    const score = minimax(root, maxDepth, -Infinity, Infinity, isRootWhite);
    const bestMoveStr = topBestMove ? `${topBestMove.from}${topBestMove.to}` : '';
    return { type: 'cp', value: isFinite(score) ? Math.round(score) : 0, bestMove: bestMoveStr };
  } catch (err) {
    console.error('Evaluation error:', err);
    return { type: 'cp', value: 0, bestMove: '' };
  }
}

function getAbsoluteScoreValue(evaluation) {
  if (!evaluation) return 0;
  if (evaluation.type === 'mate') return evaluation.value < 0 ? -10000 : 10000;
  return evaluation.value;
}

async function computeEvalsInBackground(sequence, chunkSize = 4, delay = 30) {
  if (!sequence || sequence.length === 0) return;
  showAlert('Computing evaluations...', 'info');

  const total = sequence.length;
  let completed = 0;
  const startIdx = 1;

  for (let i = startIdx; i < total; i += chunkSize) {
    const sliceEnd = Math.min(i + chunkSize, total);
    for (let j = i; j < sliceEnd; j++) {
      try {
        const fen = sequence[j].fen;
        if (fen) {
          const evalObj = evaluateBoardStatePositional(fen);
          sequence[j].eval = evalObj;
        }
      } catch (err) {
        console.warn('Eval error for index', j, err);
        sequence[j].eval = { type: 'cp', value: 0, bestMove: '' };
      }
      completed++;
    }

    const pct = Math.round((completed / (total - startIdx)) * 100);
    showAlert(`Computing evaluations... ${pct}%`, 'info');

    if (currentMoveIndex >= i && currentMoveIndex < sliceEnd) {
      updateCoachCommentaryHeader();
      renderChessboard();
    }

    await new Promise(res => setTimeout(res, delay));
  }

  showAlert('Evaluations complete.', 'success');
}