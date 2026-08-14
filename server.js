import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFile, writeFile, rename } from "node:fs/promises";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATE_PATH = path.join(__dirname, "data", "state.json");
const HISTORY_PATH = path.join(__dirname, "data", "history.json");
const DEFAULT_RESCAN_INTERVAL_MS = 3000;
const parsedInterval = Number(process.env.RESCAN_INTERVAL_MS);
const RESCAN_INTERVAL_MS =
  Number.isInteger(parsedInterval) && parsedInterval > 0 ? parsedInterval : DEFAULT_RESCAN_INTERVAL_MS;

const app = express();
const PORT = 3000;

app.use(express.static(path.join(__dirname, "public")));

app.get("/api/config", (req, res) => {
  res.json({ rescanIntervalMs: RESCAN_INTERVAL_MS });
});

app.get("/api/status", async (req, res) => {
  try {
    const raw = await readFile(STATE_PATH, "utf-8");
    res.json(JSON.parse(raw));
  } catch (err) {
    res.status(500).json({ error: "state.json을 읽을 수 없습니다" });
  }
});

app.get("/api/history", async (req, res) => {
  try {
    const raw = await readFile(HISTORY_PATH, "utf-8");
    res.json(JSON.parse(raw));
  } catch (err) {
    res.status(500).json({ error: "history.json을 읽을 수 없습니다" });
  }
});

let lastKnownStatusById = new Map();
let isScanning = false;

async function writeFileAtomic(filePath, content) {
  const tmpPath = `${filePath}.tmp`;
  await writeFile(tmpPath, content);
  await rename(tmpPath, filePath);
}

async function patchAppByName(name, patch) {
  const apps = JSON.parse(await readFile(STATE_PATH, "utf-8"));
  const app = apps.find((a) => a.name === name);
  if (!app) return;

  delete app.exitType;
  delete app.restartOutcome;
  app.status = patch.status;
  if (patch.exitType !== undefined) app.exitType = patch.exitType;
  if (patch.restartOutcome !== undefined) app.restartOutcome = patch.restartOutcome;

  await writeFileAtomic(STATE_PATH, JSON.stringify(apps, null, 2));
}

const DEMO_SCENARIO_STEPS = [
  { name: "app-3", status: "closed", exitType: "crash", restartOutcome: "fail" },
  { name: "app-3", status: "running", restartOutcome: "success" },
  { name: "app-7", status: "closed", exitType: "normal", restartOutcome: "success" },
  { name: "app-7", status: "running" },
];

let isDemoRunning = false;

async function runDemoScenario() {
  if (isDemoRunning) return false;
  isDemoRunning = true;
  (async () => {
    try {
      for (const step of DEMO_SCENARIO_STEPS) {
        await patchAppByName(step.name, step);
        await new Promise((resolve) => setTimeout(resolve, RESCAN_INTERVAL_MS + 1000));
      }
    } catch (err) {
      console.error("데모 시나리오 실행 실패:", err.message);
    } finally {
      isDemoRunning = false;
    }
  })();
  return true;
}

app.post("/api/demo/scenario", async (req, res) => {
  const started = await runDemoScenario();
  if (!started) {
    res.status(409).json({ error: "이미 데모 시나리오가 실행 중입니다" });
    return;
  }
  res.json({ status: "started", steps: DEMO_SCENARIO_STEPS.length, intervalMs: RESCAN_INTERVAL_MS });
});

async function detectStatusChanges() {
  if (isScanning) {
    console.warn("이전 재탐색이 아직 끝나지 않아 이번 주기는 건너뜁니다");
    return;
  }
  isScanning = true;
  try {
    let apps;
    try {
      apps = JSON.parse(await readFile(STATE_PATH, "utf-8"));
    } catch (err) {
      console.error("state.json 재탐색 실패:", err.message);
      return;
    }

    const changes = [];
    for (const app of apps) {
      const previousStatus = lastKnownStatusById.get(app.id);
      if (previousStatus !== undefined && previousStatus !== app.status) {
        changes.push({
          id: app.id,
          name: app.name,
          fromStatus: previousStatus,
          toStatus: app.status,
          timestamp: new Date().toISOString(),
        });
      }
      lastKnownStatusById.set(app.id, app.status);
    }

    if (changes.length === 0) return;

    let history = [];
    try {
      history = JSON.parse(await readFile(HISTORY_PATH, "utf-8"));
    } catch (err) {
      history = [];
    }
    await writeFileAtomic(HISTORY_PATH, JSON.stringify([...history, ...changes], null, 2));
  } finally {
    isScanning = false;
  }
}

async function startRescanScheduler() {
  const initialApps = JSON.parse(await readFile(STATE_PATH, "utf-8"));
  for (const app of initialApps) {
    lastKnownStatusById.set(app.id, app.status);
  }
  setInterval(detectStatusChanges, RESCAN_INTERVAL_MS);
}

app.listen(PORT, async () => {
  console.log(`Server running at http://localhost:${PORT}`);
  await startRescanScheduler();
  console.log(`${RESCAN_INTERVAL_MS}ms 재탐색 스케줄러 시작 (history.json 기록)`);
});
