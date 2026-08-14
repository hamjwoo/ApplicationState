import { execSync } from "node:child_process";

const PORT = 3000;

function findListeningPids(port) {
  let output;
  try {
    output = execSync(`netstat -ano -p TCP`, { encoding: "utf-8" });
  } catch {
    return [];
  }

  const pids = new Set();
  for (const line of output.split("\n")) {
    if (!line.includes("LISTENING")) continue;
    if (!line.includes(`:${port}`)) continue;
    const parts = line.trim().split(/\s+/);
    const pid = parts[parts.length - 1];
    if (/^\d+$/.test(pid)) pids.add(pid);
  }
  return [...pids];
}

const pids = findListeningPids(PORT);
if (pids.length === 0) {
  process.exit(0);
}

for (const pid of pids) {
  try {
    execSync(`taskkill /F /PID ${pid}`, { stdio: "ignore" });
    console.log(`포트 ${PORT}을 점유 중이던 기존 프로세스(PID ${pid})를 종료했습니다.`);
  } catch {
    console.warn(`PID ${pid} 종료 실패 — 이미 종료되었거나 권한이 없을 수 있습니다.`);
  }
}
