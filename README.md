# CCD1 — Binance TH Content Checker (Google Doc In-Document)

> System C1 ของ Binance TH AI Content Platform
> ตรวจ กลต. compliance + typo **ในเอกสาร Google Doc โดยตรง** ผ่านเมนู + sidebar

---

## ✨ Features

- 🔍 ตรวจ content ในเอกสาร 1 คลิกจากเมนู
- 🎨 Highlight อัตโนมัติ: 🔴 FAIL / 🟡 WARNING / 🔵 TYPO
- 🧹 ปุ่มล้าง highlight ในตัว
- 🔐 API key เก็บใน PropertiesService (ปลอดภัย ต่อ user)
- 🚀 Bootstrapper: สร้าง doc ใหม่พร้อม script ติดมาให้ในคลิกเดียว

---

## 📂 โครงสร้าง

```
CCD1/
├── google-apps-script/      ← script ที่ติดในแต่ละ Google Doc
│   ├── Code.gs              ← logic หลัก + system prompt
│   ├── Sidebar.html         ← UI แสดงผล (loading / result / error)
│   └── README.md            ← วิธีติดตั้ง manual
│
├── bootstrapper/            ← web app สำหรับสร้าง doc ใหม่ + ติด script auto
│   ├── Bootstrapper.gs      ← v2: copy template doc พร้อม bound script
│   └── appsscript.json      ← manifest
│
└── SETUP.md                 ← วิธี setup ครั้งแรก + anti-injection security
```

---

## 🚀 Setup

ดู `SETUP.md` สำหรับขั้นตอนเต็ม (สรุป):

1. Deploy `bootstrapper/` เป็น Web App ครั้งเดียว
2. สร้าง template Doc มี bound script (จาก `google-apps-script/`)
3. เรียก bootstrapper URL → ได้ Doc ใหม่พร้อมเมนู
4. ตั้งค่า API Key ครั้งแรกผ่านเมนู

---

## 🔍 ตรวจอะไรบ้าง

**กลต. Compliance** (อ้างอิงประกาศ นป. 2/2568):
- ❌ FAIL: "รับประกัน" / % ผลตอบแทนไม่มีคำเตือน / แนะนำซื้อ-ขาย coin / ข้อความเร่งรัด
- ⚠️ WARNING: ข้อมูลบวกไม่มีคำเตือนความเสี่ยง / ขาด disclaimer

**Typo (11 หมวด):** brand names, ศัพท์ regulatory, คำทับศัพท์, คำไทย crypto, สระ ใ/ไ, keyboard typos, วรรณยุกต์, number format, spacing, วงเล็บ, consistency

---

## 🎨 Highlight Colors

| Type | Color | Hex |
|---|---|---|
| FAIL | แดงอ่อน | `#FFCCCC` |
| WARNING | เหลือง | `#FFFF99` |
| TYPO | ฟ้าอ่อน | `#CCE5FF` |

---

## ระบบที่เกี่ยวข้อง

- **CCD2** — Claude.ai chat distribution (สำหรับตรวจไฟล์/ข้อความนอก Google Doc)
- **System A** (private) — News pipeline auto-generate content
- **System B** (private) — Drive cron compliance check (final gate ก่อน publish)
