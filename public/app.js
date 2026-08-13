function renderApps(apps) {
  const list = document.getElementById("app-list");
  list.innerHTML = "";
  for (const app of apps) {
    const item = document.createElement("li");
    const restart = app.restartOutcome ?? "재시작 이력 없음(정상)";
    item.textContent = `${app.name} — ${app.status} — ${restart}`;
    if (app.status === "closed" && app.restartOutcome === "fail") {
      item.classList.add("alert");
    }
    list.appendChild(item);
  }
}

async function loadApps() {
  const res = await fetch("/api/status");
  const apps = await res.json();
  renderApps(apps);
}

function renderHistory(entries) {
  const list = document.getElementById("history-list");
  list.innerHTML = "";
  for (const entry of entries) {
    const item = document.createElement("li");
    item.textContent = `${entry.timestamp} — ${entry.name}: ${entry.fromStatus} → ${entry.toStatus}`;
    list.appendChild(item);
  }
}

async function loadHistory() {
  const res = await fetch("/api/history");
  const entries = await res.json();
  renderHistory(entries);
}

function refresh() {
  loadApps();
  loadHistory();
}

refresh();
setInterval(refresh, 10000);
