import PDFDocument from 'pdfkit'
import fs from 'fs'
import path from 'path'

function resolveAssetBuffer(filename: string): Buffer | null {
  const candidates = [
    path.resolve(process.cwd(), 'backend/assets', filename),
    path.resolve(process.cwd(), 'assets', filename),
    typeof __dirname !== 'undefined' ? path.resolve(__dirname, '../../../../backend/assets', filename) : '',
    typeof __dirname !== 'undefined' ? path.resolve(__dirname, '../../../../assets', filename) : '',
    typeof __dirname !== 'undefined' ? path.resolve(__dirname, '../../../assets', filename) : '',
    typeof __dirname !== 'undefined' ? path.resolve(__dirname, '../../assets', filename) : '',
    typeof __dirname !== 'undefined' ? path.resolve(__dirname, '../assets', filename) : '',
    path.resolve('/home/gabrialdeora/Desktop/New VIS PROJECT FOLDER/sales-crm/backend/assets', filename),
    path.resolve('/home/gabrialdeora/Desktop/New VIS PROJECT FOLDER/sales-crm/dashboard/public/logo', filename),
  ].filter(Boolean)

  for (const c of candidates) {
    try {
      if (fs.existsSync(c)) {
        return fs.readFileSync(c)
      }
    } catch {}
  }
  return null
}

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

    // Default template logo candidate: vis-logo.png
    const visLogo = resolveAssetBuffer('vis-logo.png')
    if (visLogo) return visLogo

    // Default fallback logo candidates in workspace
    const defaultCandidates = [
      path.resolve(process.cwd(), '../dashboard/public/favicon/favicon.png'),
      path.resolve(process.cwd(), 'dashboard/public/favicon/favicon.png'),
      '/home/gabrialdeora/Desktop/New VIS PROJECT FOLDER/sales-crm/dashboard/public/favicon/favicon.png',
      path.resolve(process.cwd(), 'assets/default-logo.png'),
      path.resolve(process.cwd(), 'backend/assets/default-logo.png'),
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

export function numberToWords(num: number, currency: string = 'INR'): string {
  if (isNaN(num) || num <= 0) return 'Zero Only'

  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ]
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

  function convertUnderThousand(n: number): string {
    let str = ''
    if (n >= 100) {
      str += ones[Math.floor(n / 100)] + ' Hundred '
      n %= 100
    }
    if (n >= 20) {
      str += tens[Math.floor(n / 10)] + ' '
      n %= 10
    }
    if (n > 0) {
      str += ones[n] + ' '
    }
    return str.trim()
  }

  const rounded = Math.round(num * 100) / 100
  const integerPart = Math.floor(rounded)
  const decimalPart = Math.round((rounded - integerPart) * 100)

  let words = ''
  if (currency.toUpperCase() === 'INR') {
    const crore = Math.floor(integerPart / 10000000)
    const lakh = Math.floor((integerPart % 10000000) / 100000)
    const thousand = Math.floor((integerPart % 100000) / 1000)
    const remainder = integerPart % 1000

    if (crore > 0) words += convertUnderThousand(crore) + ' Crore '
    if (lakh > 0) words += convertUnderThousand(lakh) + ' Lakh '
    if (thousand > 0) words += convertUnderThousand(thousand) + ' Thousand '
    if (remainder > 0) words += convertUnderThousand(remainder) + ' '
  } else {
    const billion = Math.floor(integerPart / 1000000000)
    const million = Math.floor((integerPart % 1000000000) / 1000000)
    const thousand = Math.floor((integerPart % 1000000) / 1000)
    const remainder = integerPart % 1000

    if (billion > 0) words += convertUnderThousand(billion) + ' Billion '
    if (million > 0) words += convertUnderThousand(million) + ' Million '
    if (thousand > 0) words += convertUnderThousand(thousand) + ' Thousand '
    if (remainder > 0) words += convertUnderThousand(remainder) + ' '
  }

  words = words.trim() || 'Zero'

  const subUnit = currency.toUpperCase() === 'INR' ? 'Paise' : 'Cents'
  if (decimalPart > 0) {
    const decWords = convertUnderThousand(decimalPart)
    return `${words} and ${decWords} ${subUnit} Only`
  }

  return `${words} Only`
}

function formatInvoiceDate(d: Date | string): string {
  const date = new Date(d)
  if (isNaN(date.getTime())) return String(d)
  const day = String(date.getDate()).padStart(2, '0')
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const month = months[date.getMonth()]
  const year = date.getFullYear()
  return `${day}-${month}-${year}`
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
    hsnCode?: string | null
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
    defaultNotes?: string | null
    defaultTerms?: string | null
  }
}

export function resolveOrderNotice(
  terms?: string | null,
  defaultTerms?: string | null,
  companyName?: string | null
): string {
  const candidates = [terms, defaultTerms].filter(Boolean) as string[]

  for (const cand of candidates) {
    const lines = cand
      .split('\n')
      .map((l) => l.replace(/^[•\s\d.-]+/, '').trim())
      .filter(Boolean)

    const matched = lines.find((l) =>
      /^order to be placed/i.test(l) || /^in favor of/i.test(l)
    )
    if (matched) {
      return matched
    }
  }

  const companyUpper = (companyName || 'Vibrantick Infotech Solutions').toUpperCase()
  return `Order to be Placed - In favor of ${companyUpper}`
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
  const msmeBadgeBuffer = resolveAssetBuffer('msme-iso-badge.png')
  const authSignatoryBuffer = resolveAssetBuffer('auth-signatory.png')

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        margins: { top: 40, bottom: 25, left: 40, right: 40 },
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
      const borderColor = '#cbd5e1'
      const pdfCurr = getPdfCurrency(data.currency)

      // ==========================================
      // 1. HEADER SECTION (Brand & Invoice Badge)
      // ==========================================
      const headerTop = 40

      // Top-Left: Company Logo
      if (logoBuffer) {
        try {
          doc.image(logoBuffer, 40, headerTop, { fit: [160, 44] })
        } catch (imgErr) {
          console.warn('[InvoicePdf] doc.image logo error:', imgErr)
          doc.font('Helvetica-Bold').fontSize(16).fillColor(darkText).text(data.settings.companyName || 'Vibrantick Infotech Solutions', 40, headerTop)
        }
      } else {
        doc.font('Helvetica-Bold').fontSize(16).fillColor(darkText).text(data.settings.companyName || 'Vibrantick Infotech Solutions', 40, headerTop)
      }

      // Directly below Logo: Invoice No: VIS/...
      doc
        .font('Helvetica-Bold')
        .fontSize(9)
        .fillColor(darkText)
        .text('Invoice No: ', 40, headerTop + 52, { continued: true })
        .font('Helvetica')
        .text(data.invoiceNumber)

      // Top-Right: MSME & ISO Certification Badge
      if (msmeBadgeBuffer) {
        try {
          doc.image(msmeBadgeBuffer, 425, headerTop, { fit: [130, 48] })
        } catch (bErr) {
          console.warn('[InvoicePdf] doc.image msme badge error:', bErr)
        }
      }

      // Right Column Metadata: GSTIN, Date
      const rightMetaX = 375
      const rightMetaWidth = 180
      let metaY = headerTop + 52

      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(darkText)
      doc.text(`GSTIN- ${data.settings.gstin || '03BINPR6900A1ZK'}`, rightMetaX, metaY, { width: rightMetaWidth, align: 'right' })
      metaY += 12

      doc.font('Helvetica').fontSize(8.5).fillColor(darkText)
      doc.text(`Date: ${formatInvoiceDate(data.issueDate)}`, rightMetaX, metaY, { width: rightMetaWidth, align: 'right' })
      metaY += 14

      // Divider Line between Header and Bill To
      const billSectionY = Math.max(headerTop + 68, metaY)
      doc.moveTo(40, billSectionY).lineTo(555, billSectionY).strokeColor('#e2e8f0').lineWidth(0.75).stroke()

      // ==========================================
      // 2. CLIENT INFO & INVOICE TIMELINE (Matching Webview)
      // ==========================================
      const clientTop = billSectionY + 12

      // Left Column: Billed To (Clean open layout matching webview)
      const leftColX = 40
      const leftColWidth = 280
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#94a3b8').text('BILLED TO', leftColX, clientTop)

      const clientName = data.customer?.companyName || 'Valued Client'
      doc.font('Helvetica-Bold').fontSize(11).fillColor(darkText).text(clientName, leftColX, clientTop + 12, { width: leftColWidth })
      const clientNameHeight = doc.heightOfString(clientName, { width: leftColWidth })

      let clientCursorY = clientTop + 12 + clientNameHeight + 2
      if (data.customer?.contactPerson) {
        doc.font('Helvetica').fontSize(8).fillColor('#475569').text(`Attn: ${data.customer.contactPerson}`, leftColX, clientCursorY, { width: leftColWidth })
        clientCursorY += 11
      }
      if (data.customer?.email) {
        doc.font('Helvetica').fontSize(8).fillColor('#64748b').text(data.customer.email, leftColX, clientCursorY, { width: leftColWidth })
        clientCursorY += 11
      }
      if (data.customer?.phone) {
        doc.font('Helvetica').fontSize(8).fillColor('#64748b').text(data.customer.phone, leftColX, clientCursorY, { width: leftColWidth })
        clientCursorY += 11
      }
      if (data.customer?.address) {
        doc.font('Helvetica').fontSize(7.5).fillColor('#64748b').text(data.customer.address, leftColX, clientCursorY, { width: leftColWidth, lineGap: 1.5 })
        clientCursorY += doc.heightOfString(data.customer.address, { width: leftColWidth, lineGap: 1.5 }) + 2
      }

      // Right Column: Invoice Timeline (Matching Webview)
      const rightTimelineX = 355
      const rightTimelineWidth = 200
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#94a3b8').text('INVOICE TIMELINE', rightTimelineX, clientTop, { width: rightTimelineWidth, align: 'right' })

      let timeY = clientTop + 14
      const addTimelineRow = (label: string, val: string) => {
        doc.font('Helvetica').fontSize(8).fillColor('#64748b').text(`${label}:`, rightTimelineX, timeY, { width: 110, align: 'right' })
        doc.font('Helvetica-Bold').fontSize(8).fillColor(darkText).text(val, rightTimelineX + 115, timeY, { width: 85, align: 'right' })
        timeY += 13
      }
      addTimelineRow('Issue Date', formatInvoiceDate(data.issueDate))
      addTimelineRow('Due Date', formatInvoiceDate(data.dueDate))
      addTimelineRow('GST Tax Mode', data.taxType.replace('_', ' '))

      const clientSectionBottom = Math.max(clientCursorY, timeY) + 6
      doc.moveTo(40, clientSectionBottom).lineTo(555, clientSectionBottom).strokeColor('#f1f5f9').lineWidth(0.75).stroke()

      // ==========================================
      // 3. LINE ITEMS TABLE (Clean Minimalist Matching Webview)
      // ==========================================
      // 3. LINE ITEMS TABLE (Solid Brand Accent Header Bar)
      // ==========================================
      const tableTop = clientSectionBottom + 10
      const tableHeaderHeight = 20

      // Table Header Bar (Original accent background with bold white text)
      doc.rect(40, tableTop, 515, tableHeaderHeight).fill(accent)

      doc.font('Helvetica-Bold').fontSize(8).fillColor('#ffffff')
      doc.text('ITEM & DESCRIPTION', 48, tableTop + 6, { width: 215 })
      doc.text('QTY', 268, tableTop + 6, { width: 35, align: 'center' })
      doc.text(`RATE (${pdfCurr.label})`, 308, tableTop + 6, { width: 68, align: 'right' })
      doc.text('DISC %', 382, tableTop + 6, { width: 42, align: 'center' })
      doc.text('TAX %', 428, tableTop + 6, { width: 42, align: 'center' })
      doc.text(`TOTAL (${pdfCurr.label})`, 475, tableTop + 6, { width: 72, align: 'right' })

      let itemY = tableTop + tableHeaderHeight + 1
      data.items.forEach((item, index) => {
        doc.font('Helvetica-Bold').fontSize(8.5)
        const nameHeight = doc.heightOfString(item.itemName, { width: 195 })
        let descHeight = 0
        if (item.description && item.description.trim()) {
          doc.font('Helvetica').fontSize(7.5)
          descHeight = doc.heightOfString(item.description.trim(), { width: 195 }) + 1
        }
        const rowHeight = Math.max(26, nameHeight + descHeight + 10)

        // Alternating row background
        const rowBg = index % 2 === 0 ? '#ffffff' : '#f8fafc'
        doc.rect(40, itemY, 515, rowHeight).fill(rowBg)
        doc.moveTo(40, itemY + rowHeight).lineTo(555, itemY + rowHeight).strokeColor('#e2e8f0').lineWidth(0.75).stroke()

        // Name & Description (with HSN Code)
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor(darkText)
        const nameText = item.hsnCode?.trim() ? `${item.itemName} (HSN: ${item.hsnCode.trim()})` : item.itemName
        doc.text(nameText, 48, itemY + 5, { width: 215 })
        if (item.description && item.description.trim()) {
          doc.font('Helvetica').fontSize(7.5).fillColor(mutedText)
          doc.text(item.description.trim(), 48, itemY + 5 + nameHeight + 1, { width: 215 })
        }

        const midY = itemY + 6
        doc.font('Helvetica').fontSize(8.5).fillColor(darkText)
        doc.text(item.quantity.toString(), 268, midY, { width: 35, align: 'center' })
        
        doc.text(item.unitPrice.toLocaleString(pdfCurr.locale, { minimumFractionDigits: 2 }), 308, midY, {
          width: 68,
          align: 'right',
        })
        
        doc.font('Helvetica').fontSize(8).fillColor('#64748b')
        doc.text(`${item.discountPercent}%`, 382, midY, { width: 42, align: 'center' })
        doc.text(`${item.taxPercent}%`, 428, midY, { width: 42, align: 'center' })
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor(darkText).text(item.lineTotal.toLocaleString(pdfCurr.locale, { minimumFractionDigits: 2 }), 475, midY, {
          width: 72,
          align: 'right',
        })

        itemY += rowHeight
      })

      // ==========================================
      // 4. TOTALS & SUMMARY FOOTER (Exact Webview Match)
      // ==========================================
      // Anchor summary & signatory proportionally so they sit comfortably above Terms & Instructions
      const summaryTop = Math.max(itemY + 16, 495)

      // Left Column: Thank You Note & Space for Signature (Dynamic Note)
      const leftFootX = 40
      const leftFootWidth = 240
      const isCustomNote =
        Boolean(data.notes &&
        data.notes.trim().length > 0 &&
        data.notes.trim() !== 'Thank you for partnering with Vibrantick Infotech Solutions.' &&
        data.notes.trim() !== 'Thank you and looking forward to a fruitful relationship with our company.')

      const thankYouNote =
        (isCustomNote ? data.notes?.trim() : null) ||
        data.settings.defaultNotes?.trim() ||
        data.notes?.trim() ||
        'Thank you and looking forward to a fruitful relationship with our company.'

      doc
        .font('Helvetica-Oblique')
        .fontSize(8)
        .fillColor('#475569')
        .text(thankYouNote, leftFootX, summaryTop, {
          width: leftFootWidth,
          lineGap: 2,
        })

      const noteHeight = doc.heightOfString(thankYouNote, { width: leftFootWidth, lineGap: 2 })

      // Designated Signature Space (Positioned right above Terms & Instructions)
      const signY = summaryTop + Math.max(noteHeight + 14, 28)
      const signLineY = signY + 38
      doc.dash(3, { space: 3 }).moveTo(leftFootX, signLineY).lineTo(leftFootX + 130, signLineY).strokeColor('#cbd5e1').lineWidth(0.8).stroke().undash()
      
      doc.font('Helvetica-Bold').fontSize(8).fillColor(darkText).text('Auth. Signatory', leftFootX, signLineY + 6)
      doc.font('Helvetica').fontSize(7.5).fillColor('#64748b').text('Rakesh Kumar Rai\nFounder & CEO', leftFootX, signLineY + 18)
      const signBottom = signLineY + 36

      // Right Column: Totals & Tax Calculations
      const totLabelX = 345
      const totValX = 445
      const totValWidth = 110
      let tY = summaryTop

      const addTotalLine = (label: string, valueStr: string, isBold = false) => {
        doc
          .font(isBold ? 'Helvetica-Bold' : 'Helvetica')
          .fontSize(isBold ? 9.5 : 8.5)
          .fillColor(isBold ? darkText : '#475569')
          .text(label, totLabelX, tY, { width: 95 })

        doc
          .font(isBold ? 'Helvetica-Bold' : 'Helvetica')
          .fontSize(isBold ? 9.5 : 8.5)
          .fillColor(darkText)
          .text(valueStr, totValX, tY, { width: totValWidth, align: 'right' })

        tY += 13
      }

      const discPct = data.totalDiscount > 0 && data.subtotal > 0
        ? ((data.totalDiscount / data.subtotal) * 100).toFixed(2)
        : '0.00'

      addTotalLine('Sub Total:', `RS. ${data.subtotal.toLocaleString(pdfCurr.locale, { minimumFractionDigits: 2 })}/-`)
      addTotalLine('Discount:', `${discPct}%`)

      if (data.taxType === 'INTER_STATE') {
        addTotalLine('IGST (18%):', `RS. ${data.taxAmount.toLocaleString(pdfCurr.locale, { minimumFractionDigits: 2 })}`)
      } else {
        const halfTax = data.taxAmount / 2
        addTotalLine('SGST (9%):', `RS. ${halfTax.toLocaleString(pdfCurr.locale, { minimumFractionDigits: 2 })}`)
        addTotalLine('CGST (9%):', `RS. ${halfTax.toLocaleString(pdfCurr.locale, { minimumFractionDigits: 2 })}`)
      }

      // Total Amount line
      doc.moveTo(totLabelX - 5, tY + 2).lineTo(555, tY + 2).strokeColor('#cbd5e1').lineWidth(0.75).stroke()
      tY += 6
      addTotalLine('Total Amount:', `RS. ${data.grandTotal.toLocaleString(pdfCurr.locale, { minimumFractionDigits: 2 })}/-`, true)
      tY += 3

      // Total Amount In Words (Increased by 20% of previous size)
      doc.font('Helvetica-Bold').fontSize(10.8).fillColor('#64748b').text('Total Amount In Words:', totLabelX - 50, tY, { width: 260, align: 'right' })
      tY += 13.5
      const wordsText = numberToWords(data.grandTotal, data.currency)
      doc.font('Helvetica-Bold').fontSize(12).fillColor(darkText).text(wordsText, totLabelX - 50, tY, {
        width: 260,
        align: 'right',
        lineGap: 2,
      })
      const wordsHeight = doc.heightOfString(wordsText, { width: 260, lineGap: 2 })
      tY += wordsHeight + 4

      // Status Stamp (Enlarged & Tilted Rubber Stamp Style)
      const rawStatus = (data.status || 'PAID').toUpperCase()
      const stampText = rawStatus.replace(/_/g, ' ')
      
      let stampColor = '#1d61e7'
      if (rawStatus === 'PAID') stampColor = '#15803d'
      else if (rawStatus === 'DRAFT') stampColor = '#64748b'
      else if (rawStatus === 'OVERDUE' || rawStatus === 'CANCELLED') stampColor = '#dc2626'
      else if (rawStatus === 'PARTIALLY_PAID') stampColor = '#d97706'
      else if (rawStatus === 'ISSUED') stampColor = '#1d61e7'

      const stampWidth = stampText.length > 8 ? 124 : 104
      const stampHeight = 31
      const stampX = 555 - stampWidth
      const stampY = tY + 4
      const centerX = stampX + stampWidth / 2
      const centerY = stampY + stampHeight / 2

      doc.save()
      doc.rotate(-9, { origin: [centerX, centerY] })
      doc.roundedRect(stampX, stampY, stampWidth, stampHeight, 4).lineWidth(2).strokeColor(stampColor).stroke()
      doc.font('Helvetica-Bold').fontSize(14).fillColor(stampColor).text(stampText, stampX, stampY + 8, {
        width: stampWidth,
        align: 'center',
        lineBreak: false,
        characterSpacing: 1.5,
      })
      doc.restore()
      tY += stampHeight + 8

      // ==========================================
      // 5. FOOTER: TERMS & INSTRUCTIONS AND CONTACT (Directly below Auth. Signatory & Totals)
      // ==========================================
      // Terms & Instructions sits right below Auth. Signatory and Totals as a unified footer area
      const sectionTop = Math.max(signBottom + 16, tY + 14)

      // Section Heading: Terms & Instructions (Larger Prominent Size)
      doc.font('Helvetica-Bold').fontSize(13).fillColor(darkText).text('Terms & Instructions', 40, sectionTop)

      // Clean horizontal divider line right below Terms & Instructions across the page
      const sectionLineY = sectionTop + 18
      doc.moveTo(40, sectionLineY).lineTo(555, sectionLineY).strokeColor('#cbd5e1').lineWidth(0.75).stroke()

      // Left Column: Terms & Bank Details (Open layout, fully dynamic)
      let termLineY = sectionLineY + 7
      const orderNotice = resolveOrderNotice(data.terms, data.settings.defaultTerms, data.settings.companyName)
      doc.font('Helvetica').fontSize(8.5).fillColor(darkText).text(orderNotice, 40, termLineY, { width: 310 })
      termLineY += 12

      doc.font('Helvetica-Bold').fontSize(8.8).fillColor(darkText).text('Payment Details -', 40, termLineY)
      termLineY += 11

      const addPayDetail = (label: string, val: string) => {
        doc.font('Helvetica').fontSize(8.2).fillColor(darkText).text(`${label} - ${val}`, 52, termLineY, { width: 298 })
        termLineY += 10.5
      }
      addPayDetail('Name', data.settings.companyName || 'Vibrantick Infotech Solutions')
      addPayDetail('Acc No.', data.settings.bankAccountNo || '50200012345678')
      addPayDetail('IFSC Code', data.settings.bankIfsc || 'HDFC0001234')
      addPayDetail('Bank Name', data.settings.bankName || 'HDFC Bank')
      addPayDetail('Branch Name', data.settings.bankBranch || 'IT Park Branch')

      // Right Column: Contact Details with Icon Badges (Open layout, fully dynamic)
      const contactX = 385
      const textX = contactX + 18
      let contactLineY = sectionLineY + 7

      // Helper to draw square icon badge
      const drawIconBox = (boxX: number, boxY: number) => {
        doc.roundedRect(boxX, boxY, 12, 12, 2).strokeColor('#64748b').lineWidth(0.6).stroke()
      }

      // 1. Phone
      drawIconBox(contactX, contactLineY - 1)
      doc.save()
      doc.lineWidth(1.2).strokeColor('#334155').lineCap('round')
      doc.moveTo(contactX + 3.5, contactLineY + 2.5).lineTo(contactX + 5, contactLineY + 2.5).lineTo(contactX + 4.5, contactLineY + 4.5).lineTo(contactX + 6.5, contactLineY + 6.5).lineTo(contactX + 8.5, contactLineY + 6).lineTo(contactX + 8.5, contactLineY + 7.5)
      doc.stroke()
      doc.restore()
      doc.font('Helvetica').fontSize(8.2).fillColor(darkText).text(data.settings.companyPhone || '+91 8699792040', textX, contactLineY)
      contactLineY += 14

      // 2. Mobile
      drawIconBox(contactX, contactLineY - 1)
      doc.roundedRect(contactX + 3.5, contactLineY + 1.5, 5, 7.5, 1).strokeColor('#334155').lineWidth(0.8).stroke()
      doc.moveTo(contactX + 5, contactLineY + 7).lineTo(contactX + 7, contactLineY + 7).strokeColor('#334155').lineWidth(0.5).stroke()
      doc.font('Helvetica').fontSize(8.2).fillColor(darkText).text(data.settings.whatsappNumber || '8699792040', textX, contactLineY)
      contactLineY += 14

      // 3. Email
      drawIconBox(contactX, contactLineY - 1)
      doc.rect(contactX + 2.5, contactLineY + 2.5, 7.5, 5.5).strokeColor('#334155').lineWidth(0.7).stroke()
      doc.moveTo(contactX + 2.5, contactLineY + 2.5).lineTo(contactX + 6.2, contactLineY + 5.2).lineTo(contactX + 10, contactLineY + 2.5).strokeColor('#334155').lineWidth(0.7).stroke()
      doc.font('Helvetica').fontSize(8.2).fillColor(darkText).text(data.settings.companyEmail || 'info@vibrantick.in', textX, contactLineY)
      contactLineY += 14

      // 4. Address
      const addrLine = [
        data.settings.addressLine1 || 'Prosperity Square, Phase 8b',
        data.settings.city ? (data.settings.city.toLowerCase().includes('sector') ? data.settings.city : `Sector 74, ${data.settings.city}`) : 'Sector 74, Mohali',
        data.settings.state || 'Punjab',
      ].filter(Boolean).join(', ')
      drawIconBox(contactX, contactLineY - 1)
      doc.circle(contactX + 6, contactLineY + 4, 2).strokeColor('#334155').lineWidth(0.7).stroke()
      doc.moveTo(contactX + 4.2, contactLineY + 4.8).lineTo(contactX + 6, contactLineY + 8).lineTo(contactX + 7.8, contactLineY + 4.8).strokeColor('#334155').lineWidth(0.7).stroke()
      doc.font('Helvetica').fontSize(8).fillColor(darkText).text(addrLine, textX, contactLineY, { width: 145, lineGap: 1.5 })
      const addrH = doc.heightOfString(addrLine, { width: 145, lineGap: 1.5 })
      contactLineY += addrH + 4

      // ==========================================
      // 6. TRUE PAGE FOOTER STRIP
      // ==========================================
      const footerDividerY = Math.max(termLineY + 8, contactLineY + 8, 770)
      doc.moveTo(40, footerDividerY).lineTo(555, footerDividerY).strokeColor('#cbd5e1').lineWidth(0.5).stroke()

      doc.font('Helvetica-Bold').fontSize(8).fillColor(darkText).text('www.vibrantick.in', 40, footerDividerY + 4, {
        width: 515,
        align: 'center',
      })
      doc.font('Helvetica').fontSize(6.5).fillColor(mutedText).text(
        'Cyber Security | Web Development | Digital Marketing | Cloud Mgt Services | Mobile Application',
        40,
        footerDividerY + 15,
        { width: 515, align: 'center' }
      )

      doc.end()
    } catch (err) {
      reject(err)
    }
  })
}
