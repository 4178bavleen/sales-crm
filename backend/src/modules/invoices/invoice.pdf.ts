import PDFDocument from 'pdfkit'
import fs from 'fs'
import path from 'path'

async function resolveLogoBuffer(logoStr?: string | null): Promise<Buffer | null> {
  try {
    if (logoStr && typeof logoStr === 'string' && logoStr.trim()) {
      const trimmed = logoStr.trim()

      // Base64 Data URL (e.g. data:image/png;base64,iVBOR...)
      if (trimmed.startsWith('data:image/')) {
        const base64Index = trimmed.indexOf('base64,')
        if (base64Index !== -1) {
          const raw = trimmed.substring(base64Index + 7)
          return Buffer.from(raw, 'base64')
        }
      }

      // HTTP or HTTPS URL
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        const res = await fetch(trimmed)
        if (res.ok) {
          const arr = await res.arrayBuffer()
          return Buffer.from(arr)
        }
      }

      // Local file path
      if (fs.existsSync(trimmed)) {
        return fs.readFileSync(trimmed)
      }
    }

    // Default fallback logo candidates in workspace
    const defaultCandidates = [
      path.resolve(process.cwd(), '../dashboard/public/favicon/favicon.png'),
      path.resolve(process.cwd(), 'dashboard/public/favicon/favicon.png'),
      '/home/gabrialdeora/Desktop/New VIS PROJECT FOLDER/sales-crm/dashboard/public/favicon/favicon.png',
      path.resolve(process.cwd(), 'assets/default-logo.png'),
      path.resolve(process.cwd(), 'backend/assets/default-logo.png'),
      typeof __dirname !== 'undefined' ? path.resolve(__dirname, '../../../../dashboard/public/favicon/favicon.png') : '',
      typeof __dirname !== 'undefined' ? path.resolve(__dirname, '../../../../assets/default-logo.png') : '',
      typeof __dirname !== 'undefined' ? path.resolve(__dirname, '../../../assets/default-logo.png') : '',
    ].filter(Boolean)

    for (const cand of defaultCandidates) {
      if (fs.existsSync(cand)) {
        return fs.readFileSync(cand)
      }
    }
  } catch (err) {
    console.warn('[InvoicePdf] Error resolving logo:', err)
  }
  return null
}

function parseTermsList(rawTerms?: string | null): string[] {
  if (!rawTerms || typeof rawTerms !== 'string') return []
  const trimmed = rawTerms.trim()
  if (!trimmed) return []

  // 1. If explicit newlines exist
  if (trimmed.includes('\n')) {
    return trimmed
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
  }

  // 2. If numbered clauses like "1. ... 2. ... 3. ..." in a single line
  const numberedSplit = trimmed.split(/(?:^|\s+)(?=(?:[0-9]+[\.\)]|\([0-9]+\))\s+)/)
  if (numberedSplit.length > 1) {
    return numberedSplit
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
  }

  // 3. If semicolon-separated bullet clauses
  if (trimmed.includes(';') && trimmed.split(';').length > 1) {
    return trimmed
      .split(';')
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
  }

  return [trimmed]
}

function cleanTermClause(term: string): string {
  return term
    .replace(/^(?:[0-9]+[\.\)]|\([0-9]+\))\s*/, '')
    .replace(/^[-•*]\s*/, '')
    .trim()
}

interface InvoicePdfData {
  invoiceNumber: string
  issueDate: Date | string
  dueDate: Date | string
  status: string
  templateEdition: string
  taxType: string
  currency: string
  subtotal: number
  totalDiscount: number
  taxAmount: number
  grandTotal: number
  amountPaid: number
  amountDue: number
  notes?: string | null
  terms?: string | null
  customer?: {
    companyName?: string | null
    contactPerson?: string | null
    email?: string | null
    phone?: string | null
    address?: string | null
  } | null
  items: Array<{
    itemName: string
    description?: string | null
    quantity: number
    unitPrice: number
    discountPercent: number
    taxPercent: number
    lineTotal: number
  }>
  settings: {
    companyName: string
    companyLogo?: string | null
    companyEmail?: string | null
    companyPhone?: string | null
    whatsappNumber?: string | null
    addressLine1?: string | null
    city?: string | null
    state?: string | null
    country?: string | null
    pincode?: string | null
    gstin?: string | null
    panNumber?: string | null
    bankName?: string | null
    bankAccountNo?: string | null
    bankIfsc?: string | null
    bankBranch?: string | null
    upiId?: string | null
    brandColor?: string | null
    defaultTerms?: string | null
  }
}

export async function generateInvoicePdfBuffer(data: InvoicePdfData): Promise<Buffer> {
  const logoBuffer = await resolveLogoBuffer(data.settings.companyLogo)

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        margin: 40,
        size: 'A4',
        info: {
          Title: `Invoice - ${data.invoiceNumber}`,
          Author: data.settings.companyName || 'Vibrantick Infotech Solutions',
          Subject: `Tax Invoice ${data.invoiceNumber}`,
        },
      })

      const buffers: Buffer[] = []
      doc.on('data', (chunk) => buffers.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(buffers)))
      doc.on('error', (err) => reject(err))

      const accent = data.settings.brandColor || '#1d61e7'
      const darkText = '#0f172a'
      const mutedText = '#64748b'
      const lightBg = '#f8fafc'
      const borderColor = '#e2e8f0'

      // ==========================================
      // 1. HEADER SECTION (Brand & Invoice Badge)
      // ==========================================
      const headerTop = 40
      
      // Top colored accent banner
      doc.rect(40, headerTop, 515, 6).fill(accent)

      let textX = 40
      let logoYBottom = headerTop + 12

      // Render custom/default Logo on the left side of company name (prominent brand size)
      if (logoBuffer) {
        try {
          const logoSize = 92
          doc.image(logoBuffer, 40, headerTop + 10, { fit: [logoSize, logoSize] })
          textX = 40 + logoSize + 14
          logoYBottom = headerTop + 10 + logoSize
        } catch (imgErr) {
          console.warn('[InvoicePdf] doc.image error:', imgErr)
          textX = 40
        }
      }

      // Company Name (positioned to the right of the logo)
      doc
        .font('Helvetica-Bold')
        .fontSize(16)
        .fillColor(darkText)
        .text(data.settings.companyName || 'Vibrantick Infotech Solutions', textX, headerTop + 12, { width: 195 })

      let companyY = headerTop + 33
      doc.font('Helvetica').fontSize(8.5).fillColor(mutedText)

      const addressParts = [
        data.settings.addressLine1,
        data.settings.city,
        data.settings.state,
        data.settings.country,
        data.settings.pincode ? `- ${data.settings.pincode}` : null,
      ]
        .filter(Boolean)
        .join(', ')

      if (addressParts) {
        doc.text(addressParts, textX, companyY, { width: 195 })
        companyY += 18
      }
      if (data.settings.companyEmail || data.settings.companyPhone) {
        const contactLine = [
          data.settings.companyEmail,
          data.settings.companyPhone ? `Ph: ${data.settings.companyPhone}` : null,
        ]
          .filter(Boolean)
          .join(' | ')
        doc.text(contactLine, textX, companyY, { width: 195 })
        companyY += 11
      }
      if (data.settings.gstin || data.settings.panNumber) {
        const taxIds = [
          data.settings.gstin ? `GSTIN: ${data.settings.gstin}` : null,
          data.settings.panNumber ? `PAN: ${data.settings.panNumber}` : null,
        ]
          .filter(Boolean)
          .join(' | ')
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor(darkText).text(taxIds, textX, companyY, { width: 195 })
        companyY += 12
      }

      const finalCompanyY = Math.max(companyY, logoYBottom)

      // Invoice Details Block (Right)
      doc
        .font('Helvetica-Bold')
        .fontSize(22)
        .fillColor(accent)
        .text('TAX INVOICE', 320, headerTop + 16, { align: 'right' })

      doc.font('Helvetica').fontSize(10).fillColor(darkText)
      const rightX = 350
      let invY = headerTop + 44

      const addDetailRow = (label: string, val: string) => {
        doc.font('Helvetica-Bold').fontSize(9).fillColor(mutedText).text(label, rightX, invY, { width: 90 })
        doc.font('Helvetica-Bold').fontSize(9).fillColor(darkText).text(val, rightX + 90, invY, { width: 115, align: 'right' })
        invY += 14
      }

      addDetailRow('Invoice No:', data.invoiceNumber)
      addDetailRow('Issue Date:', new Date(data.issueDate).toLocaleDateString('en-IN'))
      addDetailRow('Due Date:', new Date(data.dueDate).toLocaleDateString('en-IN'))
      addDetailRow('Status:', data.status)
      addDetailRow('Tax Type:', data.taxType.replace('_', ' '))

      // Divider
      const billSectionY = Math.max(finalCompanyY + 16, invY + 10)
      doc.moveTo(40, billSectionY).lineTo(555, billSectionY).strokeColor(borderColor).stroke()

      // ==========================================
      // 2. BILL TO SECTION
      // ==========================================
      const colWidth = 245
      const billY = billSectionY + 12

      // Bill To Column
      doc.rect(40, billY, colWidth, 75).fillAndStroke(lightBg, borderColor)
      doc.font('Helvetica-Bold').fontSize(9).fillColor(accent).text('BILLED TO', 52, billY + 8)
      doc.font('Helvetica-Bold').fontSize(11).fillColor(darkText).text(data.customer?.companyName || 'Valued Customer', 52, billY + 22)
      
      doc.font('Helvetica').fontSize(8.5).fillColor(mutedText)
      let bLineY = billY + 36
      if (data.customer?.contactPerson) {
        doc.text(`Attn: ${data.customer.contactPerson}`, 52, bLineY)
        bLineY += 11
      }
      const custContact = [data.customer?.email, data.customer?.phone].filter(Boolean).join(' | ')
      if (custContact) {
        doc.text(custContact, 52, bLineY)
      }

      // Address Column
      doc.rect(310, billY, colWidth, 75).fillAndStroke(lightBg, borderColor)
      doc.font('Helvetica-Bold').fontSize(9).fillColor(accent).text('BILLING ADDRESS', 322, billY + 8)
      doc.font('Helvetica').fontSize(8.5).fillColor(darkText)
      const addressText = data.customer?.address || 'Registered Office Address'
      doc.text(addressText, 322, billY + 22, { width: 220, height: 45 })

      // ==========================================
      // 3. LINE ITEMS TABLE
      // ==========================================
      const tableTop = billY + 90
      
      // Table Header Bar
      doc.rect(40, tableTop, 515, 20).fill(accent)
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#ffffff')
      
      doc.text('ITEM & DESCRIPTION', 48, tableTop + 5, { width: 220 })
      doc.text('QTY', 275, tableTop + 5, { width: 40, align: 'center' })
      doc.text('RATE (INR)', 320, tableTop + 5, { width: 65, align: 'right' })
      doc.text('DISC %', 390, tableTop + 5, { width: 45, align: 'center' })
      doc.text('TAX %', 440, tableTop + 5, { width: 45, align: 'center' })
      doc.text('TOTAL (INR)', 485, tableTop + 5, { width: 62, align: 'right' })

      let itemY = tableTop + 24
      data.items.forEach((item, index) => {
        const rowBg = index % 2 === 0 ? '#ffffff' : '#f8fafc'
        const rowHeight = 26
        
        doc.rect(40, itemY - 2, 515, rowHeight).fill(rowBg)
        doc.moveTo(40, itemY + rowHeight - 2).lineTo(555, itemY + rowHeight - 2).strokeColor(borderColor).stroke()

        doc.font('Helvetica-Bold').fontSize(8.5).fillColor(darkText)
        doc.text(item.itemName, 48, itemY + 3, { width: 220, lineBreak: false })

        doc.font('Helvetica').fontSize(8).fillColor(mutedText)
        doc.text(item.quantity.toString(), 275, itemY + 3, { width: 40, align: 'center' })
        
        doc.font('Helvetica').fontSize(8.5).fillColor(darkText)
        doc.text(item.unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 }), 320, itemY + 3, {
          width: 65,
          align: 'right',
        })
        
        doc.text(`${item.discountPercent}%`, 390, itemY + 3, { width: 45, align: 'center' })
        doc.text(`${item.taxPercent}%`, 440, itemY + 3, { width: 45, align: 'center' })
        doc.font('Helvetica-Bold').text(item.lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 }), 485, itemY + 3, {
          width: 62,
          align: 'right',
        })

        itemY += rowHeight
      })

      // ==========================================
      // 4. TOTALS & BANK / PAYMENT SUMMARY
      // ==========================================
      const summaryTop = itemY + 12

      // Left Box: Bank Details & UPI
      const bankWidth = 270
      doc.rect(40, summaryTop, bankWidth, 115).fillAndStroke(lightBg, borderColor)
      doc.font('Helvetica-Bold').fontSize(9).fillColor(accent).text('BANK PAYMENT INSTRUCTIONS', 52, summaryTop + 8)

      let bDetailsY = summaryTop + 24
      const addBankRow = (label: string, value?: string | null) => {
        if (!value) return
        doc.font('Helvetica-Bold').fontSize(8).fillColor(mutedText).text(label, 52, bDetailsY, { width: 85 })
        doc.font('Helvetica').fontSize(8).fillColor(darkText).text(value, 138, bDetailsY, { width: 165 })
        bDetailsY += 13
      }

      addBankRow('Bank Name:', data.settings.bankName || 'State Bank of India')
      addBankRow('Account No:', data.settings.bankAccountNo || 'XXXXXXXXXXXX')
      addBankRow('IFSC Code:', data.settings.bankIfsc || 'SBIN000XXXX')
      addBankRow('Branch:', data.settings.bankBranch || 'Main Branch')
      if (data.settings.upiId) {
        addBankRow('UPI ID:', data.settings.upiId)
      }
      if (data.settings.whatsappNumber) {
        addBankRow('WhatsApp Support:', `+91 ${data.settings.whatsappNumber}`)
      }

      // Right Box: Totals & Tax Calculations
      const totX = 330
      const valX = 450
      let tY = summaryTop + 4

      const addTotalRow = (label: string, amount: number, isBold = false, isAccent = false) => {
        doc
          .font(isBold ? 'Helvetica-Bold' : 'Helvetica')
          .fontSize(isBold ? 9.5 : 8.5)
          .fillColor(isAccent ? accent : isBold ? darkText : mutedText)
          .text(label, totX, tY, { width: 115 })

        doc
          .font(isBold ? 'Helvetica-Bold' : 'Helvetica')
          .fontSize(isBold ? 9.5 : 8.5)
          .fillColor(isAccent ? accent : darkText)
          .text(`₹ ${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, valX, tY, {
            width: 95,
            align: 'right',
          })

        tY += 15
      }

      addTotalRow('Subtotal (Taxable):', data.subtotal)
      if (data.totalDiscount > 0) {
        addTotalRow('Discount:', -data.totalDiscount)
      }

      if (data.taxType === 'INTER_STATE') {
        addTotalRow('Integrated GST (IGST):', data.taxAmount)
      } else if (data.taxType === 'INTRA_STATE') {
        addTotalRow('Central GST (CGST):', data.taxAmount / 2)
        addTotalRow('State GST (SGST):', data.taxAmount / 2)
      }

      doc.moveTo(totX, tY).lineTo(555, tY).strokeColor(borderColor).stroke()
      tY += 6

      // Grand Total Box
      doc.rect(totX - 10, tY - 4, 235, 24).fill(accent)
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#ffffff').text('TOTAL AMOUNT:', totX, tY + 2)
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#ffffff').text(
        `₹ ${data.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
        valX,
        tY + 2,
        { width: 95, align: 'right' }
      )
      tY += 28

      if (data.amountPaid > 0) {
        addTotalRow('Amount Paid:', data.amountPaid)
        addTotalRow('Balance Due:', data.amountDue, true, true)
      }

      // ==========================================
      // 5. NOTES, TERMS & SIGNATURE
      // ==========================================
      const footerY = Math.max(summaryTop + 130, tY + 20)

      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(darkText).text('Terms & Conditions:', 40, footerY)

      const rawTerms =
        data.terms ||
        data.settings.defaultTerms ||
        '• Payment is due within 15 days of invoice date.\n• Please quote the invoice number when making electronic transfer.\n• All disputes are subject to local jurisdiction.'

      const termsList = parseTermsList(rawTerms)
      let termsY = footerY + 12
      doc.font('Helvetica').fontSize(7.5).fillColor(darkText)

      termsList.forEach((term) => {
        const clean = cleanTermClause(term)
        const lineText = `•   ${clean}`
        const itemHeight = doc.heightOfString(lineText, { width: 340 })
        doc.text(lineText, 40, termsY, { width: 340 })
        termsY += itemHeight + 3
      })

      const notesY = Math.max(termsY + 8, footerY + 45)
      if (data.notes) {
        doc.rect(40, notesY, 340, 24).fillAndStroke('#f8fafc', borderColor)
        doc.rect(40, notesY, 3, 24).fill(accent)
        doc.font('Helvetica-Bold').fontSize(7).fillColor(darkText).text('NOTE:', 48, notesY + 4)
        doc.font('Helvetica').fontSize(7).fillColor(mutedText).text(data.notes, 48, notesY + 13, { width: 325 })
      }

      // Authorized Signatory
      const signX = 400
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(darkText).text(
        `For ${data.settings.companyName || 'Vibrantick Infotech Solutions'}`,
        signX,
        footerY,
        { width: 145, align: 'center' }
      )
      doc.moveTo(signX + 15, footerY + 50).lineTo(signX + 130, footerY + 50).strokeColor(borderColor).stroke()
      doc.font('Helvetica').fontSize(7.5).fillColor(mutedText).text('Authorized Signatory', signX, footerY + 54, {
        width: 145,
        align: 'center',
      })

      doc.end()
    } catch (err) {
      reject(err)
    }
  })
}
