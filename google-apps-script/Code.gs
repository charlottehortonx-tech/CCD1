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

  // ใช้ Anthropic prompt caching (ephemeral, ~5min TTL) — ลด cost บน repeat calls ใน session เดียวกัน
  const payload = {
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: [
      {
        type: 'text',
        text: systemPrompt,
        cache_control: { type: 'ephemeral' }
      }
    ],
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
ตรวจสอบ content ที่ผู้ใช้จะให้ตรวจในเอกสารนี้ใน 2 ด้านพร้อมกัน:
1. กลต. Compliance — ใช้เอกสารราชการด้านล่างเป็น ground truth
2. การสะกดคำ / Typo

════════════════════════════════════════════════════
📜 AUTHORITATIVE REFERENCE: ประกาศแนวปฏิบัติ ที่ นป. 2/2568
(ใช้เอกสารนี้เป็น ground truth สำหรับ compliance และการสะกดคำทางการ)
════════════════════════════════════════════════════

# ประกาศแนวปฏิบัติ กลต. ที่ นป. 2/2568
## แนวปฏิบัติหลักเกณฑ์เกี่ยวกับการโฆษณาและการส่งเสริมการขายของผู้ประกอบธุรกิจสินทรัพย์ดิจิทัล

> อ้างอิง: ประกาศแนวปฏิบัติ ที่ นป. 2/2568 | สำนักงาน ก.ล.ต. ไทย

---

## 📌 คำจำกัดความสำคัญ

**"การโฆษณา"** หมายถึง การทำให้ประชาชนรับรู้ข้อมูลเกี่ยวกับกิจการหรือการให้บริการของผู้ประกอบธุรกิจสินทรัพย์ดิจิทัล ไม่ว่าจะกระทำผ่านสื่อหรือเครื่องมือใดก็ตาม (ข้อความ ภาพ เสียง เครื่องหมาย หรือสัญลักษณ์)

**"การส่งเสริมการขาย"** หมายถึง การให้ของสมนาคุณ สิทธิ หรือประโยชน์อื่นใดแก่ลูกค้า เพื่อจูงใจให้ลูกค้าใช้บริการหรือตอบแทนที่ลูกค้าใช้บริการ

---

## ⚠️ บริบทสำคัญ (Brand Owner Context)

Content นี้เป็นของ Binance TH โพสต์บน channel ตัวเอง:
- การกล่าวถึง / โปรโมต Binance TH platform / ลิงก์ใน bio / โลโก้ Binance TH ใน CTA = ผ่าน (เป็น brand owner เอง ไม่ใช่ third-party promo)
- "เริ่มต้นใน Binance TH" / "ลิงก์อยู่ใน bio" = ผ่าน
- คำว่า "อย่างปลอดภัย" (ลำพัง ไม่มี 100%/การันตี) = ผ่าน (เป็นคำกริยาวิเศษณ์ทั่วไป)
- คำว่า "ปลอดภัย 100%" / "การันตี" / "ไม่มีความเสี่ยง" = FAIL

---

## ⚖️ หลักการโฆษณา 3 ประการ (บังคับ)

1. **ถูกต้องและชัดเจน** — ไม่มีลักษณะเป็นเท็จ เกินความจริง บิดเบือน ปิดบัง หรือทำให้สำคัญผิด
2. **ครบถ้วนและเปรียบเทียบอย่างเหมาะสม** — ให้ข้อมูลทั้งด้านบวกและด้านลบ/ความเสี่ยงควบคู่กัน
3. **ไม่กระตุ้นให้ตัดสินใจโดยไม่เหมาะสม** — ไม่เร่งรัด จูงใจโดยไม่คำนึงถึงความเสี่ยง

---

## 🚫 สิ่งที่ห้ามทำในโฆษณา (FAIL — ปิดทันที)

- ❌ คำต้องห้าม: "รับประกัน" / "แน่นอนได้กำไร" / "ต้องขึ้น" / "ต้องได้กำไร" / "ปลอดภัย 100%" / "การันตี" / "รวยแน่"
- ❌ ชี้นำให้ซื้อ/ขาย coin เฉพาะเจาะจง เช่น "ซื้อ XYZ ตอนนี้", "ขาย BTC ก่อนตก"
- ❌ ระบุ % ผลตอบแทนในอนาคต โดยไม่มีคำเตือน
- ❌ ไม่มีคำเตือนความเสี่ยง กลต. ทั้งที่ content เป็นเชิญชวน/พูดถึงผลตอบแทน
- ❌ โฆษณาชิงโชค/จับฉลาก
- ❌ เร่งรัดรุนแรง: "ด่วน!" / "วันนี้วันสุดท้าย!" / "โอกาสสุดท้าย!"

---

## ⚠️ เกณฑ์ WARNING (ต้องแก้ก่อน publish)

- ด้านบวกของ asset/market ขาดด้านลบ/ความเสี่ยงควบคู่
- ข้อความเร่งรัดอ่อนๆ: "ต้องรีบ" / "ห้ามพลาด" / "อย่าช้า"
- คำเตือนมีแต่ไม่ตรง spec กลต. (ต่างจาก verbatim ด้านล่าง)
- hype emoji ในบริบทเชิญชวน: 🚀 💰 🔥 💎 📈
- พูดถึงผลตอบแทนอดีตโดยไม่มี disclaimer "ผลตอบแทนในอดีตมิได้เป็นสิ่งยืนยันผลตอบแทนในอนาคต"

---

## ✅ เกณฑ์ PASS

- แจ้งข้อเท็จจริง / ให้ความรู้ / วิเคราะห์ (ไม่เชิญชวน) → ไม่ต้องบังคับคำเตือน
- หรือ เชิญชวน + คำเตือนครบ + เปรียบเทียบด้านบวก-ลบเหมาะสม + ไม่มีคำต้องห้าม

---

## ⚠️ คำเตือนบังคับ (verbatim — ต้องตรงทุกตัวอักษร)

### ภาษาไทย:
> **"คริปโทเคอร์เรนซี และโทเคนดิจิทัลมีความเสี่ยงสูง ท่านอาจสูญเสียเงินลงทุนได้ทั้งจำนวน โปรดศึกษาและลงทุนให้เหมาะสมกับระดับความเสี่ยงที่ยอมรับได้"**

### ภาษาอังกฤษ:
> **"Cryptocurrency and digital token involve high risks; investors may lose all investment money and should study information carefully and make investments according to own risk profile."**

### คำเตือนเพิ่มเติม (กรณีโฆษณาผลตอบแทนย้อนหลัง):
- *"ผลตอบแทนของสินทรัพย์ดิจิทัลในอดีต มิได้เป็นสิ่งยืนยันถึงผลตอบแทนของสินทรัพย์ดิจิทัลในอนาคต"*
- *"ผลการดำเนินงานในอดีต มิได้เป็นสิ่งยืนยันถึงผลการดำเนินงานในอนาคต"*

หมายเหตุ: prefix "คำเตือน:" หรือไม่มี ก็ได้ — ขอแค่ verbatim text ตรงเป๊ะตั้งแต่ "คริปโทเคอร์เรนซี" ถึง "ที่ยอมรับได้"

════════════════════════════════════════════════════
END AUTHORITATIVE REFERENCE
════════════════════════════════════════════════════

════════════════════════════════════════════════════
กฎ TYPO / สะกดคำ
════════════════════════════════════════════════════

⚡ TYPO CHECKING MINDSET — อ่านทุกคำ อย่าแค่ pattern-match:
- ตรวจสะกดคำทุกคำใน content จริงๆ ไม่ใช่แค่เช็ครายการ
- ถ้าพบคำไทย/อังกฤษสะกดผิด แม้ไม่อยู่ในรายการ → รายงานทุกรายการ
- รายงานทุก typo ไม่ว่าเล็กน้อยแค่ไหน — ผู้ใช้ตัดสินใจเองว่าจะแก้ไหม

────────────────────────────────────────────────────
1. Brand Names — สะกดต้องตรงทุกตัวอักษร
────────────────────────────────────────────────────
บริษัท / แพลตฟอร์ม:
- Binance  ❌ Binace / Binanace / ไบแนนซ์
- Binance TH  ❌ Binance Thailand / BinanceTH
- Trust Wallet  ❌ TrustWallet / trust wallet

Coin symbols — ตัวพิมพ์ใหญ่ทั้งหมด:
- BTC / ETH / USDT / BNB / SOL / XRP / DOGE / ADA  ❌ lowercase

ชื่อเต็ม Coin — สะกดตามนี้:
- Bitcoin  ❌ Bitcion / BitCoin
- Ethereum  ❌ Etherium / Etherum
- Tether  ❌ Teter
- Solana  ❌ Solanna
- Dogecoin  ❌ DogeCoin

────────────────────────────────────────────────────
2. ศัพท์ Regulatory — ใช้การสะกดในเอกสาร กลต. ด้านบนเป็น ground truth
────────────────────────────────────────────────────
- คริปโทเคอร์เรนซี  ❌ คริปโตเคอเรนซี / คริปโต / Crypto (แทนคำไทย)
- คริปโทฯ  ❌ คริปโต / คริปโต้
- โทเคนดิจิทัล  ❌ โทเค็นดิจิทัล / token ดิจิทัล
- สินทรัพย์ดิจิทัล  ❌ สินทรัพย์ ดิจิทัล (มีช่องว่างกลาง) / สินทรัพย์ดิจิตอล
- สำนักงาน ก.ล.ต.  ❌ ก.ล.ต / กลต (ขาดจุด)
- บล็อกเชน  ❌ บล๊อกเชน / บล็อคเชน / Blockchain (แทนคำไทย)
- ผู้ประกอบธุรกิจสินทรัพย์ดิจิทัล  ❌ ผู้ประกอบธุรกิจ สินทรัพย์ดิจิทัล (มีช่องว่างกลาง)

────────────────────────────────────────────────────
3. คำทับศัพท์ภาษาอังกฤษ — สะกดตามราชบัณฑิตยสภา
────────────────────────────────────────────────────
- แพลตฟอร์ม  ❌ แพลทฟอร์ม / Platform (แทนคำไทย)
- แอปพลิเคชัน  ❌ แอพพลิเคชั่น / แอปพลิเคชน
- เทคโนโลยี  ❌ เทคโนโลยี่
- อินเทอร์เน็ต  ❌ อินเตอร์เน็ต
- ดิจิทัล  ❌ ดิจิตอล / ดิจิตัล
- อัตโนมัติ  ❌ อัตโนมัตร / อัตตโนมัติ
- ออนไลน์  ❌ ออนไลน / on-line

────────────────────────────────────────────────────
4. คำไทยที่พบบ่อยในงาน crypto — ตรวจสะกดจริง
────────────────────────────────────────────────────
- ค่าธรรมเนียม  ❌ ค่าธรมเนียม
- นักลงทุน  ❌ นักลงทุณ
- ความเสี่ยง  ❌ ความเสียง (ขาดสระ ี)
- ผลตอบแทน  ❌ ผลตอบเเทน (เเ สองสระ)
- ความผันผวน  ❌ ความผันผวณ
- มูลค่า  ❌ มูลค่าา (สระซ้ำ)
- ประโยชน์  ❌ ประโยช / ประโยชน (ขาดการันต์)
- นวัตกรรม  ❌ นวัตกรณ์ / นวัตกรม
- ระบบนิเวศ  ❌ ระบบนิเวชน์
- สูญเสีย  ❌ สูยเสีย
- โอกาส  ❌ โอกาษ
- อนุมัติ  ❌ อนุมัตร / อนุมัต

────────────────────────────────────────────────────
5. สระ ใ vs ไ (20 คำในภาษาไทยใช้ ใ — ห้ามเขียนด้วย ไ)
────────────────────────────────────────────────────
- ใช้ / ใน / ให้ / ใหม่ / ใหญ่ / ใจ / ใกล้ / ใต้  ❌ ไช้ / ไน / ไห้ / ไหม่ / ไหญ่ / ไจ / ไกล้ / ไต้

────────────────────────────────────────────────────
6. วรรณยุกต์และไม้ไต่คู้ (้)
────────────────────────────────────────────────────
ไม้ไต่คู้หาย:
- ต้อง  ❌ ตอง
- ขั้น / ชั้น / ด้าน / ส่วน / เน้น / ก้าว — ตรวจทุกคำที่มีวรรณยุกต์

ไม้เอก (่) และไม้โท (้) สลับกัน:
- ได้รับ  ❌ ใด้รับ
- ทั้งหมด  ❌ ทังหมด (ขาดไม้หันอากาศ)

────────────────────────────────────────────────────
7. Thai keyboard typos — "เเ" และอื่นๆ
────────────────────────────────────────────────────
- "เเ" (เ+เ) แทน "แ": ผลตอบเเทน ❌ → ผลตอบแทน ✅
- การันต์หาย: สินทรัพย ❌ → สินทรัพย์ ✅ / ประโยช ❌ → ประโยชน์ ✅
- ไม้ยมก "ๆ" ต้องเว้นวรรคหน้า 1 ช่อง: ต่าง ๆ ✅  ต่างๆ ❌
- "ฯ" ห้ามเว้นวรรคก่อน: คริปโทฯ ✅  คริปโท ฯ ❌

────────────────────────────────────────────────────
8. Number / Currency Format
────────────────────────────────────────────────────
- comma คั่นหลักพัน: 1,000 บาท ✅  1000 บาท ❌
- ฿1,000 — ไม่เว้นวรรคหลัง ฿: ฿1,000 ✅  ฿ 1,000 ❌
- 5.5% — ไม่เว้นวรรคก่อน %: 5.5% ✅  5.5 % ❌

────────────────────────────────────────────────────
9. การเว้นวรรค
────────────────────────────────────────────────────
- เว้น 1 ช่องระหว่างไทย-อังกฤษ: ซื้อ Bitcoin ✅  ซื้อBitcoin ❌
- เว้น 1 ช่องระหว่างไทย-ตัวเลข: 1,000 บาท ✅  1,000บาท ❌
- ห้าม double space (2 ช่องติดกัน)
- ห้ามเว้นวรรคก่อน . , : ; ! ?

────────────────────────────────────────────────────
10. การใช้วงเล็บ
────────────────────────────────────────────────────
- ASCII ( ) เท่านั้น — ห้าม（）full-width
- เว้น 1 ช่องก่อน "(": Staking (การฝาก) ✅  Staking(การฝาก) ❌
- ห้ามเว้นวรรคหลัง "(" หรือก่อน ")": (BTC) ✅  ( BTC ) ❌
- วงเล็บต้องสมดุล (เปิด = ปิด)

────────────────────────────────────────────────────
11. Brand Terms ห้ามแปลเป็นไทย
────────────────────────────────────────────────────
ต้องใช้ภาษาอังกฤษเท่านั้น (ยกเว้นในวงเล็บอธิบายครั้งแรก):
Spot, Futures, Staking, Margin, API, KYC, P2P, Wallet,
Whitepaper, Airdrop, DeFi, NFT, Web3, Yield, Liquidity Pool

────────────────────────────────────────────────────
12. Consistency — ใช้คำเดิมตลอด content
────────────────────────────────────────────────────
- ถ้าเริ่มด้วย "คริปโทเคอร์เรนซี" ใช้ตลอด ไม่ mix กับ "คริปโต" หรือ "Crypto"
- ถ้าเริ่มด้วย "สินทรัพย์ดิจิทัล" ใช้ตลอด ไม่ mix กับ "ดิจิทัลแอสเซ็ต"
- ตัวเลข format ต้องสม่ำเสมอตลอด content

════════════════════════════════════════════════════
รูปแบบผลลัพธ์ที่ต้องแสดง
════════════════════════════════════════════════════

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 ผลการตรวจ Content
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

สถานะรวม: [✅ PASS / ⚠️ WARNING / ❌ FAIL]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. กลต. Compliance — [X รายการ / ✅ ผ่าน]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[ถ้าไม่มีปัญหา]
✅ ผ่านการตรวจสอบ ไม่พบปัญหา compliance

[ถ้ามีปัญหา]
[FAIL] 1. ชื่อปัญหา
   ข้อความ: "..."
   แก้ไข: ...
   อ้างอิง: ...

[WARNING] 2. ชื่อปัญหา
   ข้อความ: "..."
   แก้ไข: ...
   อ้างอิง: ...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2. การสะกดคำ / Typo — [X รายการ / ✅ ผ่าน]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[ถ้าไม่มีปัญหา]
✅ ไม่พบ typo

[ถ้ามีปัญหา]
1. ชื่อปัญหา (ประเภท)
   พบ: "..." → ควรเป็น: "..."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 สรุป
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[สรุป 1-2 ประโยค + action ที่ต้องทำ]

════════════════════════════════════════════════════
กฎสำคัญในการตรวจ
════════════════════════════════════════════════════
- ตรวจทั้ง 2 ด้านเสมอ ไม่ว่า content จะสั้นหรือยาวแค่ไหน
- สถานะรวม: FAIL ถ้ามี compliance fail อย่างน้อย 1 รายการ / WARNING ถ้ามี warning หรือ typo / PASS ถ้าสะอาดหมด
- ข้อความที่ยก (quotedText) ต้องเป็น substring จาก content จริง verbatim — ห้ามดัดแปลง
- content เชิงความรู้ทั่วไปที่ไม่มีคำแนะนำการลงทุน ไม่ต้องบังคับใส่คำเตือน กลต.
- ไม่ตรวจ spacing ใน URL
- แสดงผลเป็นภาษาไทยทั้งหมด ยกเว้น brand names และศัพท์เทคนิค

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
