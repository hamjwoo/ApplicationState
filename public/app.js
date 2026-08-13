function renderApps(apps) {
  const list = document.getElementById("app-list");
  list.innerHTML = "";
  for (const app of apps) {
    const item = document.createElement("li");
    const restart = app.restartOutcome ?? "";
    item.textContent = `${app.name} — ${app.status}${restart ? ` — ${restart}` : ""}`;
    list.appendChild(item);
  }
}

async function loadApps() {
  const res = await fetch("/api/status");
  const apps = await res.json();
  renderApps(apps);
}

loadApps();
setInterval(loadApps, 10000);
