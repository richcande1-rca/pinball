// Miami Nights worldwide high-score board.
// Presentation/network layer only: gameplay scoring and physics stay untouched.

(() => {
  if (window.miamiWorldHighScoresInstalled) return;
  window.miamiWorldHighScoresInstalled = true;

  const API_URL = 'https://pinball.rich-gothic.workers.dev/api/board';
  const BOARD_LIMIT = 20;
  const INITIALS_KEY = 'miami-nights-world-initials-v1';

  let boardOpen = false;
  let leaderboard = [];
  let leaderboardLoaded = false;
  let submittedThisGame = false;
  let pendingGameOverScore = null;

  const stylesheet = document.createElement('link');
  stylesheet.rel = 'stylesheet';
  stylesheet.href = 'high-scores.css?v=20260906-world1';
  document.head.appendChild(stylesheet);

  const helpBar = document.querySelector('.help-bar');
  if (!helpBar) return;

  const openButton = document.createElement('button');
  openButton.id = 'miami-world-scores-button';
  openButton.className = 'miami-world-scores-button';
  openButton.type = 'button';
  openButton.textContent = 'WORLD HIGH SCORES';
  openButton.setAttribute('aria-haspopup', 'dialog');
  openButton.setAttribute('aria-expanded', 'false');
  helpBar.insertAdjacentElement('beforebegin', openButton);

  const overlay = document.createElement('section');
  overlay.id = 'miami-world-scores';
  overlay.className = 'miami-world-scores is-hidden';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'miami-world-scores-title');
  overlay.innerHTML = `
    <div class="miami-world-scores-card">
      <div class="miami-world-scores-head">
        <div>
          <p class="miami-world-scores-kicker">MIAMI NIGHTS</p>
          <h2 id="miami-world-scores-title">WORLD HIGH SCORES</h2>
          <p id="miami-world-scores-note" class="miami-world-scores-note">Worldwide Top ${BOARD_LIMIT}</p>
        </div>
        <button id="miami-world-scores-close" class="miami-world-scores-close" type="button" aria-label="Close high scores">×</button>
      </div>

      <form id="miami-world-score-form" class="miami-world-score-form" hidden>
        <div class="miami-world-score-callout">
          <span>NEW HIGH SCORE</span>
          <strong id="miami-world-score-value">0</strong>
        </div>
        <label for="miami-world-score-initials">INITIALS</label>
        <div class="miami-world-score-entry-row">
          <input id="miami-world-score-initials" maxlength="3" inputmode="text" autocomplete="nickname" spellcheck="false" placeholder="AAA" aria-label="High score initials">
          <button id="miami-world-score-submit" type="submit">POST SCORE</button>
        </div>
        <p id="miami-world-score-status" class="miami-world-score-status" aria-live="polite"></p>
      </form>

      <div id="miami-world-scores-list" class="miami-world-scores-list" aria-live="polite"></div>
      <button id="miami-world-scores-refresh" class="miami-world-scores-refresh" type="button">REFRESH WORLD BOARD</button>
    </div>
  `;
  document.body.appendChild(overlay);

  const closeButton = overlay.querySelector('#miami-world-scores-close');
  const refreshButton = overlay.querySelector('#miami-world-scores-refresh');
  const list = overlay.querySelector('#miami-world-scores-list');
  const note = overlay.querySelector('#miami-world-scores-note');
  const form = overlay.querySelector('#miami-world-score-form');
  const scoreValue = overlay.querySelector('#miami-world-score-value');
  const initialsInput = overlay.querySelector('#miami-world-score-initials');
  const submitButton = overlay.querySelector('#miami-world-score-submit');
  const status = overlay.querySelector('#miami-world-score-status');

  try {
    initialsInput.value = (localStorage.getItem(INITIALS_KEY) || '').slice(0, 3).toUpperCase();
  } catch (error) {
    // Remembering initials is optional; the world board itself remains cloud-only.
  }

  function formatScore(value) {
    return Number(value || 0).toLocaleString('en-US');
  }

  function cleanInitials(value) {
    return String(value || '')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 3);
  }

  function rememberInitials(value) {
    try {
      localStorage.setItem(INITIALS_KEY, value);
    } catch (error) {
      // Fine without saved initials.
    }
  }

  function currentBuild() {
    const build = document.querySelector('.build-number');
    return (build?.textContent || 'Miami Nights').trim().slice(0, 40);
  }

  function renderMessage(text, error = false) {
    list.replaceChildren();
    const row = document.createElement('div');
    row.className = `miami-world-scores-message${error ? ' is-error' : ''}`;
    row.textContent = text;
    list.appendChild(row);
  }

  function renderBoard(entries) {
    leaderboard = Array.isArray(entries) ? entries.slice(0, BOARD_LIMIT) : [];
    leaderboardLoaded = true;
    list.replaceChildren();
    note.textContent = `Worldwide Top ${BOARD_LIMIT}`;

    if (!leaderboard.length) {
      renderMessage('No scores yet. First player owns Miami.');
      return;
    }

    leaderboard.forEach((entry, index) => {
      const row = document.createElement('div');
      row.className = 'miami-world-score-row';
      if (index === 0) row.classList.add('is-first');

      const rank = document.createElement('span');
      rank.className = 'miami-world-score-rank';
      rank.textContent = String(index + 1).padStart(2, '0');

      const initials = document.createElement('strong');
      initials.className = 'miami-world-score-name';
      initials.textContent = String(entry.initials || entry.name || '---').slice(0, 3).toUpperCase();

      const points = document.createElement('span');
      points.className = 'miami-world-score-points';
      points.textContent = formatScore(entry.score);

      row.append(rank, initials, points);
      list.appendChild(row);
    });
  }

  async function fetchBoard() {
    const response = await fetch(API_URL, {
      headers: { Accept: 'application/json' },
      cache: 'no-store'
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || !body.ok || !Array.isArray(body.entries)) {
      throw new Error(body.error || `World board returned ${response.status}.`);
    }
    renderBoard(body.entries);
    return body.entries;
  }

  function scoreQualifies(finalScore, entries = leaderboard) {
    const numericScore = Math.max(0, Number(finalScore) || 0);
    if (numericScore <= 0) return false;
    if (!Array.isArray(entries) || entries.length < BOARD_LIMIT) return true;
    const cutoff = Number(entries[BOARD_LIMIT - 1]?.score) || 0;
    return numericScore > cutoff;
  }

  function showEntryForm(finalScore) {
    pendingGameOverScore = Math.max(0, Math.floor(Number(finalScore) || 0));
    if (!pendingGameOverScore || submittedThisGame) {
      form.hidden = true;
      return;
    }

    scoreValue.textContent = formatScore(pendingGameOverScore);
    status.textContent = '';
    form.hidden = false;
    window.setTimeout(() => initialsInput.focus({ preventScroll: true }), 30);
  }

  async function refreshBoard() {
    renderMessage('CONTACTING MIAMI...');
    refreshButton.disabled = true;
    try {
      const entries = await fetchBoard();
      if (
        boardOpen &&
        gameOver &&
        !submittedThisGame &&
        scoreQualifies(score, entries)
      ) {
        showEntryForm(score);
      } else if (!pendingGameOverScore) {
        form.hidden = true;
      }
    } catch (error) {
      leaderboardLoaded = false;
      note.textContent = 'Worldwide board';
      renderMessage('World board is temporarily unreachable. The game still works.', true);
    } finally {
      refreshButton.disabled = false;
    }
  }

  async function submitScore(event) {
    event.preventDefault();
    if (submittedThisGame || !pendingGameOverScore) return;

    const initials = cleanInitials(initialsInput.value);
    initialsInput.value = initials;
    if (!initials) {
      status.textContent = 'Enter 1–3 letters or numbers.';
      initialsInput.focus();
      return;
    }

    submitButton.disabled = true;
    status.textContent = 'Posting to the world board...';

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({
          initials,
          score: pendingGameOverScore,
          build: currentBuild()
        })
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.ok || !Array.isArray(body.entries)) {
        throw new Error(body.error || `World board returned ${response.status}.`);
      }

      rememberInitials(initials);
      submittedThisGame = true;
      pendingGameOverScore = null;
      form.hidden = true;
      renderBoard(body.entries);
      note.textContent = 'SCORE POSTED WORLDWIDE';
    } catch (error) {
      status.textContent = 'Could not reach the world board. Try again.';
    } finally {
      submitButton.disabled = false;
    }
  }

  function openBoard() {
    if (boardOpen) return;
    boardOpen = true;
    if (typeof releaseAllControls === 'function') releaseAllControls();
    overlay.classList.remove('is-hidden');
    openButton.setAttribute('aria-expanded', 'true');
    refreshBoard();
    closeButton.focus({ preventScroll: true });
  }

  function closeBoard() {
    if (!boardOpen) return;
    boardOpen = false;
    overlay.classList.add('is-hidden');
    openButton.setAttribute('aria-expanded', 'false');
    openButton.focus({ preventScroll: true });
  }

  async function handleFinalScore(finalScore) {
    if (submittedThisGame || finalScore <= 0) return;

    pendingGameOverScore = Math.floor(finalScore);
    try {
      const entries = leaderboardLoaded ? leaderboard : await fetchBoard();
      if (!scoreQualifies(finalScore, entries)) {
        pendingGameOverScore = null;
        return;
      }
      openBoard();
      showEntryForm(finalScore);
    } catch (error) {
      // Do not interrupt GAME OVER just because the network is unavailable.
      pendingGameOverScore = null;
    }
  }

  initialsInput.addEventListener('input', () => {
    initialsInput.value = cleanInitials(initialsInput.value);
  });
  form.addEventListener('submit', submitScore);
  openButton.addEventListener('click', openBoard);
  closeButton.addEventListener('click', closeBoard);
  refreshButton.addEventListener('click', refreshBoard);
  overlay.addEventListener('pointerdown', event => {
    if (event.target === overlay) closeBoard();
  });
  window.addEventListener('keydown', event => {
    if (!boardOpen || event.code !== 'Escape') return;
    event.preventDefault();
    event.stopImmediatePropagation();
    closeBoard();
  }, true);

  // Consume fixed simulation steps while the board is open so closing it never
  // causes a catch-up physics burst.
  const baseUpdateWithWorldScores = update;
  update = function updateWithWorldScores(dt) {
    if (boardOpen) return;
    baseUpdateWithWorldScores(dt);
  };

  // Install after every other rule module so this observes the final, wrapped
  // drain behavior and sees the true final score.
  const baseHandleDrainWithWorldScores = handleDrain;
  handleDrain = function handleDrainWithWorldScores() {
    const wasGameOver = gameOver;
    baseHandleDrainWithWorldScores();
    if (!wasGameOver && gameOver) {
      const finalScore = score;
      window.setTimeout(() => handleFinalScore(finalScore), 0);
    }
  };

  const baseResetGameWithWorldScores = resetGame;
  resetGame = function resetGameWithWorldScores() {
    submittedThisGame = false;
    pendingGameOverScore = null;
    form.hidden = true;
    if (boardOpen) closeBoard();
    baseResetGameWithWorldScores();
  };
})();