# dsh-font-switcher

Choose the **DSH Web UI** text and code fonts in **Settings → Fonts**, and keep
Latin and CJK text on one weight table.

## Why

DSH's built-in text stack is:

```
-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", …
```

The Latin-first families win for Latin glyphs while the CJK part of the list
wins for Han characters, so one line of text is drawn by **two different
fonts**. Their weight tables do not line up: `Segoe UI` has a real 600 face,
while an incomplete PingFang install may expose only one face declared at
`usWeightClass: 400`. The visible result is that bold UI labels — tabs, tags,
titles, which use `font-weight: 500`/`600` — thicken in English and stay
unchanged in Chinese.

Pointing `--dsh-font-family-text` at a **single family** removes the split:
both scripts resolve from the same font and the same weight table.

## Install

**From the plugin market / npm** (once published):

```
dsh-font-switcher
```

Install it in **Plugins → Add plugin** with that package name, or from the
market listing.

**From this repository:**

```bash
git clone https://github.com/moeskia/dsh-font-switcher.git
```

Then install the checkout as a local directory in **Plugins → Add plugin**.

After installing, restart DSH once so the new client bundle is composed, then
open **Settings → Fonts**.

## Use

| Row | Config field | Default |
| --- | --- | --- |
| Text font | `textFontFamily` | `"Microsoft YaHei"` |
| Code font | `codeFontFamily` | `Consolas, "Microsoft YaHei"` |

Each row offers curated presets, **Custom** (any CSS font list), and **DSH
default** (clears the override). A choice is previewed immediately and saved
through the Host; a refused write reverts the preview and says why under the
row that failed.

## How it works

- **Host half** (`index.js`): emits a `style` index-injection row for every
  rendered page, and serves `GET/POST /font-switcher/config` so the page can
  read and write this plugin's own config. Writes go through the in-process
  config editor (revision-fenced), one field at a time, so two windows editing
  different rows cannot revert each other.
- **Browser half** (`client.js`): registers the `settings.section` page and
  applies the selected stack to the live page through a `<style>` element it
  owns. It never writes `body.style`, because the theme's boot script puts its
  own font stack there.

## Limitations

- Applies to the Web UI (the page the DSH web server renders, including the
  Desktop window). Native desktop shell pages keep their own stylesheet.
- The page cannot enumerate installed fonts (that needs the Local Font Access
  permission), so it offers curated presets plus a custom field. A preset only
  matches when the family name equals the installed one exactly.
- While it holds a value, its `html body` rule with `!important` outranks the
  theme's own font field.

## License

MIT
