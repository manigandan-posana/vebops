// views/fe/JobDetail.jsx
import React, { useState } from 'react'
import { useSelector } from 'react-redux'
import { useParams } from 'react-router-dom'
import { usePostProgressMutation, useLazyGetCompletionReportPdfQuery } from '../../features/fe/feApi'
import { downloadBlob } from '../../utils/file'

 const STEPS = [
   { label: 'Started',              value: 'STARTED' },
   { label: 'Material Received',    value: 'MATERIAL_RECEIVED' },
   { label: 'Installation Started', value: 'INSTALLATION_STARTED' },
   { label: 'Completed',            value: 'COMPLETED' },
 ]
const selectUser = (state) => state?.auth?.user || null
const LS_USER_KEY = 'vebops.user'
const readUserFromLS = () => {
  try { return JSON.parse(localStorage.getItem(LS_USER_KEY) || 'null') } catch { return null }
}

export default function JobDetail(){
  const { id } = useParams()
  const reduxUser = useSelector(selectUser)
  const user = reduxUser || readUserFromLS()
  const feId = user?.feId ?? user?.id

  const [status, setStatus] = useState(STEPS[0].value)// maps to backend "status"
  const [remarks, setRemarks] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')

  const [postProgress, { isLoading }] = usePostProgressMutation()
  const [fetchPdf, { data: pdf, isFetching: isPdfLoading }] = useLazyGetCompletionReportPdfQuery()

  async function handlePostProgress(){
    if (!id || !feId) return
    try {
      await postProgress({ woId: id, status, byFeId: feId, remarks, photoUrl }).unwrap()
      setRemarks('')
      // optional: toast success
    } catch (e) {
      // optional: toast error
      console.error(e)
    }
  }

  async function handleDownload(){
    if (!id) return
    const res = await fetchPdf(id).unwrap()
    if (res) downloadBlob(res, `completion-report-${id}.pdf`)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Job #{id}</h1>

      {!feId && (
        <div className="alert">Couldn’t determine Field Engineer ID from your session.</div>
      )}

      <div className="card p-4 grid md:grid-cols-2 gap-3">
        <select className="input" value={status} onChange={e=>setStatus(e.target.value)}>
          {STEPS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>

        <input
          className="input"
          placeholder="Photo URL (optional)"
          value={photoUrl}
          onChange={e=>setPhotoUrl(e.target.value)}
        />

        <input
          className="input md:col-span-2"
          placeholder="Remarks (optional)"
          value={remarks}
          onChange={e=>setRemarks(e.target.value)}
        />

        <button className="btn md:col-span-2" disabled={isLoading || !feId} onClick={handlePostProgress}>
          {isLoading ? 'Posting…' : 'Post Progress'}
        </button>
      </div>

      <div className="card p-4">
        <button className="btn" disabled={isPdfLoading} onClick={handleDownload}>
          {isPdfLoading ? 'Preparing…' : 'Download Completion Report'}
        </button>
      </div>
    </div>
  )
}
