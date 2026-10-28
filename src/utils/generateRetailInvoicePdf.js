import { jsPDF } from 'jspdf';
import JsBarcode from 'jsbarcode';

/**
 * Format currency in clean Indian notation with "Rs."
 * NOTE: We strictly use "Rs." instead of the unicode rupee character "₹"
 * because standard PDF fonts (WinAnsiEncoding) render "₹" as a corrupted superscript "¹".
 */
export const formatINR = (val) =>
  `Rs. ${(Number(val) || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;

/**
 * Helper to generate a Code128 barcode image as a base64 DataURL
 */
function createBarcodeDataUrl(text) {
  try {
    const canvas = document.createElement('canvas');
    JsBarcode(canvas, String(text || 'SALE-0000'), {
      format: 'CODE128',
      displayValue: false,
      margin: 4,
      width: 2,
      height: 45,
      background: '#ffffff',
      lineColor: '#000000'
    });
    return canvas.toDataURL('image/png');
  } catch (err) {
    console.warn('[Barcode] Failed to generate canvas barcode:', err);
    return null;
  }
}

/**
 * Builds the jsPDF Document instance for Huddo Shoes Tax Invoice (Single Page).
 * Centered "HUDDO SHOES" brand header, clean layout, no corrupt '¹' symbols, no 2nd page.
 */
export function buildRetailInvoicePdfDoc(sale, retailer = {}) {
  if (!sale) return null;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4' // 210 x 297 mm
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const cardWidth = 155; // Centered card container width
  const cardX = (pageWidth - cardWidth) / 2;
  const cardPad = 8;
  const innerX = cardX + cardPad;
  const innerWidth = cardWidth - cardPad * 2;
  const rightX = innerX + innerWidth;

  const saleNumber = sale.sale_number || `SALE-${Date.now().toString().slice(-6)}`;
  const saleDate = sale.createdAt ? new Date(sale.createdAt) : new Date();
  const dateFormatted = `${saleDate.getDate().toString().padStart(2, '0')}/${(saleDate.getMonth() + 1).toString().padStart(2, '0')}/${saleDate.getFullYear()} ${saleDate.toLocaleTimeString('en-IN', { hour12: false })}`;
  const printHeaderDate = `${saleDate.getDate().toString().padStart(2, '0')}/${(saleDate.getMonth() + 1).toString().padStart(2, '0')}/${saleDate.getFullYear()}, ${saleDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;

  const storeName = retailer.business_name || retailer.name || 'Huddo Shoes Retail Store';
  const storeAddress = retailer.shop_address || retailer.address || 'Central Market, Hazira Road';
  const storeCity = retailer.city?.name || retailer.city || sale.city_name || 'Surat';
  const storeState = retailer.state?.name || retailer.state || sale.state_name || 'Gujarat';
  const storePincode = retailer.pincode || '395009';
  const gstin = retailer.gstin || '24AAACL1838J1ZM';

  const custName = sale.customer_name || 'Walk-in Customer';
  const custMobile = sale.customer_mobile || '—';
  const custId = sale.customer_id || (custMobile !== '—' ? `CUST-${custMobile.slice(-4)}` : 'WALKIN');

  const items = Array.isArray(sale.items) ? sale.items : [];
  const subtotal = Number(sale.subtotal) || 0;
  const discount = Number(sale.discount_amount) || 0;
  const grandTotal = Number(sale.grand_total) || subtotal - discount;

  // Dynamic GST reverse calculation (price is inclusive of GST)
  const gstRate = Number(sale.gst_rate || (items[0]?.product?.gst_rate) || 12);
  const taxableVal = Number(sale.taxable_amount) || Math.round((grandTotal / (1 + gstRate / 100)) * 100) / 100;
  const totalGst = Math.round((grandTotal - taxableVal) * 100) / 100;
  const halfGstRate = gstRate / 2;
  const cgstVal = Number(sale.cgst) || Math.round((totalGst / 2) * 100) / 100;
  const sgstVal = Number(sale.sgst) || Math.round((totalGst - cgstVal) * 100) / 100;

  const pMode = (sale.payment_mode || 'Cash').toUpperCase();
  const tendered = Number(sale.tendered_amount) || grandTotal;
  const changeDue = Number(sale.change_due) || (tendered > grandTotal ? tendered - grandTotal : 0);
  const totalQty = items.reduce((s, i) => s + (Number(i.quantity) || 1), 0);

  // Top system date line
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text(printHeaderDate, cardX, 10);
  doc.text('huddo shoes invoice', rightX, 10, { align: 'right' });

  // Main Card Container (Single Page A4)
  const cardStartY = 14;
  const cardHeight = 270;
  doc.setDrawColor(210, 215, 222);
  doc.setLineWidth(0.4);
  doc.roundedRect(cardX, cardStartY, cardWidth, cardHeight, 3, 3, 'S');

  let y = cardStartY + 8;

  // ─────────────────────────────────────────────────────────────
  // 1. BRAND HEADER: "HUDDO SHOES" IN THE CENTER
  // ─────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text('HUDDO SHOES', pageWidth / 2, y, { align: 'center' });
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text('Premium Footwear & Retail Distribution Network', pageWidth / 2, y, { align: 'center' });
  y += 4;

  const storeLocationText = `${storeName} · ${storeAddress}, ${storeCity}, ${storeState} - ${storePincode}`;
  const splitLoc = doc.splitTextToSize(storeLocationText, innerWidth);
  doc.text(splitLoc, pageWidth / 2, y, { align: 'center' });
  y += splitLoc.length * 3.4;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  doc.text(`GSTIN NO: ${gstin}   |   Place of Supply: ${storeCity}, ${storeState}`, pageWidth / 2, y, { align: 'center' });
  y += 5;

  // Subtle separator line
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(innerX, y, rightX, y);
  y += 5;

  // ─────────────────────────────────────────────────────────────
  // 2. TAX INVOICE TITLE & SALE METADATA
  // ─────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('TAX INVOICE', pageWidth / 2, y, { align: 'center' });
  y += 6;

  doc.setFontSize(7.5);
  // Row 1: Invoice No & Date
  doc.setFont('helvetica', 'bold');
  doc.text(`INVOICE NO: ${saleNumber}`, innerX, y);
  doc.setFont('helvetica', 'normal');
  doc.text(dateFormatted, rightX, y, { align: 'right' });
  y += 4;

  // Row 2: Counter & Cashier
  doc.setFont('helvetica', 'bold');
  doc.text(`COUNTER: ${sale.counter_number || '1'}`, innerX, y);
  doc.setFont('helvetica', 'normal');
  doc.text(`CASHIER: ${sale.cashier_name || 'Staff User'}`, rightX, y, { align: 'right' });
  y += 4;

  // Row 3: Customer Name & Customer ID
  doc.setFont('helvetica', 'bold');
  doc.text(`CUSTOMER: ${custName.toUpperCase()}`, innerX, y);
  doc.setFont('helvetica', 'normal');
  doc.text(`CUST ID: ${custId.toUpperCase()}`, rightX, y, { align: 'right' });
  y += 4;

  // Row 4: Mobile & Payment Mode
  doc.setFont('helvetica', 'bold');
  doc.text(`MOBILE NO: ${custMobile}`, innerX, y);
  doc.text(`PAYMENT: ${pMode}`, rightX, y, { align: 'right' });
  y += 6;

  // ─────────────────────────────────────────────────────────────
  // 3. ITEMS TABLE
  // ─────────────────────────────────────────────────────────────
  // Header background bar
  doc.setFillColor(241, 245, 249); // slate-100
  doc.rect(innerX, y - 3, innerWidth, 5.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  doc.text('Item Description', innerX + 1.5, y + 0.8);
  doc.text('Price (Rs.)', innerX + 70, y + 0.8, { align: 'right' });
  doc.text('QTY', innerX + 88, y + 0.8, { align: 'center' });
  doc.text('Disc (Rs.)', innerX + 112, y + 0.8, { align: 'right' });
  doc.text('Net Amt (Rs.)', rightX - 1.5, y + 0.8, { align: 'right' });
  y += 6;

  // Items List
  items.forEach((item, idx) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);

    const sku = item.sku_variant || item.product_variant?.sku_variant || `HUDDO-${idx + 101}`;
    const name = item.product_name || item.product?.name || 'Huddo Footwear Shoes';
    const qty = Number(item.quantity) || 1;
    const price = Number(item.unit_price) || (Number(item.line_total) || 0) / (qty || 1);
    const lineTotal = Number(item.line_total) || price * qty;
    const discAmt = Number(item.line_discount_amount) || 0;

    // Line 1: Item Name / SKU + Price + Qty + Disc + Net Amount
    const itemTitle = `${name} [${sku}]`;
    const splitTitle = doc.splitTextToSize(itemTitle, 58);
    doc.text(splitTitle[0], innerX + 1.5, y);

    doc.setFont('helvetica', 'normal');
    // Using clean numbers without UTF-8 rupee symbol
    doc.text(price.toFixed(2), innerX + 70, y, { align: 'right' });
    doc.text(`${qty} PC`, innerX + 88, y, { align: 'center' });
    doc.text(discAmt.toFixed(2), innerX + 112, y, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.text(lineTotal.toFixed(2), rightX - 1.5, y, { align: 'right' });
    y += 3.6;

    // Line 2: Details (Size, Color, Category)
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(100, 116, 139);
    const metaDetails = [
      item.size ? `Size: ${item.size}` : null,
      item.color ? `Color: ${item.color}` : null,
      `HSN: ${item.product?.hsn || '64031900'}`
    ].filter(Boolean).join('  ·  ');
    doc.text(metaDetails, innerX + 1.5, y);
    y += 4.5;
  });

  y += 2;

  // Divider above totals
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.35);
  doc.line(innerX, y, rightX, y);
  y += 5;

  // ─────────────────────────────────────────────────────────────
  // 4. TOTALS & SUMMARY SECTION (Integrated directly on page 1)
  // ─────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);

  doc.text('Gross Total:', innerX + 1.5, y);
  doc.text(`Rs. ${subtotal.toFixed(2)}`, rightX - 1.5, y, { align: 'right' });
  y += 4.2;

  doc.text('Total Discount:', innerX + 1.5, y);
  doc.text(`Rs. ${discount.toFixed(2)}`, rightX - 1.5, y, { align: 'right' });
  y += 4.2;

  // Dynamic GST Breakdown info (Price inclusive of GST)
  doc.setFontSize(7.2);
  doc.setTextColor(100, 116, 139);
  doc.text(`Taxable Base: Rs. ${taxableVal.toFixed(2)}  |  GST ${gstRate}% Included (CGST ${halfGstRate}%: Rs. ${cgstVal.toFixed(2)}  |  SGST ${halfGstRate}%: Rs. ${sgstVal.toFixed(2)})`, innerX + 1.5, y);
  y += 5;

  // Total Invoice Amount Box
  doc.setFillColor(248, 250, 252);
  doc.rect(innerX, y - 3, innerWidth, 8, 'F');
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.4);
  doc.line(innerX, y - 3, rightX, y - 3);
  doc.line(innerX, y + 5, rightX, y + 5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('TOTAL INVOICE AMOUNT:', innerX + 2, y + 2.5);
  doc.text(`Rs. ${grandTotal.toFixed(2)}`, rightX - 2, y + 2.5, { align: 'right' });
  y += 9.5;

  // Payment / Tender Breakdown line
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  const tenderInfo = `Paid By: ${pMode}  ·  Received: Rs. ${tendered.toFixed(2)}  ·  Change Due: Rs. ${changeDue.toFixed(2)}  ·  Total Items: ${items.length} (${totalQty} Pairs)`;
  doc.text(tenderInfo, pageWidth / 2, y, { align: 'center' });
  y += 7;

  // ─────────────────────────────────────────────────────────────
  // 5. SCANNABLE BARCODE & POLICY (NO SECOND PAGE)
  // ─────────────────────────────────────────────────────────────
  const barcodeNumber = `-${saleNumber.replace(/[^A-Za-z0-9]/g, '')}-`;
  const barcodeDataUrl = createBarcodeDataUrl(barcodeNumber);
  if (barcodeDataUrl) {
    const bcWidth = 70;
    const bcHeight = 13;
    const bcX = (pageWidth - bcWidth) / 2;
    doc.addImage(barcodeDataUrl, 'PNG', bcX, y, bcWidth, bcHeight);
    y += bcHeight + 2;
  } else {
    y += 8;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  doc.text(barcodeNumber, pageWidth / 2, y, { align: 'center' });
  y += 5;

  // Return policy summary
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Exchange Policy: 30 days exchange with original invoice & packaging at any store.', pageWidth / 2, y, { align: 'center' });
  y += 3.5;
  doc.setFont('helvetica', 'bold');
  doc.text('Thank you for shopping with Huddo Shoes!', pageWidth / 2, y, { align: 'center' });

  // Bottom watermark
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`huddo shoes invoice · ${saleNumber}`, cardX, pageHeight - 8);
  doc.text('1/1', rightX, pageHeight - 8, { align: 'right' });

  return doc;
}

/**
 * Generate and download Huddo Shoes Tax Invoice PDF
 * File name: huddo shoes invoice.pdf
 */
export function generateRetailInvoicePdf(sale, retailer = {}) {
  const doc = buildRetailInvoicePdfDoc(sale, retailer);
  if (!doc) return;

  // Exact file name requested: "huddo shoes invoice.pdf"
  doc.save('huddo shoes invoice.pdf');
}

/**
 * Print the Huddo Shoes invoice via browser print window (Single Page)
 */
export function printRetailInvoice(sale, retailer = {}) {
  const saleNumber = sale.sale_number || `SALE-${Date.now().toString().slice(-6)}`;
  const saleDate = sale.createdAt ? new Date(sale.createdAt) : new Date();
  const dateFormatted = `${saleDate.getDate().toString().padStart(2, '0')}/${(saleDate.getMonth() + 1).toString().padStart(2, '0')}/${saleDate.getFullYear()} ${saleDate.toLocaleTimeString('en-IN', { hour12: false })}`;

  const storeName = retailer.business_name || retailer.name || 'Huddo Shoes Retail Store';
  const storeAddress = retailer.shop_address || retailer.address || 'Central Market, Hazira Road';
  const storeCity = retailer.city?.name || retailer.city || sale.city_name || 'Surat';
  const storeState = retailer.state?.name || retailer.state || sale.state_name || 'Gujarat';
  const storePincode = retailer.pincode || '395009';
  const gstin = retailer.gstin || '24AAACL1838J1ZM';

  const custName = sale.customer_name || 'Walk-in Customer';
  const custMobile = sale.customer_mobile || '—';
  const custId = sale.customer_id || (custMobile !== '—' ? `CUST-${custMobile.slice(-4)}` : 'WALKIN');

  const items = Array.isArray(sale.items) ? sale.items : [];
  const subtotal = Number(sale.subtotal) || 0;
  const discount = Number(sale.discount_amount) || 0;
  const grandTotal = Number(sale.grand_total) || subtotal - discount;

  // Dynamic GST reverse calculation (price is inclusive of GST)
  const gstRate = Number(sale.gst_rate || (items[0]?.product?.gst_rate) || 12);
  const taxableVal = Number(sale.taxable_amount) || Math.round((grandTotal / (1 + gstRate / 100)) * 100) / 100;
  const totalGst = Math.round((grandTotal - taxableVal) * 100) / 100;
  const halfGstRate = gstRate / 2;
  const cgstVal = Number(sale.cgst) || Math.round((totalGst / 2) * 100) / 100;
  const sgstVal = Number(sale.sgst) || Math.round((totalGst - cgstVal) * 100) / 100;

  const pMode = (sale.payment_mode || 'Cash').toUpperCase();
  const tendered = Number(sale.tendered_amount) || grandTotal;
  const changeDue = Number(sale.change_due) || (tendered > grandTotal ? tendered - grandTotal : 0);
  const totalQty = items.reduce((s, i) => s + (Number(i.quantity) || 1), 0);
  const barcodeNumber = `-${saleNumber.replace(/[^A-Za-z0-9]/g, '')}-`;

  const printWindow = window.open('', '_blank', 'width=750,height=900');
  if (!printWindow) return;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>huddo shoes invoice - ${saleNumber}</title>
        <style>
          @page { size: A4 portrait; margin: 10mm; }
          * { box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background: #f8fafc;
            color: #0f172a;
            margin: 0;
            padding: 20px;
          }
          .invoice-card {
            background: #ffffff;
            border: 1px solid #cbd5e1;
            border-radius: 12px;
            max-width: 580px;
            margin: 0 auto;
            padding: 24px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
          }
          .brand-header {
            text-align: center;
            margin-bottom: 16px;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 12px;
          }
          .brand-title {
            font-size: 24px;
            font-weight: 800;
            letter-spacing: 1px;
            color: #0f172a;
            margin-bottom: 4px;
          }
          .brand-sub {
            font-size: 11px;
            color: #64748b;
            margin-bottom: 4px;
          }
          .store-sub {
            font-size: 11px;
            color: #334155;
          }
          .tax-title {
            font-size: 14px;
            font-weight: 800;
            letter-spacing: 1px;
            text-align: center;
            margin: 12px 0 10px;
          }
          .meta-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            font-size: 11px;
            margin-bottom: 12px;
            row-gap: 4px;
          }
          .meta-full {
            grid-column: span 2;
          }
          .bold { font-weight: bold; }
          table.items-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
            margin: 12px 0;
          }
          table.items-table th {
            text-align: left;
            background: #f1f5f9;
            padding: 6px 8px;
            font-size: 10.5px;
            font-weight: 700;
            border-top: 1px solid #cbd5e1;
            border-bottom: 1px solid #cbd5e1;
          }
          table.items-table td {
            padding: 6px 8px;
            vertical-align: top;
            border-bottom: 1px solid #f1f5f9;
          }
          .totals-row {
            display: flex;
            justify-content: space-between;
            font-size: 11.5px;
            padding: 3px 0;
          }
          .grand-total-row {
            display: flex;
            justify-content: space-between;
            font-size: 14px;
            font-weight: 800;
            background: #f8fafc;
            border-top: 2px solid #0f172a;
            border-bottom: 2px solid #0f172a;
            padding: 8px 4px;
            margin: 8px 0;
          }
          .policy-box {
            text-align: center;
            font-size: 10px;
            color: #64748b;
            margin-top: 14px;
            border-top: 1px dashed #cbd5e1;
            padding-top: 10px;
          }
          .barcode-box {
            text-align: center;
            margin: 12px 0 6px;
            font-family: monospace;
            font-size: 13px;
            font-weight: bold;
          }
          .no-print {
            text-align: center;
            margin-top: 20px;
          }
          @media print {
            body { background: #fff; padding: 0; }
            .invoice-card { border: none; box-shadow: none; max-width: 100%; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="invoice-card">
          <div class="brand-header">
            <div class="brand-title">HUDDO SHOES</div>
            <div class="brand-sub">Premium Footwear &amp; Retail Network</div>
            <div class="store-sub">
              ${storeName} · ${storeAddress}, ${storeCity}, ${storeState} - ${storePincode}<br/>
              <b>GSTIN: ${gstin} · Place Of Supply: ${storeCity}, ${storeState}</b>
            </div>
          </div>

          <div class="tax-title">TAX INVOICE</div>

          <div class="meta-grid">
            <div class="bold">INVOICE NO: ${saleNumber}</div>
            <div style="text-align: right;">${dateFormatted}</div>
            <div class="bold">COUNTER: ${sale.counter_number || '1'}</div>
            <div style="text-align: right;">CASHIER: ${sale.cashier_name || 'Staff User'}</div>
            <div class="meta-full bold">CUSTOMER: ${custName.toUpperCase()}</div>
            <div class="meta-full bold">MOBILE NO: ${custMobile}</div>
            <div class="bold">CUSTOMER ID: ${custId.toUpperCase()}</div>
            <div style="text-align: right;" class="bold">PAYMENT: ${pMode}</div>
          </div>

          <table class="items-table">
            <thead>
              <tr>
                <th>Item Description</th>
                <th style="text-align: right;">Price</th>
                <th style="text-align: center;">QTY</th>
                <th style="text-align: right;">Disc</th>
                <th style="text-align: right;">Net Amount</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((item, idx) => `
                <tr>
                  <td>
                    <div class="bold">${item.product_name || item.product?.name || 'Footwear Shoes'}</div>
                    <div style="color: #64748b; font-size: 10px;">
                      SKU: ${item.sku_variant || 'HUDDO-' + (idx + 101)}
                      ${item.size ? ' · Size: ' + item.size : ''}
                      ${item.color ? ' · Color: ' + item.color : ''}
                    </div>
                  </td>
                  <td style="text-align: right;">Rs. ${Number(item.unit_price || 0).toFixed(2)}</td>
                  <td style="text-align: center;">${item.quantity || 1} PC</td>
                  <td style="text-align: right;">Rs. ${Number(item.line_discount_amount || 0).toFixed(2)}</td>
                  <td style="text-align: right;" class="bold">Rs. ${Number(item.line_total || (item.unit_price * (item.quantity || 1))).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="totals-row">
            <span>Gross Total:</span>
            <span>Rs. ${subtotal.toFixed(2)}</span>
          </div>
          <div class="totals-row">
            <span>Total Discount:</span>
            <span>Rs. ${discount.toFixed(2)}</span>
          </div>
          <div class="totals-row" style="font-size: 10.5px; color: #64748b;">
            <span>Taxable Value (Base):</span>
            <span>Rs. ${taxableVal.toFixed(2)}</span>
          </div>
          <div class="totals-row" style="font-size: 10.5px; color: #64748b;">
            <span>GST ${gstRate}% Included (CGST ${halfGstRate}% + SGST ${halfGstRate}%):</span>
            <span>Rs. ${(cgstVal + sgstVal).toFixed(2)}</span>
          </div>

          <div class="grand-total-row">
            <span>TOTAL INVOICE AMOUNT:</span>
            <span>Rs. ${grandTotal.toFixed(2)}</span>
          </div>

          <div style="font-size: 11px; color: #475569; text-align: center; margin: 6px 0;">
            Paid via: <b>${pMode}</b> &nbsp;|&nbsp; Received: Rs. ${tendered.toFixed(2)} &nbsp;|&nbsp; Total: ${totalQty} Pairs
          </div>

          <div class="barcode-box">
            <div style="letter-spacing: 4px; font-size: 18px; margin-bottom: 2px;">||| | ||||| || |||| ||| ||</div>
            <div>${barcodeNumber}</div>
          </div>

          <div class="policy-box">
            Exchange Policy: 30 days exchange with original invoice &amp; box at any store.<br/>
            <b>Thank you for shopping with Huddo Shoes!</b>
          </div>

          <div class="no-print">
            <button onclick="window.print()" style="padding: 10px 28px; background: #0f172a; color: #fff; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 13px;">
              Print Invoice
            </button>
          </div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 400);
          }
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}

/**
 * Generate formatted text for manual WhatsApp dispatch to the customer
 */
export function getWhatsAppShareText(sale, retailer = {}) {
  if (!sale) return '';
  const storeName = retailer.business_name || retailer.name || 'Huddo Shoes Store';
  const storeCity = retailer.city?.name || retailer.city || sale.city_name || '';
  const customerName = sale.customer_name || 'Valued Customer';
  const saleNumber = sale.sale_number || '';
  const items = Array.isArray(sale.items) ? sale.items : [];
  const pairs = sale.pairs_sold || (items.length > 0 ? items.reduce((s, i) => s + (Number(i.quantity) || 1), 0) : 1);
  const grandTotal = `Rs. ${(Number(sale.grand_total) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const subtotal = `Rs. ${(Number(sale.subtotal) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const discount = Number(sale.discount_amount) > 0 ? `Rs. ${(Number(sale.discount_amount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : null;

  const itemsSummary = items.map((i, idx) => {
    const name = i.product_name || i.product?.name || 'Footwear';
    const size = i.size ? ` (Size: ${i.size})` : '';
    const qty = i.quantity || 1;
    const price = `Rs. ${(Number(i.line_total || (i.unit_price * qty)) || 0).toFixed(2)}`;
    return `  ${idx + 1}. *${name}*${size} × ${qty} = ${price}`;
  }).join('\n');

  return `*HUDDO SHOES - TAX INVOICE* 👟\n` +
    `--------------------------------\n` +
    `Dear *${customerName}*,\n` +
    `Thank you for shopping at *Huddo Shoes*${storeCity ? ` (${storeCity})` : ''}!\n\n` +
    `🧾 *Invoice Details:*\n` +
    `• Invoice No: *${saleNumber}*\n` +
    `• Total Pairs: *${pairs}*\n` +
    (itemsSummary ? `\n🛍️ *Items Purchased:*\n${itemsSummary}\n\n` : '') +
    `💰 *Bill Summary:*\n` +
    `• Subtotal: ${subtotal}\n` +
    (discount ? `• Discount: -${discount}\n` : '') +
    `• *Total Amount Paid:* *${grandTotal}*\n` +
    `• Payment Mode: *${(sale.payment_mode || 'Cash').toUpperCase()}*\n\n` +
    `🔄 *Exchange Policy:*\n` +
    `30 Days exchange available with original invoice & box packaging.\n\n` +
    `📄 *Attached:* Your official PDF invoice copy ("huddo shoes invoice.pdf").\n` +
    `Have a wonderful day! ✨`;
}

/**
 * Share both Detailed Bill Summary AND PDF invoice on WhatsApp
 * If Web Share API with files is supported (mobile/desktop supported browsers),
 * it sends BOTH the message text AND the PDF file directly!
 * Otherwise, it downloads "huddo shoes invoice.pdf" and opens WhatsApp with pre-filled text.
 */
export async function shareRetailInvoiceWhatsApp(sale, retailer = {}, onNotice = null) {
  if (!sale) return;

  const shareText = getWhatsAppShareText(sale, retailer);
  const cleanPhone = String(sale.customer_mobile || '').replace(/\D/g, '');

  try {
    // Generate PDF document
    const doc = buildRetailInvoicePdfDoc(sale, retailer);
    if (!doc) return;

    const pdfBlob = doc.output('blob');
    const pdfFile = new File([pdfBlob], 'huddo shoes invoice.pdf', { type: 'application/pdf' });

    // 1. Try Native Web Share API with PDF file attachment
    if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
      try {
        await navigator.share({
          title: 'huddo shoes invoice',
          text: shareText,
          files: [pdfFile]
        });
        onNotice?.('Invoice shared to WhatsApp successfully with PDF attached!', 'success');
        return;
      } catch (shareErr) {
        if (shareErr.name === 'AbortError') return; // User closed share modal
        console.warn('Web Share failed, falling back to WhatsApp Web link:', shareErr);
      }
    }

    // 2. Fallback: Automatically download PDF & open WhatsApp Web/App
    // This guarantees the user has the PDF ready to drag/attach into the opened chat
    doc.save('huddo shoes invoice.pdf');

    // Copy formatted details to clipboard
    try {
      await navigator.clipboard?.writeText(shareText);
    } catch (e) {
      // Ignore clipboard fail
    }

    // Open WhatsApp chat
    const targetUrl = cleanPhone.length >= 10
      ? `https://api.whatsapp.com/send?phone=91${cleanPhone}&text=${encodeURIComponent(shareText)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;

    window.open(targetUrl, '_blank');
    onNotice?.('PDF invoice downloaded & WhatsApp opened with bill details! Simply attach the downloaded PDF in the chat.', 'success');
  } catch (err) {
    console.error('WhatsApp dispatch error:', err);
    onNotice?.('Could not open WhatsApp: ' + err.message, 'error');
  }
}
