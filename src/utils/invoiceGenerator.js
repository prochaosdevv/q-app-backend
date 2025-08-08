import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export const createInvoicePDFBuffer = async (invoiceData) => {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4 Size
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const { companyName, invoiceNo, invoiceDate, customerName, description, amount,address } = invoiceData;

  const pageWidth = 595;

  const drawTextCenter = (text, y, size = 12) => {
    const textWidth = font.widthOfTextAtSize(text, size);
    const x = (pageWidth - textWidth) / 2;
    page.drawText(text, { x, y, size, font, color: rgb(0, 0, 0) });
  };

  const drawText = (text, x, y, size = 12) => {
    page.drawText(text, { x, y, size, font, color: rgb(0, 0, 0) });
  };

  const drawLine = (startX, startY, endX, endY, thickness = 1) => {
    page.drawLine({
      start: { x: startX, y: startY },
      end: { x: endX, y: endY },
      thickness: thickness,
      color: rgb(0, 0, 0),
    });
  };

  // Header Title
  drawTextCenter("Q-Surv Invoice", 800, 14);

  // Company Info Centered
  drawTextCenter(companyName, 770);
  drawTextCenter(address, 755);

  // Invoice Details (Left & Right aligned with space)
  drawText(`Invoice No: ${invoiceNo}`, 50, 730);
  const invoiceDateText = `Invoice Date: ${invoiceDate.toLocaleDateString()}`;
  const dateTextWidth = font.widthOfTextAtSize(invoiceDateText, 12);
  drawText(invoiceDateText, pageWidth - dateTextWidth - 50, 730);

  // Receiver Info Box (Details of Receiver)
  drawLine(50, 690, 545, 690); // Top line
  drawLine(50, 650, 545, 650); // Bottom line
  drawLine(50, 650, 50, 690);  // Left border
  drawLine(545, 650, 545, 690); // Right border

  // Receiver Title Centered
  drawTextCenter("Details Of Receiver (Billed To)", 670, 12);

  // Customer Name (Left aligned inside box)
  drawText(`Name: ${customerName}`, 60, 655);

  // Table Layout
  const startY = 620;
  const tableCols = [50, 120, 300, 450, 545]; // SL No, Plan Name, Description, Amount, End Line

  // Table Border Lines
  drawLine(tableCols[0], startY, tableCols[4], startY);       // Top Line
  drawLine(tableCols[0], startY - 30, tableCols[4], startY - 30); // Header Bottom Line
  drawLine(tableCols[0], startY - 60, tableCols[4], startY - 60); // Row Bottom Line

  // Vertical Lines
  for (let i = 0; i < tableCols.length; i++) {
    drawLine(tableCols[i], startY, tableCols[i], startY - 60);
  }

  // Table Header Text
  drawText("SL No", tableCols[0] + 10, startY - 20);
  drawText("Plan Name", tableCols[1] + 10, startY - 20);
  drawText("Description", tableCols[2] + 10, startY - 20);
  drawText("Amount", tableCols[3] + 20, startY - 20);

  // Table Row Text
  drawText("1", tableCols[0] + 10, startY - 50);
  drawText("Basic", tableCols[1] + 10, startY - 50);
  drawText(description, tableCols[2] + 10, startY - 50);
  drawText(`${amount}`, tableCols[3] + 20, startY - 50);

  // Footer Total in Words
  drawText(`Invoice Total: $${amount} only`, 50, startY - 90);

  // Footer Info Centered
  drawTextCenter("CarXs", startY - 130);
  drawTextCenter("This is a computer generated document, does not require signature", startY - 150, 10);

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
};
