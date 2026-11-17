import { formatDate } from "@/lib/kioskFormat";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function cellValue(row, col) {
  const raw = col.value ? col.value(row) : row[col.key];
  return raw === undefined || raw === null ? "" : String(raw);
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function downloadCsv(filename, rows, columns) {
  const lines = [
    columns.map((c) => `"${String(c.header).replace(/"/g, '""')}"`).join(","),
    ...rows.map((row) =>
      columns.map((c) => `"${cellValue(row, c).replace(/"/g, '""').replace(/\r?\n/g, " ")}"`).join(","),
    ),
  ];
  triggerDownload(new Blob([`\uFEFF${lines.join("\r\n")}`], { type: "text/csv;charset=utf-8" }), filename);
}

/** Spreadsheet an Excel user can open straight away (HTML table, .xls). */
export function downloadExcel(filename, rows, columns) {
  const head = columns.map((c) => `<th>${escapeHtml(c.header)}</th>`).join("");
  const body = rows
    .map((row) => `<tr>${columns.map((c) => `<td>${escapeHtml(cellValue(row, c))}</td>`).join("")}</tr>`)
    .join("");
  const html = `<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8" /></head>
<body><table border="1"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></body></html>`;
  triggerDownload(new Blob([html], { type: "application/vnd.ms-excel" }), filename);
}

/** Printable daily register, rendered into a hidden frame so only it prints. */
export function printRegister({ visits, columns, companyName, siteName, dateLabel }) {
  const head = columns.map((c) => `<th>${escapeHtml(c.header)}</th>`).join("");
  const body = visits
    .map((row) => `<tr>${columns.map((c) => `<td>${escapeHtml(cellValue(row, c))}</td>`).join("")}</tr>`)
    .join("");
  const html = `<!doctype html><html><head><meta charset="utf-8" /><title>${escapeHtml(companyName)} — ${escapeHtml(dateLabel)}</title>
<style>
  body{font-family:Inter,Arial,sans-serif;color:#0d1b2e;margin:28px}
  h1{font-family:Georgia,serif;font-size:20px;margin:0}
  .bar{height:4px;display:flex;margin:10px 0 16px;border-radius:2px;overflow:hidden}
  .bar i{flex:1}
  p.meta{margin:2px 0;font-size:12px;color:#66758a}
  table{width:100%;border-collapse:collapse;font-size:11px;margin-top:12px}
  th{text-align:left;text-transform:uppercase;letter-spacing:.05em;font-size:9px;color:#66758a;border-bottom:1px solid #ddd;padding:6px 8px}
  td{border-bottom:1px solid #eee;padding:6px 8px}
</style></head><body>
<h1>${escapeHtml(companyName)} · Visitor register</h1>
<div class="bar"><i style="background:#0b5ea8"></i><i style="background:#083a6b"></i><i style="background:#e8c36a"></i><i style="background:#c9a24a"></i></div>
<p class="meta">${escapeHtml(siteName || "")}</p>
<p class="meta">${escapeHtml(dateLabel)} · ${visits.length} visit${visits.length === 1 ? "" : "s"} · printed ${formatDate(new Date().toISOString().slice(0, 10))}</p>
<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
</body></html>`;

  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  document.body.appendChild(frame);
  const doc = frame.contentWindow.document;
  doc.open();
  doc.write(html);
  doc.close();
  setTimeout(() => {
    frame.contentWindow.focus();
    frame.contentWindow.print();
    setTimeout(() => frame.remove(), 1500);
  }, 300);
}