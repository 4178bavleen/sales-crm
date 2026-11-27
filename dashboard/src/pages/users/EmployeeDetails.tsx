import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Building2, CreditCard, UserRound } from 'lucide-react'
import type { EmployeeDetailUser } from '../../types/employeeDetail'
import { fetchEmployeeDetail, saveEmployeeBank, saveEmployeeCompany, saveEmployeePersonal, uploadEmployeeAvatar, uploadEmployeeIdCard } from '../../lib/employeeDetails'
import { API_URL } from '../../lib/endpoints'

type Tab = 'personal' | 'bank' | 'company'
const inputCls = 'w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none'
const labelCls = 'block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5'

function fileUrl(path?: string | null) {
  if (!path) return ''
  if (/^https?:\/\//.test(path)) return path
  const base = API_URL.replace(/\/api\/v1\/?$/, '')
  return `${base}${path.startsWith('/') ? path : `/${path}`}`
}

export default function EmployeeDetails() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const userId = Number(id)
  const [tab, setTab] = useState<Tab>('personal')
  const [user, setUser] = useState<EmployeeDetailUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [personal, setPersonal] = useState<any>({})
  const [bank, setBank] = useState<any>({})
  const [company, setCompany] = useState<any>({})

  const hydrate = (u: EmployeeDetailUser) => {
    const p = u.employeeProfile || {}
    setUser(u)
    setPersonal({
      fullName: u.name || '', fatherName: p.fatherName || '', mobileNumber: u.phone || '',
      emergencyMobileNumber: p.emergencyMobile || '', email: u.email || '', aadharNumber: p.aadharNumber || '',
      panNumber: p.panNumber || '', bloodGroup: p.bloodGroup || '', dateOfBirth: p.dateOfBirth?.slice(0, 10) || '',
      state: p.state || '', city: p.city || '', permanentAddress: p.permanentAddress || '', avatarPath: p.avatarPath || '',
    })
    setBank({ bankName: p.bankName || '', accountNumber: p.bankAccountNumber || '', ifscCode: p.bankIfscCode || '' })
    setCompany({
      employeeCode: p.employeeCode || '', designation: p.designationTitle || '', joiningDate: u.joiningDate?.slice(0, 10) || '',
      officialMail: p.officialMail || '', idCardPath: p.idCardPath || '', idCardName: p.idCardName || '', laptopOrMobile: p.laptopOrMobile || '',
      employmentType: p.employmentType || 'FULL_TIME', employmentStatus: p.employmentStatus || 'ACTIVE', assignedClient: p.assignedClient || '',
      workAssigned: p.workAssigned || '', lastWorkingDate: p.lastWorkingDate?.slice(0, 10) || '', handoverName: p.handoverName || '', handoverDate: p.handoverDate?.slice(0, 10) || '',
    })
  }

  const load = async () => {
    try { setLoading(true); hydrate(await fetchEmployeeDetail(userId)) }
    catch (e: any) { setMsg({ type: 'error', text: e.message || 'Failed to load employee' }) }
    finally { setLoading(false) }
  }
  useEffect(() => { if (userId) load() }, [userId])

  const run = async (fn: () => Promise<EmployeeDetailUser>, ok: string) => {
    try { setSaving(true); setMsg(null); hydrate(await fn()); setMsg({ type: 'success', text: ok }) }
    catch (e: any) { setMsg({ type: 'error', text: e.message || 'Save failed' }) }
    finally { setSaving(false) }
  }

  if (loading) return <div className="p-6 text-sm text-slate-500">Loading employee details...</div>
  if (!user) return <div className="p-6 text-sm text-rose-600">Employee not found.</div>

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/employees')} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"><ArrowLeft size={16} /></button>
        <div>
          <h1 className="text-xl font-bold text-slate-900">{user.name}</h1>
          <p className="text-xs text-slate-500">{user.email} • {user.role?.name || 'Employee'}</p>
        </div>
      </div>

      {msg && <div className={`rounded-xl border px-4 py-3 text-sm ${msg.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>{msg.text}</div>}

      <div className="flex gap-2 border-b border-slate-200">
        {([['personal', 'Personal Details', UserRound], ['bank', 'Bank Details', CreditCard], ['company', 'Company Details', Building2]] as const).map(([k, label, Icon]) => (
          <button key={k} onClick={() => setTab(k)} className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium ${tab === k ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}><Icon size={16} />{label}</button>
        ))}
      </div>

      {tab === 'personal' && (
        <form onSubmit={(e) => { e.preventDefault(); run(() => saveEmployeePersonal(userId, personal), 'Personal details saved') }} className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5">
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 overflow-hidden rounded-full bg-slate-100 border border-slate-200">{personal.avatarPath ? <img src={fileUrl(personal.avatarPath)} alt="avatar" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-slate-400"><UserRound /></div>}</div>
            <div><label className={labelCls}>Image</label><input type="file" accept="image/*" onChange={async (e) => { const f = e.target.files?.[0]; if (f) await run(() => uploadEmployeeAvatar(userId, f), 'Image uploaded') }} className="text-sm" /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[['fullName','Full Name'],['fatherName',"Father's Name"],['mobileNumber','Mobile Number'],['emergencyMobileNumber','Emergency Mobile Number'],['email','Email'],['aadharNumber','Aadhar Number'],['panNumber','PAN Number'],['bloodGroup','Blood Group'],['state','State'],['city','City']].map(([k,l]) => (
              <div key={k}><label className={labelCls}>{l}</label><input className={inputCls} value={personal[k] || ''} onChange={(e) => setPersonal({ ...personal, [k]: e.target.value })} /></div>
            ))}
            <div><label className={labelCls}>Date of Birth</label><input type="date" className={inputCls} value={personal.dateOfBirth || ''} onChange={(e) => setPersonal({ ...personal, dateOfBirth: e.target.value })} /></div>
            <div className="md:col-span-2"><label className={labelCls}>Permanent Address</label><textarea className={inputCls} rows={3} value={personal.permanentAddress || ''} onChange={(e) => setPersonal({ ...personal, permanentAddress: e.target.value })} /></div>
          </div>
          <button disabled={saving} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{saving ? 'Saving...' : 'Save Personal Details'}</button>
        </form>
      )}

      {tab === 'bank' && (
        <form onSubmit={(e) => { e.preventDefault(); run(() => saveEmployeeBank(userId, bank), 'Bank details saved') }} className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[['bankName','Bank Name'],['accountNumber','Account Number'],['ifscCode','IFSC Code']].map(([k,l]) => (
              <div key={k}><label className={labelCls}>{l}</label><input className={inputCls} value={bank[k] || ''} onChange={(e) => setBank({ ...bank, [k]: e.target.value })} /></div>
            ))}
          </div>
          <button disabled={saving} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{saving ? 'Saving...' : 'Save Bank Details'}</button>
        </form>
      )}

      {tab === 'company' && (
        <form onSubmit={(e) => { e.preventDefault(); run(() => saveEmployeeCompany(userId, company), 'Company details saved') }} className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className={labelCls}>Employee Code</label><input className={inputCls} value={company.employeeCode || ''} onChange={(e) => setCompany({ ...company, employeeCode: e.target.value })} /></div>
            <div><label className={labelCls}>Designation / Role</label><input className={inputCls} value={company.designation || ''} onChange={(e) => setCompany({ ...company, designation: e.target.value })} placeholder="e.g. Sales Executive" /></div>
            <div><label className={labelCls}>Joining Date</label><input type="date" className={inputCls} value={company.joiningDate || ''} onChange={(e) => setCompany({ ...company, joiningDate: e.target.value })} /></div>
            <div><label className={labelCls}>Official Mail</label><input className={inputCls} value={company.officialMail || ''} onChange={(e) => setCompany({ ...company, officialMail: e.target.value })} /></div>
            <div><label className={labelCls}>ID Card</label><input type="file" className="text-sm" onChange={async (e) => { const f = e.target.files?.[0]; if (f) await run(() => uploadEmployeeIdCard(userId, f), 'ID card uploaded') }} />{company.idCardPath && <a href={fileUrl(company.idCardPath)} target="_blank" className="mt-1 block text-xs text-blue-600 underline">{company.idCardName || 'View ID Card'}</a>}</div>
            <div><label className={labelCls}>Laptop / Mobile</label><input className={inputCls} value={company.laptopOrMobile || ''} onChange={(e) => setCompany({ ...company, laptopOrMobile: e.target.value })} /></div>
            <div><label className={labelCls}>Employment Type</label><select className={inputCls} value={company.employmentType || 'FULL_TIME'} onChange={(e) => setCompany({ ...company, employmentType: e.target.value })}><option value="FULL_TIME">Full Time</option><option value="PART_TIME">Part Time</option><option value="CONTRACT">Contract</option><option value="INTERN">Intern</option></select></div>
            <div><label className={labelCls}>Employment Status</label><select className={inputCls} value={company.employmentStatus || 'ACTIVE'} onChange={(e) => setCompany({ ...company, employmentStatus: e.target.value })}><option value="ACTIVE">Active</option><option value="PROBATION">Probation</option><option value="ON_LEAVE">On Leave</option><option value="NOTICE_PERIOD">Notice Period</option><option value="RESIGNED">Resigned</option><option value="TERMINATED">Terminated</option><option value="INACTIVE">Inactive</option></select></div>
            <div><label className={labelCls}>Assigned Client</label><input className={inputCls} value={company.assignedClient || ''} onChange={(e) => setCompany({ ...company, assignedClient: e.target.value })} /></div>
            <div className="md:col-span-2"><label className={labelCls}>Work Assigned</label><textarea className={inputCls} rows={3} value={company.workAssigned || ''} onChange={(e) => setCompany({ ...company, workAssigned: e.target.value })} /></div>
            <div><label className={labelCls}>Last Working Date</label><input type="date" className={inputCls} value={company.lastWorkingDate || ''} onChange={(e) => setCompany({ ...company, lastWorkingDate: e.target.value })} /></div>
            <div><label className={labelCls}>Handover Name</label><input className={inputCls} value={company.handoverName || ''} onChange={(e) => setCompany({ ...company, handoverName: e.target.value })} /></div>
            <div><label className={labelCls}>Handover Date</label><input type="date" className={inputCls} value={company.handoverDate || ''} onChange={(e) => setCompany({ ...company, handoverDate: e.target.value })} /></div>
          </div>
          <button disabled={saving} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{saving ? 'Saving...' : 'Save Company Details'}</button>
        </form>
      )}
    </div>
  )
}
