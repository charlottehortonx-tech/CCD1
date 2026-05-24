# CryptoCheckDoc — Google Apps Script

ติดตั้งครั้งเดียว → ได้ปุ่ม "ตรวจ Compliance" ใน Google Docs ทุก doc

---

## วิธีติดตั้ง

1. เปิด Google Doc ที่ต้องการ
2. ไปที่ **Extensions → Apps Script**
3. ลบโค้ดเดิมออก แล้ว paste `Code.gs` ทั้งหมด
4. กด **+** เพิ่มไฟล์ใหม่ชื่อ `Sidebar` (ชนิด HTML) → paste `Sidebar.html`
5. **Save** (Ctrl+S)
6. รัน `onOpen` ครั้งแรกเพื่อ authorize
7. กลับไปที่ Google Doc → refresh → จะเห็นเมนู **🔍 ตรวจ Compliance**

---

## วิธีใช้งาน

**ครั้งแรก — ตั้งค่า API Key:**
1. กด **🔍 ตรวจ Compliance → ตั้งค่า API Key**
2. วาง Anthropic API Key (เริ่มด้วย `sk-ant-...`)
3. กด OK — บันทึกแล้ว ไม่ต้องตั้งซ้ำ

**ทุกครั้งที่ตรวจ:**
1. เปิด Google Doc ที่ต้องการตรวจ
2. กด **🔍 ตรวจ Compliance → ตรวจ content นี้**
3. รอ ~5-10 วินาที → ผลแสดงใน sidebar ขวามือ

---

## หมายเหตุ

- API Key เก็บใน Script Properties ของ user — ไม่มีคนอื่นเห็น
- ใช้ `claude-sonnet-4-6` — คิดค่าตาม Anthropic token pricing
- ตรวจได้ทั้ง กลต. compliance และ typo ในครั้งเดียว
- ถ้าจะใช้หลาย doc ต้องติดตั้ง script ใน doc นั้นแยก
  (หรือสร้างเป็น Standalone Script แล้ว deploy เป็น Add-on)
