/* Dependency-free XLSX export.
   XLSX is a zip of XML parts; we write it uncompressed ("stored"), which every spreadsheet app accepts. */

const Exporter = (() => {
  const enc = new TextEncoder();
  const MIME_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

  /* ───────── ZIP (stored) ───────── */
  const CRC = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
    return t;
  })();
  const crc32 = (u8) => { let c = 0xFFFFFFFF; for (let i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  const u16 = (n) => [n & 255, (n >> 8) & 255];
  const u32 = (n) => [n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >>> 24) & 255];

  function zip(files) {
    const parts = [], central = [];
    let offset = 0;
    for (const f of files) {
      const name = enc.encode(f.name), crc = crc32(f.data), size = f.data.length;
      const local = new Uint8Array([0x50, 0x4b, 3, 4, ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21), ...u32(crc), ...u32(size), ...u32(size), ...u16(name.length), ...u16(0)]);
      parts.push(local, name, f.data);
      central.push(new Uint8Array([0x50, 0x4b, 1, 2, ...u16(20), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21), ...u32(crc), ...u32(size), ...u32(size), ...u16(name.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(offset)]), name);
      offset += local.length + name.length + size;
    }
    const cdSize = central.reduce((a, c) => a + c.length, 0);
    const end = new Uint8Array([0x50, 0x4b, 5, 6, ...u16(0), ...u16(0), ...u16(files.length), ...u16(files.length), ...u32(cdSize), ...u32(offset), ...u16(0)]);
    return new Blob([...parts, ...central, end], { type: MIME_XLSX });
  }

  /* ───────── XLSX ───────── */
  const esc = (s) => String(s).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const colName = (i) => { let s = ''; i++; while (i > 0) { const r = (i - 1) % 26; s = String.fromCharCode(65 + r) + s; i = Math.floor((i - 1) / 26); } return s; };
  const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';

  /* cell style names → index in cellXfs below */
  const STY = { def: 0, hdr: 1, wrap: 2, bold: 3, title: 4, sub: 5, kpiV: 6, kpiL: 7, kpiN: 8, sec: 9, txt: 10, int: 11, pct: 12, pct1: 13, tot: 14, totInt: 15, totPct1: 16, co: 17, wrapInd: 18 };

  const STYLES = `${XML}<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="3"><numFmt numFmtId="164" formatCode="0&quot;%&quot;"/><numFmt numFmtId="165" formatCode="0.0&quot;%&quot;"/><numFmt numFmtId="166" formatCode="#,##0"/></numFmts>
<fonts count="8">
<font><sz val="11"/><name val="Calibri"/></font>
<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
<font><b/><sz val="11"/><name val="Calibri"/></font>
<font><b/><sz val="22"/><color rgb="FF1D1D1F"/><name val="Calibri"/></font>
<font><sz val="11"/><color rgb="FF5F6368"/><name val="Calibri"/></font>
<font><b/><sz val="20"/><color rgb="FF107C41"/><name val="Calibri"/></font>
<font><sz val="9"/><color rgb="FF5F6368"/><name val="Calibri"/></font>
<font><b/><sz val="13"/><color rgb="FF107C41"/><name val="Calibri"/></font>
</fonts>
<fills count="5"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF107C41"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFE7F4EC"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFF3F3F3"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="4">
<border><left/><right/><top/><bottom/><diagonal/></border>
<border><left/><right/><top/><bottom style="thin"><color rgb="FFD4D4D4"/></bottom><diagonal/></border>
<border><left style="thin"><color rgb="FFC9DCCF"/></left><right style="thin"><color rgb="FFC9DCCF"/></right><top style="thin"><color rgb="FFC9DCCF"/></top><bottom style="thin"><color rgb="FFC9DCCF"/></bottom><diagonal/></border>
<border><left/><right/><top style="thin"><color rgb="FF107C41"/></top><bottom/><diagonal/></border>
</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="19">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top"/></xf>
<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="top"/></xf>
<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="center"/></xf>
<xf numFmtId="0" fontId="4" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="center"/></xf>
<xf numFmtId="0" fontId="5" fillId="3" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="0" fontId="2" fillId="3" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="6" fillId="3" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="top" wrapText="1"/></xf>
<xf numFmtId="0" fontId="7" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>
<xf numFmtId="166" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
<xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
<xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
<xf numFmtId="0" fontId="2" fillId="4" borderId="3" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>
<xf numFmtId="166" fontId="2" fillId="4" borderId="3" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
<xf numFmtId="165" fontId="2" fillId="4" borderId="3" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
<xf numFmtId="0" fontId="2" fillId="4" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1" indent="1"/></xf>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

  /* A sheet: { name, rows, widths, merges, bars, meta, tab, grid, freeze, outline, selected }
     rows[r][c] is a string, a number, or { v, f, s } (value, formula, style name). meta[r] = { ht, level }. */
  function sheetXml(sh, selected) {
    const { rows, widths = [], merges = [], bars = [], meta = {}, tab, grid = true, freeze = 0, outline = false } = sh;
    const maxLevel = Math.max(0, ...Object.values(meta).map((m) => m.level || 0));
    let body = '';
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i] || [];
      const m = meta[i] || {};
      let cells = '';
      for (let c = 0; c < r.length; c++) {
        let cell = r[c];
        if (cell == null || cell === '') continue;
        if (typeof cell !== 'object') cell = { v: cell };
        const ref = `${colName(c)}${i + 1}`;
        const f = cell.f ? `<f>${esc(cell.f)}</f>` : '';
        const isNum = typeof cell.v === 'number' && isFinite(cell.v);
        let style = cell.s != null ? STY[cell.s] : (typeof cell.v === 'string' && cell.v.length > 60 ? STY.wrap : 0);
        if (cell.v == null && !cell.f) { cells += `<c r="${ref}" s="${style}"/>`; continue; }
        if (isNum) cells += `<c r="${ref}" s="${style}">${f}<v>${cell.v}</v></c>`;
        else if (f) cells += `<c r="${ref}" s="${style}" t="str">${f}<v>${esc(cell.v)}</v></c>`;
        else cells += `<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${esc(cell.v)}</t></is></c>`;
      }
      const attrs = `${m.ht ? ` ht="${m.ht}" customHeight="1"` : ''}${m.level ? ` outlineLevel="${m.level}"` : ''}`;
      body += `<row r="${i + 1}"${attrs}>${cells}</row>`;
    }
    const cols = widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('');
    const pane = freeze ? `<pane ySplit="${freeze}" topLeftCell="A${freeze + 1}" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft"/>` : '';
    const mergeXml = merges.length ? `<mergeCells count="${merges.length}">${merges.map((x) => `<mergeCell ref="${x}"/>`).join('')}</mergeCells>` : '';
    const barXml = bars.map((x, i) => `<conditionalFormatting sqref="${x}"><cfRule type="dataBar" priority="${i + 1}"><dataBar><cfvo type="num" val="0"/><cfvo type="max"/><color rgb="FF7BC89A"/></dataBar></cfRule></conditionalFormatting>`).join('');
    const pr = `${tab ? `<tabColor rgb="${tab}"/>` : ''}${outline ? '<outlinePr summaryBelow="0"/>' : ''}`;
    return `${XML}<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${pr ? `<sheetPr>${pr}</sheetPr>` : ''}<sheetViews><sheetView workbookViewId="0"${grid ? '' : ' showGridLines="0"'}${selected ? ' tabSelected="1"' : ''}>${pane}</sheetView></sheetViews><sheetFormatPr defaultRowHeight="15"${maxLevel ? ` outlineLevelRow="${maxLevel}"` : ''}/>${cols ? `<cols>${cols}</cols>` : ''}<sheetData>${body}</sheetData>${mergeXml}${barXml}</worksheet>`;
  }

  function xlsx(sheets) {
    const files = [];
    const add = (name, text) => files.push({ name, data: enc.encode(text) });
    add('[Content_Types].xml', `${XML}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`);
    add('_rels/.rels', `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`);
    add('xl/workbook.xml', `${XML}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView activeTab="0"/></bookViews><sheets>${sheets.map((s, i) => `<sheet name="${esc(s.name.replace(/[\\/?*[\]:]/g, ' ').slice(0, 31))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets><calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>`);
    add('xl/_rels/workbook.xml.rels', `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`);
    add('xl/styles.xml', STYLES);
    sheets.forEach((s, i) => add(`xl/worksheets/sheet${i + 1}.xml`, sheetXml(s, i === 0)));
    return zip(files);
  }

  function download(blob, filename) {
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: filename });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }

  return { xlsx, download };
})();
