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

function getPdfCurrency(currency?: string): { code: string; label: string; locale: string } {
  const c = (currency || 'INR').toUpperCase()
  switch (c) {
    case 'USD':
      return { code: 'USD', label: '$', locale: 'en-US' }
    case 'EUR':
      return { code: 'EUR', label: 'EUR', locale: 'de-DE' }
    case 'GBP':
      return { code: 'GBP', label: 'GBP', locale: 'en-GB' }
    case 'AED':
      return { code: 'AED', label: 'AED', locale: 'en-AE' }
    case 'CAD':
      return { code: 'CAD', label: 'CA$', locale: 'en-CA' }
    case 'AUD':
      return { code: 'AUD', label: 'AU$', locale: 'en-AU' }
    case 'SGD':
      return { code: 'SGD', label: 'SG$', locale: 'en-SG' }
    case 'INR':
    default:
      return { code: 'INR', label: 'Rs.', locale: 'en-IN' }
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
      const pdfCurr = getPdfCurrency(data.currency)

      // ==========================================
      // 1. HEADER SECTION (Brand & Invoice Badge)
      // ==========================================
      const headerTop = 40
      
      // Top colored accent banner
      doc.rect(40, headerTop, 515, 5).fill(accent)

      let textX = 40
      let logoYBottom = headerTop + 14

      // Render custom/default Logo on the left side of company name (balanced brand size)
      if (logoBuffer) {
        try {
          const logoSize = 75
          doc.image(logoBuffer, 40, headerTop + 12, { fit: [logoSize, logoSize] })
          textX = 40 + logoSize + 14
          logoYBottom = headerTop + 12 + logoSize
        } catch (imgErr) {
          console.warn('[InvoicePdf] doc.image error:', imgErr)
          textX = 40
        }
      }

      // Invoice Details Block coordinates (Right column)
      const rightColX = 355
      doc
        .font('Helvetica-Bold')
        .fontSize(22)
        .fillColor(accent)
        .text('TAX INVOICE', 320, headerTop + 14, { align: 'right' })

      doc.font('Helvetica').fontSize(10).fillColor(darkText)
      let invY = headerTop + 42

      const addDetailRow = (label: string, val: string) => {
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor(mutedText).text(label, rightColX, invY, { width: 85 })
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor(darkText).text(val, rightColX + 85, invY, { width: 115, align: 'right' })
        invY += 13.5
      }

      addDetailRow('Invoice No:', data.invoiceNumber)
      addDetailRow('Issue Date:', new Date(data.issueDate).toLocaleDateString('en-IN'))
      addDetailRow('Due Date:', new Date(data.dueDate).toLocaleDateString('en-IN'))
      addDetailRow('Status:', data.status)
      addDetailRow('Tax Type:', data.taxType.replace('_', ' '))

      // Left Column: Company Name & Contact Info (Dynamically calculated heights)
      const compWidth = rightColX - textX - 12
      const compName = data.settings.companyName || 'Vibrantick Infotech Solutions'

      doc.font('Helvetica-Bold').fontSize(15).fillColor(darkText)
      const compNameHeight = doc.heightOfString(compName, { width: compWidth })
      doc.text(compName, textX, headerTop + 14, { width: compWidth })

      let companyY = headerTop + 14 + compNameHeight + 4

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
        doc.font('Helvetica').fontSize(8.5).fillColor(mutedText)
        const addrHeight = doc.heightOfString(addressParts, { width: compWidth })
        doc.text(addressParts, textX, companyY, { width: compWidth })
        companyY += addrHeight + 3
      }

      if (data.settings.companyEmail || data.settings.companyPhone) {
        const contactLine = [
          data.settings.companyEmail,
          data.settings.companyPhone ? `Ph: ${data.settings.companyPhone}` : null,
        ]
          .filter(Boolean)
          .join(' | ')
        doc.font('Helvetica').fontSize(8.5).fillColor(mutedText)
        const contactHeight = doc.heightOfString(contactLine, { width: compWidth })
        doc.text(contactLine, textX, companyY, { width: compWidth })
        companyY += contactHeight + 3
      }

      if (data.settings.gstin || data.settings.panNumber) {
        const taxIds = [
          data.settings.gstin ? `GSTIN: ${data.settings.gstin}` : null,
          data.settings.panNumber ? `PAN: ${data.settings.panNumber}` : null,
        ]
          .filter(Boolean)
          .join(' | ')
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor(darkText)
        const taxHeight = doc.heightOfString(taxIds, { width: compWidth })
        doc.text(taxIds, textX, companyY, { width: compWidth })
        companyY += taxHeight + 4
      }

      const finalCompanyY = Math.max(companyY, logoYBottom)

      // Divider Line between Header and Bill To
      const billSectionY = Math.max(finalCompanyY + 14, invY + 10)
      doc.moveTo(40, billSectionY).lineTo(555, billSectionY).strokeColor(borderColor).stroke()

      // ==========================================
      // 2. BILL TO SECTION
      // ==========================================
      const colWidth = 248
      const colGap = 19
      const billY = billSectionY + 12
      const billBoxHeight = 78

      // Bill To Column
      doc.rect(40, billY, colWidth, billBoxHeight).fillAndStroke(lightBg, borderColor)
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(accent).text('BILLED TO', 52, billY + 8)
      doc.font('Helvetica-Bold').fontSize(10.5).fillColor(darkText).text(data.customer?.companyName || 'Valued Customer', 52, billY + 22, { width: colWidth - 24 })
      
      doc.font('Helvetica').fontSize(8.5).fillColor(mutedText)
      let bLineY = billY + 38
      if (data.customer?.contactPerson) {
        doc.text(`Attn: ${data.customer.contactPerson}`, 52, bLineY, { width: colWidth - 24 })
        bLineY += 12
      }
      const custContact = [data.customer?.email, data.customer?.phone].filter(Boolean).join(' | ')
      if (custContact) {
        doc.text(custContact, 52, bLineY, { width: colWidth - 24 })
      }

      // Address Column
      const rightBillX = 40 + colWidth + colGap
      doc.rect(rightBillX, billY, colWidth, billBoxHeight).fillAndStroke(lightBg, borderColor)
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(accent).text('BILLING ADDRESS', rightBillX + 12, billY + 8)
      doc.font('Helvetica').fontSize(8.5).fillColor(darkText)

      let addressText = data.customer?.address?.trim()
      if (!addressText || addressText === 'Registered Office Address') {
        const clientName = data.customer?.companyName || 'Corporate Client'
        const region = [data.settings.city, data.settings.state].filter(Boolean).join(', ') || 'Mohali, Punjab'
        addressText = `${clientName} Corporate Office\nPlot 12, Commercial Hub, ${region}, India`
      }

      doc.text(addressText, rightBillX + 12, billY + 22, { width: colWidth - 24, height: 48, lineGap: 1.5 })

      // ==========================================
      // 3. LINE ITEMS TABLE
      // ==========================================
      const tableTop = billY + billBoxHeight + 14
      
      // Table Header Bar
      doc.rect(40, tableTop, 515, 20).fill(accent)
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#ffffff')
      
      doc.text('ITEM & DESCRIPTION', 48, tableTop + 5, { width: 215 })
      doc.text('QTY', 268, tableTop + 5, { width: 35, align: 'center' })
      doc.text(`RATE (${pdfCurr.label})`, 308, tableTop + 5, { width: 68, align: 'right' })
      doc.text('DISC %', 382, tableTop + 5, { width: 42, align: 'center' })
      doc.text('TAX %', 428, tableTop + 5, { width: 42, align: 'center' })
      doc.text(`TOTAL (${pdfCurr.label})`, 475, tableTop + 5, { width: 72, align: 'right' })

      let itemY = tableTop + 22
      data.items.forEach((item, index) => {
        const rowBg = index % 2 === 0 ? '#ffffff' : '#f8fafc'
        
        doc.font('Helvetica-Bold').fontSize(8.5)
        const nameHeight = doc.heightOfString(item.itemName, { width: 215 })
        let descHeight = 0
        if (item.description && item.description.trim()) {
          doc.font('Helvetica').fontSize(7.5)
          descHeight = doc.heightOfString(item.description.trim(), { width: 215 }) + 1
        }
        const rowHeight = Math.max(26, nameHeight + descHeight + 10)

        doc.rect(40, itemY, 515, rowHeight).fill(rowBg)
        doc.moveTo(40, itemY + rowHeight).lineTo(555, itemY + rowHeight).strokeColor(borderColor).stroke()

        // Name & Description
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor(darkText)
        doc.text(item.itemName, 48, itemY + 5, { width: 215 })
        if (item.description && item.description.trim()) {
          doc.font('Helvetica').fontSize(7.5).fillColor(mutedText)
          doc.text(item.description.trim(), 48, itemY + 5 + nameHeight + 1, { width: 215 })
        }

        const midY = itemY + 6
        doc.font('Helvetica').fontSize(8).fillColor(mutedText)
        doc.text(item.quantity.toString(), 268, midY, { width: 35, align: 'center' })
        
        doc.font('Helvetica').fontSize(8.5).fillColor(darkText)
        doc.text(item.unitPrice.toLocaleString(pdfCurr.locale, { minimumFractionDigits: 2 }), 308, midY, {
          width: 68,
          align: 'right',
        })
        
        doc.text(`${item.discountPercent}%`, 382, midY, { width: 42, align: 'center' })
        doc.text(`${item.taxPercent}%`, 428, midY, { width: 42, align: 'center' })
        doc.font('Helvetica-Bold').text(item.lineTotal.toLocaleString(pdfCurr.locale, { minimumFractionDigits: 2 }), 475, midY, {
          width: 72,
          align: 'right',
        })

        itemY += rowHeight
      })

      // ==========================================
      // 4. TOTALS & BANK / PAYMENT SUMMARY
      // ==========================================
      const summaryTop = itemY + 14

      // Left Box: Bank Details & UPI
      const bankWidth = 265
      const bankHeight = 118
      doc.rect(40, summaryTop, bankWidth, bankHeight).fillAndStroke(lightBg, borderColor)
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(accent).text('BANK PAYMENT INSTRUCTIONS', 52, summaryTop + 8)

      let bDetailsY = summaryTop + 24
      const addBankRow = (label: string, value?: string | null) => {
        if (!value) return
        doc.font('Helvetica-Bold').fontSize(8).fillColor(mutedText).text(label, 52, bDetailsY, { width: 85 })
        doc.font('Helvetica').fontSize(8).fillColor(darkText).text(value, 138, bDetailsY, { width: 160 })
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
      const totX = 325
      const valX = 445
      const valWidth = 100
      let tY = summaryTop + 4

      const addTotalRow = (label: string, amount: number, isBold = false, isAccent = false) => {
        doc
          .font(isBold ? 'Helvetica-Bold' : 'Helvetica')
          .fontSize(isBold ? 9 : 8.5)
          .fillColor(isAccent ? accent : isBold ? darkText : mutedText)
          .text(label, totX, tY, { width: 120 })

        doc
          .font(isBold ? 'Helvetica-Bold' : 'Helvetica')
          .fontSize(isBold ? 9 : 8.5)
          .fillColor(isAccent ? accent : darkText)
          .text(`${pdfCurr.label} ${amount.toLocaleString(pdfCurr.locale, { minimumFractionDigits: 2 })}`, valX, tY, {
            width: valWidth,
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
      doc.rect(totX - 10, tY - 4, 240, 26).fill(accent)
      doc.font('Helvetica-Bold').fontSize(10.5).fillColor('#ffffff').text(`TOTAL AMOUNT (${pdfCurr.code}):`, totX, tY + 4)
      doc.font('Helvetica-Bold').fontSize(10.5).fillColor('#ffffff').text(
        `${pdfCurr.label} ${data.grandTotal.toLocaleString(pdfCurr.locale, { minimumFractionDigits: 2 })}`,
        valX,
        tY + 4,
        { width: valWidth, align: 'right' }
      )
      tY += 30

      if (data.amountPaid > 0) {
        addTotalRow('Amount Paid:', data.amountPaid)
        addTotalRow('Balance Due:', data.amountDue, true, true)
      }

      // ==========================================
      // 5. NOTES, TERMS & SIGNATURE
      // ==========================================
      const footerY = Math.max(summaryTop + bankHeight + 18, tY + 16)

      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(darkText).text('Terms & Conditions:', 40, footerY)

      const rawTerms =
        data.terms ||
        data.settings.defaultTerms ||
        '• Payment is due within 15 days of invoice date.\n• Please quote the invoice number when making electronic transfer.\n• All disputes are subject to local jurisdiction.'

      const termsList = parseTermsList(rawTerms)
      let termsY = footerY + 13
      doc.font('Helvetica').fontSize(7.5).fillColor(darkText)

      termsList.forEach((term) => {
        const clean = cleanTermClause(term)
        const lineText = `•   ${clean}`
        const itemHeight = doc.heightOfString(lineText, { width: 330 })
        doc.text(lineText, 40, termsY, { width: 330 })
        termsY += itemHeight + 3
      })

      const notesY = Math.max(termsY + 6, footerY + 45)
      if (data.notes) {
        const noteText = data.notes
        doc.font('Helvetica').fontSize(7.5)
        const noteTextHeight = doc.heightOfString(noteText, { width: 320 })
        const noteBoxHeight = Math.max(24, noteTextHeight + 14)

        doc.rect(40, notesY, 340, noteBoxHeight).fillAndStroke('#f8fafc', borderColor)
        doc.rect(40, notesY, 3, noteBoxHeight).fill(accent)
        doc.font('Helvetica-Bold').fontSize(7).fillColor(darkText).text('NOTE:', 48, notesY + 3)
        doc.font('Helvetica').fontSize(7).fillColor(mutedText).text(noteText, 48, notesY + 12, { width: 320 })
      }

      // Authorized Signatory
      const signX = 395
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(darkText).text(
        `For ${data.settings.companyName || 'Vibrantick Infotech Solutions'}`,
        signX,
        footerY,
        { width: 160, align: 'center' }
      )
      doc.moveTo(signX + 15, footerY + 50).lineTo(signX + 145, footerY + 50).strokeColor(borderColor).stroke()
      doc.font('Helvetica').fontSize(7.5).fillColor(mutedText).text('Authorized Signatory', signX, footerY + 54, {
        width: 160,
        align: 'center',
      })

      doc.end()
    } catch (err) {
      reject(err)
    }
  })
}
