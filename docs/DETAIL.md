# Font switcher

Replaces the Web UI text and code font stacks, and adds a **Fonts** section to
Settings so the stack can be chosen in the app.

## Why it exists

The built-in stack is
`-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", …`.
On Windows the Latin-first families win for Latin text while the CJK part of
the list wins for Han characters, so one line of text is drawn by two fonts.
Their weight tables do not line up: `Segoe UI` has a real 600 face while an
incomplete PingFang install may expose only one face at `usWeightClass: 400`.
The visible result is that bold UI labels (tabs, tags, titles, which use
`font-weight: 500`/`600`) thicken in English and stay unchanged in Chinese.

Pointing `--dsh-font-family-text` at a single family removes the split.

## Where it appears

**Settings → Fonts**. Two selectors:

| Selector | Field | Default |
| --- | --- | --- |
| Text font | `textFontFamily` | `"Microsoft YaHei"` |
| Code font | `codeFontFamily` | `Consolas, "Microsoft YaHei"` |

Each selector also offers **Custom…**, which takes any CSS font list; and the
**DSH default** entry clears the override so the built-in stack returns.

## How a choice travels

1. The browser writes the changed field to this bundle's own Host route
   `POST /font-switcher/config` — one field per edit, not the whole pair.
2. The Host checks the request is same-origin and carries `application/json`,
   then merges the field into the entry through the in-process config editor,
   so the write is revision-fenced and serialized with every other profile
   change. A concurrent edit to the other field therefore survives.
3. The saved stack is rendered into every index as a `style` row, and the
   browser also previews the selection immediately through a `<style>` element
   this plugin owns. A refused write reverts the preview and explains itself
   under the row that failed.

The page never writes `body.style`: the theme's boot script puts its own font
stack there, and removing a property from that inline style would erase the
user's theme font.

## Scope and limitations

- Applies to the Web UI (the page served by the DSH web server, including the
  Desktop window). The native desktop shell pages keep their own stylesheet.
- This section does not enumerate installed fonts: a browser list needs the
  Local Font Access permission, so the page offers curated presets plus a
  custom field. A preset only matches when its family name equals the installed
  one exactly; anything else falls back to a system font.
- A profile that cannot persist configuration reports it up front: the rows
  render disabled with a note instead of accepting a choice that would fail.
- The injected rule targets `html body` with `!important`, so it outranks the
  theme's own `body` declarations and any inline value the theme's boot script
  writes. The plugin therefore wins over the theme's own font field while it
  holds a value.
