// CryptoCheckDoc — Google Apps Script (Personal Add-on)
// ติดตั้งเป็น Add-on: script.google.com → New project → Paste → Deploy → Add-on
// ใช้ได้กับ Google Doc ทุกไฟล์ใน account เดียวกัน

// ═══════════════════════════════════════
// MENU
// ═══════════════════════════════════════

function onOpen(e) {
  DocumentApp.getUi()
    .createMenu('🔍 ตรวจ Compliance')
    .addItem('ตรวจ content นี้', 'checkCompliance')
    .addItem('ล้าง Highlight', 'clearHighlights')
    .addSeparator()
    .addItem('ตั้งค่า API Key', 'promptApiKey')
    .addToUi();
}

function onInstall(e) {
  onOpen(e);
}

// ═══════════════════════════════════════
// API KEY SETUP
// ═══════════════════════════════════════

function promptApiKey() {
  const ui = DocumentApp.getUi();
  const result = ui.prompt(
    'ตั้งค่า Anthropic API Key',
    'วาง API Key ของคุณ (เริ่มด้วย sk-ant-...):',
    ui.ButtonSet.OK_CANCEL
  );
  if (result.getSelectedButton() === ui.Button.OK) {
    const key = result.getResponseText().trim();
    if (key.startsWith('sk-ant-') || key.startsWith('sk-')) {
      PropertiesService.getUserProperties().setProperty('ANTHROPIC_API_KEY', key);
      ui.alert('✅ บันทึก API Key เรียบร้อยแล้ว');
    } else {
      ui.alert('❌ API Key ไม่ถูกต้อง ต้องขึ้นต้นด้วย sk-ant-...');
    }
  }
}

function getApiKey() {
  const key = PropertiesService.getUserProperties().getProperty('ANTHROPIC_API_KEY');
  if (!key) throw new Error('ยังไม่ได้ตั้งค่า API Key — ไปที่ 🔍 ตรวจ Compliance → ตั้งค่า API Key');
  return key;
}

// ═══════════════════════════════════════
// MAIN: ตรวจ content
// ═══════════════════════════════════════

function checkCompliance() {
  const ui = DocumentApp.getUi();

  const doc = DocumentApp.getActiveDocument();
  const text = doc.getBody().getText().trim();

  if (!text || text.length < 10) {
    ui.alert('❌ ไม่พบข้อความใน document นี้');
    return;
  }

  showSidebar('loading', '', text.substring(0, 100));

  try {
    const rawResult = callClaude(text);
    const { displayText, highlights } = parseHighlightData(rawResult);

    // ล้าง highlight เก่า แล้วทาใหม่
    clearHighlights();
    if (highlights.length > 0) {
      applyHighlights(highlights);
    }

    showSidebar('result', displayText, '');
  } catch (e) {
    showSidebar('error', e.message, '');
  }
}

// ═══════════════════════════════════════
// HIGHLIGHT: parse + apply + clear
// ═══════════════════════════════════════

function parseHighlightData(rawText) {
  const highlights = [];
  const blockMatch = rawText.match(/\[HIGHLIGHT_DATA\]([\s\S]*?)\[\/HIGHLIGHT_DATA\]/);

  if (blockMatch) {
    const lines = blockMatch[1].split('\n').map(l => l.trim()).filter(l => l);
    for (const line of lines) {
      const failMatch  = line.match(/^FAIL:"([\s\S]+)"$/);
      const warnMatch  = line.match(/^WARNING:"([\s\S]+)"$/);
      const typoMatch  = line.match(/^TYPO:"([\s\S]+)"$/);
      if (failMatch)  highlights.push({ text: failMatch[1],  type: 'FAIL' });
      else if (warnMatch) highlights.push({ text: warnMatch[1], type: 'WARNING' });
      else if (typoMatch) highlights.push({ text: typoMatch[1], type: 'TYPO' });
    }
  }

  const displayText = rawText
    .replace(/\[HIGHLIGHT_DATA\][\s\S]*?\[\/HIGHLIGHT_DATA\]/, '')
    .trim();

  return { displayText, highlights };
}

function applyHighlights(highlights) {
  const body = DocumentApp.getActiveDocument().getBody();
  const COLOR = {
    FAIL:    '#FFCCCC',  // แดงอ่อน
    WARNING: '#FFFF99',  // เหลือง
    TYPO:    '#CCE5FF'   // ฟ้าอ่อน
  };

  for (const h of highlights) {
    if (!h.text) continue;
    const color = COLOR[h.type] || '#FFFFCC';
    let found = body.findText(h.text);
    while (found !== null) {
      found.getElement().asText().setBackgroundColor(
        found.getStartOffset(),
        found.getEndOffsetInclusive(),
        color
      );
      found = body.findText(h.text, found);
    }
  }
}

function clearHighlights() {
  const body = DocumentApp.getActiveDocument().getBody();
  const fullText = body.getText();
  if (fullText.length > 0) {
    body.editAsText().setBackgroundColor(0, fullText.length - 1, null);
  }
}

// ═══════════════════════════════════════
// CLAUDE API CALL
// ═══════════════════════════════════════

function callClaude(content) {
  const apiKey = getApiKey();
  const systemPrompt = buildSystemPrompt();

  const payload = {
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: 'ตรวจ content นี้:\n\n' + content
      }
    ]
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', options);
  const data = JSON.parse(response.getContentText());

  if (data.error) throw new Error(data.error.message);
  return data.content[0].text;
}

// ═══════════════════════════════════════
// SYSTEM PROMPT
// ═══════════════════════════════════════

function buildSystemPrompt() {
  return `คุณคือ Content Compliance Checker ของ Binance TH
ตรวจสอบ content ใน 2 ด้านพร้อมกัน:
1. กลต. Compliance — ใช้เอกสารราชการด้านล่างเป็น ground truth
2. การสะกดคำ / Typo

════════════════════════════════════════════════════
📜 AUTHORITATIVE REFERENCE: ประกาศแนวปฏิบัติ ที่ นป. 2/2568
════════════════════════════════════════════════════

หลักการโฆษณา 3 ประการ (บังคับ):
1. ถูกต้องและชัดเจน — ไม่เท็จ ไม่เกินจริง ไม่บิดเบือน
2. ครบถ้วน — ให้ข้อมูลทั้งด้านบวกและด้านลบ/ความเสี่ยงควบคู่
3. ไม่กระตุ้นให้ตัดสินใจโดยไม่เหมาะสม — ไม่เร่งรัด

❌ FAIL — ห้ามเด็ดขาด:
- คำว่า "รับประกัน" / "แน่นอน" / "ต้องได้กำไร" / "ปลอดภัย 100%" / "ไม่มีความเสี่ยง"
- ระบุ % ผลตอบแทนโดยไม่มีคำเตือนความเสี่ยงควบคู่
- แนะนำให้ซื้อ/ขาย coin เฉพาะเจาะจง เช่น "ซื้อ BTC ตอนนี้เลย"
- ข้อความเร่งรัด "ด่วน!" / "วันนี้วันสุดท้าย!" ในบริบทการลงทุน
- โฆษณาคริปโทฯ ในช่องทาง public ที่ไม่ใช่ช่องทางทางการ

⚠️ WARNING — ต้องแก้ไข:
- มีข้อมูลด้านบวกโดยไม่มีคำเตือนความเสี่ยงควบคู่
- ขาดคำเตือน กลต.: "คริปโทเคอร์เรนซี และโทเคนดิจิทัลมีความเสี่ยงสูง ท่านอาจสูญเสียเงินลงทุนได้ทั้งจำนวน โปรดศึกษาและลงทุนให้เหมาะสมกับระดับความเสี่ยงที่ยอมรับได้"
- พูดถึงผลตอบแทนอดีตโดยไม่มี disclaimer: "ผลตอบแทนในอดีตมิได้เป็นสิ่งยืนยันผลตอบแทนในอนาคต"

คำเตือนบังคับ (ต้องมีทุกชิ้นที่มีลักษณะเชิญชวน):
"คริปโทเคอร์เรนซี และโทเคนดิจิทัลมีความเสี่ยงสูง ท่านอาจสูญเสียเงินลงทุนได้ทั้งจำนวน โปรดศึกษาและลงทุนให้เหมาะสมกับระดับความเสี่ยงที่ยอมรับได้"

════════════════════════════════════════════════════
กฎ TYPO / สะกดคำ
════════════════════════════════════════════════════

Brand Names:
- Binance ❌ Binace/Binanace/ไบแนนซ์
- Binance TH ❌ Binance Thailand
- Trust Wallet ❌ TrustWallet
- BTC/ETH/USDT/BNB/SOL/XRP/DOGE/ADA ❌ lowercase
- Bitcoin/Ethereum/Tether/Solana/Dogecoin — สะกดตามนี้

ศัพท์ Regulatory:
- คริปโทเคอร์เรนซี ❌ คริปโตเคอเรนซี/คริปโต/คริปโต้
- คริปโทฯ ❌ คริปโต
- โทเคนดิจิทัล ❌ โทเค็นดิจิทัล
- สินทรัพย์ดิจิทัล ❌ มีช่องว่างกลาง/สินทรัพย์ดิจิตอล
- สำนักงาน ก.ล.ต. ❌ ขาดจุดท้าย
- บล็อกเชน ❌ บล๊อกเชน/บล็อคเชน

คำทับศัพท์:
- แพลตฟอร์ม ❌ แพลทฟอร์ม
- แอปพลิเคชัน ❌ แอพพลิเคชั่น
- เทคโนโลยี ❌ เทคโนโลยี่
- อินเทอร์เน็ต ❌ อินเตอร์เน็ต
- ดิจิทัล ❌ ดิจิตอล

คำไทย crypto ที่มักผิด:
- ค่าธรรมเนียม / ความเสี่ยง / ประโยชน์ / นวัตกรรม / ผลตอบแทน

สระ ใ vs ไ: ใช้/ใน/ให้/ใหม่/ใหญ่/ใจ/ใกล้/ใต้ ❌ ไช้/ไน/ไห้/ไหม่ฯ
Thai keyboard: "เเ" (สองสระ) แทน "แ" / การันต์หาย / ไม้ยมก "ๆ" เว้นวรรคหน้า
Number: 1,000 บาท ✅ / 1000 บาท ❌ / ฿1,000 / 5.5%
Spacing: เว้น 1 ช่องระหว่างไทย-อังกฤษ, ไทย-ตัวเลข / ห้าม double space
วงเล็บ: ASCII ( ) เท่านั้น / ไม่เว้นในวงเล็บ / ต้องสมดุล
Consistency: ใช้คำเดิมตลอด ห้าม mix เช่น คริปโทเคอร์เรนซี กับ คริปโต

════════════════════════════════════════════════════
รูปแบบผลลัพธ์ที่ต้องแสดง
════════════════════════════════════════════════════

━━━━━━━━━━━━━━━━━━━━━━━━
📋 ผลการตรวจ Content
━━━━━━━━━━━━━━━━━━━━━━━━

สถานะรวม: [✅ PASS / ⚠️ WARNING / ❌ FAIL]

━━━━━━━━━━━━━━━━━━━━━━━━
1. กลต. Compliance
━━━━━━━━━━━━━━━━━━━━━━━━
[FAIL/WARNING] 1. ชื่อปัญหา
   ข้อความ: "..."
   แก้ไข: ...
   อ้างอิง: ...

━━━━━━━━━━━━━━━━━━━━━━━━
2. การสะกดคำ / Typo
━━━━━━━━━━━━━━━━━━━━━━━━
1. ชื่อปัญหา (ประเภท)
   พบ: "..." → ควรเป็น: "..."

━━━━━━━━━━━━━━━━━━━━━━━━
💡 สรุป
━━━━━━━━━━━━━━━━━━━━━━━━
[สรุป 1-2 ประโยค + action]

กฎ: FAIL > WARNING > PASS / quotedText ต้องเป็น verbatim จาก content / แสดงผลภาษาไทย

════════════════════════════════════════════════════
HIGHLIGHT BLOCK (บังคับ — ต้องอยู่ท้ายสุดเสมอ)
════════════════════════════════════════════════════

หลังจากแสดงผลแล้ว ให้เพิ่ม block นี้ท้ายสุดทุกครั้ง:

[HIGHLIGHT_DATA]
FAIL:"ข้อความ verbatim ที่เป็น FAIL จาก content"
WARNING:"ข้อความ verbatim ที่เป็น WARNING จาก content"
TYPO:"ข้อความ verbatim ที่สะกดผิดจาก content"
[/HIGHLIGHT_DATA]

กฎ HIGHLIGHT_DATA:
- ใส่เฉพาะข้อความที่พบปัญหาจริงเท่านั้น ถ้าไม่มีปัญหาประเภทนั้นให้ละบรรทัดนั้น
- quotedText ต้อง verbatim ตรงทั้งหมดกับที่อยู่ใน content (copy มาตรงๆ)
- ถ้า PASS ทั้งหมดให้ใส่ block เปล่า: [HIGHLIGHT_DATA][/HIGHLIGHT_DATA]
- ห้ามมี text อื่นอยู่หลัง [/HIGHLIGHT_DATA]`;
}

// ═══════════════════════════════════════
// SIDEBAR
// ═══════════════════════════════════════

function showSidebar(state, content, preview) {
  const html = HtmlService.createTemplateFromFile('Sidebar');
  html.state = state;
  html.content = content;
  html.preview = preview;
  const sidebar = html.evaluate()
    .setTitle('🔍 ผลการตรวจ Compliance')
    .setWidth(400);
  DocumentApp.getUi().showSidebar(sidebar);
}
