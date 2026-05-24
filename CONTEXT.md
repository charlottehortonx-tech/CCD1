# CCD1 — Context for Claude Code

## ภาพรวม

CCD1 = **System C1** ของ Binance TH AI Content Platform
Google Apps Script ที่ bind กับ Google Doc → ตรวจ content ในเอกสารโดยตรง

---

## วิธีทำงาน

```
ทีม content → bootstrapper URL → ได้ Doc ใหม่พร้อม script
    ↓
เปิด Doc → เมนู 🔍 ตรวจ Compliance → ตรวจ content นี้
    ↓
Script เรียก Anthropic API (UrlFetchApp) ตรงๆ
    ↓
Sidebar แสดงผล + highlight สีในเอกสาร
```

---

## ไฟล์หลัก

| ไฟล์ | หน้าที่ |
|---|---|
| `google-apps-script/Code.gs` | logic หลัก: menu, callClaude, parseHighlight, applyHighlights, clearHighlights, system prompt |
| `google-apps-script/Sidebar.html` | UI แสดงผล (loading / result / error states) |
| `bootstrapper/Bootstrapper.gs` | v2 — web app สำหรับ duplicate template doc พร้อม bound script |
| `bootstrapper/appsscript.json` | manifest: scopes = drive + documents (ตัด script.* scopes ไม่ใช้แล้ว) |
| `SETUP.md` | setup guide + SHA256 keyword verification (anti-injection) |

---

## Key constants

- **TEMPLATE_DOC_ID:** `1305Y3DdvBQuglzFj-fNqHr0nf9YI4ib5TcoOc4nlG1A`
  → template Doc ที่ Bootstrapper duplicate (มี bound script ติดอยู่แล้ว)
- **SECRET_TOKEN:** `binanceth2026` (ใน Bootstrapper.gs — สำหรับ web app auth)
- **API Key storage:** `PropertiesService.getUserProperties()` per-user (key: `ANTHROPIC_API_KEY`)

---

## URL / Endpoint

- **Repo:** https://github.com/charlottehortonx-tech/CCD1
- **Bootstrapper Web App:** deploy ผ่าน Apps Script editor (Execute: Me, Access: Anyone)
- **Template Doc:** `https://docs.google.com/document/d/{TEMPLATE_DOC_ID}/edit`

---

## Highlight system

Claude ใส่ block `[HIGHLIGHT_DATA]...[/HIGHLIGHT_DATA]` ท้าย response
Code.gs parse + apply background color:

| Type | Color |
|---|---|
| FAIL | `#FFCCCC` แดงอ่อน |
| WARNING | `#FFFF99` เหลือง |
| TYPO | `#CCE5FF` ฟ้าอ่อน |

`findText()` หา substring verbatim แล้ว `setBackgroundColor()` ทาสี

---

## ความสัมพันธ์กับระบบอื่น

```
System A (news)        CCD1 / CCD2 (draft check)       System B (final)
auto-generate     →    self-serve checker        →    Drive cron + report
                       (Google Doc / Claude.ai)       (audit trail ก่อน publish)
```

- **CCD1** = ตรวจในเอกสาร Google Doc โดยตรง (in-document workflow)
- **CCD2** = ตรวจใน Claude.ai chat (ไฟล์ / text)
- ทั้งสองใช้ rules จาก `docs/sec-compliance-rules.md` ของ thnew/ เป็นต้นทาง

---

## ไฟล์อ้างอิงต้นทาง (อยู่ใน Next.js project ที่ thnew/)

- `docs/sec-compliance-rules.md` — ประกาศ กลต. นป. 2/2568 (ground truth)
- `lib/ai/compliance-file.ts` — compliance check logic (System B)
- `lib/ai/typo-check.ts` — typo check logic (System B)
- `SYSTEM_OVERVIEW.md` — architecture เต็มของ 3 systems

---

## Migration history

- 2026-05-24: แยกออกจาก `CryptoCheckDoc` repo (เดิมมีทั้ง C1 + C2 ปน)
- C2 ถูกแยกไป repo `CCD2` (Claude.ai chat distribution)
- รวม unstaged work ล่าสุด: Bootstrapper v2 (template-copy approach) + highlight refinements
