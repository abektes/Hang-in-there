import { useEffect, useRef, useState } from 'react'
import { featuredBadge } from '../data/showcase'
import { LANYARDS, SURFACES, lanyardColor } from '../data/badgeStyles'
import { downloadBadge } from '../utils/badgeTexture'

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const IMAGE_ACCEPT = IMAGE_TYPES.join(',')
const MAX_PHOTO_SIZE = 10 * 1024 * 1024
const MAX_LOGO_SIZE = 5 * 1024 * 1024

function readImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Unable to read this image.'))
    reader.onload = () => {
      const image = new Image()
      image.onload = () => resolve(reader.result)
      image.onerror = () => reject(new Error('This image could not be opened.'))
      image.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}

// One upload slot (portrait or logo): validates the file, ignores results from
// a superseded pick, and writes the data URL into the badge field.
function useImageUpload({ field, maxSize, noun, onChange, onActivity }) {
  const version = useRef(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => () => { version.current += 1 }, [])

  function cancel() {
    version.current += 1
    setBusy(false)
    setError('')
  }

  async function pick(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    const current = ++version.current
    setError('')
    setBusy(false)
    onActivity()

    if (!IMAGE_TYPES.includes(file.type)) {
      setError('Choose a JPG, PNG, or WebP image.')
      return
    }
    if (file.size > maxSize) {
      setError(`This ${noun} is too large. Choose an image under ${maxSize / 1024 / 1024} MB.`)
      return
    }

    setBusy(true)
    try {
      const image = await readImage(file)
      if (current !== version.current) return
      onChange((badge) => ({ ...badge, [field]: image }))
    } catch {
      if (current === version.current) setError(`We could not open that ${noun}. Try another JPG, PNG, or WebP.`)
    } finally {
      if (current === version.current) setBusy(false)
    }
  }

  return { busy, error, pick, cancel }
}

function DownloadIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v12m-5-5 5 5 5-5M5 16v4h14v-4" />
    </svg>
  )
}

export default function BadgeCustomizer({ badge, onChange, texture, textureStatus, textureError }) {
  const photoInput = useRef(null)
  const logoInput = useRef(null)
  const [downloadStatus, setDownloadStatus] = useState('')
  const clearStatus = () => setDownloadStatus('')
  const photo = useImageUpload({ field: 'slackImage', maxSize: MAX_PHOTO_SIZE, noun: 'photo', onChange, onActivity: clearStatus })
  const logo = useImageUpload({ field: 'companyLogo', maxSize: MAX_LOGO_SIZE, noun: 'logo', onChange, onActivity: clearStatus })

  const isOriginal = ['title', 'weekLabel', 'badgeId', 'name', 'role', 'slackImage', 'companyName', 'companyLogo', 'surface', 'lanyard']
    .every((field) => badge[field] === featuredBadge[field])
  const busy = photo.busy || logo.busy
  const canDownload = textureStatus === 'ready' && !busy && Boolean(badge.name.trim() && badge.role.trim())

  function updateField(field, value) {
    clearStatus()
    onChange({ ...badge, [field]: value })
  }

  function restorePhoto() {
    photo.cancel()
    clearStatus()
    onChange((current) => ({ ...current, slackImage: featuredBadge.slackImage }))
  }

  function removeLogo() {
    logo.cancel()
    clearStatus()
    onChange((current) => ({ ...current, companyLogo: '' }))
  }

  function resetBadge() {
    photo.cancel()
    logo.cancel()
    clearStatus()
    onChange(featuredBadge)
  }

  async function exportBadge() {
    clearStatus()
    try {
      await downloadBadge(texture, badge.name, { surface: badge.surface })
      setDownloadStatus('Your badge PNG is ready.')
    } catch {
      setDownloadStatus('Download failed. Please try again.')
    }
  }

  const progress = photo.busy ? 'Reading your photo…' : logo.busy ? 'Reading your logo…' : ''

  return (
    <form className="badge-customizer" aria-labelledby="customizer-title" onSubmit={(event) => event.preventDefault()}>
      <div className="customizer-heading">
        <h2 id="customizer-title">Make it yours</h2>
        <button className="text-button" type="button" onClick={resetBadge} disabled={isOriginal && !busy && !photo.error && !logo.error}>
          Reset
        </button>
      </div>

      <fieldset className="customizer-group">
        <legend>Badge</legend>
        <div className="form-field">
          <label htmlFor="badge-event">Event</label>
          <input id="badge-event" name="event" autoComplete="off" value={badge.title} maxLength={40} placeholder={featuredBadge.title} onChange={(event) => updateField('title', event.target.value)} />
        </div>
        <div className="detail-fields">
          <div className="form-field">
            <label htmlFor="badge-tagline">Tagline</label>
            <input id="badge-tagline" name="tagline" autoComplete="off" value={badge.weekLabel} maxLength={32} placeholder="Under the event" onChange={(event) => updateField('weekLabel', event.target.value)} />
          </div>
          <div className="form-field">
            <label htmlFor="badge-number">Number</label>
            <input id="badge-number" name="badge-number" autoComplete="off" value={badge.badgeId} maxLength={4} placeholder="No." onChange={(event) => updateField('badgeId', event.target.value)} />
          </div>
        </div>
        <div className="look-fields">
          <div className="form-field">
            <label htmlFor="badge-surface">Surface</label>
            <div className="select-control">
              <select id="badge-surface" value={badge.surface} onChange={(event) => updateField('surface', event.target.value)}>
                {SURFACES.map((surface) => <option key={surface.id} value={surface.id}>{surface.label}</option>)}
              </select>
            </div>
          </div>
          <div className="form-field">
            <label htmlFor="badge-lanyard">Lanyard</label>
            <div className="select-control has-swatch">
              <span className="select-swatch" style={{ background: lanyardColor(badge.lanyard, badge.surface) }} aria-hidden="true" />
              <select id="badge-lanyard" value={badge.lanyard} onChange={(event) => updateField('lanyard', event.target.value)}>
                {LANYARDS.map((lanyard) => <option key={lanyard.id} value={lanyard.id}>{lanyard.label}</option>)}
              </select>
            </div>
          </div>
        </div>
      </fieldset>

      <fieldset className="customizer-group">
        <legend>Speaker</legend>
        <div className="image-control">
          <img className="image-thumbnail" src={badge.slackImage} alt="Current badge portrait" />
          <div className="image-actions">
            <button className="secondary-button" type="button" onClick={() => photoInput.current?.click()} aria-describedby="photo-guidance photo-error">
              {photo.busy ? 'Reading photo…' : 'Change photo'}
            </button>
            <p id="photo-guidance" className="field-hint">JPG, PNG, or WebP · Up to 10 MB</p>
            {badge.slackImage !== featuredBadge.slackImage && (
              <button type="button" className="text-button inline-action" onClick={restorePhoto}>Use original photo</button>
            )}
          </div>
          <input ref={photoInput} className="visually-hidden" tabIndex={-1} type="file" accept={IMAGE_ACCEPT} aria-label="Upload a badge portrait" onChange={photo.pick} />
        </div>
        <p id="photo-error" className="field-error" role="alert">{photo.error}</p>

        <div className="form-field">
          <label htmlFor="badge-name">Name</label>
          <input id="badge-name" name="name" autoComplete="name" value={badge.name} maxLength={50} required placeholder="Your name" onChange={(event) => updateField('name', event.target.value)} />
        </div>
        <div className="form-field">
          <label htmlFor="badge-role">Role</label>
          <input id="badge-role" name="role" autoComplete="organization-title" value={badge.role} maxLength={70} required placeholder="What you do" onChange={(event) => updateField('role', event.target.value)} />
        </div>
      </fieldset>

      <fieldset className="customizer-group">
        <legend>Company</legend>
        <div className="image-control">
          {badge.companyLogo ? (
            <img className="image-thumbnail is-logo" src={badge.companyLogo} alt="Current company logo" />
          ) : (
            <span className="image-thumbnail is-empty" aria-hidden="true">No logo</span>
          )}
          <div className="image-actions">
            <button className="secondary-button" type="button" onClick={() => logoInput.current?.click()} aria-describedby="logo-guidance logo-error">
              {logo.busy ? 'Reading logo…' : badge.companyLogo ? 'Change logo' : 'Upload logo'}
            </button>
            <p id="logo-guidance" className="field-hint">Transparent PNGs print in white · Up to 5 MB</p>
            {badge.companyLogo && (
              <button type="button" className="text-button inline-action" onClick={removeLogo}>Remove logo</button>
            )}
          </div>
          <input ref={logoInput} className="visually-hidden" tabIndex={-1} type="file" accept={IMAGE_ACCEPT} aria-label="Upload a company logo" onChange={logo.pick} />
        </div>
        <p id="logo-error" className="field-error" role="alert">{logo.error}</p>

        <div className="form-field">
          <label htmlFor="badge-company">
            Company name <span className="label-note">Optional</span>
          </label>
          <input id="badge-company" name="organization" autoComplete="organization" value={badge.companyName} maxLength={40} placeholder="Where you work" onChange={(event) => updateField('companyName', event.target.value)} />
        </div>
      </fieldset>

      <p className="customizer-note">Changes appear on both sides of your badge.</p>
      <button className="download-button" type="button" disabled={!canDownload} onClick={exportBadge}>
        <DownloadIcon />
        Download badge
        <span className="download-format">PNG</span>
      </button>
      <p className={`customizer-status${textureError ? ' is-error' : ''}`} role="status" aria-live="polite">
        {progress || textureError || (textureStatus === 'loading' ? 'Updating your preview…' : downloadStatus)}
      </p>
    </form>
  )
}
