import { useEffect, useRef, useState } from 'react'
import { embedUrl, imageSnippet, isLocalOrigin, liveSnippet, shrinkForEmbed } from '../utils/badgeEmbed'

const TABS = [
  { id: 'live', label: 'Live 3D' },
  { id: 'image', label: 'Static image' },
]

// Packs uploads into embed-sized copies. Keeps the last packed badge while a
// new one is prepared so the code block never flashes empty mid-typing.
function usePackedBadge(badge) {
  const [state, setState] = useState({ source: null, packed: null, failed: false })

  useEffect(() => {
    let cancelled = false
    Promise.all([shrinkForEmbed(badge.slackImage, 'photo'), shrinkForEmbed(badge.companyLogo, 'logo')])
      .then(([slackImage, companyLogo]) => {
        if (!cancelled) setState({ source: badge, packed: { ...badge, slackImage, companyLogo }, failed: false })
      })
      .catch(() => {
        if (!cancelled) setState((previous) => ({ ...previous, source: badge, failed: true }))
      })
    return () => { cancelled = true }
  }, [badge])

  return { packed: state.packed, pending: state.source !== badge, failed: state.source === badge && state.failed }
}

function CopyIcon({ done }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {done ? <path d="m5 12.5 4.5 4.5L19 7.5" /> : <><rect x="8.5" y="8.5" width="11" height="11" rx="2" /><path d="M15.5 8.5V6.5a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2" /></>}
    </svg>
  )
}

export default function BadgeEmbed({ badge }) {
  const [tab, setTab] = useState('live')
  const [copiedCode, setCopiedCode] = useState('')
  const [copyFailed, setCopyFailed] = useState(false)
  const tabRefs = useRef({})
  const codeRef = useRef(null)
  const timer = useRef(0)
  const { packed, pending, failed } = usePackedBadge(badge)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const { origin, pathname, hostname } = window.location
  const url = packed && !failed ? embedUrl(`${origin}${pathname}`, packed) : ''
  const code = tab === 'live' ? (url ? liveSnippet(url, badge) : '') : imageSnippet(badge)
  const copied = Boolean(code) && copiedCode === code
  const linkSize = Math.max(1, Math.round(url.length / 1024))
  const carriesImages = Boolean(packed && (packed.slackImage.startsWith('data:') || packed.companyLogo))

  function selectTab(id) {
    setTab(id)
    setCopyFailed(false)
    tabRefs.current[id]?.focus()
  }

  function onTabKey(event) {
    const index = TABS.findIndex(({ id }) => id === tab)
    const next = {
      ArrowRight: TABS[(index + 1) % TABS.length],
      ArrowLeft: TABS[(index - 1 + TABS.length) % TABS.length],
      Home: TABS[0],
      End: TABS[TABS.length - 1],
    }[event.key]
    if (!next) return
    event.preventDefault()
    selectTab(next.id)
  }

  async function copy() {
    setCopyFailed(false)
    try {
      await navigator.clipboard.writeText(code)
      setCopiedCode(code)
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setCopiedCode(''), 2000)
    } catch {
      // Clipboard can be blocked (permissions, insecure origin); select the
      // code so a keyboard copy still works.
      window.getSelection()?.selectAllChildren(codeRef.current)
      setCopyFailed(true)
    }
  }

  let note
  if (tab === 'image') {
    note = 'Download the badge PNG, put it next to your page, then paste this. It stays still, so it works anywhere images do.'
  } else if (failed) {
    note = 'We could not pack your images into the link. Try another photo or logo.'
  } else if (carriesImages) {
    note = `Your photo and logo travel inside the link (about ${linkSize} KB), so anyone with the code can see them.`
  } else {
    note = 'The badge swings on any page that allows iframes. Visitors can grab it too.'
  }

  return (
    <section className="badge-embed" aria-labelledby="embed-title">
      <div className="embed-heading">
        <h2 id="embed-title">Hang it on another page</h2>
      </div>

      <div className="embed-tabs" role="tablist" aria-label="Embed type" onKeyDown={onTabKey}>
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            ref={(node) => { tabRefs.current[id] = node }}
            id={`embed-tab-${id}`}
            className="embed-tab"
            type="button"
            role="tab"
            aria-selected={tab === id}
            aria-controls="embed-panel"
            tabIndex={tab === id ? 0 : -1}
            onClick={() => selectTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div id="embed-panel" role="tabpanel" aria-labelledby={`embed-tab-${tab}`}>
        {tab === 'live' && isLocalOrigin(hostname) && (
          <p className="embed-warning">
            You are on {hostname}, so this link only works on this computer. Host the app, then copy the code again.
          </p>
        )}
        <pre ref={codeRef} className={`code-block${pending && tab === 'live' ? ' is-pending' : ''}`} tabIndex={0} aria-label="Embed code">
          <code>{code || (failed ? 'No embed code yet.' : 'Packing your badge…')}</code>
        </pre>
        <div className="embed-actions">
          <button className="secondary-button copy-button" type="button" onClick={copy} disabled={!code || (tab === 'live' && pending)}>
            <CopyIcon done={copied} />
            {copied ? 'Copied' : 'Copy code'}
          </button>
          <p className="embed-status" role="status" aria-live="polite">
            {copyFailed ? 'Copy was blocked. The code is selected, so press Cmd+C or Ctrl+C.' : copied && <span className="visually-hidden">Embed code copied.</span>}
          </p>
        </div>
        <p className="field-hint embed-note">{note}</p>
      </div>
    </section>
  )
}
