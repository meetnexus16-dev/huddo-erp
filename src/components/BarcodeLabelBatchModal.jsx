import React, { useEffect, useMemo, useRef, useState } from 'react';
import JsBarcode from 'jsbarcode';
import { jsPDF } from 'jspdf';
import { Printer, Download, Tag } from 'lucide-react';
import { Modal } from './Common';
import logoUrl from '../assets/logo.png';

/**
 * Loads the brand logo into a base64 PNG data URL (with natural dimensions) so it can
 * be embedded reliably in the print pop-up window and in the generated PDF.
 */
function useLogoDataUrl() {
  const [logo, setLogo] = useState({ url: '', w: 0, h: 0 });
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.getContext('2d').drawImage(img, 0, 0);
        setLogo({ url: canvas.toDataURL('image/png'), w: img.naturalWidth, h: img.naturalHeight });
      } catch {
        setLogo({ url: logoUrl, w: img.naturalWidth || 0, h: img.naturalHeight || 0 });
      }
    };
    img.onerror = () => setLogo({ url: '', w: 0, h: 0 });
    img.src = logoUrl;
  }, []);
  return logo;
}

/** Approximate men's footwear size conversions from a UK size. */
function sizeConversions(size) {
  const uk = parseFloat(size);
  if (!Number.isFinite(uk)) return null;
  return [
    { label: 'IN', value: uk, cm: (uk * 0.847 + 18.3).toFixed(1) },
    { label: 'UK', value: uk, cm: (uk * 0.847 + 17.8).toFixed(1) },
    { label: 'US', value: uk + 1, cm: (uk * 0.847 + 18.3).toFixed(1) },
    { label: 'EU', value: Math.round(uk + 33), cm: (uk * 0.847 + 18.3).toFixed(1) }
  ];
}

/** Renders a barcode value to a PNG data URL using jsbarcode + an offscreen canvas. */
function makeBarcodeDataUrl(value) {
  try {
    const canvas = document.createElement('canvas');
    JsBarcode(canvas, String(value || 'NA'), {
      format: 'CODE128',
      displayValue: true,
      fontSize: 14,
      height: 46,
      margin: 4,
      width: 1.6
    });
    return canvas.toDataURL('image/png');
  } catch {
    return '';
  }
}

const money = (v) => `RS.${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const COLOR_NAMES = {
  '#EF4444': 'Red',
  '#1F2937': 'Black',
  '#3B82F6': 'Blue',
  '#10B981': 'Green',
  '#9CA3AF': 'Grey',
  '#1E3A8A': 'Navy',
  '#F59E0B': 'Yellow',
  '#8B4513': 'Brown',
  '#FFFFFF': 'White'
};

const colorLabel = (color) => {
  if (!color) return '';
  return COLOR_NAMES[String(color).toUpperCase()] || COLOR_NAMES[color] || color;
};

/** Single label markup (inline styles so it prints identically in a new window). */
function buildLabelHtml(batch, barcodeDataUrl, logoDataUrl) {
  const conv = sizeConversions(batch.size);
  const bigSize = String(batch.size || '').toUpperCase();

  const convRows = conv
    ? conv
        .map(
          (r) => `<div style="display:flex;justify-content:space-between;font-size:9px;line-height:1.5;letter-spacing:.5px;">
            <span style="width:26px;">${r.label}</span>
            <span style="width:34px;text-align:left;">${r.value}</span>
            <span style="width:38px;text-align:right;">${r.cm}</span>
          </div>`
        )
        .join('')
    : `<div style="font-size:10px;letter-spacing:.5px;">SIZE: ${bigSize}</div>`;

  return `
  <div style="width:360px;height:210px;border:1px solid #000;display:flex;font-family:Arial,Helvetica,sans-serif;color:#000;background:#fff;box-sizing:border-box;overflow:hidden;">
    <!-- Left dark panel -->
    <div style="width:40%;background:#111;color:#fff;display:flex;flex-direction:column;justify-content:space-between;padding:10px;box-sizing:border-box;">
      <div>
        <div style="font-size:52px;font-weight:800;line-height:1;">${bigSize}</div>
        <div style="margin-top:8px;">${convRows}</div>
      </div>
      <div style="border-top:1px solid #fff;padding-top:5px;">
        <div style="font-size:8px;letter-spacing:.5px;margin-bottom:3px;">www.huddoshoes.com</div>
        <div style="background:#fff;border-radius:2px;padding:2px;display:flex;justify-content:center;">
          <img src="${barcodeDataUrl}" style="height:44px;max-width:100%;" alt="barcode" />
        </div>
      </div>
    </div>
    <!-- Right white panel -->
    <div style="width:60%;display:flex;flex-direction:column;box-sizing:border-box;">
      <div style="padding:8px 10px;border-bottom:1px solid #000;display:flex;align-items:center;gap:4px;height:44px;box-sizing:border-box;">
        ${logoDataUrl
          ? `<img src="${logoDataUrl}" style="max-height:28px;max-width:100%;object-fit:contain;" alt="logo" />`
          : `<span style="font-size:24px;font-weight:800;letter-spacing:1px;">HUDDO</span><span style="font-size:16px;">&#128095;</span>`}
      </div>
      <div style="padding:7px 10px;border-bottom:1px solid #000;font-size:13px;font-weight:700;letter-spacing:.5px;">${(batch.product_name || 'PRODUCT').toUpperCase()}</div>
      <div style="padding:6px 10px;border-bottom:1px solid #000;font-size:10px;letter-spacing:.5px;">${(batch.colors_text || '').toUpperCase()}</div>
      <div style="padding:6px 10px;border-bottom:1px solid #000;font-size:10px;display:flex;justify-content:space-between;">
        <span>ARTICLE NO.</span><span style="font-weight:700;">${batch.article_no || '-'}</span>
      </div>
      <div style="padding:6px 10px;border-bottom:1px solid #000;font-size:10px;display:flex;justify-content:space-between;">
        <span>HSN / SAC</span><span style="font-weight:700;">${batch.hsn_code || '-'}</span>
      </div>
      <div style="padding:5px 10px;border-bottom:1px solid #000;font-size:8px;letter-spacing:.5px;color:#333;">INNOVATED BY INDIA</div>
      <div style="padding:7px 10px;background:#111;color:#fff;font-size:11px;display:flex;justify-content:space-between;margin-top:auto;">
        <span style="font-weight:700;">M.R.P.</span><span style="font-weight:700;">${money(batch.mrp)}</span>
      </div>
    </div>
  </div>`;
}

export default function BarcodeLabelBatchModal({ isOpen, onClose, batch, showToast }) {
  const previewRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const logo = useLogoDataUrl();

  const barcodeDataUrl = useMemo(
    () => (batch ? makeBarcodeDataUrl(batch.barcode_value) : ''),
    [batch]
  );

  useEffect(() => {
    if (isOpen && batch && previewRef.current) {
      previewRef.current.innerHTML = buildLabelHtml(batch, barcodeDataUrl, logo.url);
    }
  }, [isOpen, batch, barcodeDataUrl, logo.url]);

  if (!batch) return null;

  const quantity = Number(batch.quantity) || 1;

  const notifyServer = (action) => {
    if (!batch._id) return;
    fetch(`/api/inventory/label-batches/${batch._id}/${action}`, { method: 'POST' }).catch(() => {});
  };

  const handlePrint = () => {
    const labelHtml = buildLabelHtml(batch, barcodeDataUrl, logo.url);
    const labels = Array.from({ length: quantity }, () => labelHtml).join('');
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) {
      showToast?.('Please allow pop-ups to print labels.', 'error');
      return;
    }
    win.document.write(`
      <html>
        <head>
          <title>${batch.batch_number || 'Labels'}</title>
          <style>
            @page { margin: 8mm; }
            body { margin:0; display:flex; flex-wrap:wrap; gap:8px; padding:8px; }
            @media print { .lbl { break-inside: avoid; } }
          </style>
        </head>
        <body onload="window.print();">
          ${labels.replace(/<div style="width:360px/g, '<div class="lbl" style="width:360px')}
        </body>
      </html>`);
    win.document.close();
    notifyServer('printed');
    showToast?.(`Sent ${quantity} label(s) to printer.`, 'success');
  };

  const handleDownloadPdf = () => {
    setBusy(true);
    try {
      // Label physical size in mm (approx 90 x 52mm) laid two-up per row.
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const labelW = 90;
      const labelH = 52;
      const marginX = 12;
      const marginY = 12;
      const gapX = 6;
      const gapY = 6;
      const cols = 2;
      const pageH = pdf.internal.pageSize.getHeight();

      let x = marginX;
      let y = marginY;
      let col = 0;

      for (let i = 0; i < quantity; i += 1) {
        drawPdfLabel(pdf, batch, barcodeDataUrl, x, y, labelW, labelH, logo);
        col += 1;
        if (col >= cols) {
          col = 0;
          x = marginX;
          y += labelH + gapY;
          if (y + labelH > pageH - marginY && i < quantity - 1) {
            pdf.addPage();
            y = marginY;
          }
        } else {
          x += labelW + gapX;
        }
      }

      pdf.save(`${batch.batch_number || 'labels'}.pdf`);
      notifyServer('downloaded');
      showToast?.(`Downloaded ${quantity} label(s) as PDF.`, 'success');
    } catch (err) {
      console.error('PDF generation failed:', err);
      showToast?.('Failed to generate PDF.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const footer = (
    <>
      <button
        onClick={onClose}
        className="px-4 py-2 border border-slate-200 hover:border-slate-300 rounded-lg text-sm font-semibold text-slate-700 bg-white transition-colors"
      >
        Close
      </button>
      <button
        onClick={handleDownloadPdf}
        disabled={busy}
        className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-bold text-slate-700 bg-white hover:bg-slate-50 flex items-center gap-1.5 disabled:opacity-60"
      >
        <Download className="w-4 h-4" /> {busy ? 'Preparing...' : 'Download PDF'}
      </button>
      <button
        onClick={handlePrint}
        className="px-4 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg text-sm font-bold flex items-center gap-1.5 shadow-sm"
      >
        <Printer className="w-4 h-4" /> Print {quantity} Label(s)
      </button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Barcode Label Batch"
      maxWidth="max-w-xl"
      footerContent={footer}
    >
      <div className="space-y-4 text-left">
        <div className="flex items-center gap-2 bg-orange-50 border border-orange-100 rounded-lg p-3 text-xs text-orange-800">
          <Tag className="w-4 h-4 shrink-0" />
          <div>
            <p className="font-bold">
              {batch.batch_number ? `${batch.batch_number} · ` : ''}{quantity} label(s) for {batch.product_name}
            </p>
            <p className="text-orange-700">
              Barcode: <span className="font-mono">{batch.barcode_value}</span> · Size {batch.size} · {colorLabel(batch.color)}
            </p>
          </div>
        </div>

        <div>
          <p className="text-[11px] font-bold text-slate-500 uppercase mb-2">Label Preview</p>
          <div className="flex justify-center bg-slate-100 border border-slate-200 rounded-xl p-5">
            <div ref={previewRef} />
          </div>
          <p className="text-[11px] text-slate-400 mt-2 text-center">
            The same label repeats {quantity} time(s) when printed or downloaded — one per unit added to inventory.
          </p>
        </div>
      </div>
    </Modal>
  );
}

/** Draws a single label onto a jsPDF document reproducing the reference layout. */
function drawPdfLabel(pdf, batch, barcodeDataUrl, x, y, w, h, logo) {
  const leftW = w * 0.4;
  const rightX = x + leftW;
  const rightW = w - leftW;

  // Outer border
  pdf.setDrawColor(0);
  pdf.setLineWidth(0.3);
  pdf.rect(x, y, w, h);

  // Left dark panel
  pdf.setFillColor(17, 17, 17);
  pdf.rect(x, y, leftW, h, 'F');

  // Big size
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(26);
  pdf.text(String(batch.size || '').toUpperCase(), x + 3, y + 12);

  // Conversion rows
  const conv = sizeConversions(batch.size);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(6.5);
  let cy = y + 18;
  if (conv) {
    conv.forEach((r) => {
      pdf.text(r.label, x + 3, cy);
      pdf.text(String(r.value), x + 12, cy);
      pdf.text(String(r.cm), x + leftW - 3, cy, { align: 'right' });
      cy += 3.2;
    });
  } else {
    pdf.text(`SIZE: ${String(batch.size || '').toUpperCase()}`, x + 3, cy);
  }

  // Website + barcode
  pdf.setFontSize(5);
  pdf.text('www.huddoshoes.com', x + 3, y + h - 14);
  if (barcodeDataUrl) {
    try {
      pdf.setFillColor(255, 255, 255);
      pdf.rect(x + 2, y + h - 12, leftW - 4, 10, 'F');
      pdf.addImage(barcodeDataUrl, 'PNG', x + 3, y + h - 11.5, leftW - 6, 9);
    } catch {
      /* ignore */
    }
  }

  // Right panel content
  pdf.setTextColor(0, 0, 0);
  const line = (yy) => {
    pdf.setDrawColor(0);
    pdf.setLineWidth(0.2);
    pdf.line(rightX, yy, rightX + rightW, yy);
  };

  let ry = y;
  const rowH = h / 7;

  if (logo && logo.url) {
    const maxH = rowH - 2.5;
    const maxW = rightW - 6;
    let dh = maxH;
    let dw = logo.w && logo.h ? (dh * logo.w) / logo.h : maxW;
    if (dw > maxW) {
      dw = maxW;
      dh = logo.w && logo.h ? (dw * logo.h) / logo.w : maxH;
    }
    try {
      pdf.addImage(logo.url, 'PNG', rightX + 3, ry + (rowH - dh) / 2, dw, dh);
    } catch {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(13);
      pdf.text('HUDDO', rightX + 3, ry + rowH - 3);
    }
  } else {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(13);
    pdf.text('HUDDO', rightX + 3, ry + rowH - 3);
  }
  line(ry + rowH);
  ry += rowH;

  pdf.setFontSize(9);
  pdf.text(String(batch.product_name || 'PRODUCT').toUpperCase().slice(0, 22), rightX + 3, ry + rowH - 3);
  line(ry + rowH);
  ry += rowH;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(6.5);
  pdf.text(String(batch.colors_text || '').toUpperCase().slice(0, 32), rightX + 3, ry + rowH - 3);
  line(ry + rowH);
  ry += rowH;

  pdf.setFontSize(7);
  pdf.text('ARTICLE NO.', rightX + 3, ry + rowH - 3);
  pdf.setFont('helvetica', 'bold');
  pdf.text(String(batch.article_no || '-'), rightX + rightW - 3, ry + rowH - 3, { align: 'right' });
  line(ry + rowH);
  ry += rowH;

  pdf.setFont('helvetica', 'normal');
  pdf.text('HSN / SAC', rightX + 3, ry + rowH - 3);
  pdf.setFont('helvetica', 'bold');
  pdf.text(String(batch.hsn_code || '-'), rightX + rightW - 3, ry + rowH - 3, { align: 'right' });
  line(ry + rowH);
  ry += rowH;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(5.5);
  pdf.text('INNOVATED BY INDIA', rightX + 3, ry + rowH - 3);
  line(ry + rowH);
  ry += rowH;

  // MRP dark strip
  pdf.setFillColor(17, 17, 17);
  pdf.rect(rightX, ry, rightW, h - (ry - y), 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.text('M.R.P.', rightX + 3, ry + rowH - 3);
  pdf.text(money(batch.mrp), rightX + rightW - 3, ry + rowH - 3, { align: 'right' });
}
