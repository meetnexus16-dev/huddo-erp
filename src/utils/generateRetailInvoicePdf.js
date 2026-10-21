import { jsPDF } from 'jspdf';
import JsBarcode from 'jsbarcode';

/**
 * Format currency in Indian Rupees notation
 */
export const formatINR = (val) =>
  `₹${(Number(val) || 0).toLocaleString('en-IN', {
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
      height: 50,
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
 * Draw a smiley face in jsPDF
 * @param {jsPDF} doc
 * @param {number} cx Center X
 * @param {number} cy Center Y
 * @param {number} r Radius
 * @param {string} color Stroke/fill color
 * @param {'sad'|'neutral'|'happy'} type
 */
function drawSmiley(doc, cx, cy, r, color, type) {
  doc.setDrawColor(color);
  doc.setLineWidth(0.6);
  // Circle
  doc.circle(cx, cy, r, 'S');

  // Eyes
  doc.setFillColor(color);
  doc.circle(cx - r * 0.35, cy - r * 0.2, 0.45, 'F');
  doc.circle(cx + r * 0.35, cy - r * 0.2, 0.45, 'F');

  // Mouth
  if (type === 'sad') {
    // Frown arc (approximated by inverted line/triangle or short arc)
    doc.line(cx - r * 0.4, cy + r * 0.35, cx, cy + r * 0.15);
    doc.line(cx, cy + r * 0.15, cx + r * 0.4, cy + r * 0.35);
  } else if (type === 'neutral') {
    // Straight line
    doc.line(cx - r * 0.35, cy + r * 0.25, cx + r * 0.35, cy + r * 0.25);
  } else {
    // Smile arc
    doc.line(cx - r * 0.4, cy + r * 0.15, cx, cy + r * 0.35);
    doc.line(cx, cy + r * 0.35, cx + r * 0.4, cy + r * 0.15);
  }
}

/**
 * Generate Westside-style Tax Invoice PDF matching Westside.pdf
 * @param {Object} sale - The sale document (RetailSale)
 * @param {Object} retailer - The retailer information
 */
export function generateRetailInvoicePdf(sale, retailer = {}) {
  if (!sale) return;

  // Initialize jsPDF in A4 portrait format matching Westside.pdf
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4' // 210 x 297 mm
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const cardWidth = 145; // Centered card container width (exact Westside layout)
  const cardX = (pageWidth - cardWidth) / 2;
  const cardPad = 8;
  const innerX = cardX + cardPad;
  const innerWidth = cardWidth - cardPad * 2;
  const rightX = innerX + innerWidth;

  const saleNumber = sale.sale_number || `SALE-${Date.now().toString().slice(-6)}`;
  const saleDate = sale.createdAt ? new Date(sale.createdAt) : new Date();
  const dateFormatted = `${saleDate.getDate().toString().padStart(2, '0')}/${(saleDate.getMonth() + 1).toString().padStart(2, '0')}/${saleDate.getFullYear()} ${saleDate.toLocaleTimeString('en-IN', { hour12: false })}`;
  const printHeaderDate = `${saleDate.getDate().toString().padStart(2, '0')}/${(saleDate.getMonth() + 1).toString().padStart(2, '0')}/${saleDate.getFullYear()}, ${saleDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;

  const storeName = retailer.business_name || retailer.name || 'Westside A Unit of Trent Ltd';
  const storeAddress = retailer.shop_address || retailer.address || 'W144 Imperial Square, Hazira Road Adajan Road Opposite Aalishan Enclave Adjan';
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

  // 5% GST breakdown (Footwear GST: 2.5% CGST + 2.5% SGST)
  const taxableVal = Math.round((grandTotal / 1.05) * 100) / 100;
  const cgstVal = Math.round(((grandTotal - taxableVal) / 2) * 100) / 100;
  const sgstVal = Math.round((grandTotal - taxableVal - cgstVal) * 100) / 100;

  const pMode = (sale.payment_mode || 'Cash').toUpperCase();
  const tendered = Number(sale.tendered_amount) || grandTotal;
  const changeDue = Number(sale.change_due) || (tendered > grandTotal ? tendered - grandTotal : 0);
  const totalQty = items.reduce((s, i) => s + (Number(i.quantity) || 1), 0);

  // ─────────────────────────────────────────────────────────────
  // PAGE 1: HEADER, SMILEYS & TAX INVOICE CARD
  // ─────────────────────────────────────────────────────────────

  // Top system print line (as on digital e-invoices)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(80, 80, 80);
  doc.text(printHeaderDate, cardX, 12);
  doc.text('Westside', rightX, 12, { align: 'right' });

  // Store brand banner
  let y = 22;
  doc.setFont('times', 'bolditalic');
  doc.setFontSize(22);
  doc.setTextColor(20, 20, 20);
  doc.text('WESTSIDE', cardX + 8, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(60, 60, 60);
  const brandSub = `${storeName} - ${storeCity}`;
  doc.text(brandSub, rightX, y - 3, { align: 'right' });
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(7.5);
  doc.text('Store Details >', rightX, y + 2, { align: 'right' });

  y += 18;

  // "Tell us about your overall experience"
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 30, 30);
  doc.text('Tell us about your overall experience', pageWidth / 2, y, { align: 'center' });

  y += 7;
  const smileyY = y;
  const smileyR = 4;
  // Least Likely (red)
  drawSmiley(doc, pageWidth / 2 - 38, smileyY, smileyR, '#EF4444', 'sad');
  doc.setFontSize(7.5);
  doc.setTextColor(50, 50, 50);
  doc.text('Least Likely', pageWidth / 2 - 38, smileyY + 7.5, { align: 'center' });

  // Probably (yellow)
  drawSmiley(doc, pageWidth / 2, smileyY, smileyR, '#F59E0B', 'neutral');
  doc.text('Probably', pageWidth / 2, smileyY + 7.5, { align: 'center' });

  // Very Likely! (green)
  drawSmiley(doc, pageWidth / 2 + 38, smileyY, smileyR, '#10B981', 'happy');
  doc.text('Very Likely!', pageWidth / 2 + 38, smileyY + 7.5, { align: 'center' });

  y += 17;

  // Card Outer Container Box
  const cardStartY = y;
  const cardHeight = 205;
  doc.setDrawColor(220, 224, 230);
  doc.setLineWidth(0.35);
  doc.roundedRect(cardX, cardStartY, cardWidth, cardHeight, 3.5, 3.5, 'S');

  y += 8;

  // Trent Limited / Huddo Company Heading
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(20, 20, 20);
  doc.text('Trent Limited', pageWidth / 2, y, { align: 'center' });
  y += 4.5;

  // Place of supply
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(50, 50, 50);
  const supplyText = `Place Of Supply : ${storeName} - ${storeAddress} ${storeCity}, ${storeCity}, ${storeState} - ${storePincode}`;
  const splitSupply = doc.splitTextToSize(supplyText, innerWidth);
  doc.text(splitSupply, pageWidth / 2, y, { align: 'center' });
  y += splitSupply.length * 3.3 + 1;

  doc.setFont('helvetica', 'bold');
  doc.text(`GSTIN NO : ${gstin}`, pageWidth / 2, y, { align: 'center' });
  y += 5.5;

  doc.text('Registered Office:', pageWidth / 2, y, { align: 'center' });
  y += 3.5;
  doc.setFont('helvetica', 'normal');
  doc.text('Bombay House, 24, Homi Mody Street, Fort, Mumbai 400001', pageWidth / 2, y, { align: 'center' });
  y += 3.3;
  doc.setFont('helvetica', 'bold');
  doc.text('GSTIN NO : 36AAACL1838J1ZH', pageWidth / 2, y, { align: 'center' });
  y += 7;

  // TAX INVOICE title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 15, 15);
  doc.text('TAX INVOICE', pageWidth / 2, y, { align: 'center' });
  y += 6.5;

  // Invoice Metadata
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(`INVOICE NO. :${saleNumber}`, innerX, y);
  doc.setFont('helvetica', 'normal');
  doc.text(dateFormatted, rightX, y, { align: 'right' });
  y += 4;

  doc.setFont('helvetica', 'bold');
  doc.text(`COUNTER :${sale.counter_number || '4'}`, innerX, y);
  doc.text(`CASHIER :${sale.cashier_name || '100125'}`, rightX, y, { align: 'right' });
  y += 4.5;

  doc.text(`CUSTOMER ID :${custId.toUpperCase()}`, innerX, y);
  y += 4;
  doc.text(`CUSTOMER NAME : ${custName.toUpperCase()}`, innerX, y);
  y += 4;
  doc.text(`MOBILE NO :${custMobile}`, innerX, y);
  y += 6.5;

  // Item Table Columns
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('Item', innerX, y);
  doc.text('Price', innerX + 60, y, { align: 'right' });
  doc.text('QTY/Unit', innerX + 80, y, { align: 'center' });
  doc.text('Disc.Amt', innerX + 104, y, { align: 'right' });
  doc.text('Net.Amt', rightX, y, { align: 'right' });
  y += 3.5;

  doc.text('Description', innerX, y);
  doc.text('HSN-SAC', innerX + 90, y, { align: 'right' });
  doc.text('Taxable', rightX, y, { align: 'right' });
  y += 3;
  doc.text('Amount', rightX, y, { align: 'right' });
  y += 4.5;

  // Tax slab header
  doc.text('A) CGST@2.5% SGST@2.5%', innerX, y);
  y += 4.5;

  // Item Rows
  items.forEach((item, idx) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);

    const sku = item.sku_variant || item.product_variant?.sku_variant || `3010851${idx + 1000}`;
    const name = item.product_name || item.product?.name || 'Footwear Shoes';
    const category = item.product?.category?.name || item.product?.category || "Women's / Men's Footwear";
    const qty = Number(item.quantity) || 1;
    const price = Number(item.unit_price) || (Number(item.line_total) || 0) / (qty || 1);
    const lineTotal = Number(item.line_total) || price * qty;
    const discAmt = Number(item.line_discount_amount) || 0;
    const lineTaxable = Math.round((lineTotal / 1.05) * 100) / 100;
    const hsn = item.product?.hsn || '64031900';

    // Line 1: SKU, Price, QTY, Disc.Amt, Net.Amt
    doc.text(sku, innerX, y);
    doc.text(formatINR(price), innerX + 60, y, { align: 'right' });
    doc.text(`${qty} PC`, innerX + 80, y, { align: 'center' });
    doc.text(formatINR(discAmt), innerX + 104, y, { align: 'right' });
    doc.text(formatINR(lineTotal), rightX, y, { align: 'right' });
    y += 3.6;

    // Line 2: Name + Category / Size / Color
    const desc = `${name} (${item.size ? 'Size ' + item.size : ''}${item.color ? ' ' + item.color : ''})`;
    doc.text(desc, innerX, y);
    doc.text(hsn, innerX + 90, y, { align: 'right' });
    doc.text(formatINR(lineTaxable), rightX, y, { align: 'right' });
    y += 3.4;

    doc.text(category, innerX, y);
    y += 5;
  });

  y += 3;

  // Totals Section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Gross Total:', innerX, y);
  doc.text(subtotal.toFixed(2), rightX, y, { align: 'right' });
  y += 4.5;

  doc.text('Total Discount:', innerX, y);
  doc.text(discount.toFixed(2), rightX, y, { align: 'right' });
  y += 5;

  doc.setFontSize(8.5);
  doc.text('Total Invoice Amount:', innerX, y);
  doc.text(grandTotal.toFixed(2), rightX, y, { align: 'right' });

  // Page 1 footer URL watermark (matching Westside page 1)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 100, 100);
  doc.text(`https://westside.karnival.com/q/zd/${saleNumber}/`, cardX, pageHeight - 10);
  doc.text('1/2', rightX, pageHeight - 10, { align: 'right' });

  // ─────────────────────────────────────────────────────────────
  // PAGE 2: TAX DETAILS, TENDER, RETURN POLICY & SCANNABLE BARCODE
  // ─────────────────────────────────────────────────────────────
  doc.addPage();

  // Top system print line page 2
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(80, 80, 80);
  doc.text(printHeaderDate, cardX, 12);
  doc.text('Westside', rightX, 12, { align: 'right' });

  y = 20;

  // Page 2 Card Container Box
  const p2CardHeight = 220;
  doc.setDrawColor(220, 224, 230);
  doc.setLineWidth(0.35);
  doc.roundedRect(cardX, y, cardWidth, p2CardHeight, 3.5, 3.5, 'S');

  y += 8;

  // Tax Details Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(20, 20, 20);
  doc.text('Tax Details', pageWidth / 2, y, { align: 'center' });
  y += 6;

  // Tax Details Table Columns
  doc.setFontSize(7.5);
  doc.text('GST IND', innerX, y);
  doc.text('Taxable', innerX + 32, y, { align: 'right' });
  doc.text('CGST', innerX + 54, y, { align: 'right' });
  doc.text('SGST', innerX + 76, y, { align: 'right' });
  doc.text('CESS', innerX + 98, y, { align: 'right' });
  doc.text('Total', rightX, y, { align: 'right' });
  y += 3;
  doc.text('Value', innerX + 32, y, { align: 'right' });
  doc.text('Amount', rightX, y, { align: 'right' });
  y += 5;

  // Tax Row A)
  doc.setFont('helvetica', 'normal');
  doc.text('A)', innerX, y);
  doc.text(formatINR(taxableVal), innerX + 32, y, { align: 'right' });
  doc.text(formatINR(cgstVal), innerX + 54, y, { align: 'right' });
  doc.text(formatINR(sgstVal), innerX + 76, y, { align: 'right' });
  doc.text('₹0.00', innerX + 98, y, { align: 'right' });
  doc.text(formatINR(grandTotal), rightX, y, { align: 'right' });
  y += 5;

  // Tax Total Row
  doc.setFont('helvetica', 'bold');
  doc.text('Total', innerX, y);
  doc.text(formatINR(taxableVal), innerX + 32, y, { align: 'right' });
  doc.text(formatINR(cgstVal), innerX + 54, y, { align: 'right' });
  doc.text(formatINR(sgstVal), innerX + 76, y, { align: 'right' });
  doc.text('₹0.00', innerX + 98, y, { align: 'right' });
  doc.text(formatINR(grandTotal), rightX, y, { align: 'right' });
  y += 8;

  // Tender Detail Section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('Tender Detail', pageWidth / 2, y, { align: 'center' });
  y += 6;

  doc.setFontSize(8);
  doc.text(pMode, innerX, y);
  doc.text(formatINR(tendered), rightX, y, { align: 'right' });
  y += 5;

  doc.text('TOTAL RECEIVED AMOUNT', innerX, y);
  doc.text(formatINR(tendered), rightX, y, { align: 'right' });
  y += 5;

  doc.text('CHANGE DUE', innerX, y);
  doc.text(formatINR(changeDue), rightX, y, { align: 'right' });
  y += 6;

  doc.text(`NO OF ITEMS :${items.length}`, innerX, y);
  y += 4;
  doc.text(`TOTAL QTY :${totalQty}`, innerX, y);
  y += 8;

  // Return Policy Section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Return Policy', innerX, y);
  y += 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(60, 60, 60);
  doc.text('Not entirely satisfied with your purchase?', innerX, y);
  y += 3.5;
  doc.text('Just ask for an exchange across any Westside store!', innerX, y);
  y += 3.5;
  doc.text('All exchanges/returns can be made within 30 days from the date of the', innerX, y);
  y += 3.5;
  doc.text('invoice.', innerX, y);
  y += 4;

  const bulletPoints = [
    '* If you have an invoice, we will give you an exchange or a credit note.',
    '* If you do not have an invoice, exchange/return will not be accepted.',
    '* We do not provide an exchange/return on Innerwear, Cosmetics, Accessories & Jewellery including POME.',
    '* Footwear must be unworn and in original box packaging with purchase invoice.',
    '* Discount includes a reduction in the applicable GST rate.',
    '* Download the App to view your invoice and show it at store for exchange/return.'
  ];

  bulletPoints.forEach((bp) => {
    const wrapped = doc.splitTextToSize(bp, innerWidth);
    doc.text(wrapped, innerX, y);
    y += wrapped.length * 3.2;
  });

  y += 4;

  // Scannable Barcode Image
  const barcodeNumber = `-${saleNumber.replace(/[^A-Za-z0-9]/g, '')}-`;
  const barcodeDataUrl = createBarcodeDataUrl(barcodeNumber);
  if (barcodeDataUrl) {
    const bcWidth = 80;
    const bcHeight = 16;
    const bcX = (pageWidth - bcWidth) / 2;
    doc.addImage(barcodeDataUrl, 'PNG', bcX, y, bcWidth, bcHeight);
    y += bcHeight + 2;
  } else {
    y += 12;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(20, 20, 20);
  doc.text(barcodeNumber, pageWidth / 2, y, { align: 'center' });
  y += 10;

  // Bottom "Love what's in? Follow to know more" Card
  const followCardY = cardStartY + p2CardHeight + 5;
  if (followCardY + 20 < pageHeight - 12) {
    doc.setDrawColor(220, 224, 230);
    doc.roundedRect(cardX, followCardY, cardWidth, 18, 3.5, 3.5, 'S');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 30, 30);
    doc.text("Love what's in? Follow to know", pageWidth / 2, followCardY + 6.5, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.text('more', pageWidth / 2, followCardY + 10.5, { align: 'center' });

    // Social icon circles f, insta, x
    const sY = followCardY + 14.5;
    const sR = 2.2;
    // FB
    doc.setFillColor(59, 89, 152);
    doc.circle(pageWidth / 2 - 8, sY, sR, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(5);
    doc.text('f', pageWidth / 2 - 8, sY + 1.2, { align: 'center' });

    // Insta
    doc.setFillColor(225, 48, 108);
    doc.circle(pageWidth / 2, sY, sR, 'F');
    doc.text('IG', pageWidth / 2, sY + 1.2, { align: 'center' });

    // X
    doc.setFillColor(0, 0, 0);
    doc.circle(pageWidth / 2 + 8, sY, sR, 'F');
    doc.text('X', pageWidth / 2 + 8, sY + 1.2, { align: 'center' });
  }

  // Page 2 footer URL watermark
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 100, 100);
  doc.text(`https://westside.karnival.com/q/zd/${saleNumber}/`, cardX, pageHeight - 10);
  doc.text('2/2', rightX, pageHeight - 10, { align: 'right' });

  // Save the PDF
  doc.save(`Westside_Invoice_${saleNumber}.pdf`);
}

/**
 * Print the Westside-style invoice via browser print window
 */
export function printRetailInvoice(sale, retailer = {}) {
  const saleNumber = sale.sale_number || `SALE-${Date.now().toString().slice(-6)}`;
  const saleDate = sale.createdAt ? new Date(sale.createdAt) : new Date();
  const dateFormatted = `${saleDate.getDate().toString().padStart(2, '0')}/${(saleDate.getMonth() + 1).toString().padStart(2, '0')}/${saleDate.getFullYear()} ${saleDate.toLocaleTimeString('en-IN', { hour12: false })}`;

  const storeName = retailer.business_name || retailer.name || 'Westside A Unit of Trent Ltd';
  const storeAddress = retailer.shop_address || retailer.address || 'W144 Imperial Square, Hazira Road Adajan Road Opposite Aalishan Enclave Adjan';
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

  const taxableVal = Math.round((grandTotal / 1.05) * 100) / 100;
  const cgstVal = Math.round(((grandTotal - taxableVal) / 2) * 100) / 100;
  const sgstVal = Math.round((grandTotal - taxableVal - cgstVal) * 100) / 100;

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
        <title>Westside Tax Invoice - ${saleNumber}</title>
        <style>
          @page { size: A4 portrait; margin: 10mm; }
          * { box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background: #f8fafc;
            color: #111;
            margin: 0;
            padding: 20px;
          }
          .invoice-card {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            max-width: 580px;
            margin: 0 auto;
            padding: 24px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
          }
          .brand-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
          }
          .brand-title {
            font-family: 'Times New Roman', serif;
            font-size: 26px;
            font-weight: bold;
            font-style: italic;
            letter-spacing: 1px;
          }
          .store-sub {
            text-align: right;
            font-size: 11px;
            color: #555;
          }
          .store-link {
            font-size: 10px;
            color: #888;
            cursor: pointer;
          }
          .experience-box {
            text-align: center;
            margin-bottom: 20px;
          }
          .experience-title {
            font-size: 13px;
            color: #333;
            margin-bottom: 10px;
          }
          .smileys {
            display: flex;
            justify-content: center;
            gap: 40px;
            font-size: 11px;
            font-weight: 500;
          }
          .smiley-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
          }
          .smiley-circle {
            width: 26px;
            height: 26px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
          }
          .border-box {
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 16px;
          }
          .company-name {
            font-size: 14px;
            font-weight: bold;
            text-align: center;
            margin-bottom: 4px;
          }
          .company-details {
            font-size: 10px;
            text-align: center;
            color: #444;
            line-height: 1.4;
            margin-bottom: 12px;
          }
          .tax-title {
            font-size: 14px;
            font-weight: 800;
            letter-spacing: 1px;
            text-align: center;
            margin: 14px 0 10px;
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
            font-size: 10.5px;
            margin: 12px 0;
          }
          table.items-table th {
            text-align: left;
            border-bottom: 1px solid #111;
            padding: 4px 0;
            font-size: 10px;
            font-weight: 700;
          }
          table.items-table td {
            padding: 4px 0;
            vertical-align: top;
          }
          .totals-row {
            display: flex;
            justify-content: space-between;
            font-size: 11.5px;
            font-weight: bold;
            padding: 3px 0;
          }
          .section-heading {
            font-size: 13px;
            font-weight: bold;
            text-align: center;
            margin: 16px 0 10px;
          }
          table.tax-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10.5px;
            margin-bottom: 14px;
          }
          table.tax-table th {
            border-bottom: 1px solid #ddd;
            padding: 4px 0;
            font-size: 10px;
          }
          table.tax-table td {
            padding: 4px 0;
          }
          .return-policy {
            font-size: 9.5px;
            color: #444;
            line-height: 1.4;
            margin: 14px 0;
          }
          .return-policy ul {
            padding-left: 16px;
            margin: 4px 0;
          }
          .barcode-box {
            text-align: center;
            margin: 16px 0;
            font-family: monospace;
            font-size: 14px;
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
            <div class="brand-title">WESTSIDE</div>
            <div class="store-sub">
              <div>${storeName} - ${storeCity}</div>
              <div class="store-link">Store Details &gt;</div>
            </div>
          </div>

          <div class="experience-box">
            <div class="experience-title">Tell us about your overall experience</div>
            <div class="smileys">
              <div class="smiley-item">
                <div class="smiley-circle" style="border: 2px solid #ef4444; color: #ef4444;">🙁</div>
                <span>Least Likely</span>
              </div>
              <div class="smiley-item">
                <div class="smiley-circle" style="border: 2px solid #f59e0b; color: #f59e0b;">😐</div>
                <span>Probably</span>
              </div>
              <div class="smiley-item">
                <div class="smiley-circle" style="border: 2px solid #10b981; color: #10b981;">😊</div>
                <span>Very Likely!</span>
              </div>
            </div>
          </div>

          <div class="border-box">
            <div class="company-name">Trent Limited</div>
            <div class="company-details">
              Place Of Supply : ${storeName} - ${storeAddress} ${storeCity}, ${storeCity}, ${storeState} - ${storePincode}<br/>
              <b>GSTIN NO : ${gstin}</b><br/>
              <b>Registered Office:</b><br/>
              Bombay House, 24, Homi Mody Street, Fort, Mumbai 400001<br/>
              <b>GSTIN NO : 36AAACL1838J1ZH</b>
            </div>

            <div class="tax-title">TAX INVOICE</div>

            <div class="meta-grid">
              <div class="bold">INVOICE NO. : ${saleNumber}</div>
              <div style="text-align: right;">${dateFormatted}</div>
              <div class="bold">COUNTER : ${sale.counter_number || '4'}</div>
              <div style="text-align: right;" class="bold">CASHIER : ${sale.cashier_name || '100125'}</div>
              <div class="meta-full bold">CUSTOMER ID : ${custId.toUpperCase()}</div>
              <div class="meta-full bold">CUSTOMER NAME : ${custName.toUpperCase()}</div>
              <div class="meta-full bold">MOBILE NO : ${custMobile}</div>
            </div>

            <table class="items-table">
              <thead>
                <tr>
                  <th>Item / Description</th>
                  <th style="text-align: right;">Price</th>
                  <th style="text-align: center;">QTY/Unit</th>
                  <th style="text-align: right;">Disc.Amt</th>
                  <th style="text-align: right;">Net.Amt</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colspan="5" class="bold" style="padding-top: 6px;">A) CGST@2.5% SGST@2.5%</td>
                </tr>
                ${items.map((item, idx) => `
                  <tr>
                    <td>
                      <div class="bold">${item.sku_variant || '3010851' + (idx + 1000)}</div>
                      <div>${item.product_name || item.product?.name || 'Footwear'}</div>
                      <div style="color: #666; font-size: 9.5px;">${item.size ? 'Size ' + item.size : ''} ${item.color ? '· ' + item.color : ''} · HSN: ${item.product?.hsn || '64031900'}</div>
                    </td>
                    <td style="text-align: right;">₹${Number(item.unit_price || 0).toFixed(2)}</td>
                    <td style="text-align: center;">${item.quantity || 1} PC</td>
                    <td style="text-align: right;">₹${Number(item.line_discount_amount || 0).toFixed(2)}</td>
                    <td style="text-align: right;" class="bold">₹${Number(item.line_total || (item.unit_price * (item.quantity || 1))).toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div style="border-top: 1px dashed #ccc; padding-top: 6px; margin-top: 8px;">
              <div class="totals-row">
                <span>Gross Total:</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div class="totals-row">
                <span>Total Discount:</span>
                <span>${discount.toFixed(2)}</span>
              </div>
              <div class="totals-row" style="font-size: 13px; font-weight: 800; border-top: 1px solid #111; padding-top: 6px; margin-top: 4px;">
                <span>Total Invoice Amount:</span>
                <span>${grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div class="border-box">
            <div class="section-heading">Tax Details</div>
            <table class="tax-table">
              <thead>
                <tr>
                  <th>GST IND</th>
                  <th style="text-align: right;">Taxable Value</th>
                  <th style="text-align: right;">CGST</th>
                  <th style="text-align: right;">SGST</th>
                  <th style="text-align: right;">CESS</th>
                  <th style="text-align: right;">Total Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>A)</td>
                  <td style="text-align: right;">₹${taxableVal.toFixed(2)}</td>
                  <td style="text-align: right;">₹${cgstVal.toFixed(2)}</td>
                  <td style="text-align: right;">₹${sgstVal.toFixed(2)}</td>
                  <td style="text-align: right;">₹0.00</td>
                  <td style="text-align: right;">₹${grandTotal.toFixed(2)}</td>
                </tr>
                <tr class="bold" style="border-top: 1px solid #333;">
                  <td>Total</td>
                  <td style="text-align: right;">₹${taxableVal.toFixed(2)}</td>
                  <td style="text-align: right;">₹${cgstVal.toFixed(2)}</td>
                  <td style="text-align: right;">₹${sgstVal.toFixed(2)}</td>
                  <td style="text-align: right;">₹0.00</td>
                  <td style="text-align: right;">₹${grandTotal.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>

            <div class="section-heading">Tender Detail</div>
            <div class="totals-row">
              <span>${pMode}</span>
              <span>₹${tendered.toFixed(2)}</span>
            </div>
            <div class="totals-row">
              <span>TOTAL RECEIVED AMOUNT</span>
              <span>₹${tendered.toFixed(2)}</span>
            </div>
            <div class="totals-row">
              <span>CHANGE DUE</span>
              <span>₹${changeDue.toFixed(2)}</span>
            </div>
            <div style="font-size: 10px; color: #555; margin-top: 6px;">
              NO OF ITEMS : ${items.length} &nbsp;|&nbsp; TOTAL QTY : ${totalQty}
            </div>

            <div class="return-policy">
              <b>Return Policy</b><br/>
              Not entirely satisfied with your purchase?<br/>
              Just ask for an exchange across any Westside store!<br/>
              All exchanges/returns can be made within 30 days from the date of the invoice.<br/>
              <ul>
                <li>If you have an invoice, we will give you an exchange or a credit note.</li>
                <li>If you do not have an invoice, exchange/return will not be accepted.</li>
                <li>We do not provide an exchange/return on Innerwear, Cosmetics, Accessories & Jewellery including POME.</li>
                <li>Footwear must be in unworn original condition with box & invoice.</li>
                <li>Discount includes a reduction in the applicable GST rate.</li>
                <li>Download the App to view your invoice and show it at store for exchange/return.</li>
              </ul>
            </div>

            <div class="barcode-box">
              <div style="letter-spacing: 4px; font-size: 18px; margin-bottom: 2px;">||| | ||||| || |||| ||| ||</div>
              <div>${barcodeNumber}</div>
            </div>
          </div>

          <div style="text-align: center; font-size: 11px; color: #666; margin-top: 10px;">
            <div>Love what's in? Follow to know more</div>
            <div style="margin-top: 6px; font-weight: bold;">facebook &middot; instagram &middot; twitter</div>
          </div>

          <div class="no-print">
            <button onclick="window.print()" style="padding: 8px 24px; background: #000; color: #fff; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;">
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
  const storeName = retailer.business_name || retailer.name || 'Westside Footwear';
  const customerName = sale.customer_name || 'Valued Customer';
  const grandTotal = formatINR(sale.grand_total);
  const saleNumber = sale.sale_number || '';
  const pairs = sale.pairs_sold || (Array.isArray(sale.items) ? sale.items.reduce((s, i) => s + (Number(i.quantity) || 1), 0) : 1);

  return `Hello ${customerName}, 👋\n\nThank you for shopping at *${storeName}*!\n\n🧾 *Tax Invoice Details:*\n• Invoice No: *${saleNumber}*\n• Total Pairs: *${pairs}*\n• Total Amount Paid: *${grandTotal}*\n• Payment Mode: *${sale.payment_mode || 'Cash'}*\n\n🔄 *Return / Exchange Policy:*\nItems can be exchanged within 30 days with original invoice & box.\n\nHave a wonderful day!`;
}
