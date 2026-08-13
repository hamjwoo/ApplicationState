import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFile, writeFile, rename } from "node:fs/promises";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATE_PATH = path.join(__dirname, "data", "state.json");
const HISTORY_PATH = path.join(__dirname, "data", "history.json");
const DEFAULT_RESCAN_INTERVAL_MS = 10000;
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
