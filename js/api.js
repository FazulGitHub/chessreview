// Chess.com API Functions

async function queryArchives(username) {
  if (!username) return;
  showAlert(`Scanning profile "${username}"...`, "info");
  archiveLbl.innerText = "Scanning...";
  archiveSelect.disabled = true;
  fetchBtn.disabled = true;

  try {
    const cleanUser = username.trim().toLowerCase();
    const response = await fetch(`https://api.chess.com/pub/player/${encodeURIComponent(cleanUser)}/games/archives`);

    if (!response.ok) throw new Error(`User "${username}" was not found.`);
    const data = await response.json();
    const reversed = data.archives ? data.archives.reverse() : [];

    if (reversed.length === 0) {
      archiveLbl.innerText = "No Games";
      showAlert(`Profile "${username}" found, but has no archived games.`, "error");
      fetchBtn.disabled = false;
      return;
    }

    archiveSelect.innerHTML = '';
    reversed.forEach(url => {
      const parts = url.split('/');
      const dateObj = new Date(parts[parts.length - 2], parseInt(parts[parts.length - 1]) - 1);
      const name = dateObj.toLocaleString('default', { month: 'long', year: 'numeric' });

      const opt = document.createElement('option');
      opt.value = url;
      opt.innerText = name;
      archiveSelect.appendChild(opt);
    });

    archiveSelect.disabled = false;
    archiveLbl.innerText = "Archive:";
    await downloadGamesFromMonth(reversed[0]);

  } catch (err) {
    archiveLbl.innerText = "Failed";
    showAlert(err.message, "error");
  } finally {
    fetchBtn.disabled = false;
  }
}

async function downloadGamesFromMonth(url) {
  archiveLbl.innerText = "Importing...";
  showAlert("Downloading matches for selected month...", "info");

  try {
    const response = await fetch(url);

    if (!response.ok) throw new Error(`Could not load games archive.`);
    const data = await response.json();
    const games = data.games ? data.games.reverse().slice(0, 24) : [];

    gamesTotalBadge.innerText = games.length;
    renderGamesHistoryList(games);

    if (games.length > 0) showAlert(`Successfully loaded ${games.length} games! Select any game to review.`, "success");
    else showAlert("No games found in this archive.", "amber");

  } catch (err) {
    showAlert(err.message, "error");
  } finally {
    fetchBtn.disabled = false;
    archiveLbl.innerText = "Archive:";
  }
}