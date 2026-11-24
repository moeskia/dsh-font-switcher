/**
 * Font switcher — overrides the Web UI font stacks.
 *
 * DSH resolves `--dsw-font-family` from `--dsh-font-family-text` and
 * `--ds-font-family-code` from `--dsh-font-family-code` on `body`. The built-in
 * default stack puts Latin-first families (`-apple-system`, `Segoe UI`) ahead
 * of the CJK families, so on Windows Latin text and CJK text come from two
 * different fonts with unrelated weight tables. Pointing `--dsh-font-family-text`
 * at one family makes both scripts resolve from the same font.
 *
 * Two surfaces carry one value:
 *  - every rendered index gets a `style` row, so a reload (or a new window)
 *    starts from the saved stack;
 *  - the browser half applies the same stack live, so a selection is visible
 *    before any reload.
 *
 * Both config fields are volatile, so the saved write updates the running
 * config in place instead of restarting this plugin. Writes are partial: a row
 * sends only its own field, and the Host merges it into the entry, so two
 * windows editing different rows cannot revert each other.
 */

import Schema from '@deepseek-ai/schemastery'

/**
 * Config schema. The fields are volatile because the value is read fresh on
 * every index render and every settings request; the Settings page is this
 * bundle's own client surface, not a schema-generated form.
 */
export const Config = Schema.object({
  /** Font stack for interface and conversation text; empty keeps the built-in stack. */
  textFontFamily: Schema.string().default('"Microsoft YaHei"').volatile(),
  /** Font stack for code blocks and inline code; empty keeps the built-in stack. */
  codeFontFamily: Schema.string().default('Consolas, "Microsoft YaHei"').volatile(),
})

/** Largest config body accepted from the selector, in bytes. */
const MAX_BODY_BYTES = 16 * 1024

/** Largest single font stack accepted, in characters. */
const MAX_FIELD_CHARS = 1000

/** Config fields the selector may write. */
const FIELDS = ['textFontFamily', 'codeFontFamily']

/**
 * Read a config field that may be a volatile wrapper or a plain value.
 * @param field - wrapper or value.
 * @returns the current value.
 */
function read(field) {
  return typeof field?.get === 'function' ? field.get() : field
}

/**
 * Strip characters that would end the declaration or the style element.
 * Quotes, commas and spaces survive, so any CSS font list is still expressible.
 * @param value - raw config text.
 * @returns the sanitized stack, or '' when nothing is left.
 */
function sanitize(value) {
  if (typeof value !== 'string') return ''
  return value.replace(/[;{}<>]/g, ' ').replace(/\s+/g, ' ').trim()
}

/**
 * Current sanitized pair, shared by the read path and the write answer.
 * @param config - validated plugin config.
 * @returns the two stacks.
 */
function currentPair(config) {
  return {
    textFontFamily: sanitize(read(config.textFontFamily)),
    codeFontFamily: sanitize(read(config.codeFontFamily)),
  }
}

/**
 * Build the stylesheet for one config snapshot.
 * @param config - validated plugin config.
 * @returns CSS text, or '' when both fields are empty.
 */
function stylesheet(config) {
  const { textFontFamily: text, codeFontFamily: code } = currentPair(config)
  const rules = []
  // `!important` also beats an inline `--dsh-font-family-text` the theme's boot
  // script would write on `body` when the user configured the theme's own font
  // field, so the two plugins cannot silently disagree.
  if (text !== '') rules.push(`--dsh-font-family-text: ${text} !important;`)
  if (code !== '') rules.push(`--dsh-font-family-code: ${code} !important;`)
  // `html body` outranks the theme's own `body` declarations regardless of
  // stylesheet order, so the override cannot be shadowed by a later sheet.
  return rules.length === 0 ? '' : `html body{${rules.join('')}}`
}

/**
 * An error carrying a stable machine code, so the browser half can localize it.
 * @param code - stable code.
 * @param message - English fallback text.
 * @returns the error.
 */
function coded(code, message) {
  return Object.assign(new Error(message), { code })
}

/**
 * Publish the font override into every rendered index and serve the settings
 * route the client selector reads and writes.
 * @param ctx - Host plugin context.
 * @param config - validated plugin config.
 */
export function apply(ctx, config) {
  // Captured once: the handler must persist into this plugin's own entry.
  const entry = ctx.fiber.entry
  ctx.on('webserver/index-inject', (table) => {
    const css = stylesheet(config)
    if (css !== '') table.push({ kind: 'style', text: css })
  })

  ctx.inject(['webServer', 'configEditor'], (scope) => {
    scope.effect(
      () =>
        scope.webServer.register({
          kind: 'exact',
          path: '/font-switcher/config',
          handler: (req, res) => handleConfig(scope, entry, config, req, res),
        }),
      'font-switcher: settings route',
    )
  })
}

/**
 * Whether a request comes from this page's own origin.
 *
 * The framework's `/api` transport mounts its own Host/Origin checks; this
 * route is ours, so it carries the equivalent guard: a cross-site page must
 * not be able to write the profile through a simple request.
 * @param req - incoming request.
 * @returns true for a same-origin (or non-browser) caller.
 */
function sameOrigin(req) {
  const site = req.headers['sec-fetch-site']
  if (typeof site === 'string' && site !== 'same-origin' && site !== 'none') return false
  const origin = req.headers.origin
  if (typeof origin === 'string') {
    try {
      return new URL(origin).host === String(req.headers.host ?? '')
    } catch {
      return false
    }
  }
  return true
}

/**
 * Answer the selector's read and write requests for this plugin's own config.
 * The write rides the in-process config editor, so it is revision-fenced and
 * serialized with every other profile change instead of rewriting YAML here.
 * @param scope - context owning `webServer` and `configEditor`.
 * @param entry - the plugin's own profile entry.
 * @param config - live plugin config.
 * @param req - incoming request.
 * @param res - response to complete.
 */
async function handleConfig(scope, entry, config, req, res) {
  const json = (status, body) => {
    res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
    res.end(JSON.stringify(body))
  }

  if (req.method === 'GET') {
    // `editable` lets the page present a read-only state before the user tries
    // a write that this profile could never persist.
    json(200, { ...currentPair(config), editable: entry !== undefined })
    return
  }
  if (req.method !== 'POST') {
    res.writeHead(405, { allow: 'GET, POST', 'cache-control': 'no-store' })
    res.end()
    return
  }
  if (!sameOrigin(req)) {
    json(403, { code: 'cross-origin', error: 'Cross-origin request refused' })
    return
  }
  // A JSON content type forces a cross-site caller through a preflight this
  // route never answers; it also keeps form-encoded bodies out.
  if (!/^application\/json\b/i.test(String(req.headers['content-type'] ?? ''))) {
    json(415, { code: 'content-type', error: 'Expected application/json' })
    return
  }

  let raw
  try {
    raw = await readBody(req)
  } catch (error) {
    json(error?.status ?? 400, { code: error?.code ?? 'body', error: String(error?.message ?? error) })
    return
  }

  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch {
    json(400, { code: 'bad-json', error: 'Invalid JSON body' })
    return
  }

  const patch = {}
  for (const field of FIELDS) {
    const value = parsed?.[field]
    if (value === undefined) continue
    if (typeof value !== 'string') {
      json(400, { code: 'bad-field', error: `${field} must be a string` })
      return
    }
    if (value.length > MAX_FIELD_CHARS) {
      json(400, { code: 'too-long', error: `Each font stack must be at most ${MAX_FIELD_CHARS} characters` })
      return
    }
    patch[field] = sanitize(value)
  }
  if (Object.keys(patch).length === 0) {
    json(400, { code: 'no-field', error: 'The body carries no font field' })
    return
  }

  try {
    if (entry === undefined) throw coded('no-entry', 'Configuration cannot be saved in this profile')
    let merged
    const editor = scope.configEditor
    // Merge into what the entry holds now, so a concurrent edit to the other
    // row from another window survives this write.
    await editor.edit(entry, (current) => {
      merged = { ...current, ...patch }
      return merged
    })
    json(200, {
      textFontFamily: String(merged?.textFontFamily ?? patch.textFontFamily ?? ''),
      codeFontFamily: String(merged?.codeFontFamily ?? patch.codeFontFamily ?? ''),
      editable: true,
    })
  } catch (error) {
    json(error?.status ?? 409, { code: error?.code ?? 'save-failed', error: String(error?.message ?? error) })
  }
}

/**
 * Read a request body with a hard size cap. An oversized body stops buffering
 * and rejects with `status: 413`; the socket is left to drain so the error
 * response still reaches the caller.
 * @param req - incoming request.
 * @returns the decoded text.
 */
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    let settled = false
    const fail = (error) => {
      if (settled) return
      settled = true
      reject(error)
    }
    req.on('data', (chunk) => {
      if (settled) return
      size += chunk.length
      if (size > MAX_BODY_BYTES) {
        const error = coded('body-too-large', 'Body too large')
        error.status = 413
        fail(error)
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      if (settled) return
      settled = true
      resolve(Buffer.concat(chunks).toString('utf8'))
    })
    req.on('error', fail)
  })
}
