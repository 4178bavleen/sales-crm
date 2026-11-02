import { useEffect, useState, useCallback } from 'react'
import {
  FileText,
  ShieldCheck,
  FileCheck,
  FolderArchive,
  Plus,
  Search,
  RotateCw,
  Download,
  Trash2,
  Pencil,
  History,
  X,
  Upload,
  Users,
  FolderGit2,
  AlertCircle,
  FileSpreadsheet,
  FileImage,
  File,
  Loader2,
} from 'lucide-react'
import StatCard from '../../components/ui/StatCard'
import { TablePagination } from '../../components/ui/DataTable'
import {
  fetchDocuments,
  fetchDocumentOptions,
  createDocumentApi,
  addDocumentVersionApi,
  updateDocumentApi,
  deleteDocumentApi,
  downloadDocumentFile,
  formatFileSize,
  getCategoryMeta,
} from '../../lib/documents'
import type {
  DocumentCategory,
  DocumentItem,
  DocumentStats,
  DocumentOptions,
} from '../../types/document'

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [stats, setStats] = useState<DocumentStats>({
    total: 0,
    contracts: 0,
    proposals: 0,
    customerFiles: 0,
    meetingNotes: 0,
    other: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters & Pagination
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [totalCount, setTotalCount] = useState(0)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | DocumentCategory>('ALL')

  // Options
  const [options, setOptions] = useState<DocumentOptions | null>(null)

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [versionModalOpen, setVersionModalOpen] = useState(false)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [alertDialog, setAlertDialog] = useState<{
    open: boolean
    title: string
    message: string
  }>({
    open: false,
    title: '',
    message: '',
  })

  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form states
  const [createFile, setCreateFile] = useState<File | null>(null)
  const [createName, setCreateName] = useState('')
  const [createCategory, setCreateCategory] = useState<DocumentCategory>('CONTRACT')
  const [createLeadId, setCreateLeadId] = useState<string>('none')
  const [createDealId, setCreateDealId] = useState<string>('none')
  const [createCustomerId, setCreateCustomerId] = useState<string>('none')

  const [versionFile, setVersionFile] = useState<File | null>(null)
  const [versionNote, setVersionNote] = useState('')

  const [editName, setEditName] = useState('')
  const [editCategory, setEditCategory] = useState<DocumentCategory>('OTHER')
  const [editLeadId, setEditLeadId] = useState<string>('none')
  const [editDealId, setEditDealId] = useState<string>('none')
  const [editCustomerId, setEditCustomerId] = useState<string>('none')

  // Load Data
  const loadDocuments = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetchDocuments({
        page,
        limit,
        search: search.trim() || undefined,
        category: categoryFilter,
      })
      setDocuments(res.items)
      setTotalCount(res.pagination.total)
      setStats(res.stats)
    } catch (err) {
      console.error('Failed to load documents:', err)
      setError(err instanceof Error ? err.message : 'Error fetching documents')
    } finally {
      setLoading(false)
    }
  }, [page, limit, search, categoryFilter])

  useEffect(() => {
    void loadDocuments()
  }, [loadDocuments])

  // Load options once
  useEffect(() => {
    fetchDocumentOptions()
      .then(setOptions)
      .catch((err) => console.error('Failed to load document options:', err))
  }, [])

  // Helpers
  const getFileIconComponent = (fileType?: string) => {
    const ext = (fileType || '').toLowerCase()
    if (ext === 'pdf') return <FileText className="text-rose-600" size={20} />
    if (ext === 'xlsx' || ext === 'xls' || ext === 'csv')
      return <FileSpreadsheet className="text-emerald-600" size={20} />
    if (ext === 'doc' || ext === 'docx' || ext === 'txt')
      return <FileText className="text-blue-600" size={20} />
    if (['png', 'jpg', 'jpeg', 'webp', 'svg'].includes(ext))
      return <FileImage className="text-purple-600" size={20} />
    return <File className="text-slate-600" size={20} />
  }

  // Handlers
  const handleOpenCreate = () => {
    setCreateFile(null)
    setCreateName('')
    setCreateCategory('CONTRACT')
    setCreateLeadId('none')
    setCreateDealId('none')
    setCreateCustomerId('none')
    setCreateModalOpen(true)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setCreateFile(file)
      if (!createName) {
        // Pre-fill name from filename without extension
        const base = file.name.substring(0, file.name.lastIndexOf('.')) || file.name
        setCreateName(base)
      }
    }
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createFile || !createName.trim()) return
    try {
      setIsSubmitting(true)
      await createDocumentApi({
        file: createFile,
        name: createName.trim(),
        category: createCategory,
        leadId: createLeadId !== 'none' ? Number(createLeadId) : null,
        dealId: createDealId !== 'none' ? Number(createDealId) : null,
        customerId: createCustomerId !== 'none' ? Number(createCustomerId) : null,
      })
      setCreateModalOpen(false)
      void loadDocuments()
    } catch (err) {
      setAlertDialog({
        open: true,
        title: 'Upload Failed',
        message: err instanceof Error ? err.message : 'Upload failed',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenVersionModal = (doc: DocumentItem) => {
    setSelectedDoc(doc)
    setVersionFile(null)
    setVersionNote('')
    setVersionModalOpen(true)
  }

  const handleVersionSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDoc || !versionFile) return
    try {
      setIsSubmitting(true)
      await addDocumentVersionApi(selectedDoc.id, {
        file: versionFile,
        replaceNote: versionNote.trim() || null,
      })
      setVersionModalOpen(false)
      void loadDocuments()
    } catch (err) {
      setAlertDialog({
        open: true,
        title: 'Version Upload Failed',
        message: err instanceof Error ? err.message : 'Version upload failed',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenEdit = (doc: DocumentItem) => {
    setSelectedDoc(doc)
    setEditName(doc.name)
    setEditCategory(doc.category)
    setEditLeadId(doc.leadId ? String(doc.leadId) : 'none')
    setEditDealId(doc.dealId ? String(doc.dealId) : 'none')
    setEditCustomerId(doc.customerId ? String(doc.customerId) : 'none')
    setEditModalOpen(true)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDoc || !editName.trim()) return
    try {
      setIsSubmitting(true)
      await updateDocumentApi(selectedDoc.id, {
        name: editName.trim(),
        category: editCategory,
        leadId: editLeadId !== 'none' ? Number(editLeadId) : null,
        dealId: editDealId !== 'none' ? Number(editDealId) : null,
        customerId: editCustomerId !== 'none' ? Number(editCustomerId) : null,
      })
      setEditModalOpen(false)
      void loadDocuments()
    } catch (err) {
      setAlertDialog({
        open: true,
        title: 'Update Failed',
        message: err instanceof Error ? err.message : 'Update failed',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenDelete = (doc: DocumentItem) => {
    setSelectedDoc(doc)
    setDeleteModalOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!selectedDoc) return
    try {
      setIsSubmitting(true)
      await deleteDocumentApi(selectedDoc.id)
      setDeleteModalOpen(false)
      void loadDocuments()
    } catch (err) {
      setAlertDialog({
        open: true,
        title: 'Delete Failed',
        message: err instanceof Error ? err.message : 'Delete failed',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenDetail = (doc: DocumentItem) => {
    setSelectedDoc(doc)
    setDetailModalOpen(true)
  }

  const handleDownload = async (doc: DocumentItem, versionNo?: number) => {
    const v =
      versionNo && doc.versions
        ? doc.versions.find((item) => item.versionNo === versionNo)
        : doc.latestVersion || doc.versions?.[0]
    const fileName = v?.originalFileName || `${doc.name}.bin`
    try {
      await downloadDocumentFile(doc.id, fileName, versionNo)
    } catch (err) {
      setAlertDialog({
        open: true,
        title: 'Failed to Download Document',
        message: err instanceof Error ? err.message : 'Failed to download document file.',
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Documents
          </h1>
          <p className="mt-1 text-xs text-slate-600">
            Store, organize, and manage versioned sales proposals, signed contracts, and customer attachments.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => loadDocuments()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition cursor-pointer"
          >
            <RotateCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#1d61e7] px-4 py-2 text-xs font-semibold text-white shadow-md shadow-blue-600/25 hover:bg-blue-700 transition cursor-pointer"
          >
            <Plus size={15} />
            <span>Upload Document</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Documents"
          value={stats.total}
          subtext="Active library files"
          icon={FileText}
          color="blue"
        />
        <StatCard
          label="Contracts"
          value={stats.contracts}
          subtext="Executed agreements"
          icon={ShieldCheck}
          color="emerald"
        />
        <StatCard
          label="Proposals"
          value={stats.proposals}
          subtext="Quotes & pitch decks"
          icon={FileCheck}
          color="indigo"
        />
        <StatCard
          label="Customer Files"
          value={stats.customerFiles}
          subtext="Client records"
          icon={FolderArchive}
          color="amber"
        />
      </div>

      {/* Error alert */}
      {error && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">
          <AlertCircle size={16} className="shrink-0 text-rose-600 mt-0.5" />
          <div>
            <p className="font-bold">Error loading documents</p>
            <p className="mt-0.5 text-rose-700">{error}</p>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            placeholder="Search by document or filename..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-8 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-hidden transition"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={13} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
            {(
              [
                { key: 'ALL', label: 'All' },
                { key: 'CONTRACT', label: 'Contracts' },
                { key: 'PROPOSAL', label: 'Proposals' },
                { key: 'CUSTOMER_FILE', label: 'Customer Files' },
                { key: 'OTHER', label: 'Other' },
              ] as const
            ).map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => {
                  setCategoryFilter(t.key)
                  setPage(1)
                }}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition cursor-pointer ${
                  categoryFilter === t.key
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content View */}
      {loading ? (
        <div className="p-16 text-center rounded-2xl border border-slate-200 bg-white">
          <Loader2 size={32} className="mx-auto text-blue-600 animate-spin mb-3" />
          <p className="text-xs font-semibold text-slate-700">Loading document vault...</p>
        </div>
      ) : documents.length === 0 ? (
        <div className="p-16 text-center rounded-2xl border border-slate-200 bg-white">
          <FileText size={36} className="mx-auto text-slate-300 mb-3" />
          <h3 className="text-sm font-bold text-slate-800">No Documents Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {search || categoryFilter !== 'ALL'
              ? 'No documents matched your current filter criteria. Try clearing search or category filters.'
              : 'Your document vault is currently empty. Upload your first contract, proposal, or file to get started.'}
          </p>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#1d61e7] px-4 py-2 text-xs font-semibold text-white shadow-md shadow-blue-600/25 hover:bg-blue-700 transition cursor-pointer"
          >
            <Plus size={14} />
            <span>Upload First Document</span>
          </button>
        </div>
      ) : (
        /* Table View */
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-slate-900">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold text-slate-800 uppercase tracking-wider">
                  <th className="py-3 px-4 w-12 text-center">S.No</th>
                  <th className="py-3 px-4 min-w-[200px]">Document Name</th>
                  <th className="py-3 px-4 min-w-[130px]">Category</th>
                  <th className="py-3 px-4 min-w-[140px]">Connected Record</th>
                  <th className="py-3 px-4 min-w-[80px]">Version</th>
                  <th className="py-3 px-4 min-w-[90px]">Size</th>
                  <th className="py-3 px-4 min-w-[130px]">Uploaded By</th>
                  <th className="py-3 px-4 min-w-[110px]">Date</th>
                  <th className="py-3 px-4 w-36 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {documents.map((doc, idx) => {
                  const v = doc.latestVersion || doc.versions?.[0]
                  const meta = getCategoryMeta(doc.category)
                  const createdDate = new Date(doc.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })

                  return (
                    <tr
                      key={doc.id}
                      onClick={() => handleOpenDetail(doc)}
                      className="hover:bg-slate-50/80 transition cursor-pointer"
                    >
                      <td className="py-3.5 px-4 text-center font-bold text-slate-500">
                        {(page - 1) * limit + idx + 1}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        <div className="flex items-center gap-2">
                          {getFileIconComponent(v?.fileType)}
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-900">{doc.name}</p>
                            <p className="text-[11px] text-slate-400 truncate">
                              {v?.originalFileName || '-'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${meta.bg}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                          {meta.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {doc.lead && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 border border-slate-200 px-1.5 py-0.5 text-[10px] font-medium text-slate-700">
                              <Users size={10} className="text-slate-400 shrink-0" />
                              <span className="truncate max-w-[100px]">{doc.lead.contactName}</span>
                            </span>
                          )}
                          {doc.deal && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 text-purple-700 border border-purple-200 px-1.5 py-0.5 text-[10px] font-medium">
                              <FolderGit2 size={10} className="text-purple-400 shrink-0" />
                              <span className="truncate max-w-[100px]">{doc.deal.name}</span>
                            </span>
                          )}
                          {doc.customer && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 text-[10px] font-medium">
                              <Users size={10} className="text-emerald-400 shrink-0" />
                              <span className="truncate max-w-[100px]">
                                {doc.customer.company?.name ||
                                  doc.customer.primaryContact?.fullName ||
                                  'Customer'}
                              </span>
                            </span>
                          )}
                          {!doc.lead && !doc.deal && !doc.customer && (
                            <span className="text-slate-400 text-xs">-</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-700 border border-slate-200">
                          v{doc.currentVersion}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-600">
                        {formatFileSize(v?.sizeBytes)}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-700">
                        {doc.uploadedBy?.name || 'User'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">{createdDate}</td>
                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            title="Download"
                            onClick={() => handleDownload(doc)}
                            className="rounded-md p-1.5 text-slate-500 hover:bg-blue-50 hover:text-blue-600 transition"
                          >
                            <Download size={14} />
                          </button>
                          <button
                            type="button"
                            title="Upload new version"
                            onClick={() => handleOpenVersionModal(doc)}
                            className="rounded-md p-1.5 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 transition"
                          >
                            <Upload size={14} />
                          </button>
                          <button
                            type="button"
                            title="Version History"
                            onClick={() => handleOpenDetail(doc)}
                            className="rounded-md p-1.5 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition"
                          >
                            <History size={14} />
                          </button>
                          <button
                            type="button"
                            title="Edit"
                            onClick={() => handleOpenEdit(doc)}
                            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            title="Delete"
                            onClick={() => handleOpenDelete(doc)}
                            className="rounded-md p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition"
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
        </div>
      )}

      {/* Pagination */}
      <TablePagination
        total={totalCount}
        page={page}
        pageSize={limit}
        onPageChange={setPage}
        onPageSizeChange={(newLimit) => {
          setLimit(newLimit)
          setPage(1)
        }}
      />

      {/* 1. UPLOAD DOCUMENT MODAL */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">Upload New Document</h2>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-4">
              {/* File Drop Area */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Select File <span className="text-rose-500">*</span>
                </label>
                <div className="flex justify-center rounded-xl border border-dashed border-slate-300 px-6 py-6 hover:border-blue-400 transition cursor-pointer bg-slate-50/50 relative">
                  <input
                    type="file"
                    required
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <div className="text-center">
                    <Upload className="mx-auto h-8 w-8 text-blue-600" />
                    <p className="mt-2 text-xs font-medium text-slate-700">
                      {createFile ? (
                        <span className="font-bold text-blue-700">{createFile.name}</span>
                      ) : (
                        <>
                          <span className="text-blue-600 hover:underline">Choose file</span> or drag
                          and drop
                        </>
                      )}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      PDF, DOCX, XLSX, Images up to 25MB
                    </p>
                  </div>
                </div>
              </div>

              {/* Document Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Document Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Master Services Agreement 2026"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Category <span className="text-rose-500">*</span>
                </label>
                <select
                  value={createCategory}
                  onChange={(e) => setCreateCategory(e.target.value as DocumentCategory)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 cursor-pointer"
                >
                  <option value="CONTRACT">Contract (Agreements, NDAs, Sign-offs)</option>
                  <option value="PROPOSAL">Proposal (Quotations, Bids, Scopes)</option>
                  <option value="CUSTOMER_FILE">Customer File (Onboarding, Requirements)</option>
                  <option value="MEETING_NOTES">Meeting Notes & Agendas</option>
                  <option value="OTHER">General / Other</option>
                </select>
              </div>

              {/* Connect to CRM Records */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Connect to CRM Records <span className="text-[11px] font-normal text-slate-500">(Optional)</span>
                  </label>
                  {(createLeadId !== 'none' || createDealId !== 'none' || createCustomerId !== 'none') && (
                    <button
                      type="button"
                      onClick={() => {
                        setCreateLeadId('none')
                        setCreateDealId('none')
                        setCreateCustomerId('none')
                      }}
                      className="text-[11px] font-medium text-blue-600 hover:text-blue-800 transition cursor-pointer"
                    >
                      Clear all
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mb-2.5">
                  Link this document to any relevant Lead, Deal, or Customer (or leave as None for a general document).
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Lead
                    </label>
                    <select
                      value={createLeadId}
                      onChange={(e) => setCreateLeadId(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none transition focus:border-blue-500"
                    >
                      <option value="none">-- None --</option>
                      {options?.leads.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Deal
                    </label>
                    <select
                      value={createDealId}
                      onChange={(e) => setCreateDealId(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none transition focus:border-blue-500"
                    >
                      <option value="none">-- None --</option>
                      {options?.deals.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Customer
                    </label>
                    <select
                      value={createCustomerId}
                      onChange={(e) => setCreateCustomerId(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none transition focus:border-blue-500"
                    >
                      <option value="none">-- None --</option>
                      {options?.customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  disabled={isSubmitting}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !createFile || !createName.trim()}
                  className="rounded-xl bg-[#1d61e7] px-4 py-2 text-xs font-semibold text-white shadow-md shadow-blue-600/25 hover:bg-blue-700 transition cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Uploading...' : 'Save Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. UPLOAD NEW VERSION MODAL */}
      {versionModalOpen && selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900">Upload New Version</h2>
                <p className="text-xs text-slate-500 mt-0.5 truncate">{selectedDoc.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setVersionModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleVersionSubmit} className="mt-4 space-y-4">
              <div className="rounded-xl bg-blue-50/70 p-3 text-xs text-blue-800 border border-blue-200">
                This will increment the document to{' '}
                <span className="font-bold">v{selectedDoc.currentVersion + 1}</span>. Previous
                versions remain preserved and downloadable in the version history.
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Select New File <span className="text-rose-500">*</span>
                </label>
                <input
                  type="file"
                  required
                  onChange={(e) => setVersionFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Change Note (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Revised quote with 10% volume discount"
                  value={versionNote}
                  onChange={(e) => setVersionNote(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setVersionModalOpen(false)}
                  disabled={isSubmitting}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !versionFile}
                  className="rounded-xl bg-[#1d61e7] px-4 py-2 text-xs font-semibold text-white shadow-md shadow-blue-600/25 hover:bg-blue-700 transition cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Uploading...' : 'Publish Version'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. VERSION HISTORY & DETAILS MODAL */}
      {detailModalOpen && selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900">{selectedDoc.name}</h2>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                      getCategoryMeta(selectedDoc.category).bg
                    }`}
                  >
                    {getCategoryMeta(selectedDoc.category).label}
                  </span>
                  <span className="text-xs text-slate-500">
                    Current: <strong className="text-slate-800">v{selectedDoc.currentVersion}</strong>
                  </span>
                  {selectedDoc.lead && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 border border-slate-200 px-1.5 py-0.5 text-[10px] font-medium text-slate-700">
                      <Users size={10} className="text-slate-400" />
                      <span>Lead: {selectedDoc.lead.contactName}</span>
                    </span>
                  )}
                  {selectedDoc.deal && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 text-purple-700 border border-purple-200 px-1.5 py-0.5 text-[10px] font-medium">
                      <FolderGit2 size={10} className="text-purple-400" />
                      <span>Deal: {selectedDoc.deal.name}</span>
                    </span>
                  )}
                  {selectedDoc.customer && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 text-[10px] font-medium">
                      <Users size={10} className="text-emerald-400" />
                      <span>
                        Customer: {selectedDoc.customer.company?.name ||
                          selectedDoc.customer.primaryContact?.fullName ||
                          'Customer'}
                      </span>
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1"
              >
                <X size={18} />
              </button>
            </div>

            <div className="my-4 flex-1 overflow-y-auto space-y-3 pr-1">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Version History
              </h3>

              <div className="space-y-2.5">
                {(selectedDoc.versions && selectedDoc.versions.length > 0
                  ? selectedDoc.versions
                  : [selectedDoc.latestVersion].filter(Boolean)
                ).map((v) => {
                  if (!v) return null
                  const isCurrent = v.versionNo === selectedDoc.currentVersion
                  const uploadDate = new Date(v.uploadedAt).toLocaleString('en-US', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })

                  return (
                    <div
                      key={v.id}
                      className={`rounded-xl border p-3 flex items-center justify-between gap-3 ${
                        isCurrent
                          ? 'border-blue-300 bg-blue-50/30'
                          : 'border-slate-200 bg-white hover:bg-slate-50/60'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900">v{v.versionNo}</span>
                          {isCurrent && (
                            <span className="rounded-full bg-blue-100 text-blue-700 px-2 py-0.5 text-[10px] font-bold">
                              Current
                            </span>
                          )}
                          <span className="text-xs text-slate-500 truncate">
                            {v.originalFileName}
                          </span>
                        </div>
                        {v.replaceNote && (
                          <p className="text-xs text-slate-600 mt-1 italic">"{v.replaceNote}"</p>
                        )}
                        <p className="text-[11px] text-slate-400 mt-1">
                          {formatFileSize(v.sizeBytes)} • Uploaded {uploadDate} by{' '}
                          {v.uploadedBy?.name || 'User'}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDownload(selectedDoc, v.versionNo)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition shadow-2xs shrink-0 cursor-pointer"
                      >
                        <Download size={13} />
                        <span>Download</span>
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setDetailModalOpen(false)
                  handleOpenVersionModal(selectedDoc)
                }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800"
              >
                <Upload size={14} />
                <span>Upload New Version</span>
              </button>

              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. EDIT DOCUMENT MODAL */}
      {editModalOpen && selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">Edit Document Details</h2>
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Document Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Category <span className="text-rose-500">*</span>
                </label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value as DocumentCategory)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 outline-none transition focus:border-blue-500"
                >
                  <option value="CONTRACT">Contract</option>
                  <option value="PROPOSAL">Proposal</option>
                  <option value="CUSTOMER_FILE">Customer File</option>
                  <option value="MEETING_NOTES">Meeting Notes</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              {/* Connect to CRM Records */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Connect to CRM Records <span className="text-[11px] font-normal text-slate-500">(Optional)</span>
                  </label>
                  {(editLeadId !== 'none' || editDealId !== 'none' || editCustomerId !== 'none') && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditLeadId('none')
                        setEditDealId('none')
                        setEditCustomerId('none')
                      }}
                      className="text-[11px] font-medium text-blue-600 hover:text-blue-800 transition cursor-pointer"
                    >
                      Clear all
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mb-2.5">
                  Link this document to any relevant Lead, Deal, or Customer (or leave as None for a general document).
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Lead
                    </label>
                    <select
                      value={editLeadId}
                      onChange={(e) => setEditLeadId(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none transition focus:border-blue-500"
                    >
                      <option value="none">-- None --</option>
                      {options?.leads.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Deal
                    </label>
                    <select
                      value={editDealId}
                      onChange={(e) => setEditDealId(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none transition focus:border-blue-500"
                    >
                      <option value="none">-- None --</option>
                      {options?.deals.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Customer
                    </label>
                    <select
                      value={editCustomerId}
                      onChange={(e) => setEditCustomerId(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none transition focus:border-blue-500"
                    >
                      <option value="none">-- None --</option>
                      {options?.customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  disabled={isSubmitting}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !editName.trim()}
                  className="rounded-xl bg-[#1d61e7] px-4 py-2 text-xs font-semibold text-white shadow-md shadow-blue-600/25 hover:bg-blue-700 transition cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. DELETE MODAL */}
      {deleteModalOpen && selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Delete Document</h3>
                <p className="text-xs text-slate-500">This action can be audited</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete{' '}
              <strong className="text-slate-800">"{selectedDoc.name}"</strong>? All versions
              associated with this document will be moved to deleted status.
            </p>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                disabled={isSubmitting}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isSubmitting}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-rose-600/25 hover:bg-rose-700 transition cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. STYLED NOTIFICATION / ALERT DIALOG BOX */}
      {alertDialog.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-start justify-between gap-3 mb-3.5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 shadow-xs">
                  <AlertCircle size={22} strokeWidth={2} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{alertDialog.title}</h3>
                  <p className="text-[11px] font-medium text-slate-400">Document Management Alert</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAlertDialog((prev) => ({ ...prev, open: false }))}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3.5 mb-5">
              <p className="text-xs text-slate-700 leading-relaxed font-medium">
                {alertDialog.message}
              </p>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setAlertDialog((prev) => ({ ...prev, open: false }))}
                className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 transition cursor-pointer active:scale-[0.99]"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
