import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const BACKLOG_PATH = join(dirname(fileURLToPath(import.meta.url)), "..", "backlog.json");
const REQUIRED_FIELDS = [
  "id", "status", "priority", "category", "title", "summary",
  "where", "parent", "deps", "doc", "done_at", "note",
];
const ID_PATTERN = /^LB-\d{3}$/;

function loadBacklog() {
  const raw = readFileSync(BACKLOG_PATH, "utf8");
  return JSON.parse(raw);
}

function saveBacklog(backlog) {
  writeFileSync(BACKLOG_PATH, JSON.stringify(backlog, null, 2) + "\n", "utf8");
}

function sortedByIdNumber(tasks) {
  return [...tasks].sort((a, b) => {
    const numA = Number(String(a.id).split("-")[1]);
    const numB = Number(String(b.id).split("-")[1]);
    return numA - numB;
  });
}

function cmdList() {
  const backlog = loadBacklog();
  for (const task of sortedByIdNumber(backlog.tasks)) {
    console.log(`${task.id}\t${task.status}\t${task.title}`);
  }
}

function cmdSet(id, status) {
  if (!id || !status) {
    console.error("사용법: node tools/backlog.mjs set <id> <status>");
    process.exitCode = 1;
    return;
  }
  const backlog = loadBacklog();
  if (!backlog.enums.status.includes(status)) {
    console.error(`거부: "${status}"는 enums.status에 없는 값입니다. 허용값: ${backlog.enums.status.join(", ")}`);
    process.exitCode = 1;
    return;
  }
  const task = backlog.tasks.find((t) => t.id === id);
  if (!task) {
    console.error(`거부: id "${id}"인 작업을 찾을 수 없습니다.`);
    process.exitCode = 1;
    return;
  }
  task.status = status;
  saveBacklog(backlog);
  console.log(`${task.id} 상태를 "${status}"로 바꿔서 저장했습니다.`);
}

function cmdValidate() {
  const backlog = loadBacklog();
  const problems = [];
  const { status: statusEnum, priority: priorityEnum, category: categoryEnum } = backlog.enums;

  for (const task of backlog.tasks) {
    const label = task.id ?? "(id 없음)";

    for (const field of REQUIRED_FIELDS) {
      if (!Object.prototype.hasOwnProperty.call(task, field)) {
        problems.push(`${label}: 필수 필드 "${field}"가 없음`);
      }
    }

    if (typeof task.id !== "string" || !ID_PATTERN.test(task.id)) {
      problems.push(`${label}: id 형식이 LB-숫자3자리가 아님 (현재: ${JSON.stringify(task.id)})`);
    }
    if (!statusEnum.includes(task.status)) {
      problems.push(`${label}: status "${task.status}"가 enums.status에 없음`);
    }
    if (!priorityEnum.includes(task.priority)) {
      problems.push(`${label}: priority "${task.priority}"가 enums.priority에 없음`);
    }
    if (!categoryEnum.includes(task.category)) {
      problems.push(`${label}: category "${task.category}"가 enums.category에 없음`);
    }
    if (typeof task.title !== "string" || task.title.trim() === "") {
      problems.push(`${label}: title이 비어 있음`);
    }
    if (typeof task.summary !== "string" || task.summary.trim() === "") {
      problems.push(`${label}: summary가 비어 있음`);
    }
    if (typeof task.note !== "string" || task.note.trim() === "") {
      problems.push(`${label}: note가 비어 있음`);
    }
    if (!Array.isArray(task.deps)) {
      problems.push(`${label}: deps가 배열이 아님`);
    }
  }

  if (problems.length === 0) {
    console.log("VALID");
  } else {
    console.log(`문제 ${problems.length}건:`);
    for (const problem of problems) console.log(`- ${problem}`);
    process.exitCode = 1;
  }
}

function main() {
  const [command, ...args] = process.argv.slice(2);

  switch (command) {
    case "list":
      cmdList();
      break;
    case "set":
      cmdSet(args[0], args[1]);
      break;
    case "validate":
      cmdValidate();
      break;
    default:
      console.error("사용법: node tools/backlog.mjs <list|set|validate> [args]");
      process.exitCode = 1;
  }
}

main();
