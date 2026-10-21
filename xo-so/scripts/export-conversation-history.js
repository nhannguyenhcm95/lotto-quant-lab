/**
 * LOTTO-QUANT LAB: CONVERSATION HISTORY EXPORTER
 * Trích xuất toàn bộ lịch sử trò chuyện từ transcript_full.jsonl
 * Tạo tài liệu Markdown chi tiết và sao lưu transcript JSONL
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const parentDir = path.resolve(rootDir, '..');

const conversationId = 'c3185154-123e-4cfe-b47c-73ff243b6b97';
const transcriptDir = `C:\\Users\\Admin\\.gemini\\antigravity-ide\\brain\\${conversationId}\\.system_generated\\logs`;
const transcriptFullPath = path.join(transcriptDir, 'transcript_full.jsonl');
const transcriptPath = path.join(transcriptDir, 'transcript.jsonl');

console.log('Đang đọc transcript từ:', transcriptFullPath);
const sourcePath = fs.existsSync(transcriptFullPath) ? transcriptFullPath : transcriptPath;
const rawLines = fs.readFileSync(sourcePath, 'utf-8').split('\n').filter(Boolean);

console.log(`Đã đọc ${rawLines.length} dòng sự kiện.`);

// Phân tách thành các Turn
const turns = [];
let currentTurn = null;

for (let i = 0; i < rawLines.length; i++) {
  let step;
  try {
    step = JSON.parse(rawLines[i]);
  } catch (e) {
    continue;
  }

  if (step.type === 'USER_INPUT') {
    if (currentTurn) {
      turns.push(currentTurn);
    }
    currentTurn = {
      turnIndex: turns.length + 1,
      stepIndex: step.step_index,
      userInput: step.content || '',
      actions: [],
      filesModified: new Set(),
      commandsRun: [],
      assistantResponses: []
    };
    continue;
  }

  if (!currentTurn) continue;

  // Thu thập actions và tool calls
  if (step.tool_calls && Array.isArray(step.tool_calls)) {
    for (const tc of step.tool_calls) {
      if (tc.name === 'replace_file_content' || tc.name === 'write_to_file' || tc.name === 'multi_replace_file_content') {
        const file = tc.args?.TargetFile || tc.args?.targetFile;
        if (file) currentTurn.filesModified.add(path.basename(file));
      } else if (tc.name === 'run_command') {
        const cmd = tc.args?.CommandLine;
        if (cmd && !currentTurn.commandsRun.includes(cmd)) currentTurn.commandsRun.push(cmd);
      }
    }
  }

  // Thu thập phản hồi của Planner / Model
  if (step.source === 'MODEL' && step.type === 'PLANNER_RESPONSE' && step.content && step.content.trim().length > 0) {
    // Chỉ giữ lại phản hồi có ý nghĩa (không phải chỉ log tool)
    currentTurn.assistantResponses.push(step.content.trim());
  }
}

if (currentTurn) {
  turns.push(currentTurn);
}

console.log(`Đã trích xuất thành công ${turns.length} lượt hội thoại (Turns).`);

// Sinh nội dung Markdown
let md = `# TOÀN BỘ LỊCH SỬ TRÒ CHUYỆN & TIẾN TRÌNH DỰ ÁN LOTTO-QUANT LAB

- **Mã định danh phiên hội thoại (Conversation ID):** \`${conversationId}\`
- **Thời gian xuất lịch sử:** ${new Date().toISOString()}
- **Số lượt trao đổi chính (Total Turns):** ${turns.length} lượt
- **Trạng thái dự án hiện tại:** **HOÀN TẤT 100% CÁC YÊU CẦU TỪ FIX-1 ĐẾN FIX-6 (PASS GATE A -> GATE L)**

---

## MỤC LỤC CÁC LƯỢT TRAO ĐỔI (TABLE OF CONTENTS)

${turns.map(t => {
  const preview = t.userInput.replace(/<USER_REQUEST>/g, '').replace(/<\/USER_REQUEST>/g, '').trim().split('\n')[0].substring(0, 80);
  return `- [Lượt #${t.turnIndex}: ${preview || 'Yêu cầu'}](#luot-${t.turnIndex})`;
}).join('\n')}

---

`;

turns.forEach(t => {
  // Làm sạch user input
  let cleanInput = t.userInput;
  cleanInput = cleanInput.replace(/<USER_REQUEST>/g, '').replace(/<\/USER_REQUEST>/g, '').trim();

  // Lấy câu trả lời cuối cùng hoặc tổng hợp các phản hồi
  const finalResponse = t.assistantResponses.length > 0 
    ? t.assistantResponses[t.assistantResponses.length - 1]
    : '(Trợ lý đã thực hiện các lệnh công cụ trực tiếp)';

  const filesList = Array.from(t.filesModified);

  md += `## Lượt #${t.turnIndex} <a id="luot-${t.turnIndex}"></a>\n\n`;
  md += `### 👤 Người Dùng (User)\n\n`;
  md += `\`\`\`text\n${cleanInput}\n\`\`\`\n\n`;

  if (filesList.length > 0 || t.commandsRun.length > 0) {
    md += `### ⚙️ Các Thao Tác Kỹ Thuật Đã Thực Hiện\n\n`;
    if (filesList.length > 0) {
      md += `- **Tập tin đã chỉnh sửa/tạo mới:** \`${filesList.join('`, `')}\`\n`;
    }
    if (t.commandsRun.length > 0) {
      md += `- **Lệnh đã thực thi tiêu biểu:**\n`;
      t.commandsRun.slice(0, 5).forEach(c => {
        md += `  \`\`\`powershell\n  ${c}\n  \`\`\`\n`;
      });
    }
    md += `\n`;
  }

  md += `### 🤖 Phản Hồi Của Trợ Lý (Antigravity Assistant)\n\n`;
  md += `${finalResponse}\n\n`;
  md += `---\n\n`;
});

// Ghi file ra thư mục Web và xo-so/reports/
const outPathRoot = path.join(parentDir, 'CONVERSATION_HISTORY.md');
const outPathReports = path.join(rootDir, 'reports', 'CONVERSATION_HISTORY.md');

fs.writeFileSync(outPathRoot, md, 'utf-8');
fs.writeFileSync(outPathReports, md, 'utf-8');

console.log('Đã lưu file Markdown tại:');
console.log('1.', outPathRoot);
console.log('2.', outPathReports);

// Sao chép cả 2 file raw transcript.jsonl và transcript_full.jsonl
const rawBackupDir = path.join(rootDir, 'reports', 'transcripts');
if (!fs.existsSync(rawBackupDir)) fs.mkdirSync(rawBackupDir, { recursive: true });

if (fs.existsSync(transcriptFullPath)) {
  fs.copyFileSync(transcriptFullPath, path.join(rawBackupDir, 'transcript_full.jsonl'));
}
if (fs.existsSync(transcriptPath)) {
  fs.copyFileSync(transcriptPath, path.join(rawBackupDir, 'transcript.jsonl'));
}

console.log('Đã sao lưu bản thô transcript JSONL vào:', rawBackupDir);
