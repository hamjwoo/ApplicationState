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

// netstat만으로는 부족하다: Windows에서 새 프로세스가 같은 포트를 다시 바인딩하면
// 이전 프로세스는 더 이상 LISTENING으로 보이지 않지만 재탐색 스케줄러(setInterval)는
// 계속 살아서 history.json에 중복 기록을 남긴다. 그래서 이 프로젝트의 server.js를
// 실행 중인 node 프로세스를 명령줄 기준으로 직접 찾아 함께 종료한다.
function findServerJsPids() {
  let output;
  try {
    output = execSync(
      `powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \\"Name='node.exe'\\" | Where-Object { $_.CommandLine -match 'server\\.js' } | Select-Object -ExpandProperty ProcessId"`,
      { encoding: "utf-8" }
    );
  } catch {
    return [];
  }
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^\d+$/.test(line));
}

const pids = new Set([...findListeningPids(PORT), ...findServerJsPids()]);
if (pids.size === 0) {
  process.exit(0);
}

for (const pid of pids) {
  try {
    execSync(`taskkill /F /PID ${pid}`, { stdio: "ignore" });
    console.log(`기존 서버 프로세스(PID ${pid})를 종료했습니다.`);
  } catch {
    console.warn(`PID ${pid} 종료 실패 — 이미 종료되었거나 권한이 없을 수 있습니다.`);
  }
}
