import jsPDF from "jspdf";
import JsBarcode from "jsbarcode";
import QRCode from "qrcode";

const LABELS_GRID = {
  1: [1, 1],
  2: [2, 1],
  4: [2, 2],
  6: [3, 2],
  8: [4, 2],
};

function getBarcodeDataUrl(sku) {
  const canvas = document.createElement("canvas");

  try {
    JsBarcode(canvas, String(sku || "0"), {
      format: "CODE128",
      width: 2,
      height: 40,
      margin: 0,
      displayValue: false,
    });

    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}

async function getQRDataUrl(productId, sku) {
  const baseUrl =
    typeof window !== "undefined" ? window.location.origin : "";

  const text =
    productId && baseUrl
      ? `${baseUrl}/products/${productId}`
      : `SKU:${sku}`;

  try {
    return await QRCode.toDataURL(text, { width: 200, margin: 0 });
  } catch {
    return null;
  }
}

export async function generateLabelsPDF(products, options = {}) {
  if (!products?.length) return;

  const labelsPerPage = options.labelsPerPage || 4;
  const orientation = options.orientation || "p";

  const includeBarcode = options.includeBarcode !== false;
  const includeQR = options.includeQR !== false;

  const margin = options.marginMm || 10;
  const gap = 4;

  const [cols, rows] = LABELS_GRID[labelsPerPage] || [2, 2];

  const doc = new jsPDF({
    unit: "mm",
    format: "a4",
    orientation,
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const usableWidth = pageWidth - margin * 2;
  const usableHeight = pageHeight - margin * 2;

  const labelWidth = (usableWidth - gap * (cols - 1)) / cols;
  const labelHeight = (usableHeight - gap * (rows - 1)) / rows;

  const barcodeHeight = labelHeight * 0.25;
  const qrSize = Math.min(labelHeight * 0.35, labelWidth * 0.5);

  let index = 0;

  for (let i = 0; i < products.length; i++) {
    const product = products[i];

    if (i !== 0 && index === cols * rows) {
      doc.addPage();
      index = 0;
    }

    const col = index % cols;
    const row = Math.floor(index / cols);

    const x = margin + col * (labelWidth + gap);
    const y = margin + row * (labelHeight + gap);

    const sku = product.sku || product._id || "";

    const barcode = includeBarcode
      ? getBarcodeDataUrl(sku)
      : null;

    const qr = includeQR
      ? await getQRDataUrl(product._id, sku)
      : null;

    // draw label border (helps alignment)
    doc.rect(x, y, labelWidth, labelHeight);

    let cursorY = y + 3;

    if (barcode) {
      doc.addImage(
        barcode,
        "PNG",
        x + 2,
        cursorY,
        labelWidth - 4,
        barcodeHeight
      );

      cursorY += barcodeHeight + 2;
    }

    if (qr) {
      doc.addImage(
        qr,
        "PNG",
        x + (labelWidth - qrSize) / 2,
        cursorY,
        qrSize,
        qrSize
      );

      cursorY += qrSize + 2;
    }

    doc.setFontSize(8);
    doc.text(
      String(sku).slice(0, 30),
      x + 2,
      cursorY
    );

    cursorY += 3;

    if (product.title) {
      doc.setFontSize(7);

      const lines = doc.splitTextToSize(
        product.title,
        labelWidth - 4
      );

      doc.text(lines, x + 2, cursorY);
    }

    index++;
  }

  doc.save("labels.pdf");
}