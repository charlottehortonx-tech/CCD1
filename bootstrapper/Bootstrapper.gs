// CryptoCheckDoc — Bootstrapper v2
// ════════════════════════════════════════════════════
// Deploy เป็น Web App ครั้งเดียว:
//   Execute as: Me
//   Who has access: Anyone
//
// Usage: GET /exec?name=ชื่อไฟล์&token=binanceth2026
//
// วิธีทำงาน: copy template Google Doc ที่มี bound script อยู่แล้ว
// ไม่ต้องใช้ Apps Script API เลย — ทำงานได้ทุก account
// ════════════════════════════════════════════════════

const SECRET_TOKEN = 'binanceth2026';

// Template Google Doc (มี Code.gs + Sidebar.html bound อยู่แล้ว)
// สร้างจาก: Extensions → Apps Script → วาง code → Save
const TEMPLATE_DOC_ID = '1305Y3DdvBQuglzFj-fNqHr0nf9YI4ib5TcoOc4nlG1A';

// ═══════════════════════════════════════
// WEB APP ENTRY POINT
// ═══════════════════════════════════════

function doGet(e) {
  if (!e.parameter.token || e.parameter.token !== SECRET_TOKEN) {
    return respond({ success: false, error: 'Unauthorized' });
  }

  const docName = e.parameter.name
    || 'Compliance Doc — ' + Utilities.formatDate(new Date(), 'Asia/Bangkok', 'dd/MM/yyyy HH:mm');

  try {
    const docUrl = createComplianceDoc(docName);
    return respond({ success: true, url: docUrl, name: docName });
  } catch (err) {
    return respond({ success: false, error: err.message });
  }
}

function respond(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ═══════════════════════════════════════
// CORE: copy template doc (พร้อม bound script)
// ═══════════════════════════════════════

function createComplianceDoc(docName) {
  // copy template — bound script ถูก copy ไปพร้อมกันอัตโนมัติ
  const templateFile = DriveApp.getFileById(TEMPLATE_DOC_ID);
  const newFile = templateFile.makeCopy(docName);
  const newDocId = newFile.getId();

  return 'https://docs.google.com/document/d/' + newDocId + '/edit';
}
