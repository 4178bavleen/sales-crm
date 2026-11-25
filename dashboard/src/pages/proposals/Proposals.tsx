import { useEffect, useState, useCallback, useMemo } from 'react'
import {
  FileCheck,
  Plus,
  Search,
  RotateCw,
  Trash2,
  Pencil,
  X,
  Building2,
  Send,
  Printer,
  TrendingUp,
  Percent,
  Eye,
  FileText,
  Clock,
  Tag,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react'
import StatCard from '../../components/ui/StatCard'
import { useSession } from '../../lib/useSession'
import {
  fetchProposals,
  fetchProposalStats,
  fetchProposalOptions,
  createProposal,
  updateProposal,
  updateProposalStatus,
  submitProposalForApproval,
  approveProposal,
  requestProposalChanges,
  sendProposal,
  deleteProposal,
} from '../../lib/proposals'
import type {
  Proposal,
  ProposalStats,
  ProposalOptions,
  ProposalStatus,
  DiscountType,
} from '../../types/proposal'

const CURRENCIES = [{ code: 'INR', symbol: '₹', name: 'Indian Rupee' }]

export default function Proposals() {
  const session = useSession()
  const isAdmin = session?.user?.role?.toUpperCase() === 'ADMIN'

  const [proposals, setProposals] = useState<Proposal[]>([])
  const [stats, setStats] = useState<ProposalStats>({
    totalCount: 0,
    totalValue: 0,
    draftCount: 0,
    draftValue: 0,
    pendingApprovalCount: 0,
    pendingApprovalValue: 0,
    approvedCount: 0,
    approvedValue: 0,
    sentCount: 0,
    sentValue: 0,
    underReviewCount: 0,
    underReviewValue: 0,
    acceptedCount: 0,
    acceptedValue: 0,
    rejectedCount: 0,
    rejectedValue: 0,
    expiredCount: 0,
    expiredValue: 0,
    acceptanceRate: 0,
  })
  const [options, setOptions] = useState<ProposalOptions | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Filters & Pagination
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [totalCount, setTotalCount] = useState(0)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | ProposalStatus>('ALL')
  const [customerFilter, setCustomerFilter] = useState<string>('ALL')

  // Modals
  const [formModalOpen, setFormModalOpen] = useState(false)
  const [previewModalOpen, setPreviewModalOpen] = useState(false)
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [approvalModalOpen, setApprovalModalOpen] = useState(false)
  const [approvalAction, setApprovalAction] = useState<'approve' | 'changes'>('approve')
  const [approvalNote, setApprovalNote] = useState('')
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Selected Proposal for preview / edit / status
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')

  // Form State
  const [formTitle, setFormTitle] = useState('')
  const [formProposalNumber, setFormProposalNumber] = useState('')
  const [formCustomerId, setFormCustomerId] = useState<number | ''>('')
  const [formDealId, setFormDealId] = useState<number | ''>('')
  const [formOwnerId, setFormOwnerId] = useState<number | ''>('')
  const [formCurrency, setFormCurrency] = useState('INR')
  const [formIssueDate, setFormIssueDate] = useState(() => new Date().toISOString().split('T')[0])
  const [formValidUntil, setFormValidUntil] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 30)
    return d.toISOString().split('T')[0]
  })
  const [formDiscountType, setFormDiscountType] = useState<DiscountType>('PERCENTAGE')
  const [formDiscountValue, setFormDiscountValue] = useState<number>(0)
  const [formTaxRate, setFormTaxRate] = useState<number>(0)
  const [formSummary, setFormSummary] = useState('')
  const [formTerms, setFormTerms] = useState(
    '1. Prices are valid for 30 days from the date of issue.\n2. Payment terms: 50% upfront deposit upon acceptance, 50% upon final delivery/completion.\n3. Implementation and milestone timelines commence upon initial deposit receipt.'
  )
  const [formClientNotes, setFormClientNotes] = useState('')
  const [formItems, setFormItems] = useState<
    Array<{
      id?: number
      productServiceId?: number | null
      title: string
      description: string
      quantity: number
      unitPrice: number
      discountPercent: number
      taxRate: number
      total: number
    }>
  >([
    {
      title: '',
      description: '',
      quantity: 1,
      unitPrice: 0,
      discountPercent: 0,
      taxRate: 0,
      total: 0,
    },
  ])

  // Load Data
  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setError(null)

    try {
      const [listRes, statsRes, optsRes] = await Promise.allSettled([
        fetchProposals({
          page,
          limit,
          search: search.trim() || undefined,
          status: statusFilter,
          customerId: customerFilter !== 'ALL' ? Number(customerFilter) : undefined,
        }),
        fetchProposalStats(),
        fetchProposalOptions(),
      ])

      if (listRes.status === 'fulfilled') {
        setProposals(listRes.value.proposals)
        setTotalCount(listRes.value.pagination.total)
      } else {
        setError(listRes.reason?.message || 'Failed to fetch proposals')
      }

      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value)
      }

      if (optsRes.status === 'fulfilled') {
        setOptions(optsRes.value)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred while loading proposals')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [page, limit, search, statusFilter, customerFilter])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Computed Form Totals
  const formTotals = useMemo(() => {
    let subtotal = 0
    formItems.forEach((item) => {
      const gross = (Number(item.quantity) || 1) * (Number(item.unitPrice) || 0)
      const disc = gross * ((Number(item.discountPercent) || 0) / 100)
      subtotal += Math.max(0, gross - disc)
    })

    let discountAmount = 0
    if (formDiscountType === 'PERCENTAGE') {
      discountAmount = subtotal * ((Number(formDiscountValue) || 0) / 100)
    } else {
      discountAmount = Math.min(subtotal, Number(formDiscountValue) || 0)
    }

    const taxableAmount = Math.max(0, subtotal - discountAmount)
    const taxAmount = taxableAmount * ((Number(formTaxRate) || 0) / 100)
    const grandTotal = taxableAmount + taxAmount

    return {
      subtotal: Number(subtotal.toFixed(2)),
      discountAmount: Number(discountAmount.toFixed(2)),
      taxAmount: Number(taxAmount.toFixed(2)),
      grandTotal: Number(grandTotal.toFixed(2)),
    }
  }, [formItems, formDiscountType, formDiscountValue, formTaxRate])

  // Open Create Form
  const openCreateForm = () => {
    setIsEditing(false)
    setSelectedProposal(null)
    setFormTitle('')
    setFormProposalNumber('')
    setFormCustomerId('')
    setFormDealId('')
    setFormOwnerId('')
    setFormCurrency('INR')
    setFormIssueDate(new Date().toISOString().split('T')[0])
    const d = new Date()
    d.setDate(d.getDate() + 30)
    setFormValidUntil(d.toISOString().split('T')[0])
    setFormDiscountType('PERCENTAGE')
    setFormDiscountValue(0)
    setFormTaxRate(0)
    setFormSummary('')
    setFormTerms(
      '1. Prices are valid for 30 days from the date of issue.\n2. Payment terms: 50% upfront deposit upon acceptance, 50% upon final delivery/completion.\n3. Implementation and milestone timelines commence upon initial deposit receipt.'
    )
    setFormClientNotes('')
    setFormItems([
      {
        title: '',
        description: '',
        quantity: 1,
        unitPrice: 0,
        discountPercent: 0,
        taxRate: 0,
        total: 0,
      },
    ])
    setFormModalOpen(true)
  }

  // Open Edit Form
  const openEditForm = (prop: Proposal) => {
    setIsEditing(true)
    setSelectedProposal(prop)
    setFormTitle(prop.title)
    setFormProposalNumber(prop.proposalNumber)
    setFormCustomerId(prop.customerId)
    setFormDealId(prop.dealId || '')
    setFormOwnerId(prop.ownerId)
    setFormCurrency('INR')
    setFormIssueDate(prop.issueDate ? prop.issueDate.split('T')[0] : '')
    setFormValidUntil(prop.validUntil ? prop.validUntil.split('T')[0] : '')
    setFormDiscountType(prop.discountType)
    setFormDiscountValue(Number(prop.discountValue) || 0)
    setFormTaxRate(Number(prop.taxRate) || 0)
    setFormSummary(prop.summary || '')
    setFormTerms(prop.terms || '')
    setFormClientNotes(prop.clientNotes || '')
    setFormItems(
      prop.items && prop.items.length > 0
        ? prop.items.map((it) => ({
            id: it.id,
            productServiceId: it.productServiceId || null,
            title: it.title,
            description: it.description || '',
            quantity: Number(it.quantity) || 1,
            unitPrice: Number(it.unitPrice) || 0,
            discountPercent: Number(it.discountPercent) || 0,
            taxRate: Number(it.taxRate) || 0,
            total: Number(it.total) || 0,
          }))
        : [
            {
              title: '',
              description: '',
              quantity: 1,
              unitPrice: 0,
              discountPercent: 0,
              taxRate: 0,
              total: 0,
            },
          ]
    )
    setFormModalOpen(true)
  }

  // Handle Form Item Change
  const updateFormItem = (
    index: number,
    field: string,
    val: string | number | null
  ) => {
    setFormItems((prev) => {
      const updated = [...prev]
      const current = { ...updated[index], [field]: val }

      if (field === 'productServiceId' && val) {
        const prod = options?.productsServices.find((p) => p.id === Number(val))
        if (prod) {
          current.title = prod.name
          if (prod.description && !current.description) {
            current.description = prod.description
          }
        }
      }

      const gross = (Number(current.quantity) || 1) * (Number(current.unitPrice) || 0)
      const disc = gross * ((Number(current.discountPercent) || 0) / 100)
      current.total = Math.max(0, gross - disc)

      updated[index] = current
      return updated
    })
  }

  const addFormItem = () => {
    setFormItems((prev) => [
      ...prev,
      {
        title: '',
        description: '',
        quantity: 1,
        unitPrice: 0,
        discountPercent: 0,
        taxRate: 0,
        total: 0,
      },
    ])
  }

  const removeFormItem = (idx: number) => {
    if (formItems.length === 1) return
    setFormItems((prev) => prev.filter((_, i) => i !== idx))
  }

  // Submit Form (Create / Edit)
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formTitle.trim()) {
      alert('Please enter a proposal title')
      return
    }
    if (!formCustomerId) {
      alert('Please select a customer')
      return
    }
    if (!formValidUntil) {
      alert('Please specify the validity date')
      return
    }
    const hasInvalidItem = formItems.some((it) => !it.title.trim())
    if (hasInvalidItem) {
      alert('Every proposal line item must have a title')
      return
    }

    setIsSubmitting(true)
    try {
      const payload = {
        title: formTitle.trim(),
        proposalNumber: formProposalNumber.trim() || undefined,
        customerId: Number(formCustomerId),
        dealId: formDealId ? Number(formDealId) : null,
        ownerId: formOwnerId ? Number(formOwnerId) : undefined,
        currency: formCurrency,
        issueDate: formIssueDate,
        validUntil: formValidUntil,
        discountType: formDiscountType,
        discountValue: Number(formDiscountValue) || 0,
        taxRate: Number(formTaxRate) || 0,
        summary: formSummary.trim() || null,
        terms: formTerms.trim() || null,
        clientNotes: formClientNotes.trim() || null,
        items: formItems.map((it, idx) => ({
          id: it.id,
          productServiceId: it.productServiceId ? Number(it.productServiceId) : null,
          title: it.title.trim(),
          description: it.description?.trim() || null,
          quantity: Number(it.quantity) || 1,
          unitPrice: Number(it.unitPrice) || 0,
          discountPercent: Number(it.discountPercent) || 0,
          taxRate: Number(it.taxRate) || 0,
          position: idx,
        })),
      }

      if (isEditing && selectedProposal) {
        await updateProposal(selectedProposal.id, payload)
      } else {
        await createProposal(payload)
      }

      setFormModalOpen(false)
      loadData(true)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to save proposal')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Status Actions
  const handleMarkSent = async (proposalId: number) => {
    try {
      await sendProposal(proposalId)
      loadData(true)
      if (selectedProposal && selectedProposal.id === proposalId) {
        setSelectedProposal((prev) => (prev ? { ...prev, status: 'SENT', sentAt: new Date().toISOString() } : null))
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to mark as sent')
    }
  }

  const handleSubmitForApproval = async (proposalId: number) => {
    try {
      const updated = await submitProposalForApproval(proposalId)
      setSelectedProposal((prev) => (prev?.id === proposalId ? updated : prev))
      loadData(true)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to submit proposal for approval')
    }
  }

  const handleOpenApprovalModal = (prop: Proposal, action: 'approve' | 'changes') => {
    setSelectedProposal(prop)
    setApprovalAction(action)
    setApprovalNote('')
    setApprovalModalOpen(true)
  }

  const handleConfirmApproval = async () => {
    if (!selectedProposal) return
    try {
      const note = approvalNote.trim() || undefined
      const updated =
        approvalAction === 'approve'
          ? await approveProposal(selectedProposal.id, note)
          : await requestProposalChanges(selectedProposal.id, note)
      setApprovalModalOpen(false)
      setSelectedProposal(updated)
      loadData(true)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to review proposal')
    }
  }

  const handleMarkAccepted = async (proposalId: number) => {
    try {
      await updateProposalStatus(proposalId, 'ACCEPTED')
      loadData(true)
      if (selectedProposal && selectedProposal.id === proposalId) {
        setSelectedProposal((prev) => (prev ? { ...prev, status: 'ACCEPTED', acceptedAt: new Date().toISOString() } : null))
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to accept proposal')
    }
  }

  const handleOpenReject = (prop: Proposal) => {
    setSelectedProposal(prop)
    setRejectionReason('')
    setRejectModalOpen(true)
  }

  const handleConfirmReject = async () => {
    if (!selectedProposal) return
    try {
      await updateProposalStatus(selectedProposal.id, 'REJECTED', rejectionReason.trim())
      setRejectModalOpen(false)
      loadData(true)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to reject proposal')
    }
  }

  const handleDelete = async () => {
    if (!selectedProposal) return
    try {
      await deleteProposal(selectedProposal.id)
      setDeleteModalOpen(false)
      setSelectedProposal(null)
      loadData(true)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete proposal')
    }
  }

  // Format Currency
  const formatCurrency = (amt: number | string, _curr = 'INR') => {
    const val = Number(amt) || 0
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(val)
  }

  // Status Badge Component
  const renderStatusBadge = (status: ProposalStatus) => {
    switch (status) {
      case 'DRAFT':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
            Draft
          </span>
        )
      case 'PENDING_APPROVAL':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-200">
            <Clock size={11} />
            Pending Approval
          </span>
        )
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <ShieldCheck size={11} />
            Approved
          </span>
        )
      case 'SENT':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
            Sent
          </span>
        )
      case 'UNDER_REVIEW':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            In Review
          </span>
        )
      case 'ACCEPTED':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Accepted
          </span>
        )
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
            Rejected
          </span>
        )
      case 'EXPIRED':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-red-50 text-red-600 border border-red-200">
            <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
            Expired
          </span>
        )
      default:
        return null
    }
  }

  // Validity status helper
  const getValidityMeta = (validUntilStr: string, status: ProposalStatus) => {
    if (status === 'ACCEPTED' || status === 'REJECTED') return null
    const validUntil = new Date(validUntilStr)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    validUntil.setHours(0, 0, 0, 0)

    const diffTime = validUntil.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 0) {
      return { text: 'Expired', color: 'text-red-600 bg-red-50 border-red-200' }
    } else if (diffDays === 0) {
      return { text: 'Expires today', color: 'text-amber-700 bg-amber-50 border-amber-200' }
    } else if (diffDays <= 3) {
      return { text: `${diffDays}d remaining`, color: 'text-amber-700 bg-amber-50 border-amber-200' }
    }
    return null
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <FileCheck className="h-7 w-7 text-blue-600" />
            Customer Proposals
          </h1>
          <p className="text-xs font-medium text-slate-500 mt-1">
            Create, track, and manage commercial proposals and quotations for customers.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
          >
            <RotateCw size={14} className={refreshing ? 'animate-spin text-blue-600' : 'text-slate-500'} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={openCreateForm}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition cursor-pointer"
          >
            <Plus size={16} />
            <span>Create Proposal</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <StatCard
          label="Total Proposals"
          value={stats.totalCount}
          subtext={`Value: ${formatCurrency(stats.totalValue)}`}
          icon={FileText}
          color="blue"
        />
        <StatCard
          label="Draft Proposals"
          value={stats.draftCount}
          subtext={`Value: ${formatCurrency(stats.draftValue)}`}
          icon={Clock}
          color="sky"
        />
        <StatCard
          label="Awaiting Approval"
          value={stats.pendingApprovalCount}
          subtext={`${stats.approvedCount} approved · ${formatCurrency(stats.pendingApprovalValue)}`}
          icon={ShieldCheck}
          color="indigo"
        />
        <StatCard
          label="Sent & In Review"
          value={stats.sentCount + stats.underReviewCount}
          subtext={`Value: ${formatCurrency(stats.sentValue + stats.underReviewValue)}`}
          icon={Send}
          color="amber"
        />
        <StatCard
          label="Accepted (Won)"
          value={stats.acceptedCount}
          subtext={`Won: ${formatCurrency(stats.acceptedValue)}`}
          icon={TrendingUp}
          color="emerald"
        />
        <StatCard
          label="Acceptance Rate"
          value={`${stats.acceptanceRate}%`}
          subtext={`${stats.rejectedCount} rejected / ${stats.expiredCount} expired`}
          icon={Percent}
          color="purple"
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {/* Search Input */}
          <div className="relative min-w-[220px] max-w-sm flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by proposal #, title, customer, or contact..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-8 py-1.5 text-xs font-medium text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('')
                  setPage(1)
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as 'ALL' | ProposalStatus)
                setPage(1)
              }}
              className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none hover:bg-slate-50 cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="PENDING_APPROVAL">Pending Approval</option>
              <option value="APPROVED">Approved</option>
              <option value="SENT">Sent</option>
              <option value="UNDER_REVIEW">In Review</option>
              <option value="ACCEPTED">Accepted</option>
              <option value="REJECTED">Rejected</option>
              <option value="EXPIRED">Expired</option>
            </select>
          </div>

          {/* Customer Filter */}
          {options && options.customers.length > 0 && (
            <div className="relative">
              <select
                value={customerFilter}
                onChange={(e) => {
                  setCustomerFilter(e.target.value)
                  setPage(1)
                }}
                className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none hover:bg-slate-50 cursor-pointer max-w-[200px] truncate"
              >
                <option value="ALL">All Customers</option>
                {options.customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company?.name || c.primaryContact?.fullName || `Customer #${c.id}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Reset button if filtered */}
          {(search || statusFilter !== 'ALL' || customerFilter !== 'ALL') && (
            <button
              type="button"
              onClick={() => {
                setSearch('')
                setStatusFilter('ALL')
                setCustomerFilter('ALL')
                setPage(1)
              }}
              className="inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 transition cursor-pointer"
            >
              <X size={13} />
              <span>Clear filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
        {loading && proposals.length === 0 ? (
          <div className="flex h-64 items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <RotateCw className="h-6 w-6 animate-spin text-blue-600" />
              <p className="text-xs font-medium text-slate-500">Loading customer proposals...</p>
            </div>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-sm font-semibold text-rose-600">{error}</p>
            <button
              type="button"
              onClick={() => loadData(true)}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
            >
              Retry
            </button>
          </div>
        ) : proposals.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 mb-3">
              <FileCheck size={28} />
            </div>
            <h3 className="text-sm font-bold text-slate-900">No proposals found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Create commercial proposals and quotations to send to your customers and track their acceptance.
            </p>
            <button
              type="button"
              onClick={openCreateForm}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition"
            >
              <Plus size={15} />
              <span>Create First Proposal</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Proposal # & Title</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Deal</th>
                  <th className="px-4 py-3">Grand Total</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Valid Until</th>
                  <th className="px-4 py-3">Owner</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {proposals.map((prop) => {
                  const validityMeta = getValidityMeta(prop.validUntil, prop.status)
                  const customerName =
                    prop.customer?.company?.name ||
                    prop.customer?.primaryContact?.fullName ||
                    `Customer #${prop.customerId}`

                  return (
                    <tr
                      key={prop.id}
                      className="hover:bg-slate-50/70 transition group cursor-pointer"
                      onClick={() => {
                        setSelectedProposal(prop)
                        setPreviewModalOpen(true)
                      }}
                    >
                      {/* Number & Title */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-mono text-[11px] font-bold text-blue-600">
                            {prop.proposalNumber}
                          </span>
                          <span className="font-semibold text-slate-900 truncate max-w-[220px]">
                            {prop.title}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Issued: {new Date(prop.issueDate).toLocaleDateString()}
                          </span>
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 font-bold text-xs">
                            <Building2 size={13} />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-900">{customerName}</span>
                            {prop.customer?.primaryContact && (
                              <span className="text-[10px] text-slate-500">
                                {prop.customer.primaryContact.fullName}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Deal */}
                      <td className="px-4 py-3">
                        {prop.deal ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                            <Tag size={11} className="text-slate-400" />
                            <span className="truncate max-w-[120px]">{prop.deal.name}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Grand Total */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 text-xs">
                            {formatCurrency(prop.grandTotal, prop.currency)}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {prop.items?.length || 0} line item{prop.items?.length === 1 ? '' : 's'}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">{renderStatusBadge(prop.status)}</td>

                      {/* Valid Until */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-slate-700">
                            {new Date(prop.validUntil).toLocaleDateString()}
                          </span>
                          {validityMeta && (
                            <span
                              className={`inline-flex items-center rounded px-1.5 py-0.2 text-[10px] font-semibold border ${validityMeta.color} w-fit`}
                            >
                              {validityMeta.text}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Owner */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-700">
                            {prop.owner?.name?.[0] || 'U'}
                          </div>
                          <span className="font-medium text-slate-700 truncate max-w-[100px]">
                            {prop.owner?.name || 'Unassigned'}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td
                        className="px-4 py-3 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            title="Preview Proposal"
                            onClick={() => {
                              setSelectedProposal(prop)
                              setPreviewModalOpen(true)
                            }}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                          >
                            <Eye size={14} />
                          </button>

                          <button
                            type="button"
                            title="Edit Proposal"
                            onClick={() => openEditForm(prop)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                          >
                            <Pencil size={14} />
                          </button>

                          {prop.status === 'DRAFT' && (
                            <button
                              type="button"
                              title="Submit for Admin Approval"
                              onClick={() => handleSubmitForApproval(prop.id)}
                              className="rounded-lg p-1.5 text-violet-500 hover:bg-violet-50 hover:text-violet-700 cursor-pointer"
                            >
                              <Send size={14} />
                            </button>
                          )}

                          {prop.status === 'PENDING_APPROVAL' && isAdmin && (
                            <>
                              <button
                                type="button"
                                title="Approve Proposal"
                                onClick={() => handleOpenApprovalModal(prop, 'approve')}
                                className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 cursor-pointer"
                              >
                                <ShieldCheck size={14} />
                              </button>
                              <button
                                type="button"
                                title="Return for Changes"
                                onClick={() => handleOpenApprovalModal(prop, 'changes')}
                                className="rounded-lg p-1.5 text-amber-600 hover:bg-amber-50 hover:text-amber-700 cursor-pointer"
                              >
                                <RotateCcw size={14} />
                              </button>
                            </>
                          )}

                          {prop.status === 'APPROVED' && (
                            <button
                              type="button"
                              title="Send to Customer"
                              onClick={() => handleMarkSent(prop.id)}
                              className="rounded-lg p-1.5 text-blue-500 hover:bg-blue-50 hover:text-blue-700 cursor-pointer"
                            >
                              <Send size={14} />
                            </button>
                          )}

                          <button
                            type="button"
                            title="Delete Proposal"
                            onClick={() => {
                              setSelectedProposal(prop)
                              setDeleteModalOpen(true)
                            }}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalCount > 0 && (
          <div className="flex flex-wrap items-center justify-between border-t border-slate-200 px-4 py-3 text-xs text-slate-500 bg-slate-50/50">
            <div className="flex items-center gap-4">
              <div>
                Showing <span className="font-semibold text-slate-800">{(page - 1) * limit + 1}</span> to{' '}
                <span className="font-semibold text-slate-800">
                  {Math.min(page * limit, totalCount)}
                </span>{' '}
                of <span className="font-semibold text-slate-800">{totalCount}</span> proposals
              </div>
              <div className="flex items-center gap-1.5">
                <span>Per page:</span>
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value))
                    setPage(1)
                  }}
                  className="rounded-lg border border-slate-300 bg-white px-2 py-0.5 text-xs font-semibold text-slate-700 outline-none"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
              >
                Previous
              </button>
              <span>
                Page {page} of {Math.ceil(totalCount / limit) || 1}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= Math.ceil(totalCount / limit)}
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CREATE / EDIT PROPOSAL MODAL */}
      {formModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-4xl rounded-2xl bg-white shadow-2xl border border-slate-200 my-8 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <FileCheck className="text-blue-600" size={20} />
                  {isEditing ? 'Edit Proposal' : 'Create Customer Proposal'}
                </h2>
                <p className="text-xs text-slate-500">
                  {isEditing
                    ? `Update proposal details for ${formProposalNumber}`
                    : 'Draft a commercial proposal and itemized quotation for your customer'}
                </p>
                {isEditing &&
                  selectedProposal &&
                  (selectedProposal.status === 'PENDING_APPROVAL' ||
                    selectedProposal.status === 'APPROVED') && (
                    <p className="mt-1 text-[11px] font-semibold text-amber-600">
                      Saving changes will return this proposal to draft for re-approval.
                    </p>
                  )}
              </div>
              <button
                type="button"
                onClick={() => setFormModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmitForm} className="overflow-y-auto p-6 space-y-6 flex-1">
              {/* Basic Details Section */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Proposal Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Enterprise Cloud Implementation & Maintenance"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Proposal Number
                  </label>
                  <input
                    type="text"
                    placeholder="Auto-generated if empty"
                    value={formProposalNumber}
                    onChange={(e) => setFormProposalNumber(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-mono text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Customer Account <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={formCustomerId}
                    onChange={(e) => {
                      const val = e.target.value ? Number(e.target.value) : ''
                      setFormCustomerId(val)
                      // Auto-select linked deals for this customer if any
                      const cust = options?.customers.find((c) => c.id === val)
                      if (cust?.owner?.id && !formOwnerId) {
                        setFormOwnerId(cust.owner.id)
                      }
                    }}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="">Select Customer...</option>
                    {options?.customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.company?.name || c.primaryContact?.fullName || `Customer #${c.id}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Linked Deal / Opportunity (Optional)
                  </label>
                  <select
                    value={formDealId}
                    onChange={(e) => setFormDealId(e.target.value ? Number(e.target.value) : '')}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-medium text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="">None / Independent Proposal</option>
                    {options?.deals
                      .filter((d) => !formCustomerId || !d.customerId || d.customerId === formCustomerId)
                      .map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} {d.estimatedValue ? `(${formatCurrency(d.estimatedValue)})` : ''}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Sales Rep / Owner
                  </label>
                  <select
                    value={formOwnerId}
                    onChange={(e) => setFormOwnerId(e.target.value ? Number(e.target.value) : '')}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-medium text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="">Current User / Customer Owner</option>
                    {options?.users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Currency
                  </label>
                  <select
                    value={formCurrency}
                    onChange={(e) => setFormCurrency(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code} ({c.symbol}) — {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Issue Date
                  </label>
                  <input
                    type="date"
                    value={formIssueDate}
                    onChange={(e) => setFormIssueDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-medium text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Valid Until <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formValidUntil}
                    onChange={(e) => setFormValidUntil(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-medium text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              {/* Executive Summary */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Executive Summary / Scope of Work
                </label>
                <textarea
                  rows={2}
                  placeholder="High-level overview of the solution proposed to the customer..."
                  value={formSummary}
                  onChange={(e) => setFormSummary(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* Itemized Line Items Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Line Items & Pricing
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Add products, services, or custom deliverables with pricing and discounts.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addFormItem}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-600 hover:bg-blue-100 cursor-pointer"
                  >
                    <Plus size={13} />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase text-slate-500">
                      <tr>
                        <th className="px-3 py-2.5 w-[35%]">Item & Description</th>
                        <th className="px-2 py-2.5 w-[12%]">Qty</th>
                        <th className="px-2 py-2.5 w-[18%]">Unit Price</th>
                        <th className="px-2 py-2.5 w-[12%]">Disc %</th>
                        <th className="px-3 py-2.5 w-[18%] text-right">Line Total</th>
                        <th className="px-2 py-2.5 w-[5%]"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {formItems.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="p-2">
                            <div className="space-y-1">
                              {options?.productsServices && options.productsServices.length > 0 && (
                                <select
                                  value={item.productServiceId || ''}
                                  onChange={(e) =>
                                    updateFormItem(
                                      idx,
                                      'productServiceId',
                                      e.target.value ? Number(e.target.value) : null
                                    )
                                  }
                                  className="w-full text-[11px] rounded-lg border border-slate-200 bg-slate-50/50 px-2 py-1 text-slate-700"
                                >
                                  <option value="">Quick select from catalog...</option>
                                  {options.productsServices.map((p) => (
                                    <option key={p.id} value={p.id}>
                                      {p.name} ({p.type})
                                    </option>
                                  ))}
                                </select>
                              )}
                              <input
                                type="text"
                                required
                                placeholder="Item name or service title *"
                                value={item.title}
                                onChange={(e) => updateFormItem(idx, 'title', e.target.value)}
                                className="w-full rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-900 outline-none focus:border-blue-600"
                              />
                              <input
                                type="text"
                                placeholder="Description or scope note (optional)"
                                value={item.description}
                                onChange={(e) => updateFormItem(idx, 'description', e.target.value)}
                                className="w-full rounded-lg border border-slate-200 px-2.5 py-0.5 text-[11px] text-slate-600 outline-none"
                              />
                            </div>
                          </td>

                          <td className="p-2 align-top">
                            <input
                              type="number"
                              min="0.01"
                              step="any"
                              value={item.quantity}
                              onChange={(e) => updateFormItem(idx, 'quantity', e.target.value)}
                              className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-900 text-center font-semibold outline-none focus:border-blue-600"
                            />
                          </td>

                          <td className="p-2 align-top">
                            <div className="relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">
                                {formCurrency}
                              </span>
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={item.unitPrice}
                                onChange={(e) => updateFormItem(idx, 'unitPrice', e.target.value)}
                                className="w-full rounded-lg border border-slate-300 pl-11 pr-2 py-1 text-xs text-slate-900 font-semibold outline-none focus:border-blue-600"
                              />
                            </div>
                          </td>

                          <td className="p-2 align-top">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={item.discountPercent}
                              onChange={(e) => updateFormItem(idx, 'discountPercent', e.target.value)}
                              className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-900 text-center outline-none focus:border-blue-600"
                            />
                          </td>

                          <td className="p-2 align-top text-right font-bold text-slate-900 text-xs pt-2">
                            {formatCurrency(item.total, formCurrency)}
                          </td>

                          <td className="p-2 align-top text-center pt-2">
                            {formItems.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeFormItem(idx)}
                                className="text-slate-400 hover:text-rose-600 p-1 rounded"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Financial Calculation & Totals Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Discount & Taxes
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Overall Discount Type
                      </label>
                      <select
                        value={formDiscountType}
                        onChange={(e) => setFormDiscountType(e.target.value as DiscountType)}
                        className="w-full rounded-xl border border-slate-300 px-3 py-1.5 text-xs text-slate-800"
                      >
                        <option value="PERCENTAGE">Percentage (%)</option>
                        <option value="FIXED">Fixed Amount ({formCurrency})</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Discount Value
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={formDiscountValue}
                        onChange={(e) => setFormDiscountValue(Number(e.target.value) || 0)}
                        className="w-full rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-800"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Tax / VAT Rate (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="any"
                        placeholder="e.g. 10 for 10% tax"
                        value={formTaxRate}
                        onChange={(e) => setFormTaxRate(Number(e.target.value) || 0)}
                        className="w-full rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-800"
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-2">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Proposal Totals
                  </h4>
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>Subtotal:</span>
                    <span className="font-semibold text-slate-800">
                      {formatCurrency(formTotals.subtotal, formCurrency)}
                    </span>
                  </div>
                  {formTotals.discountAmount > 0 && (
                    <div className="flex justify-between text-xs text-emerald-600">
                      <span>
                        Discount ({formDiscountType === 'PERCENTAGE' ? `${formDiscountValue}%` : 'Fixed'}):
                      </span>
                      <span className="font-semibold">
                        -{formatCurrency(formTotals.discountAmount, formCurrency)}
                      </span>
                    </div>
                  )}
                  {formTotals.taxAmount > 0 && (
                    <div className="flex justify-between text-xs text-slate-600">
                      <span>Tax ({formTaxRate}%):</span>
                      <span className="font-semibold text-slate-800">
                        +{formatCurrency(formTotals.taxAmount, formCurrency)}
                      </span>
                    </div>
                  )}
                  <div className="border-t border-slate-200 pt-2.5 mt-2 flex justify-between items-baseline">
                    <span className="text-sm font-bold text-slate-900">Grand Total:</span>
                    <span className="text-lg font-black text-blue-600">
                      {formatCurrency(formTotals.grandTotal, formCurrency)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Terms and Client Notes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Terms & Conditions
                  </label>
                  <textarea
                    rows={3}
                    value={formTerms}
                    onChange={(e) => setFormTerms(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-700 outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Client Notes / Payment Instructions
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Specific remarks for the client, bank details, or delivery milestones..."
                    value={formClientNotes}
                    onChange={(e) => setFormClientNotes(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-700 outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="border-t border-slate-200 pt-4 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setFormModalOpen(false)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving Proposal...' : isEditing ? 'Update Proposal' : 'Save as Draft'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PROPOSAL PREVIEW & DOCUMENT MODAL (PRINT READY) */}
      {previewModalOpen && selectedProposal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white">
          <div className="relative w-full max-w-4xl rounded-2xl bg-white shadow-2xl border border-slate-200 my-6 flex flex-col max-h-[92vh] print:max-h-none print:border-none print:shadow-none print:m-0">
            {/* Action Bar (hidden in print) */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-3.5 bg-slate-50/80 rounded-t-2xl print:hidden">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-blue-600">
                  {selectedProposal.proposalNumber}
                </span>
                {renderStatusBadge(selectedProposal.status)}
              </div>

              <div className="flex items-center gap-2">
                {selectedProposal.status === 'DRAFT' && (
                  <button
                    type="button"
                    onClick={() => handleSubmitForApproval(selectedProposal.id)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 cursor-pointer"
                  >
                    <Send size={13} />
                    <span>Submit for Admin Approval</span>
                  </button>
                )}

                {selectedProposal.status === 'PENDING_APPROVAL' && (
                  isAdmin ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleOpenApprovalModal(selectedProposal, 'approve')}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 cursor-pointer"
                      >
                        <ShieldCheck size={13} />
                        <span>Approve</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenApprovalModal(selectedProposal, 'changes')}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-50 cursor-pointer"
                      >
                        <RotateCcw size={13} />
                        <span>Return for Changes</span>
                      </button>
                    </>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-xl bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 border border-violet-200">
                      <Clock size={13} />
                      Awaiting admin approval
                    </span>
                  )
                )}

                {selectedProposal.status === 'APPROVED' && (
                  <button
                    type="button"
                    onClick={() => handleMarkSent(selectedProposal.id)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 cursor-pointer"
                  >
                    <Send size={13} />
                    <span>Send to Customer</span>
                  </button>
                )}

                {(selectedProposal.status === 'SENT' || selectedProposal.status === 'UNDER_REVIEW') && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleMarkAccepted(selectedProposal.id)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 cursor-pointer"
                    >
                      <FileCheck size={13} />
                      <span>Accept</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenReject(selectedProposal)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 cursor-pointer"
                    >
                      <X size={13} />
                      <span>Reject</span>
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  <Printer size={13} />
                  <span>Print / PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPreviewModalOpen(false)
                    openEditForm(selectedProposal)
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  <Pencil size={13} />
                  <span>Edit</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewModalOpen(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Document Body (Printable Letterhead) */}
            <div className="overflow-y-auto p-8 space-y-6 flex-1 bg-white text-slate-900 print:overflow-visible">
              {/* Header Letterhead */}
              <div className="flex justify-between items-start border-b border-slate-200 pb-6">
                <div className="flex items-center gap-3">
                  <img
                    src="/logo/vib_logo.jpeg"
                    alt="Vibrantick Infotech Solutions"
                    className="h-14 w-14 shrink-0 rounded-full object-cover"
                  />
                  <div>
                    <span className="text-lg font-black tracking-tight text-slate-950 block leading-tight">
                      Vibrantick Infotech Solutions
                    </span>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Commercial Sales &amp; Solutions Proposal
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <h1 className="text-2xl font-black text-blue-600 tracking-tight">PROPOSAL</h1>
                  <p className="font-mono text-xs font-bold text-slate-800 mt-1">
                    #{selectedProposal.proposalNumber}
                  </p>
                  <div className="text-[11px] text-slate-500 mt-1 space-y-0.5">
                    <p>Issue Date: {new Date(selectedProposal.issueDate).toLocaleDateString()}</p>
                    <p className="font-semibold text-slate-700">
                      Valid Until: {new Date(selectedProposal.validUntil).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Title & Status Banner */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Subject / Project
                  </span>
                  <h2 className="text-base font-bold text-slate-900">{selectedProposal.title}</h2>
                </div>
                <div>{renderStatusBadge(selectedProposal.status)}</div>
              </div>

              {/* Client & Rep Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-white">
                <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                    Prepared For
                  </span>
                  <h3 className="text-sm font-bold text-slate-900">
                    {selectedProposal.customer?.company?.name || 'Customer Account'}
                  </h3>
                  {selectedProposal.customer?.primaryContact && (
                    <div className="text-xs text-slate-600 mt-1 space-y-0.5">
                      <p className="font-semibold">
                        {selectedProposal.customer.primaryContact.fullName}
                        {selectedProposal.customer.primaryContact.jobTitle && (
                          <span className="text-slate-400 font-normal">
                            {' '}
                            — {selectedProposal.customer.primaryContact.jobTitle}
                          </span>
                        )}
                      </p>
                      {selectedProposal.customer.primaryContact.email && (
                        <p>{selectedProposal.customer.primaryContact.email}</p>
                      )}
                      {selectedProposal.customer.primaryContact.phone && (
                        <p>{selectedProposal.customer.primaryContact.phone}</p>
                      )}
                    </div>
                  )}
                  {selectedProposal.customer?.company?.address && (
                    <p className="text-xs text-slate-500 mt-1">
                      {selectedProposal.customer.company.address}
                      {selectedProposal.customer.company.city ? `, ${selectedProposal.customer.company.city}` : ''}
                    </p>
                  )}
                </div>

                <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                    Prepared By
                  </span>
                  <h3 className="text-sm font-bold text-slate-900">
                    {selectedProposal.owner?.name || 'Sales Representative'}
                  </h3>
                  <div className="text-xs text-slate-600 mt-1 space-y-0.5">
                    {selectedProposal.owner?.email && <p>{selectedProposal.owner.email}</p>}
                    {selectedProposal.deal && (
                      <p className="text-slate-500">Linked Opportunity: {selectedProposal.deal.name}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Executive Summary */}
              {selectedProposal.summary && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Executive Summary & Scope
                  </h4>
                  <div className="rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {selectedProposal.summary}
                  </div>
                </div>
              )}

              {/* Line Items Table */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Itemized Quotation
                </h4>
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase text-slate-500">
                      <tr>
                        <th className="px-4 py-2.5">Item & Description</th>
                        <th className="px-3 py-2.5 text-center">Qty</th>
                        <th className="px-3 py-2.5 text-right">Unit Price</th>
                        <th className="px-3 py-2.5 text-center">Disc %</th>
                        <th className="px-4 py-2.5 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedProposal.items?.map((it, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-3">
                            <span className="font-bold text-slate-900 block">{it.title}</span>
                            {it.description && (
                              <span className="text-[11px] text-slate-500 whitespace-pre-wrap">
                                {it.description}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-center font-medium">{it.quantity}</td>
                          <td className="px-3 py-3 text-right font-medium">
                            {formatCurrency(it.unitPrice, selectedProposal.currency)}
                          </td>
                          <td className="px-3 py-3 text-center text-slate-500">
                            {Number(it.discountPercent) > 0 ? `${it.discountPercent}%` : '—'}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-slate-900">
                            {formatCurrency(it.total, selectedProposal.currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Financial Totals Breakdown */}
              <div className="flex justify-end">
                <div className="w-full sm:w-72 rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span className="font-semibold text-slate-800">
                      {formatCurrency(selectedProposal.subtotal, selectedProposal.currency)}
                    </span>
                  </div>
                  {Number(selectedProposal.discountAmount) > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>Discount:</span>
                      <span className="font-semibold">
                        -{formatCurrency(selectedProposal.discountAmount, selectedProposal.currency)}
                      </span>
                    </div>
                  )}
                  {Number(selectedProposal.taxAmount) > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Tax ({selectedProposal.taxRate}%):</span>
                      <span className="font-semibold text-slate-800">
                        +{formatCurrency(selectedProposal.taxAmount, selectedProposal.currency)}
                      </span>
                    </div>
                  )}
                  <div className="border-t border-slate-300 pt-2 flex justify-between items-baseline">
                    <span className="text-sm font-bold text-slate-900">Grand Total:</span>
                    <span className="text-base font-black text-blue-600">
                      {formatCurrency(selectedProposal.grandTotal, selectedProposal.currency)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Terms and Notes */}
              {(selectedProposal.terms || selectedProposal.clientNotes) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-200 pt-4">
                  {selectedProposal.terms && (
                    <div>
                      <h5 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Terms & Conditions
                      </h5>
                      <div className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed">
                        {selectedProposal.terms}
                      </div>
                    </div>
                  )}

                  {selectedProposal.clientNotes && (
                    <div>
                      <h5 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Client Notes
                      </h5>
                      <div className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed">
                        {selectedProposal.clientNotes}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Rejection Note if rejected */}
              {selectedProposal.status === 'REJECTED' && selectedProposal.rejectionReason && (
                <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4">
                  <span className="text-xs font-bold text-rose-700 block">Rejection Feedback / Reason:</span>
                  <p className="text-xs text-rose-600 mt-1">{selectedProposal.rejectionReason}</p>
                </div>
              )}

              {/* Admin approval trail */}
              {(selectedProposal.submittedForApprovalAt ||
                selectedProposal.approvedBy ||
                selectedProposal.approvalNote) && (
                <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 print:border-slate-200 print:bg-transparent">
                  {selectedProposal.status === 'PENDING_APPROVAL' &&
                    selectedProposal.submittedForApprovalAt && (
                      <p className="text-xs font-semibold text-indigo-700">
                        Submitted for admin approval on{' '}
                        {new Date(selectedProposal.submittedForApprovalAt).toLocaleString()}
                      </p>
                    )}

                  {selectedProposal.status === 'APPROVED' && (
                    <p className="text-xs font-semibold text-indigo-700">
                      Approved by {selectedProposal.approvedBy?.name || 'Administrator'}
                      {selectedProposal.approvedAt
                        ? ` on ${new Date(selectedProposal.approvedAt).toLocaleString()}`
                        : ''}
                    </p>
                  )}

                  {selectedProposal.approvalNote && (
                    <div className="mt-1">
                      <span className="text-xs font-bold text-amber-700 block">
                        {selectedProposal.status === 'APPROVED' ? 'Approval note' : 'Admin feedback'}:
                      </span>
                      <p className="text-xs text-amber-600 mt-1">{selectedProposal.approvalNote}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Signature Block for Formal Acceptance */}
              <div className="border-t border-slate-200 pt-6 mt-6 grid grid-cols-2 gap-8">
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-8">Authorized Representative (Client):</p>
                  <div className="border-b border-slate-300 w-48 mb-1" />
                  <p className="text-[11px] text-slate-400">Signature & Date</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-8">
                    Prepared By (Vibrantick Infotech Solutions):
                  </p>
                  <div className="border-b border-slate-300 w-48 mb-1" />
                  <p className="text-[11px] text-slate-400">Signature & Date</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* APPROVAL / RETURN-FOR-CHANGES MODAL */}
      {approvalModalOpen && selectedProposal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              {approvalAction === 'approve' ? 'Approve Proposal' : 'Return Proposal for Changes'}
            </h3>
            <p className="text-xs text-slate-500">
              {approvalAction === 'approve'
                ? `Approve ${selectedProposal.proposalNumber} so it can be sent to the customer.`
                : `Return ${selectedProposal.proposalNumber} to draft with feedback for the author.`}
            </p>
            <textarea
              rows={3}
              placeholder={
                approvalAction === 'approve'
                  ? 'Optional approval note...'
                  : 'Describe the changes required (optional)...'
              }
              value={approvalNote}
              onChange={(e) => setApprovalNote(e.target.value)}
              className="w-full rounded-xl border border-slate-300 p-3 text-xs text-slate-800 outline-none focus:border-indigo-500"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setApprovalModalOpen(false)}
                className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmApproval}
                className={`rounded-xl px-4 py-1.5 text-xs font-bold text-white ${
                  approvalAction === 'approve'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                {approvalAction === 'approve' ? 'Approve Proposal' : 'Return to Draft'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECT MODAL */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Mark Proposal as Rejected</h3>
            <p className="text-xs text-slate-500">
              Provide feedback or the reason why the customer declined the proposal (optional).
            </p>
            <textarea
              rows={3}
              placeholder="e.g. Budget constraints, opted for competitor, or project postponed..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full rounded-xl border border-slate-300 p-3 text-xs text-slate-800 outline-none focus:border-rose-500"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectModalOpen(false)}
                className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="rounded-xl bg-rose-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-rose-700"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {deleteModalOpen && selectedProposal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Delete Proposal</h3>
            <p className="text-xs text-slate-500">
              Are you sure you want to delete proposal{' '}
              <strong className="text-slate-800">{selectedProposal.proposalNumber}</strong> (
              {selectedProposal.title})? This action will remove it from the active list.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="rounded-xl bg-rose-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-rose-700"
              >
                Delete Proposal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
