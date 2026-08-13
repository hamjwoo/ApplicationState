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
  try {
    const res = await fetch("/api/status");
    if (!res.ok) throw new Error("status fetch failed");
    const apps = await res.json();
    renderApps(apps);
  } catch (err) {
    console.error("상태를 불러오지 못했습니다:", err);
  }
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
  try {
    const res = await fetch("/api/history");
    if (!res.ok) throw new Error("history fetch failed");
    const entries = await res.json();
    renderHistory(entries);
  } catch (err) {
    console.error("이력을 불러오지 못했습니다:", err);
  }
}

function refresh() {
  loadApps();
  loadHistory();
}

refresh();
setInterval(refresh, 10000);
