const BLOCKED_TOOLS = new Set(["Read", "Edit", "Write"]);
const REASON = "백로그는 tools/backlog.mjs로만 읽고 수정할 수 있습니다. list/set/validate를 쓰세요.";

let input = "";
process.stdin.on("data", (chunk) => {
  input += chunk;
});
process.stdin.on("end", () => {
  let payload;
  try {
    payload = JSON.parse(input);
  } catch {
    process.exit(0);
  }

  const toolName = payload.tool_name;
  const filePath = String(payload.tool_input?.file_path ?? "").replace(/\\/g, "/");
  const targetsBacklog = /backlog\.json$/.test(filePath);

  if (BLOCKED_TOOLS.has(toolName) && targetsBacklog) {
    console.log(
      JSON.stringify({
        systemMessage: REASON,
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "deny",
          permissionDecisionReason: REASON,
        },
      })
    );
  }

  process.exit(0);
});
