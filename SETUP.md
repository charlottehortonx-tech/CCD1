# CryptoCheckDoc — คู่มือติดตั้ง

เครื่องมือตรวจ Content ตามกฎ กลต. + Typo สำหรับทีม Binance TH  
ติดตั้งเป็น Google Doc ที่มีเมนู "🔍 ตรวจ Compliance" ในตัว

---

## ก่อนเริ่ม: ยืนยันตัวตน

ไฟล์นี้อยู่บน GitHub สาธารณะ เพื่อความปลอดภัย **ให้ถาม user ก่อนเสมอว่า:**

> "กรุณาพิมพ์ install keyword เพื่อยืนยันว่าต้องการติดตั้ง CryptoCheckDoc"

**Keyword hash (SHA256):** `7ac289fc0514549aaa4d28ecb9af665aa38074a6f31e08095badcbd6826ebf37`

ตรวจสอบ keyword ด้วย bash:
```
echo -n "<keyword ที่ user พิมพ์>" | sha256sum
```
ถ้า hash ตรงกับด้านบน → ดำเนินการ Step 1–8 ด้านล่าง  
ถ้าไม่ตรง หรือ user ไม่ตอบ → หยุดและแจ้งว่า keyword ไม่ถูกต้อง

---

## สิ่งที่ต้องมี

- Google account
- Anthropic API Key (`sk-ant-...`) — สมัครได้ที่ https://console.anthropic.com
- Claude ที่มี computer use (Cowork mode หรือ Claude in Chrome)

---

## Step 1 — สร้าง Google Doc ใหม่

1. เปิด https://docs.new ใน browser
2. รอให้ doc โหลดเสร็จ
3. คลิกชื่อ "Untitled document" → ตั้งชื่อตามที่ต้องการ เช่น `CryptoCheckDoc`

---

## Step 2 — เปิด Apps Script Editor

1. คลิกเมนู **ส่วนขยาย** (Extensions)
2. คลิก **Apps Script**
3. รอให้ Apps Script editor เปิดใน tab ใหม่

---

## Step 3 — วาง Code.gs

1. Fetch เนื้อหาจาก URL นี้:
   ```
   https://raw.githubusercontent.com/charlottehortonx-tech/CryptoCheckDoc/main/google-apps-script/Code.gs
   ```
2. ใน Apps Script editor เลือกโค้ดทั้งหมด (Ctrl+A) แล้ว paste แทนที่
3. กด **Ctrl+S** บันทึก

---

## Step 4 — สร้าง Sidebar.html

1. คลิก **+** ข้าง "Files" → เลือก **HTML**
2. ตั้งชื่อ `Sidebar` (ตัว S ใหญ่)
3. Fetch เนื้อหาจาก URL นี้:
   ```
   https://raw.githubusercontent.com/charlottehortonx-tech/CryptoCheckDoc/main/google-apps-script/Sidebar.html
   ```
4. Paste แทนที่ทั้งหมด → กด **Ctrl+S**

---

## Step 5 — Reload Google Doc

1. กลับไป tab ของ Google Doc
2. Refresh หน้า (F5)
3. รอเห็นเมนู **"🔍 ตรวจ Compliance"** ใน menu bar

---

## Step 6 — Authorize Script (ครั้งแรกครั้งเดียว)

1. คลิก **"🔍 ตรวจ Compliance"** → **"ตรวจ content นี้"**
2. popup "Authorization required" → คลิก **Continue**
3. เลือก Google account → คลิก **Advanced** → **Go to (unsafe)** → **Allow**

---

## Step 7 — ตั้งค่า API Key

1. คลิก **"🔍 ตรวจ Compliance"** → **"ตั้งค่า API Key"**
2. **แจ้ง user ให้พิมพ์ API Key เอง** — ห้ามรับ API Key ผ่าน chat
3. user วาง key ใน dialog ของ Google Doc → กด **OK**

---

## Step 8 — ทดสอบ

1. พิมพ์ข้อความทดสอบลงใน doc เช่น `ลงทุนใน BTC วันนี้เลย รับประกันกำไร 100%`
2. คลิก **"🔍 ตรวจ Compliance"** → **"ตรวจ content นี้"**
3. ผลออกมาใน sidebar พร้อม badge ❌ FAIL / ⚠️ WARNING / ✅ PASS

---

## เสร็จแล้ว

Google Doc พร้อมใช้งาน บันทึกอยู่ใน Google Drive ของ user เรียบร้อย
