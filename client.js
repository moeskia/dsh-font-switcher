/**
 * Font switcher, browser half: one Settings section with a font selector.
 *
 * The page reads and writes this bundle's own config through the Host route
 * `/font-switcher/config` (the Host writes it with the in-process config
 * editor), so it does not depend on third-party namespaces being served to the
 * configuration mirror.
 *
 * Two style surfaces, and the split matters: `LIVE_STYLE_ID` is the preview
 * this module owns and never touches `body.style`, because the theme's boot
 * script puts its own font stack there and removing our property would erase
 * the user's theme font. `CSS_ID` is this page's component stylesheet.
 */

window.__ModuleLoader__.load({
  id: 'dsh-font-switcher',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const NS = 'font-switcher'
    const ENDPOINT = '/font-switcher/config'
    const LIVE_STYLE_ID = 'dsh-font-switcher-live'
    const CSS_ID = 'dsh-font-switcher-page-css'

    /** Curated text stacks; the empty id restores the built-in DSH stack. */
    const TEXT_PRESETS = [
      { id: '"Microsoft YaHei"', key: 'p.yahei' },
      { id: '"PingFang SC"', key: 'p.pingfang' },
      { id: '"小米兰亭 Pro VF"', key: 'p.milan' },
      { id: '"Segoe UI", "Microsoft YaHei"', key: 'p.segui' },
      { id: '', key: 'p.default' },
    ]

    /** Curated code stacks. */
    const CODE_PRESETS = [
      { id: 'Consolas, "Microsoft YaHei"', key: 'p.consolas' },
      { id: '"JetBrains Mono", "Microsoft YaHei"', key: 'p.jetbrains' },
      { id: '"Cascadia Code", "Microsoft YaHei"', key: 'p.cascadia' },
      { id: '', key: 'p.default' },
    ]

    /** Stable Host error codes → dictionary keys. */
    const ERROR_KEYS = {
      'cross-origin': 'e.crossOrigin',
      'content-type': 'e.contentType',
      'bad-json': 'e.badJson',
      'bad-field': 'e.badField',
      'too-long': 'e.tooLong',
      'no-field': 'e.noField',
      'no-entry': 'e.noEntry',
      'body-too-large': 'e.tooLarge',
      body: 'e.body',
      'save-failed': 'e.saveFailed',
    }

    const DICT = {
      zh: {
        nav: '字体',
        title: '字体',
        intro: '选择界面字体。只含一个字体族时，中英文来自同一套字重，加粗才会同步。',
        text: '正文字体',
        textDesc: '界面与会话正文',
        code: '代码字体',
        codeDesc: '代码块与行内代码',
        custom: '自定义',
        customPlaceholder: '例如 "Microsoft YaHei"',
        apply: '应用',
        applyTo: '应用{row}',
        loading: '读取中…',
        saving: '保存中…',
        saved: '已保存',
        retry: '重试',
        unavailable: '设置暂不可用',
        emptyDraft: '填写字体名后才能应用',
        readOnly: '当前 Profile 无法保存配置',
        hint: '未安装的字体会回退到系统字体。',
        'e.generic': '保存失败：{error}',
        'e.crossOrigin': '请求来源不被接受，未保存',
        'e.contentType': '请求格式不被接受，未保存',
        'e.badJson': '请求内容无法解析，未保存',
        'e.badField': '字体值必须是文本，未保存',
        'e.tooLong': '字体栈过长，未保存',
        'e.noField': '请求里没有字体字段，未保存',
        'e.noEntry': '当前 Profile 无法保存配置',
        'e.tooLarge': '请求过大，未保存',
        'e.body': '请求读取失败，未保存',
        'e.saveFailed': '配置写入被拒绝',
        'p.yahei': '微软雅黑',
        'p.pingfang': '苹方',
        'p.milan': '小米兰亭 Pro',
        'p.segui': 'Segoe UI + 雅黑',
        'p.consolas': 'Consolas + 雅黑',
        'p.jetbrains': 'JetBrains + 雅黑',
        'p.cascadia': 'Cascadia + 雅黑',
        'p.default': 'DSH 默认',
      },
      en: {
        nav: 'Fonts',
        title: 'Fonts',
        intro: 'Choose the interface font. A single family keeps Latin and CJK on one weight table, so bold tracks both.',
        text: 'Text font',
        textDesc: 'Interface and conversation text',
        code: 'Code font',
        codeDesc: 'Code blocks and inline code',
        custom: 'Custom',
        customPlaceholder: 'e.g. "Microsoft YaHei"',
        apply: 'Apply',
        applyTo: 'Apply {row}',
        loading: 'Loading…',
        saving: 'Saving…',
        saved: 'Saved',
        retry: 'Retry',
        unavailable: 'Settings are unavailable',
        emptyDraft: 'Enter a font name before applying',
        readOnly: 'This profile cannot save configuration',
        hint: 'A font that is not installed falls back to a system font.',
        'e.generic': 'Save failed: {error}',
        'e.crossOrigin': 'The request origin was refused; nothing was saved',
        'e.contentType': 'The request format was refused; nothing was saved',
        'e.badJson': 'The request body could not be parsed; nothing was saved',
        'e.badField': 'A font value must be text; nothing was saved',
        'e.tooLong': 'The font stack is too long; nothing was saved',
        'e.noField': 'The request carried no font field; nothing was saved',
        'e.noEntry': 'This profile cannot save configuration',
        'e.tooLarge': 'The request was too large; nothing was saved',
        'e.body': 'The request could not be read; nothing was saved',
        'e.saveFailed': 'The configuration write was refused',
        'p.yahei': 'Microsoft YaHei',
        'p.pingfang': 'PingFang SC',
        'p.milan': 'Mi Lan Pro',
        'p.segui': 'Segoe UI + YaHei',
        'p.consolas': 'Consolas + YaHei',
        'p.jetbrains': 'JetBrains + YaHei',
        'p.cascadia': 'Cascadia + YaHei',
        'p.default': 'DSH default',
      },
    }

    /** Page stylesheet; only theme tokens, `fsx-` prefixed class names. */
    const CSS = `
.fsx-page{display:grid;gap:14px;max-width:720px;padding:2px 0 8px}
.fsx-title{margin:0;font-size:15px;line-height:1.4;font-weight:600;color:var(--dsw-alias-label-primary,inherit)}
.fsx-intro{margin:0;font-size:13px;line-height:1.6;color:var(--dsw-alias-label-secondary,inherit)}
.fsx-card{border:1px solid var(--dsw-alias-border-l4,rgba(128,128,128,.28));border-radius:var(--dsw-radius-lg,16px);background:var(--dsw-alias-bg-layer-2,rgba(128,128,128,.06));padding:0 16px}
.fsx-row{display:flex;flex-wrap:wrap;align-items:center;gap:16px;padding:12px 0;border-bottom:1px solid var(--dsw-alias-border-l4,rgba(128,128,128,.2))}
.fsx-row:last-child{border-bottom:0}
.fsx-left{flex:0 0 120px;min-width:0}
.fsx-label{font-size:13px;line-height:1.45;color:var(--dsw-alias-label-primary,inherit)}
.fsx-desc{margin:2px 0 0;font-size:12px;line-height:1.5;color:var(--dsw-alias-label-tertiary,inherit)}
.fsx-control{display:flex;align-items:center;gap:6px;flex:1 1 auto;min-width:0}
.fsx-select{flex:0 1 150px;height:30px;box-sizing:border-box;padding:0 8px;font:inherit;font-size:12px;color:inherit;background:transparent;border:1px solid var(--dsw-alias-border-l2,rgba(128,128,128,.35));border-radius:var(--dsw-radius-sm,8px)}
.fsx-input{flex:1 1 120px;min-width:0;height:30px;box-sizing:border-box;padding:0 8px;font:inherit;font-size:12px;color:inherit;background:transparent;border:1px solid var(--dsw-alias-border-l2,rgba(128,128,128,.35));border-radius:var(--dsw-radius-sm,8px)}
.fsx-button{flex:0 0 auto;height:30px;padding:0 10px;font:inherit;font-size:12px;color:inherit;cursor:pointer;background:var(--dsw-alias-bg-layer-3,rgba(128,128,128,.14));border:1px solid var(--dsw-alias-border-l2,rgba(128,128,128,.35));border-radius:var(--dsw-radius-sm,8px)}
.fsx-button:disabled{cursor:default;opacity:.55}
.fsx-error{flex:1 1 100%;margin:0;font-size:12px;line-height:1.5;color:var(--dsw-alias-label-error,var(--dsw-alias-label-primary,inherit))}
.fsx-status{margin:0;font-size:12px;line-height:1.5;color:var(--dsw-alias-label-tertiary,inherit)}
.fsx-select:focus-visible,.fsx-input:focus-visible,.fsx-button:focus-visible{outline:2px solid var(--dsw-alias-brand-primary,currentColor);outline-offset:1px}

`

    /** Strip characters that would end the declaration or the style element. */
    function clean(value) {
      if (typeof value !== 'string') return ''
      return value.replace(/[;{}<>]/g, ' ').replace(/\s+/g, ' ').trim()
    }

    /**
     * Apply a stack to the live document through our own stylesheet.
     * @param text - text stack, '' for the built-in one.
     * @param code - code stack, '' for the built-in one.
     */
    function applyLive(text, code) {
      let style = document.getElementById(LIVE_STYLE_ID)
      if (style === null) {
        style = document.createElement('style')
        style.id = LIVE_STYLE_ID
        document.head.append(style)
      }
      const rules = []
      const textValue = clean(text)
      const codeValue = clean(code)
      if (textValue !== '') rules.push(`--dsh-font-family-text:${textValue} !important;`)
      if (codeValue !== '') rules.push(`--dsh-font-family-code:${codeValue} !important;`)
      style.textContent = rules.length === 0 ? '' : `html body{${rules.join('')}}`
    }

    /** Install the page stylesheet once; `disposeStyles` removes it. */
    function ensureStyles() {
      if (document.getElementById(CSS_ID) !== null) return
      const style = document.createElement('style')
      style.id = CSS_ID
      style.textContent = CSS
      document.head.append(style)
    }

    /** Remove every style this module added. */
    function disposeStyles() {
      document.getElementById(LIVE_STYLE_ID)?.remove()
      document.getElementById(CSS_ID)?.remove()
    }

    /**
     * Read the stored config.
     * @returns the two stacks plus whether this profile accepts writes.
     */
    async function load() {
      const response = await fetch(ENDPOINT, { credentials: 'same-origin', headers: { accept: 'application/json' } })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw Object.assign(new Error(body.error || `HTTP ${response.status}`), { code: body.code })
      return body
    }

    /**
     * Write one field and return the merged pair.
     * @param patch - the single field to change.
     * @returns the accepted pair.
     */
    async function save(patch) {
      const response = await fetch(ENDPOINT, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify(patch),
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw Object.assign(new Error(body.error || `HTTP ${response.status}`), { code: body.code })
      return body
    }

    /** Localized message for one failure. */
    function messageFor(t, error) {
      const key = ERROR_KEYS[error?.code]
      return key === undefined ? t('e.generic', { error: String(error?.message ?? error) }) : t(key)
    }

    /** One settings row: label and description left, control right. */
    function Selector(props) {
      const { t, id, label, desc, presets, value, onCommit, editable, error } = props
      const known = presets.some((preset) => preset.id === value)
      const [customMode, setCustomMode] = React.useState(!known)
      const [draft, setDraft] = React.useState(value)
      const descId = `${id}-desc`

      React.useEffect(() => {
        setDraft(value)
        setCustomMode(!presets.some((preset) => preset.id === value))
      }, [value, presets])

      const current = customMode ? '__custom__' : value
      const draftValue = draft.trim()
      const canApply = editable && draftValue !== '' && draftValue !== value

      const commitCustom = () => {
        if (!canApply) return
        onCommit(draftValue)
      }

      return h(
        'div',
        { className: 'fsx-row' },
        h(
          'div',
          { className: 'fsx-left' },
          h('label', { className: 'fsx-label', htmlFor: id }, label),
          h('p', { className: 'fsx-desc', id: descId }, desc),
        ),
        h(
          'div',
          { className: 'fsx-control' },
          h(
            'select',
            {
              id,
              className: 'fsx-select',
              // Without a custom field this row has one control, so let the
              // select take the row's remaining width instead of leaving a gap.
              style: customMode ? undefined : { flex: '1 1 150px' },
              value: current,
              disabled: !editable,
              'aria-describedby': descId,
              onChange: (event) => {
                const nextId = event.target.value
                if (nextId === '__custom__') {
                  setCustomMode(true)
                  return
                }
                setCustomMode(false)
                onCommit(nextId)
              },
            },
            presets.map((preset) => h('option', { key: preset.id || '__default__', value: preset.id }, t(preset.key))),
            h('option', { value: '__custom__' }, t('custom')),
          ),
          customMode
            ? h(
                React.Fragment,
                null,
                h('input', {
                  className: 'fsx-input',
                  'aria-label': t('custom') + ' · ' + label,
                  'aria-describedby': descId,
                  value: draft,
                  disabled: !editable,
                  placeholder: t('customPlaceholder'),
                  onChange: (event) => setDraft(event.target.value),
                  onBlur: commitCustom,
                  onKeyDown: (event) => {
                    if (event.key === 'Enter') commitCustom()
                    if (event.key === 'Escape') setDraft(value)
                  },
                }),
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'fsx-button',
                    disabled: !canApply,
                    'aria-label': t('applyTo', { row: label }),
                    title: draftValue === '' ? t('emptyDraft') : undefined,
                    // Keep the input from blurring into a second commit when the
                    // button is what takes focus.
                    onMouseDown: (event) => event.preventDefault(),
                    onClick: commitCustom,
                  },
                  t('apply'),
                ),
              )
            : null,
        ),
        error === undefined ? null : h('p', { className: 'fsx-error', role: 'alert' }, error),
      )
    }

    /** The Settings section body. */
    function FontSection(props) {
      const { t } = props
      const [state, setState] = React.useState({ status: 'loading' })
      const [saving, setSaving] = React.useState(false)
      const [notice, setNotice] = React.useState(undefined)
      const [attempt, setAttempt] = React.useState(0)
      const mounted = React.useRef(true)
      const pairRef = React.useRef(undefined)

      /** Apply one pair live and remember it as the current pair. */
      const applyPair = (pair) => {
        pairRef.current = pair
        applyLive(pair.textFontFamily ?? '', pair.codeFontFamily ?? '')
      }

      React.useEffect(() => {
        mounted.current = true
        return () => {
          mounted.current = false
        }
      }, [])

      React.useEffect(() => {
        setState({ status: 'loading' })
        load().then(
          (value) => {
            if (!mounted.current) return
            setState({ status: 'ready', value, editable: value.editable !== false })
            applyPair(value)
          },
          (error) => {
            if (mounted.current) setState({ status: 'error', error: String(error.message ?? error) })
          },
        )
      }, [attempt])

      // The acknowledgement is transient; the hint stays put.
      React.useEffect(() => {
        if (notice?.kind !== 'saved') return
        const timer = setTimeout(() => {
          setNotice((current) => (current?.kind === 'saved' ? undefined : current))
        }, 4000)
        return () => clearTimeout(timer)
      }, [notice])

      const commit = (field, value) => {
        const current = pairRef.current ?? {}
        const previous = current[field] ?? ''
        const optimistic = { ...current, [field]: value }
        setState((latest) => ({ ...latest, status: 'ready', value: optimistic }))
        setNotice(undefined)
        applyPair(optimistic)
        setSaving(true)
        save({ [field]: value }).then(
          (accepted) => {
            if (!mounted.current) return
            const next = {
              textFontFamily: accepted.textFontFamily ?? '',
              codeFontFamily: accepted.codeFontFamily ?? '',
            }
            setSaving(false)
            setState((latest) => ({ ...latest, status: 'ready', editable: accepted.editable !== false, value: next }))
            applyPair(next)
            setNotice({ kind: 'saved' })
          },
          (error) => {
            if (!mounted.current) return
            setSaving(false)
            // Revert only this row; a concurrent edit to the other row survives.
            const reverted = { ...(pairRef.current ?? current), [field]: previous }
            setState((latest) => ({ ...latest, status: 'ready', value: reverted }))
            applyPair(reverted)
            setNotice({ kind: 'error', field, text: messageFor(t, error) })
          },
        )
      }

      const header = [
        h('h2', { key: 'title', className: 'fsx-title' }, t('title')),
        h('p', { key: 'intro', className: 'fsx-intro' }, state.status === 'error' ? t('unavailable') : t('intro')),
      ]

      if (state.status === 'loading') {
        return h(
          'div',
          { className: 'fsx-page' },
          header,
          h('p', { className: 'fsx-status', role: 'status', 'aria-live': 'polite' }, t('loading')),
        )
      }

      if (state.status === 'error') {
        return h(
          'div',
          { className: 'fsx-page' },
          header,
          h('p', { className: 'fsx-status', role: 'status' }, state.error),
          h('div', null, h('button', { type: 'button', className: 'fsx-button', onClick: () => setAttempt((n) => n + 1) }, t('retry'))),
        )
      }

      const editable = state.editable !== false
      const rowError = notice?.kind === 'error' ? notice : undefined
      const status = saving ? t('saving') : notice?.kind === 'saved' ? t('saved') : t('hint')

      return h(
        'div',
        { className: 'fsx-page' },
        header,
        h(
          'div',
          { className: 'fsx-card', 'aria-busy': saving ? 'true' : undefined },
          h(Selector, {
            t,
            id: 'fsx-text-font',
            label: t('text'),
            desc: t('textDesc'),
            presets: TEXT_PRESETS,
            value: state.value?.textFontFamily ?? '',
            editable,
            error: rowError?.field === 'textFontFamily' ? rowError.text : undefined,
            onCommit: (value) => commit('textFontFamily', value),
          }),
          h(Selector, {
            t,
            id: 'fsx-code-font',
            label: t('code'),
            desc: t('codeDesc'),
            presets: CODE_PRESETS,
            value: state.value?.codeFontFamily ?? '',
            editable,
            error: rowError?.field === 'codeFontFamily' ? rowError.text : undefined,
            onCommit: (value) => commit('codeFontFamily', value),
          }),
        ),
        editable ? null : h('p', { className: 'fsx-status', role: 'status' }, t('readOnly')),
        h('p', { className: 'fsx-status', role: 'status', 'aria-live': 'polite' }, status),
      )
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, DICT), 'font-switcher: dictionaries')
        const t = ctx.locale.bind(NS)

        ctx.effect(() => {
          ensureStyles()
          return disposeStyles
        }, 'font-switcher: stylesheets')

        // Apply the stored stack as soon as the page boots, so a window opened
        // from a saved config does not flash the built-in stack.
        load().then(
          (value) => applyLive(value.textFontFamily ?? '', value.codeFontFamily ?? ''),
          () => {},
        )

        ctx.slots.inject('settings.section', () =>
          ctx.slots.register(
            {
              name: 'settings.section',
              id: NS,
              order: 240,
              locale: NS,
              label: () => t('nav'),
              inject: () => ({ t }),
            },
            FontSection,
          ),
        )
      },
    }
  },
})
