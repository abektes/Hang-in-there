import assert from 'node:assert/strict'
import test from 'node:test'
import { decodeBadge, embedUrl, encodeBadge, imageSnippet, isEmbedRequest, isLocalOrigin, liveSnippet } from '../src/utils/badgeEmbed.js'
import { featuredBadge } from '../src/data/showcase.js'

const PHOTO = 'data:image/jpeg;base64,/9j/4AAQSkZJRg+abc='

test('an untouched badge embeds with a bare link', () => {
  assert.equal(encodeBadge(featuredBadge), '')
  assert.equal(embedUrl('https://badges.example/', featuredBadge), 'https://badges.example/?embed')
  assert.ok(isEmbedRequest('?embed'))
  assert.ok(!isEmbedRequest('?embedded=1'))
})

test('round-trips edited text, looks, and uploaded images through the link hash', () => {
  const badge = {
    ...featuredBadge,
    title: 'Demo day & co',
    weekLabel: 'Talks #3',
    badgeId: '108',
    name: 'Zoë Ng',
    role: 'R&D = fun',
    companyName: 'Acme',
    slackImage: PHOTO,
    companyLogo: 'data:image/png;base64,iVBORw0KGgo=',
    surface: 'aurora',
    lanyard: 'white',
  }
  const url = embedUrl('https://badges.example/', badge)
  assert.deepEqual(decodeBadge(url.slice(url.indexOf('#'))), badge)
})

test('rejects remote images, unknown styles, and over-long text from a crafted link', () => {
  const badge = decodeBadge(`#photo=${encodeURIComponent('https://evil.example/x.png')}&logo=javascript:alert(1)&surface=nope&lanyard=nope&name=${'A'.repeat(200)}&role=%E0%A4%A`)
  assert.equal(badge.slackImage, featuredBadge.slackImage)
  assert.equal(badge.companyLogo, '')
  assert.equal(badge.surface, featuredBadge.surface)
  assert.equal(badge.lanyard, featuredBadge.lanyard)
  assert.equal(badge.name.length, 50)
  assert.equal(badge.role, featuredBadge.role)
})

test('writes escaped iframe and image snippets that describe the badge', () => {
  const badge = { ...featuredBadge, name: 'Sam "Q" Lee', role: '' }
  const live = liveSnippet('https://badges.example/?embed#name=x&y', badge)
  assert.match(live, /src="https:\/\/badges\.example\/\?embed#name=x&amp;y"/)
  assert.match(live, /title="Hang In There badge for Sam &quot;Q&quot; Lee"/)
  assert.match(live, /color-scheme: normal/)
  const image = imageSnippet(badge)
  assert.match(image, /src="Sam-Q-Lee-badge\.png"/)
  assert.match(image, /width="280"\s+height="391"/)
})

test('flags links that only work on this machine', () => {
  for (const host of ['localhost', '127.0.0.1', '[::1]', 'mac.local']) assert.ok(isLocalOrigin(host), host)
  assert.ok(!isLocalOrigin('badges.example.com'))
})
