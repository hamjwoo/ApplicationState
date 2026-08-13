# CLAUDE.md

## 명령어
- `npm start` — 서버를 실행한다 (`http://localhost:3000`)
- `node tools/backlog.mjs list` — 작업을 id·상태·제목 순서로 한 줄씩 출력한다
- `node tools/backlog.mjs set <id> <status>` — 작업 상태를 바꿔 저장한다 (enums.status에 없는 값은 거부한다)
- `node tools/backlog.mjs validate` — 필수 필드·enums 값·id 형식을 검사해 VALID 또는 문제 목록을 출력한다

## 구조
- `PLAN.md` — 프로젝트 범위와 Phase별 완료 기준의 근거
- `SPEC.md` — 데이터 구조·API·화면 흐름·제약의 근거
- `backlog.json` — 전체 작업 목록과 각 작업 상태의 단일 진실 공급원(SSOT)
- `tools/backlog.mjs` — `backlog.json`을 읽고 쓰는 유일한 도구
- `state_sample.json` — 상태 로그 형식의 샘플, 실제 데이터 스키마의 근거
- `data/state.json` — 화면에 표시할 현재 상태 데이터의 근거 (SPEC.md 기준)
- `data/history.json` — 상태 변화 이력 데이터의 근거 (SPEC.md 기준)
- `server.js` — API(`/api/status`, `/api/history`)와 10초 재탐색 스케줄러의 근거
- `public/` — 브라우저에 보이는 화면(HTML/CSS/JS)의 근거

## 항상 지킬 것
- `data/history.json`은 항목을 추가만 한다 — 기존 항목은 수정하거나 삭제하지 않는다
- 외부 데이터베이스는 붙이지 않는다 — 저장은 파일(JSON)로만 한다
- `backlog.json`은 손으로 고치지 않는다 — 읽기와 쓰기는 `tools/backlog.mjs`로만 한다

## 막히면
- 서버가 안 뜨면: 포트 3000을 다른 프로세스가 쓰고 있는지 먼저 확인한다
- 화면에 데이터가 안 보이면: `data/state.json`이 유효한 JSON인지 확인한다
- 이력이 안 쌓이면: 재탐색 스케줄러가 실행 중인지, 켜기 전에 사용자 승인을 받았는지 확인한다
- backlog 관련 오류면: `node tools/backlog.mjs validate`로 `backlog.json` 상태를 먼저 확인한다
