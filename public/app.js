function renderApps(apps) {
  const list = document.getElementById("app-list");
  list.innerHTML = "";
  for (const app of apps) {
    const row = document.createElement("tr");
    if (app.status === "closed" && app.restartOutcome === "fail") {
      row.classList.add("alert");
    }

    const nameCell = document.createElement("td");
    nameCell.textContent = app.name;

    const statusCell = document.createElement("td");
    const dot = document.createElement("span");
    dot.className = `status-dot ${app.status}`;
    statusCell.appendChild(dot);
    statusCell.appendChild(document.createTextNode(app.status));

    const restartCell = document.createElement("td");
    restartCell.textContent = app.restartOutcome ?? "";

    row.appendChild(nameCell);
    row.appendChild(statusCell);
    row.appendChild(restartCell);
    list.appendChild(row);
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
  const sorted = [...entries].sort(
    (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
  );
  for (const entry of sorted) {
    const row = document.createElement("tr");

    const timeCell = document.createElement("td");
    timeCell.textContent = new Date(entry.timestamp).toLocaleString("ko-KR", {
      timeZone: "Asia/Seoul",
    });

    const nameCell = document.createElement("td");
    nameCell.textContent = entry.name;

    const fromCell = document.createElement("td");
    fromCell.textContent = entry.fromStatus;

    const toCell = document.createElement("td");
    toCell.textContent = entry.toStatus;

    row.appendChild(timeCell);
    row.appendChild(nameCell);
    row.appendChild(fromCell);
    row.appendChild(toCell);
    list.appendChild(row);
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

function setupDemoButton() {
  const button = document.getElementById("demo-button");
  const status = document.getElementById("demo-status");

  button.addEventListener("click", async () => {
    button.disabled = true;
    status.textContent = "시나리오 실행 중... (앱 목록·이력이 자동으로 바뀝니다)";
    try {
      const res = await fetch("/api/demo/scenario", { method: "POST" });
      if (res.status === 409) {
        status.textContent = "이미 시나리오가 실행 중입니다.";
        button.disabled = false;
        return;
      }
      if (!res.ok) throw new Error("demo scenario failed to start");
      const { steps, intervalMs } = await res.json();
      const totalMs = steps * (intervalMs + 1000);
      setTimeout(() => {
        status.textContent = "시나리오 종료";
        button.disabled = false;
      }, totalMs);
    } catch (err) {
      console.error("데모 시나리오 실행 실패:", err);
      status.textContent = "실행 실패";
      button.disabled = false;
    }
  });
}

function setupTabs() {
  const buttons = document.querySelectorAll(".tab-button");
  const panels = document.querySelectorAll(".tab-panel");

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      buttons.forEach((b) => b.classList.remove("active"));
      panels.forEach((p) => p.classList.remove("active"));
      button.classList.add("active");
      document.getElementById(`tab-${button.dataset.tab}`).classList.add("active");
    });
  });
}

async function start() {
  let rescanIntervalMs = 10000;
  try {
    const res = await fetch("/api/config");
    if (res.ok) {
      const config = await res.json();
      rescanIntervalMs = config.rescanIntervalMs;
    }
  } catch (err) {
    console.error("설정을 불러오지 못했습니다, 기본값(10초) 사용:", err);
  }
  refresh();
  setInterval(refresh, rescanIntervalMs);
}

setupDemoButton();
setupTabs();
start();
