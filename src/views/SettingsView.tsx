import { useState } from 'react'
import { observer } from 'mobx-react-lite'
import { authStore } from '../stores/AuthStore'
import { api } from '../api/client'
import s from './SettingsView.module.css'

const FEATURE_KEYS = [
  { key: 'showCases', label: 'Cases', desc: 'Group related contacts and deals into cases' },
  { key: 'showTags', label: 'Tags', desc: 'Categorise contacts and deals with colour tags' },
  { key: 'showActivity', label: 'Activity Feed', desc: 'Global log of all CRM activity' },
  { key: 'showTemplates', label: 'Email Templates', desc: 'Save reusable email drafts' },
]

function getFeatures(): Record<string, boolean> {
  try { return JSON.parse(localStorage.getItem('tenne_features') ?? '{}') } catch { return {} }
}

function setFeatures(f: Record<string, boolean>) {
  localStorage.setItem('tenne_features', JSON.stringify(f))
}

export function getFeature(key: string): boolean {
  const f = getFeatures()
  return f[key] !== false
}

export const SettingsView = observer(() => {
  const session = authStore.session!
  const [features, setFeaturesState] = useState(getFeatures)
  const [name, setName] = useState(session.name)
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' })
  const [pwStatus, setPwStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [nameStatus, setNameStatus] = useState<'idle' | 'saved'>('idle')

  function toggleFeature(key: string) {
    const updated = { ...features, [key]: !(features[key] !== false) }
    setFeaturesState(updated)
    setFeatures(updated)
    window.dispatchEvent(new Event('tenne_features_changed'))
  }

  async function saveName() {
    if (!name.trim()) return
    authStore.setSession({ ...session, name: name.trim() })
    setNameStatus('saved')
    setTimeout(() => setNameStatus('idle'), 2000)
  }

  async function changePassword() {
    if (pw.next !== pw.confirm) { setPwStatus('error'); return }
    if (pw.next.length < 8) { setPwStatus('error'); return }
    setPwStatus('saving')
    try {
      await api.post('/auth/change-password', { currentPassword: pw.current, newPassword: pw.next })
      setPwStatus('saved')
      setPw({ current: '', next: '', confirm: '' })
      setTimeout(() => setPwStatus('idle'), 2000)
    } catch { setPwStatus('error') }
  }

  return (
    <div className={s.page}>
      <h1 className={s.title}>Settings</h1>

      <div className={s.section}>
        <div className={s.sectionTitle}>Profile</div>
        <div className={s.row}>
          <label className={s.label}>Name</label>
          <input className={s.input} value={name} onChange={e => setName(e.target.value)} />
          <button className={s.saveBtn} onClick={saveName}>{nameStatus === 'saved' ? 'Saved ✓' : 'Save'}</button>
        </div>
        <div className={s.row}>
          <label className={s.label}>Email</label>
          <span className={s.staticVal}>{session.email}</span>
        </div>
      </div>

      <div className={s.section}>
        <div className={s.sectionTitle}>Change Password</div>
        <div className={s.col}>
          <input className={s.input} type="password" placeholder="Current password" value={pw.current} onChange={e => setPw(p => ({ ...p, current: e.target.value }))} />
          <input className={s.input} type="password" placeholder="New password (min 8)" value={pw.next} onChange={e => setPw(p => ({ ...p, next: e.target.value }))} />
          <input className={s.input} type="password" placeholder="Confirm new password" value={pw.confirm} onChange={e => setPw(p => ({ ...p, confirm: e.target.value }))} />
          {pwStatus === 'error' && <span className={s.error}>Passwords don't match or too short.</span>}
          <button className={s.saveBtn} onClick={changePassword} disabled={pwStatus === 'saving'}>
            {pwStatus === 'saving' ? 'Saving…' : pwStatus === 'saved' ? 'Changed ✓' : 'Change Password'}
          </button>
        </div>
      </div>

      <div className={s.section}>
        <div className={s.sectionTitle}>Features</div>
        <p className={s.hint}>Turn off features you don't use so they stay out of the way.</p>
        {FEATURE_KEYS.map(f => (
          <div key={f.key} className={s.featureRow}>
            <div className={s.featureInfo}>
              <span className={s.featureLabel}>{f.label}</span>
              <span className={s.featureDesc}>{f.desc}</span>
            </div>
            <button className={`${s.toggle} ${features[f.key] !== false ? s.toggleOn : ''}`} onClick={() => toggleFeature(f.key)}>
              <span className={s.toggleKnob} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
})
