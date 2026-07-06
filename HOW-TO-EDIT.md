# How to make this site yours (no coding needed)

Everything you'll change lives in one file: **index.html**. Open it with any plain text editor —
Notepad (Windows), TextEdit in "Plain Text" mode (Mac), or, easiest of all, a free tool like
**VS Code**. Do not open it by double-clicking (that just opens it in your browser to preview it).

## 1. Replace your name / artist alias
Search the file for **"Meridian"** (Ctrl+F / Cmd+F) — it appears in the browser tab title, the
nav logo ("M."), the loader screen, and the huge hero headline (split as `MERI` + `DIAN`). Replace
each with your own name or alias, keeping the split if you want part of it outlined, e.g. for
"Nova Ash" you'd write `NOV<span class="outline">A ASH</span>`.

## 2. Replace the text
Just edit the words between the tags. For example:
```html
<p class="hero-copy">Currently studying Music Production...</p>
```
Replace everything between `<p ...>` and `</p>` with your own sentence. Do the same for the About
bio, project descriptions, concert details, and contact section. Leave the tags (the bits in
`< >`) exactly where they are.

## 3. Replace the images
All images live in `assets/images/`. Every `<img>` tag points to one, e.g.:
```html
<img src="assets/images/hero-portrait.jpg" alt="...">
```
To swap one: rename your photo to match exactly (e.g. `hero-portrait.jpg`) and drop it into
`assets/images/`, replacing the placeholder — or edit the `src="..."` path to point at your new
filename instead. Keep photos roughly the same shape (portrait, landscape, square) as the
placeholder you're replacing so the layout doesn't shift; the images will crop to fit automatically.

Current placeholders, so you know what to shoot/gather:
- `hero-portrait.jpg` — a strong studio/portrait shot for the homepage
- `about-portrait.jpg`, `about-secondary-1.jpg` — your two About-section portraits (shown side by side)
- `about-studio.jpg`, `about-secondary-2.jpg` — studio / behind-the-scenes strip photos
- `project-0X-cover.jpg` and `project-0X-detail-1/2/3.jpg` — one cover + 3 extra photos per project
- `concert-01.jpg`, `concert-02.jpg`, `concert-03.jpg` — one large photo per concert
- `gallery-01.jpg` … `gallery-09.jpg` — your gallery wall, any 9 photos

## 4. Edit or add a project
Each project has two parts:
- A short **preview block** in `index.html` under `<!-- PROJECTS -->` (title, year, description).
- A full **detail spread** inside `script.js`, in the `PROJECTS` object near the top. Each project
  (`1`, `2`, `3`, `4`) has `title`, `story` (two paragraphs), `software`, `equipment`, `notes`, the
  image filenames it uses, and a `driveLink`. Edit the text inside the quotes — don't touch the
  punctuation around it (commas, curly braces `{ }`, quote marks).

To add a 5th project, copy one whole `<article class="project-row" ...>...</article>` block in
`index.html` and one whole numbered entry in the `PROJECTS` object in `script.js`, then update the
numbers and text.

**Adding a "Listen" button:** each project's `driveLink` field is `null` by default (no button
shows). To add one, paste a share link (e.g. from Google Drive) between the quotes:
```js
driveLink: 'https://drive.google.com/file/d/your-file-id/view'
```
An elegant "Listen" button will appear automatically in that project's detail view — the raw link
is never shown to visitors.

## 4b. Edit the Concerts section
Each concert lives in `index.html` under `<!-- CONCERTS -->` as one `<article class="concert-row">`
block, with a photo, venue, date and a short description. Copy a whole block and update the text
and image filename to add another concert.

## 5. Connect the audio player to a real track (optional)
Right now the "play" button in each project's detail view animates a fake waveform — there's no
real audio file wired up yet, since none were provided. If you want actual playback, the simplest
approach: upload your track (MP3) into `assets/`, then in `script.js` swap the fake button logic
for a real `<audio>` element pointed at that file. If you're not comfortable editing JavaScript,
you can ask any developer (or Claude) to wire this up for you in a few minutes — just say which
project should play which file.

## 6. Update your contact link
This site only shows an Instagram link in the Contact section (no form, since GitHub Pages can't
run one, and no other socials). In `index.html`, find:
```html
<a href="https://www.instagram.com/andrenevesduarte/" ...>
```
Replace the URL with your own Instagram profile link if it ever changes.

## 7. Publishing it (GitHub Pages)
1. Create a GitHub account and a new repository.
2. Upload all the files and folders exactly as they are (`index.html`, `style.css`, `script.js`,
   and the whole `assets` folder) — keep the same folder structure.
3. In the repository's Settings → Pages, set the source to your main branch, root folder.
4. GitHub will give you a live link within a minute or two.

## A quick word on the images
The placeholders are abstract grey/black textures generated for this draft — not real photos of
anyone — so you're free to replace every single one without any rights concerns.
