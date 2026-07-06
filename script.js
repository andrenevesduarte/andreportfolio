/* ==========================================================================
   MERIDIAN — script.js
   Vanilla JS only. No frameworks, no build step.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

  /* Shared playback state — the single source of truth for "is a track
     currently playing", read by the tracks carousel, the mini player and
     the signature meter animation (section 4) so all three always agree. */
  let activeTrackEntry = null;

  /* Shared volume (0–1), set by the mini player's volume slider and applied
     to whichever track starts playing next, so it persists across tracks. */
  let masterVolume = 1;

  /* Last non-zero volume, so the mute toggle can restore it instead of
     always resetting to 100%. */
  let lastVolume = 1;

  /* ---------------------------------------------------------------------
     0. Loader
  --------------------------------------------------------------------- */
  const loader = document.getElementById('loader');
  window.addEventListener('load', () => {
    setTimeout(() => loader.classList.add('hide'), 500);
  });
  // Fallback in case 'load' already fired
  setTimeout(() => loader.classList.add('hide'), 2500);

  /* ---------------------------------------------------------------------
     0b. Gallery render — add/remove files here only (see assets/images/gallery/).
     Runs before the reveal/colour-focus observers below query the DOM, so
     these generated .g-item cards get picked up like any static one.
     Ordered: "STAR n" files first (by n), then the rest.
  --------------------------------------------------------------------- */
  const GALLERY_ITEMS = [
    { src: 'assets/images/gallery/star-1-img-3361.jpg', type: 'image', alt: 'IMG 3361' },
    { src: 'assets/images/gallery/star-3-img-3176.jpg', type: 'image', alt: 'IMG 3176' },
    { src: 'assets/images/gallery/star-4-img-3344.jpg', type: 'image', alt: 'IMG 3344' },
    { src: 'assets/images/gallery/star-5-img-8230.jpg', type: 'image', alt: 'IMG 8230' },
    { src: 'assets/images/gallery/star-5-img-0820.jpg', type: 'image', alt: 'IMG 0820' },
    { src: 'assets/images/gallery/star-6-img-3341.jpg', type: 'image', alt: 'IMG 3341' },
    { src: 'assets/images/gallery/IMG_8384.jpg', type: 'image', alt: 'IMG 8384' },
    { src: 'assets/images/gallery/star-7-img-3155.mp4', type: 'video', alt: 'IMG 3155', poster: 'assets/images/gallery/star-7-img-3155-poster.jpg' },
    { src: 'assets/images/gallery/IMG_3005.jpg', type: 'image', alt: 'IMG 3005' },
    { src: 'assets/images/gallery/IMG_1360.jpg', type: 'image', alt: 'IMG 1360' },
    { src: 'assets/images/gallery/IMG_1575.jpg', type: 'image', alt: 'IMG 1575' },
    { src: 'assets/images/gallery/IMG_8383.jpg', type: 'image', alt: 'IMG 8383' },
    { src: 'assets/images/gallery/IMG_2247.jpg', type: 'image', alt: 'IMG 2247' },
    { src: 'assets/images/gallery/IMG_7392.jpg', type: 'image', alt: 'IMG 7392' },
    { src: 'assets/images/gallery/star-8-img-3418.mp4', type: 'video', alt: 'IMG 3418', poster: 'assets/images/gallery/star-8-img-3418-poster.jpg' },
    { src: 'assets/images/gallery/IMG_7634.jpg', type: 'image', alt: 'IMG 7634' },
    { src: 'assets/images/gallery/IMG_0817.jpg', type: 'image', alt: 'IMG 0817' },
    { src: 'assets/images/gallery/IMG_3072.jpg', type: 'image', alt: 'IMG 3072' },
    { src: 'assets/images/gallery/IMG_2160.jpg', type: 'image', alt: 'IMG 2160' },
    { src: 'assets/images/gallery/IMG_3412.jpg', type: 'image', alt: 'IMG 3412' },
    { src: 'assets/images/gallery/IMG_3130.jpg', type: 'image', alt: 'IMG 3130' },
    { src: 'assets/images/gallery/IMG_1592.mp4', type: 'video', alt: 'IMG 1592', poster: 'assets/images/gallery/IMG_1592-poster.jpg' },
  ];

  const galleryGrid = document.getElementById('galleryGrid');
  if (galleryGrid) {
    GALLERY_ITEMS.forEach((item, i) => {
      const fig = document.createElement('figure');
      fig.className = 'g-item';
      fig.setAttribute('data-reveal', '');
      fig.dataset.type = item.type;
      fig.dataset.src = encodeURI(item.src);
      fig.dataset.caption = item.alt;

      if (item.type === 'video') {
        fig.innerHTML = `
          <video src="${encodeURI(item.src)}" poster="${item.poster ? encodeURI(item.poster) : ''}" muted loop playsinline preload="metadata"></video>
          <span class="g-item-play" aria-hidden="true"><span class="track-play-icon"></span></span>
        `;
      } else {
        fig.innerHTML = `
          <img src="${encodeURI(item.src)}" alt="${item.alt}" loading="lazy">
        `;
      }
      galleryGrid.appendChild(fig);
    });
  }

  /* ---------------------------------------------------------------------
     1. Mobile nav toggle
  --------------------------------------------------------------------- */
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');

  navToggle.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('open');
    navToggle.classList.toggle('open', isOpen);
    navToggle.setAttribute('aria-expanded', String(isOpen));
  });

  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('open');
      navToggle.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });

  /* Active link highlight on scroll */
  const sections = document.querySelectorAll('main > section[id]');
  const navAnchors = document.querySelectorAll('.nav-links a');
  const navObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navAnchors.forEach(a => a.classList.toggle('active', a.getAttribute('href') === `#${entry.target.id}`));
      }
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  sections.forEach(s => navObserver.observe(s));

  /* Concerts sidenav — visible only while the Concerts section is on
     screen; highlights whichever concert is currently in view. */
  const concertsSection = document.getElementById('concerts');
  const concertsSidenav = document.getElementById('concertsSidenav');
  if (concertsSection && concertsSidenav) {
    const sidenavVisibilityObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => concertsSidenav.classList.toggle('is-visible', entry.isIntersecting));
    }, { threshold: 0.05 });
    sidenavVisibilityObserver.observe(concertsSection);

    const sidenavLinks = concertsSidenav.querySelectorAll('a');
    const concertTargets = document.querySelectorAll('.concert-row[id]');
    const sidenavActiveObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const link = Array.from(sidenavLinks).find(a => a.getAttribute('href') === `#${entry.target.id}`);
        if (link) link.classList.toggle('active', entry.isIntersecting);
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    concertTargets.forEach(row => sidenavActiveObserver.observe(row));
  }

  /* ---------------------------------------------------------------------
     2. Scroll reveal (fade + rise) via IntersectionObserver
  --------------------------------------------------------------------- */
  const revealTargets = document.querySelectorAll('[data-reveal], [data-reveal-text]');
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => entry.target.classList.add('is-visible'), i * 40);
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });
  revealTargets.forEach(t => revealObserver.observe(t));

  /* ---------------------------------------------------------------------
     2b. Scroll-driven colour focus — applies across the whole site (hero,
     about, projects, concerts, concerts feature, gallery). Grayscale by
     default (site's resting aesthetic), colour only while the photo is
     centered in the viewport — same IntersectionObserver technique as the
     reveal system above, just a separate continuous observer instead of a
     one-shot one.
  --------------------------------------------------------------------- */
  const focusTargets = document.querySelectorAll(
    '.hero-image, .about-bleed, .about-studio-strip, .project-media, .concert-media, .concerts-feature, .g-item'
  );
  const focusObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      entry.target.classList.toggle('in-focus', entry.isIntersecting);
    });
  }, { threshold: 0, rootMargin: '-5% 0px -5% 0px' });
  focusTargets.forEach(t => focusObserver.observe(t));

  /* ---------------------------------------------------------------------
     2c. Modular photo carousel — auto-activates on any .project-media /
     .concert-media block that has more than one photo inside it; blocks
     with a single photo are left untouched (no arrow, no counter).
  --------------------------------------------------------------------- */
  focusTargets.forEach(container => {
    const imgs = container.querySelectorAll('img');
    if (imgs.length <= 1) return;

    container.classList.add('media-multi');

    const nav = document.createElement('button');
    nav.type = 'button';
    nav.className = 'media-nav';
    nav.setAttribute('aria-label', 'Next photo');
    nav.innerHTML = '<span class="ar-right"></span>';

    const counter = document.createElement('span');
    counter.className = 'media-counter';

    container.appendChild(nav);
    container.appendChild(counter);

    let index = 0;
    const AUTOPLAY_MS = 4500;
    const pad = n => String(n).padStart(2, '0');
    function render() {
      imgs.forEach((img, i) => img.classList.toggle('is-active', i === index));
      counter.textContent = `${pad(index + 1)} / ${pad(imgs.length)}`;
    }
    render();

    function advance() {
      index = (index + 1) % imgs.length;
      render();
    }

    let autoplayId = setInterval(advance, AUTOPLAY_MS);
    function restartAutoplay() {
      clearInterval(autoplayId);
      autoplayId = setInterval(advance, AUTOPLAY_MS);
    }

    nav.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      advance();
      restartAutoplay();
    });
  });

  /* ---------------------------------------------------------------------
     3. Subtle parallax on hero background word + hero image
  --------------------------------------------------------------------- */
  const heroBgWord = document.querySelector('.hero-bg-word');
  const heroImage = document.querySelector('.hero-image');
  const docEl = document.documentElement;
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        const y = window.scrollY;
        if (heroBgWord) heroBgWord.style.transform = `translate(-50%, ${y * 0.15}px)`;
        if (heroImage && y < window.innerHeight) heroImage.style.transform = `translateY(${y * -0.06}px)`;

        const maxScroll = docEl.scrollHeight - window.innerHeight;
        const progress = maxScroll > 0 ? y / maxScroll : 0;
        docEl.style.setProperty('--scroll-y', progress.toFixed(4));

        ticking = false;
      });
      ticking = true;
    }
  });

  /* ---------------------------------------------------------------------
     3b. Gallery vertical title — the word GALLERY is always fully present
     (see style.css: base letter state is opaque, never faded/hidden).
     Scroll only moves a single "active" letter down the word, one at a
     time (G → A → L → L → E → R → Y), like a moving spotlight rather than
     a cumulative fill — the previous letter calmly returns to its resting
     look as the next one activates. Progress is measured over the exact
     distance the sidebar spends stuck in place (.gallery-side's own
     height minus the sticky inner's height — the classic "sticky scroll
     range" formula), so the last letter is active exactly when the
     sidebar is about to unstick. Skipped entirely on mobile, where the
     CSS drops the title back to a plain horizontal heading (detected via
     computed position rather than duplicating the breakpoint here).
  --------------------------------------------------------------------- */
  const gallerySide = document.querySelector('.gallery-side');
  const gallerySideInner = document.querySelector('.gallery-side-inner');
  const galleryTitle = document.querySelector('.gallery .section-title');
  const galleryLetters = document.querySelectorAll('.gallery-letter');
  if (gallerySide && gallerySideInner && galleryLetters.length) {
    const GALLERY_STICKY_TOP = 110; // matches .gallery-side-inner{ top:110px } in style.css
    const GALLERY_BOTTOM_MARGIN = 28; // breathing room below the last letter (Y)
    let galleryTicking = false;

    /* Shrinks (never grows) GALLERY's font-size, from whatever size the
       CSS clamp currently wants, down to whatever actually fits between
       the sticky offset and the bottom of the viewport — so the Y is
       guaranteed to never clip, at any resolution or aspect ratio, without
       hand-picking breakpoints. Only active while the sidebar is sticky
       (desktop layout); the mobile horizontal heading is left alone. */
    function fitGalleryWord() {
      const isSticky = getComputedStyle(gallerySideInner).position === 'sticky';
      if (!isSticky || !galleryTitle) return;
      galleryTitle.style.fontSize = ''; // reset to the CSS clamp value before measuring
      const label = gallerySideInner.querySelector('.section-label');
      const innerStyles = getComputedStyle(gallerySideInner);
      const gap = parseFloat(innerStyles.rowGap || innerStyles.gap) || 0;
      const labelHeight = label ? label.offsetHeight : 0;
      const available = window.innerHeight - GALLERY_STICKY_TOP - labelHeight - gap - GALLERY_BOTTOM_MARGIN;
      const naturalHeight = galleryTitle.getBoundingClientRect().height;
      if (available > 0 && naturalHeight > available) {
        const currentSize = parseFloat(getComputedStyle(galleryTitle).fontSize);
        const fitted = currentSize * (available / naturalHeight);
        galleryTitle.style.fontSize = Math.max(18, fitted) + 'px';
      }
    }

    function updateGalleryLetters() {
      const isSticky = getComputedStyle(gallerySideInner).position === 'sticky';
      if (!isSticky) {
        galleryLetters.forEach(el => el.classList.remove('is-active'));
        return;
      }
      const rect = gallerySide.getBoundingClientRect();
      const slack = gallerySide.offsetHeight - gallerySideInner.offsetHeight;
      let progress = slack > 0 ? (GALLERY_STICKY_TOP - rect.top) / slack : 0;
      progress = Math.min(1, Math.max(0, progress));
      const activeIndex = Math.min(galleryLetters.length - 1, Math.floor(progress * galleryLetters.length));
      galleryLetters.forEach((el, i) => el.classList.toggle('is-active', i === activeIndex));
    }

    window.addEventListener('scroll', () => {
      if (!galleryTicking) {
        requestAnimationFrame(() => { updateGalleryLetters(); galleryTicking = false; });
        galleryTicking = true;
      }
    }, { passive: true });
    window.addEventListener('resize', () => { fitGalleryWord(); updateGalleryLetters(); });
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => { fitGalleryWord(); updateGalleryLetters(); });
    }
    fitGalleryWord();
    updateGalleryLetters();
  }

  /* ---------------------------------------------------------------------
     4. Signature element — live meter (canvas oscilloscope / VU bars)
  --------------------------------------------------------------------- */
  const canvas = document.getElementById('meterCanvas');
  if (canvas && canvas.getContext) {
    const ctx = canvas.getContext('2d');
    const BARS = 14;
    const barWBase = canvas.width / BARS * 0.5;
    const gap = canvas.width / BARS;
    const meterEl = canvas.closest('.meter');
    let phase = 0;

    /* Colour eases toward a bright, clean white while a track is playing
       (activeTrackEntry, set by the tracks carousel/mini player below) and
       back to the original ink grey when idle — same shared state, no
       separate flag. The whole meter also fades up to full opacity and its
       bars get visibly chunkier while playing, so it reads as clearly "on"
       rather than a faint idle flicker. */
    const IDLE_RGB = [238, 242, 239];
    const PLAYING_RGB = [255, 255, 255];
    let colorMix = 0;

    function lerp(a, b, t) { return a + (b - a) * t; }

    function drawMeter() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const isPlaying = !!(activeTrackEntry && !activeTrackEntry.audio.paused);
      if (meterEl) meterEl.classList.toggle('is-playing', isPlaying);
      colorMix += ((isPlaying ? 1 : 0) - colorMix) * 0.12;
      const r = Math.round(lerp(IDLE_RGB[0], PLAYING_RGB[0], colorMix));
      const g = Math.round(lerp(IDLE_RGB[1], PLAYING_RGB[1], colorMix));
      const b = Math.round(lerp(IDLE_RGB[2], PLAYING_RGB[2], colorMix));
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;

      // Same colorMix (0 idle → 1 playing) also drives the bars' scale and
      // thickness: subtle at rest, bold once playing — smooth, no separate state.
      const sizeScale = 0.45 + 0.55 * colorMix;
      const barW = barWBase * (1 + 0.4 * colorMix);

      for (let i = 0; i < BARS; i++) {
        const noise = Math.sin(phase * 0.05 + i * 0.9) * 0.5 + Math.sin(phase * 0.13 + i) * 0.3;
        const h = Math.max(4, (Math.abs(noise) * 0.8 + 0.08) * canvas.height * 0.9) * sizeScale;
        const x = i * gap + (gap - barW) / 2;
        const y = (canvas.height - h) / 2;
        ctx.globalAlpha = Math.min(1, (0.35 + Math.abs(noise) * 0.5) * (0.7 + 0.5 * colorMix));
        ctx.fillRect(x, y, barW, h);
      }
      // Oscillation itself only advances while actually playing, so it reads
      // as fully stopped (not just shrunk) when paused.
      if (isPlaying) phase += 1;
      requestAnimationFrame(drawMeter);
    }
    drawMeter();
  }

  /* ---------------------------------------------------------------------
     5. Project data + overlay ("editorial spread")
  --------------------------------------------------------------------- */
  const PROJECTS = {
    1: {
      eyebrow: 'Project 01 — 2025',
      title: 'Interior\nWeather',
      cover: 'assets/images/project-01-cover.jpg',
      meta: [
        { label: 'Year', value: '2025' },
        { label: 'Role', value: 'Writing, recording, mixing' },
        { label: 'Duration', value: '5 tracks / 3 weeks' },
        { label: 'Format', value: 'Home studio EP' },
      ],
      story: [
        "Interior Weather started as a single vocal take recorded on a rainy afternoon, with no plan to build anything around it. The five tracks that followed were an exercise in restraint — using as few elements as possible and trusting the performance over production tricks.",
        "Most of the record was tracked in one room with one microphone. The creative process was less about arranging and more about editing: choosing which takes to keep, and which layers to cut before they crowded the vocal."
      ],
      images: [
        'assets/images/project-01-detail-1.jpg',
        'assets/images/project-01-detail-2.jpg',
        'assets/images/project-01-detail-3.jpg',
      ],
      software: 'Logic Pro, iZotope RX, FabFilter Pro-Q',
      equipment: 'Shure SM7B, Focusrite Scarlett, Yamaha HS5',
      notes: "Track two was recorded in a single take at 1am with the window open — the room tone from that night made it into the final mix on purpose.",
      audioLabel: 'Interior Weather — Track 02 (rough mix)',
      // Optional: paste a Google Drive (or other) share link here to let visitors listen to
      // the full demo/mix. Leave as null to hide the button. e.g. 'https://drive.google.com/...'
      driveLink: null
    },
    2: {
      eyebrow: 'Project 02 — 2025',
      title: 'Loop\nStudies',
      cover: 'assets/images/project-02-cover.jpg',
      meta: [
        { label: 'Year', value: '2025' },
        { label: 'Role', value: 'Sampling, sound design' },
        { label: 'Duration', value: '7 sketches / 1 week' },
        { label: 'Format', value: 'Daily practice series' },
      ],
      story: [
        "One loop a day for a week, built from whatever was closest at hand — a chord on the Nord, a field recording, a mic dropped near a fan. The constraint was speed: finish each sketch before the idea got too precious.",
        "The series became a way to practice sampling and rhythm programming without the pressure of finishing a 'real' song, and a few of these loops are already turning into fuller tracks."
      ],
      images: [
        'assets/images/project-02-detail-1.jpg',
        'assets/images/project-02-detail-2.jpg',
        'assets/images/project-02-detail-3.jpg',
      ],
      software: 'Ableton Live, Serum',
      equipment: 'Nord Electro, Tascam field recorder',
      notes: "Sketch four uses a recording of a ceiling fan pitched down two octaves as its low end.",
      audioLabel: 'Loop Studies — Sketch 04',
      driveLink: null
    },
    3: {
      eyebrow: 'Project 03 — 2024',
      title: 'Room\nTone',
      cover: 'assets/images/project-03-cover.jpg',
      meta: [
        { label: 'Year', value: '2024' },
        { label: 'Role', value: 'Mixing exercise' },
        { label: 'Duration', value: '4 mixes / 1 session' },
        { label: 'Format', value: 'Mix study' },
      ],
      story: [
        "The same acoustic guitar-and-vocal session, mixed four separate times with four different intentions — one clean and close, one built to sound like an old tape, one wide and cinematic, one deliberately harsh. The point was to hear how far the same raw material could travel.",
        "Room Tone exists mostly as a technical study: gain staging, EQ decisions and compression settings compared side by side, to build a more deliberate mixing vocabulary."
      ],
      images: [
        'assets/images/project-03-detail-1.jpg',
        'assets/images/project-03-detail-2.jpg',
        'assets/images/project-03-detail-3.jpg',
      ],
      software: 'Ableton Live, Waves SSL Bundle',
      equipment: 'Audio-Technica AT2020, Yamaha HS5',
      notes: "Mix three's tape saturation is a plugin, not real tape — a decision made once the difference stopped being audible on monitors.",
      audioLabel: 'Room Tone — Mix 03 (tape version)',
      driveLink: null
    },
    4: {
      eyebrow: 'Project 04 — 2024',
      title: 'Field\nNotes',
      cover: 'assets/images/project-04-cover.jpg',
      meta: [
        { label: 'Year', value: '2024' },
        { label: 'Role', value: 'Field recording' },
        { label: 'Duration', value: 'Ongoing archive' },
        { label: 'Format', value: 'Sound library' },
      ],
      story: [
        "An ongoing archive of location recordings — rain on a window, a train platform, a busy kitchen — collected on a handheld recorder and catalogued for later use as texture underneath finished tracks.",
        "Field Notes is less a project than a habit: carrying a recorder and paying attention. A few of these recordings already sit quietly under the low end of other tracks on this site."
      ],
      images: [
        'assets/images/project-04-detail-1.jpg',
        'assets/images/project-04-detail-2.jpg',
        'assets/images/project-04-detail-3.jpg',
      ],
      software: 'iZotope RX, Ableton Live',
      equipment: 'Tascam field recorder',
      notes: "The rain recording used in Interior Weather's opening track was pulled straight from this archive.",
      audioLabel: 'Field Notes — Platform, 6:14am',
      driveLink: null
    }
  };

  const overlay = document.getElementById('projectOverlay');
  const overlayInner = document.getElementById('overlayInner');
  const overlayClose = document.getElementById('overlayClose');

  function buildOverlay(id) {
    const p = PROJECTS[id];
    if (!p) return;

    overlayInner.innerHTML = `
      <p class="overlay-eyebrow">${p.eyebrow}</p>
      <h2 class="overlay-title">${p.title.split('\n').join('<br>')}</h2>
      <div class="overlay-hero-img"><img src="${p.cover}" alt="${p.title.replace('\n',' ')} — cover image placeholder"></div>

      <div class="overlay-meta-row">
        ${p.meta.map(m => `<div>${m.label}<b>${m.value}</b></div>`).join('')}
      </div>

      <div class="overlay-story">
        ${p.story.map(s => `<p>${s}</p>`).join('')}
      </div>

      <div class="overlay-images">
        ${p.images.map((src, i) => `<div data-lightbox-src="${src}" data-lightbox-caption="${p.title.replace('\n',' ')} — detail ${i+1}"><img src="${src}" alt="Project detail placeholder ${i+1}"></div>`).join('')}
      </div>

      <div class="overlay-audio">
        <button class="audio-toggle" id="overlayAudioToggle" style="background-image:url('assets/icons/play.svg')"></button>
        <span class="audio-track-name">${p.audioLabel}</span>
        <div class="audio-bars" id="overlayAudioBars"></div>
        ${p.driveLink ? `<a class="listen-btn" href="${p.driveLink}" target="_blank" rel="noopener">Listen <span class="ar"></span></a>` : ''}
      </div>

      <div class="overlay-notes">
        <h4>Software &amp; equipment</h4>
        <p><strong>${p.software}</strong><br>${p.equipment}</p>
      </div>
      <div class="overlay-notes" style="margin-top:26px; border-top:none; padding-top:0;">
        <h4>Notes</h4>
        <p>${p.notes}</p>
      </div>
    `;

    // build fake waveform bars
    const barsWrap = document.getElementById('overlayAudioBars');
    const barCount = 60;
    let barsHTML = '';
    for (let i = 0; i < barCount; i++) {
      const h = 20 + Math.abs(Math.sin(i * 0.4) * 60) + Math.random() * 20;
      barsHTML += `<span style="height:${h}%"></span>`;
    }
    barsWrap.innerHTML = barsHTML;

    // fake play/pause toggle (no real audio file wired up — see README)
    const toggle = document.getElementById('overlayAudioToggle');
    let playing = false;
    let animId = null;
    toggle.addEventListener('click', () => {
      playing = !playing;
      toggle.classList.toggle('playing', playing);
      barsWrap.classList.toggle('playing', playing);
      toggle.style.backgroundImage = playing ? "url('assets/icons/pause.svg')" : "url('assets/icons/play.svg')";
      if (playing) {
        animateBars();
      } else if (animId) {
        cancelAnimationFrame(animId);
      }
    });
    function animateBars() {
      if (!playing) return;
      barsWrap.querySelectorAll('span').forEach(span => {
        const h = 15 + Math.random() * 85;
        span.style.height = h + '%';
      });
      animId = setTimeout(() => requestAnimationFrame(animateBars), 110);
    }

    // wire detail images to lightbox
    overlayInner.querySelectorAll('[data-lightbox-src]').forEach(el => {
      el.addEventListener('click', () => openLightbox(el.dataset.lightboxSrc, el.dataset.lightboxCaption));
    });
  }

  document.querySelectorAll('.project-open').forEach(btn => {
    btn.addEventListener('click', () => {
      buildOverlay(btn.dataset.open);
      overlay.classList.add('open');
      document.body.style.overflow = 'hidden';
      overlay.querySelector('.overlay-scroll').scrollTop = 0;
    });
  });

  function closeOverlay() {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }
  overlayClose.addEventListener('click', closeOverlay);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeOverlay(); closeLightbox(); }
  });

  /* ---------------------------------------------------------------------
     6. Lightbox (gallery + project detail images)
  --------------------------------------------------------------------- */
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightboxImg');
  const lightboxVideo = document.getElementById('lightboxVideo');
  const lightboxCaption = document.getElementById('lightboxCaption');
  const lightboxClose = document.getElementById('lightboxClose');
  const lightboxPrev = document.getElementById('lightboxPrev');
  const lightboxNext = document.getElementById('lightboxNext');

  // -1 when the lightbox was opened from somewhere other than the gallery
  // (e.g. a project detail image) — prev/next only makes sense for the
  // gallery's own ordered list.
  let galleryNavIndex = -1;

  function openLightbox(src, caption, type) {
    galleryNavIndex = -1; // reset; openGalleryItem sets it right after, for other callers there's no nav
    lightbox.classList.remove('from-gallery'); // reset; openGalleryItem sets it right after
    lightboxVideo.pause();
    lightbox.classList.toggle('is-video', type === 'video');
    if (type === 'video') {
      lightboxVideo.src = src;
      lightboxVideo.currentTime = 0;
      lightboxVideo.muted = false; // full experience with sound, unlike the muted grid preview
      lightboxVideo.play().catch(() => {});
    } else {
      lightboxImg.src = src;
      lightboxImg.alt = caption || '';
    }
    lightboxCaption.textContent = caption || '';
    lightbox.classList.add('open');
    const hasNav = galleryNavIndex >= 0;
    lightboxPrev.style.display = hasNav ? '' : 'none';
    lightboxNext.style.display = hasNav ? '' : 'none';
  }

  function openGalleryItem(index) {
    const item = GALLERY_ITEMS[index];
    openLightbox(encodeURI(item.src), '', item.type);
    lightbox.classList.add('from-gallery');
    galleryNavIndex = index;
    lightboxPrev.style.display = '';
    lightboxNext.style.display = '';
  }

  function closeLightbox() {
    lightbox.classList.remove('open');
    lightboxVideo.pause();
    galleryNavIndex = -1;
  }
  lightboxClose.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeLightbox(); });
  lightboxPrev.addEventListener('click', (e) => {
    e.stopPropagation();
    if (galleryNavIndex < 0) return;
    openGalleryItem((galleryNavIndex - 1 + GALLERY_ITEMS.length) % GALLERY_ITEMS.length);
  });
  lightboxNext.addEventListener('click', (e) => {
    e.stopPropagation();
    if (galleryNavIndex < 0) return;
    openGalleryItem((galleryNavIndex + 1) % GALLERY_ITEMS.length);
  });

  document.querySelectorAll('.g-item').forEach((item, i) => {
    item.addEventListener('click', () => openGalleryItem(i));
  });

  /* ---------------------------------------------------------------------
     7. Tracks showcases (horizontal audio carousels, PROJECTS section)
     Two independent carousels — "Production" and "Mixes" — share the same
     player logic below and are instantiated by initTracksCarousel() at the
     bottom of this block. Add/remove tracks in these arrays only — no
     HTML/CSS changes needed. cover should be a square image; audio/cover
     paths are relative to this file (typically assets/tracks/...).
  --------------------------------------------------------------------- */
  const PRODUCTION_TRACKS = [
    { title: 'André Duarte Beatmaking', audio: 'assets/tracks/andre-duarte-beatmaking.mp3', cover: 'assets/icons/favicon-512.png' },
    { title: 'André Duarte — Changes (Justin Bieber Cover)', audio: 'assets/tracks/andre-duarte-changes.mp3', cover: 'assets/icons/favicon-512.png' },
    { title: 'André Duarte Projeto Sampling', audio: 'assets/tracks/andre-duarte-projeto-sampling.mp3', cover: 'assets/icons/favicon-512.png' },
    { title: 'André Duarte Trabalho Produção II', audio: 'assets/tracks/andre-duarte-trabalho-producao-ii.mp3', cover: 'assets/icons/favicon-512.png' },
    { title: 'André Duarte Trabalho Ableton Final', audio: 'assets/tracks/andre-duarte-trabalho-ableton-final.mp3', cover: 'assets/icons/favicon-512.png' },
    { title: 'Ideia De Instrumental Com Bridge Grande', audio: 'assets/tracks/ideia-de-instrumental-com-bridge-grande.mp3', cover: 'assets/icons/favicon-512.png' },
    { title: 'Mashup Daft Punk Duke Dumont Clean Bandit', audio: 'assets/tracks/Mashup_DaftPunk_DukeDumont_CleanBandit.mp3', cover: 'assets/icons/favicon-512.png' },
    { title: 'Só Uma Vibe XD', audio: 'assets/tracks/so-uma-vibe-xd.mp3', cover: 'assets/icons/favicon-512.png' },
  ];

  const MIXES_TRACKS = [
    { title: 'André Duarte — 12 to 12 (Mix & Master)', audio: 'assets/tracks/mixes/andre-duarte-12-to-12-mix-master.mp3', cover: 'assets/icons/favicon-512.png' },
    { title: 'André Duarte — Pomadinha (AI Song Mix)', audio: 'assets/tracks/mixes/andre-duarte-mix-pomadinha-ai-song.mp3', cover: 'assets/icons/favicon-512.png' },
    { title: 'Contramão (Protótipo)', audio: 'assets/tracks/mixes/contramao-prototipo-48khz-24bit-v2.mp3', cover: 'assets/icons/favicon-512.png' },
    { title: 'Whole Lotta Love (Cover)', audio: 'assets/tracks/mixes/whole-lotta-love-cover-prototipo-48khz-24bit.mp3', cover: 'assets/icons/favicon-512.png' },
  ];

  {
    /* Mini player (fixed bottom bar, shared across every carousel) */
    const miniPlayer = document.getElementById('miniPlayer');
    const miniCover = document.getElementById('miniPlayerCover');
    const miniTitle = document.getElementById('miniPlayerTitle');
    const miniTitleTrack = document.getElementById('miniPlayerTitleTrack');
    const miniToggle = document.getElementById('miniPlayerToggle');
    const miniProgress = document.getElementById('miniPlayerProgress');
    const miniProgressFill = document.getElementById('miniPlayerProgressFill');
    const miniProgressThumb = document.getElementById('miniPlayerProgressThumb');
    const miniTime = document.getElementById('miniPlayerTime');
    const miniClose = document.getElementById('miniPlayerClose');
    const miniVolume = document.getElementById('miniPlayerVolume');
    const miniVolumeToggle = document.getElementById('miniPlayerVolumeToggle');
    const miniVolumeRange = document.getElementById('miniPlayerVolumeRange');

    function formatTime(s) {
      if (!isFinite(s) || s < 0) s = 0;
      const m = Math.floor(s / 60);
      const sec = Math.floor(s % 60);
      return `${m}:${String(sec).padStart(2, '0')}`;
    }

    // activeTrackEntry (declared at the top of this file) is the shared
    // "currently playing" state — read by the meter animation too.

    function syncUI(entry, pctOverride) {
      // A reset card (see resetEntry) must stay visually blank even though
      // its <audio> may still fire an async 'timeupdate'/'seeked' event
      // right after currentTime is set back to 0 — guard on a flag instead
      // of relying on event ordering.
      if (!entry.showProgress) {
        entry.progressFill.style.width = '0%';
        entry.progressThumb.style.left = '0%';
        entry.timeEl.textContent = '';
        return;
      }
      const dur = entry.audio.duration || 0;
      const cur = entry.audio.currentTime || 0;
      const pct = pctOverride != null ? pctOverride : (dur ? (cur / dur) * 100 : 0);
      const label = `${formatTime(cur)} / ${formatTime(dur)}`;
      entry.progressFill.style.width = pct + '%';
      entry.progressThumb.style.left = pct + '%';
      entry.timeEl.textContent = label;
      if (activeTrackEntry === entry) {
        miniProgressFill.style.width = pct + '%';
        miniProgressThumb.style.left = pct + '%';
        miniTime.textContent = label;
      }
    }

    function setPlayingUI(entry, playing) {
      entry.playBtn.classList.toggle('playing', playing);
      entry.playBtn.setAttribute('aria-label', `${playing ? 'Pause' : 'Play'} ${entry.track.title}`);
      entry.card.classList.toggle('is-playing', playing);
      if (activeTrackEntry === entry) miniToggle.classList.toggle('playing', playing);
    }

    function pauseEntry(entry) {
      entry.audio.pause();
      setPlayingUI(entry, false);
    }

    // Used specifically when a *different* track starts playing — the one
    // being replaced goes fully back to its untouched, never-played look
    // (cover only, play icon, no progress/time), instead of freezing at
    // wherever it was paused.
    function resetEntry(entry) {
      entry.showProgress = false;
      entry.audio.pause();
      entry.audio.currentTime = 0;
      setPlayingUI(entry, false);
      entry.progressFill.style.width = '0%';
      entry.progressThumb.style.left = '0%';
      entry.timeEl.textContent = '';
    }

    function openMiniPlayerFor(entry) {
      miniCover.src = encodeURI(entry.track.cover);
      miniCover.alt = `${entry.track.title} — cover`;
      miniTitleTrack.textContent = entry.track.title;
      miniPlayer.classList.add('open');
      document.body.classList.add('has-mini-player');

      // Marquee-on-hover: only enabled when the title is actually wider than
      // its box. Measured after the text is in place so scrollWidth reflects
      // the new title (layout is unaffected by the mini player being
      // off-screen via transform, so this is accurate even the first time).
      const overflow = miniTitleTrack.scrollWidth - miniTitle.clientWidth;
      if (overflow > 4) {
        const duration = Math.min(14, Math.max(2.5, overflow / 40));
        miniTitle.style.setProperty('--marquee-distance', `-${overflow}px`);
        miniTitle.style.setProperty('--marquee-duration', `${duration}s`);
        miniTitle.classList.add('can-marquee');
      } else {
        miniTitle.classList.remove('can-marquee');
      }
    }

    function closeMiniPlayer() {
      if (activeTrackEntry) pauseEntry(activeTrackEntry);
      miniPlayer.classList.remove('open');
      document.body.classList.remove('has-mini-player');
      activeTrackEntry = null;
    }

    function playEntry(entry) {
      if (activeTrackEntry && activeTrackEntry !== entry) resetEntry(activeTrackEntry);
      activeTrackEntry = entry;
      entry.showProgress = true; // synchronous, so a drag started on this card gets instant feedback
      entry.audio.volume = masterVolume;
      entry.audio.play().then(() => {
        setPlayingUI(entry, true);
        openMiniPlayerFor(entry);
        syncUI(entry);
      }).catch(err => {
        entry.showProgress = false;
        setPlayingUI(entry, false);
        if (activeTrackEntry === entry) activeTrackEntry = null;
      });
    }

    function toggleEntry(entry) {
      entry.audio.paused ? playEntry(entry) : pauseEntry(entry);
    }

    function ratioAt(bar, clientX) {
      const rect = bar.getBoundingClientRect();
      return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    }
    function seek(entry, clientX, bar) {
      const ratio = ratioAt(bar, clientX);
      if (entry.audio.duration) entry.audio.currentTime = ratio * entry.audio.duration;
      syncUI(entry, ratio * 100); // update instantly even before duration is known
    }

    /* Fluid drag-to-seek — works with mouse and touch via Pointer Events.
       Live visual + real audio.currentTime update while dragging; the bar
       captures the pointer so the drag keeps tracking even off its bounds. */
    function attachSeekDrag(bar, getEntry) {
      bar.style.touchAction = 'none';
      let dragging = false;
      bar.addEventListener('pointerdown', (e) => {
        const entry = getEntry();
        if (!entry) return;
        e.preventDefault();
        e.stopPropagation();
        if (entry !== activeTrackEntry) playEntry(entry);
        dragging = true;
        bar.classList.add('seeking');
        bar.setPointerCapture(e.pointerId);
        seek(entry, e.clientX, bar);
      });
      bar.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        const entry = getEntry();
        if (entry) seek(entry, e.clientX, bar);
      });
      function endSeek() {
        dragging = false;
        bar.classList.remove('seeking');
      }
      bar.addEventListener('pointerup', endSeek);
      bar.addEventListener('pointercancel', endSeek);
    }

    /* Mini player controls (shared, wired once regardless of how many
       carousels exist) */
    miniToggle.addEventListener('click', () => { if (activeTrackEntry) toggleEntry(activeTrackEntry); });
    miniClose.addEventListener('click', closeMiniPlayer);
    attachSeekDrag(miniProgress, () => activeTrackEntry);

    /* Volume — a slider popup revealed on hover (desktop) or tap (touch,
       via the .open class) instead of sitting permanently expanded in the
       already-tight mini player row. Applies to whichever track is active
       and is remembered (masterVolume) for whatever plays next. */
    function updateVolumeToggleIcon() {
      miniVolumeToggle.classList.toggle('muted', masterVolume === 0);
    }
    miniVolumeRange.addEventListener('input', () => {
      masterVolume = Number(miniVolumeRange.value) / 100;
      if (masterVolume > 0) lastVolume = masterVolume;
      if (activeTrackEntry) activeTrackEntry.audio.volume = masterVolume;
      updateVolumeToggleIcon();
    });
    miniVolumeToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      miniVolume.classList.toggle('open');

      // Mute toggle: click mutes immediately, click again restores the
      // last non-zero volume (not always 100%).
      if (masterVolume > 0) {
        lastVolume = masterVolume;
        masterVolume = 0;
      } else {
        masterVolume = lastVolume > 0 ? lastVolume : 1;
      }
      miniVolumeRange.value = String(masterVolume * 100);
      if (activeTrackEntry) activeTrackEntry.audio.volume = masterVolume;
      updateVolumeToggleIcon();
    });
    document.addEventListener('click', (e) => {
      if (miniVolume.classList.contains('open') && !miniVolume.contains(e.target)) {
        miniVolume.classList.remove('open');
      }
    });

    /* Shared cover-hover tooltip (full track title, PROJECTS section).
       Appended directly to <body> — rather than living inside the card —
       because .tracks-scroll needs overflow-x:auto for the carousel, and
       per spec that forces its overflow-y to clip too (an untouched
       'visible' axis gets computed to 'auto' the moment its pair isn't
       'visible'). A tooltip nested in there gets its bottom sheared off
       whenever a title wraps to 2+ lines. Living in <body> and being
       positioned from each cover's getBoundingClientRect() sidesteps that
       entirely, so its height is always just "as tall as the title needs". */
    const trackTooltip = document.createElement('div');
    trackTooltip.className = 'track-tooltip';
    trackTooltip.setAttribute('role', 'tooltip');
    document.body.appendChild(trackTooltip);
    const canHoverTracks = window.matchMedia('(hover: hover)').matches;

    function showTrackTooltip(cover, title) {
      if (!canHoverTracks) return;
      trackTooltip.textContent = title;
      const rect = cover.getBoundingClientRect();
      trackTooltip.style.left = `${rect.left + rect.width / 2 + window.scrollX}px`;
      trackTooltip.style.top = `${rect.bottom + window.scrollY + 8}px`;
      trackTooltip.classList.add('is-visible');
    }
    function hideTrackTooltip() {
      trackTooltip.classList.remove('is-visible');
    }

    /* Builds one horizontal tracks carousel (cards + drag-to-scroll + wheel
       + arrows + scroll-position indicator). Called once per carousel —
       see "Production" / "Mixes" calls below. An empty `tracks` array is
       fine: the loop below just adds no cards, and updateArrows() naturally
       hides the arrows/progress bar via the existing .no-overflow state. */
    function initTracksCarousel(scrollId, tracks, progressTrackId, progressThumbId) {
      const tracksScroll = document.getElementById(scrollId);
      if (!tracksScroll) return;
      const showcase = tracksScroll.closest('.tracks-showcase');
      const prevBtn = showcase.querySelector('.tracks-arrow-prev');
      const nextBtn = showcase.querySelector('.tracks-arrow-next');
      let dragged = false;

      tracks.forEach(track => {
        const card = document.createElement('article');
        card.className = 'track-card';
        // Format badge reads straight off the file extension, so it can
        // never drift out of sync with which tracks actually got converted.
        const format = track.audio.slice(track.audio.lastIndexOf('.') + 1).toUpperCase();
        card.innerHTML = `
          <div class="track-cover">
            <div class="track-cover-frame">
              <img src="${encodeURI(track.cover)}" alt="${track.title} — cover" loading="lazy">
            </div>
            <span class="track-format-badge">${format}</span>
            <button class="track-play" type="button" aria-label="Play ${track.title}">
              <span class="track-play-icon"></span>
            </button>
            <div class="track-progress"><div class="track-progress-fill"></div><div class="track-progress-thumb"></div></div>
          </div>
          <div class="track-info">
            <span class="track-title">${track.title}</span>
            <span class="track-time"></span>
          </div>
        `;

        const audio = new Audio();
        audio.preload = 'none';
        // encodeURI: filenames with spaces/accents/":" need escaping or the
        // browser fails to resolve them and playback silently never starts.
        audio.src = encodeURI(track.audio);

        const entry = {
          track, audio, card,
          showProgress: false,
          playBtn: card.querySelector('.track-play'),
          progressBar: card.querySelector('.track-progress'),
          progressFill: card.querySelector('.track-progress-fill'),
          progressThumb: card.querySelector('.track-progress-thumb'),
          timeEl: card.querySelector('.track-time'),
        };

        audio.addEventListener('timeupdate', () => syncUI(entry));
        audio.addEventListener('loadedmetadata', () => syncUI(entry));
        audio.addEventListener('ended', () => { pauseEntry(entry); syncUI(entry); });

        entry.playBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (dragged) return;
          toggleEntry(entry);
        });

        attachSeekDrag(entry.progressBar, () => entry);

        const coverEl = card.querySelector('.track-cover');
        coverEl.addEventListener('mouseenter', () => showTrackTooltip(coverEl, track.title));
        coverEl.addEventListener('mouseleave', hideTrackTooltip);

        tracksScroll.appendChild(card);
      });

      /* Drag-to-scroll with the mouse (touch already scrolls natively).
         Skip capture entirely when the press starts on an interactive child
         (play button / progress bar) — setPointerCapture on the scroll
         container was swallowing every click on those buttons before they
         could ever reach their own listeners. */
      let isDown = false, startX = 0, startScroll = 0;
      tracksScroll.addEventListener('pointerdown', (e) => {
        if (e.pointerType !== 'mouse') return;
        if (e.target.closest('.track-play, .track-progress')) return;
        isDown = true;
        dragged = false;
        startX = e.clientX;
        startScroll = tracksScroll.scrollLeft;
        tracksScroll.classList.add('dragging');
        tracksScroll.setPointerCapture(e.pointerId);
      });
      tracksScroll.addEventListener('pointermove', (e) => {
        if (!isDown) return;
        const dx = e.clientX - startX;
        if (Math.abs(dx) > 5) dragged = true;
        tracksScroll.scrollLeft = startScroll - dx;
      });
      function endDrag() {
        isDown = false;
        tracksScroll.classList.remove('dragging');
        setTimeout(() => { dragged = false; }, 0);
      }
      tracksScroll.addEventListener('pointerup', endDrag);
      tracksScroll.addEventListener('pointerleave', endDrag);

      /* Mouse-wheel translated to horizontal scroll — eased toward a target
         instead of jumping straight to it, so it reads as fluid rather than
         a hard per-tick snap. Only captures the wheel while the carousel
         still has room to move in that direction, so a normal page scroll
         isn't trapped once it reaches either end. */
      let wheelTarget = null;
      let wheelRAF = null;
      function easeWheelScroll() {
        const diff = wheelTarget - tracksScroll.scrollLeft;
        if (Math.abs(diff) < 0.5) {
          tracksScroll.scrollLeft = wheelTarget;
          wheelTarget = null;
          wheelRAF = null;
          return;
        }
        tracksScroll.scrollLeft += diff * 0.18;
        wheelRAF = requestAnimationFrame(easeWheelScroll);
      }
      /* Drop any in-flight easing and let the browser take over natively.
         Without this, a leftover wheelTarget would keep easing toward a stale
         position and visibly fight a trackpad's own horizontal scroll. */
      function releaseWheel() {
        wheelTarget = null;
        if (wheelRAF) { cancelAnimationFrame(wheelRAF); wheelRAF = null; }
      }
      tracksScroll.addEventListener('wheel', (e) => {
        // Horizontal-intent gesture (trackpad): hand off to native scrolling.
        if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) { releaseWheel(); return; }
        const max = tracksScroll.scrollWidth - tracksScroll.clientWidth;
        const current = wheelTarget != null ? wheelTarget : tracksScroll.scrollLeft;
        const atStart = current <= 0;
        const atEnd = current >= max - 1;
        // At an edge: release so the page can scroll vertically as normal.
        if ((e.deltaY < 0 && atStart) || (e.deltaY > 0 && atEnd)) { releaseWheel(); return; }
        wheelTarget = Math.min(max, Math.max(0, current + e.deltaY));
        e.preventDefault();
        if (!wheelRAF) wheelRAF = requestAnimationFrame(easeWheelScroll);
      }, { passive: false });

      /* Arrows + "more content" overflow state + scroll-position indicator */
      const progressThumb = document.getElementById(progressThumbId);

      /* One arrow click advances by exactly one card + the real CSS gap, so
         cards always land flush instead of stopping half-cut. The gap is read
         from the computed style (it's a clamp()) rather than hardcoded. */
      function cardStep() {
        const card = tracksScroll.querySelector('.track-card');
        if (!card) return 200;
        const gap = parseFloat(getComputedStyle(tracksScroll).columnGap) || 24;
        return card.getBoundingClientRect().width + gap;
      }

      /* Geometry (scrollWidth/clientWidth) only changes on resize, not while
         scrolling — so measure it once here and on resize instead of on every
         scroll event. Reading layout inside the scroll handler was forcing a
         reflow per tick, which is what made the scroll feel jittery. */
      let geom = { scrollW: 0, clientW: 0, max: 0, hasOverflow: false };
      function measure() {
        geom.scrollW = tracksScroll.scrollWidth;
        geom.clientW = tracksScroll.clientWidth;
        geom.max = Math.max(0, geom.scrollW - geom.clientW);
        geom.hasOverflow = geom.scrollW > geom.clientW + 1;
        showcase.classList.toggle('no-overflow', !geom.hasOverflow);
      }
      function updateArrows() {
        const left = tracksScroll.scrollLeft;
        prevBtn.disabled = left <= 0;
        nextBtn.disabled = left >= geom.max - 1;
        if (progressThumb && geom.hasOverflow && geom.scrollW > 0) {
          const thumbPct = Math.min(100, (geom.clientW / geom.scrollW) * 100);
          const posPct = geom.max > 0 ? (left / geom.max) * (100 - thumbPct) : 0;
          progressThumb.style.width = thumbPct + '%';
          progressThumb.style.left = posPct + '%';
        }
      }
      /* Coalesce scroll events to one update per frame. */
      let arrowsRAF = null;
      function onScroll() {
        if (arrowsRAF) return;
        arrowsRAF = requestAnimationFrame(() => { arrowsRAF = null; updateArrows(); });
      }
      prevBtn.addEventListener('click', () => tracksScroll.scrollBy({ left: -cardStep(), behavior: 'smooth' }));
      nextBtn.addEventListener('click', () => tracksScroll.scrollBy({ left: cardStep(), behavior: 'smooth' }));
      tracksScroll.addEventListener('scroll', onScroll);
      tracksScroll.addEventListener('scroll', hideTrackTooltip);
      window.addEventListener('resize', () => { measure(); updateArrows(); });
      measure();
      updateArrows();
    }

    initTracksCarousel('tracksScrollProduction', PRODUCTION_TRACKS, 'tracksProgressTrackProduction', 'tracksProgressThumbProduction');
    initTracksCarousel('tracksScrollMixes', MIXES_TRACKS, 'tracksProgressTrackMixes', 'tracksProgressThumbMixes');
  }

  /* ---------------------------------------------------------------------
     7b. Influences (horizontal album-cover scroll, INFLUENCES section)
     Add/remove entries here only — no HTML/CSS changes needed. cover
     should be a square image, path relative to this file.
  --------------------------------------------------------------------- */
  const INFLUENCES = [
    { album: 'Random Access Memories', artist: 'Daft Punk', cover: 'assets/images/influences/01-random-access-memories.png' },
    { album: 'Voodoo', artist: "D'Angelo", cover: 'assets/images/influences/02-voodoo.jpg' },
    { album: 'Girlfriend', artist: 'The Driver Era', cover: 'assets/images/influences/03-girlfriend.png' },
    { album: '25', artist: 'Adele', cover: 'assets/images/influences/04-25.png' },
    { album: 'An Evening with Silk Sonic', artist: 'Silk Sonic', cover: 'assets/images/influences/05-an-evening-with-silk-sonic.png' },
    { album: 'Mr. Morale & the Big Steppers', artist: 'Kendrick Lamar', cover: 'assets/images/influences/06-mr-morale.png' },
    { album: 'To Pimp a Butterfly', artist: 'Kendrick Lamar', cover: 'assets/images/influences/07-to-pimp-a-butterfly.png' },
    { album: 'MDID', artist: 'ProfJam', cover: 'assets/images/influences/08-mdid.jpeg' },
    { album: 'You Are Forgiven', artist: 'Slow J', cover: 'assets/images/influences/09-you-are-forgiven.jpeg' },
    { album: 'Enter the Wu-Tang (36 Chambers)', artist: 'Wu-Tang Clan', cover: 'assets/images/influences/10-enter-the-wu-tang.jpg' },
    { album: 'Papillon', artist: 'Jony Driver', cover: 'assets/images/influences/11-papillon.jpeg' },
    { album: 'The Miseducation of Lauryn Hill', artist: 'Lauryn Hill', cover: 'assets/images/influences/12-miseducation-of-lauryn-hill.png' },
    { album: 'Discovery', artist: 'Daft Punk', cover: 'assets/images/influences/13-discovery.png' },
  ];

  {
    const influenceScroll = document.getElementById('influenceScroll');
    if (influenceScroll) {
      const influencesSection = influenceScroll.closest('.influences');
      const viewport = influenceScroll.closest('.influence-viewport');
      const prevBtn = viewport.querySelector('.influence-arrow-prev');
      const nextBtn = viewport.querySelector('.influence-arrow-next');
      let dragged = false;

      INFLUENCES.forEach(entry => {
        const card = document.createElement('article');
        card.className = 'influence-card';
        card.innerHTML = `
          <div class="influence-cover">
            <img src="${encodeURI(entry.cover)}" alt="${entry.album} — ${entry.artist} cover" loading="lazy">
            <div class="influence-caption">
              <span class="influence-album">${entry.album}</span>
              <span class="influence-artist">${entry.artist}</span>
            </div>
          </div>
        `;
        influenceScroll.appendChild(card);
      });

      /* Colour follows horizontal scroll position here (not page scroll,
         like the rest of the site's grayscale/in-focus photos) — a cover
         is in colour while sufficiently inside the carousel's own visible
         band, and eases back to grayscale as it scrolls past either edge. */
      const scrollFocusObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          entry.target.classList.toggle('in-focus', entry.isIntersecting);
        });
      }, { root: influenceScroll, threshold: 0.75 });
      influenceScroll.querySelectorAll('.influence-card').forEach(card => scrollFocusObserver.observe(card));

      /* Drag-to-scroll with the mouse (touch already scrolls natively) —
         same pattern as the tracks carousel, minus the audio-related
         interactive-child exclusion since these cards have no buttons. */
      let isDown = false, startX = 0, startScroll = 0;
      influenceScroll.addEventListener('pointerdown', (e) => {
        if (e.pointerType !== 'mouse') return;
        isDown = true;
        dragged = false;
        startX = e.clientX;
        startScroll = influenceScroll.scrollLeft;
        influenceScroll.classList.add('dragging');
        influenceScroll.setPointerCapture(e.pointerId);
      });
      influenceScroll.addEventListener('pointermove', (e) => {
        if (!isDown) return;
        const dx = e.clientX - startX;
        if (Math.abs(dx) > 5) dragged = true;
        influenceScroll.scrollLeft = startScroll - dx;
      });
      function endDrag() {
        isDown = false;
        influenceScroll.classList.remove('dragging');
        setTimeout(() => { dragged = false; }, 0);
      }
      influenceScroll.addEventListener('pointerup', endDrag);
      influenceScroll.addEventListener('pointerleave', endDrag);

      // Eased toward a target instead of jumping straight to it, same as
      // the tracks carousels' wheel handler, so it reads as fluid rather
      // than a hard per-tick snap.
      let wheelTarget = null;
      let wheelRAF = null;
      function easeWheelScroll() {
        const diff = wheelTarget - influenceScroll.scrollLeft;
        if (Math.abs(diff) < 0.5) {
          influenceScroll.scrollLeft = wheelTarget;
          wheelTarget = null;
          wheelRAF = null;
          return;
        }
        influenceScroll.scrollLeft += diff * 0.18;
        wheelRAF = requestAnimationFrame(easeWheelScroll);
      }
      influenceScroll.addEventListener('wheel', (e) => {
        if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
        const max = influenceScroll.scrollWidth - influenceScroll.clientWidth;
        const current = wheelTarget != null ? wheelTarget : influenceScroll.scrollLeft;
        const atStart = current <= 0;
        const atEnd = current >= max - 1;
        if ((e.deltaY < 0 && atStart) || (e.deltaY > 0 && atEnd)) return;
        wheelTarget = Math.min(max, Math.max(0, current + e.deltaY));
        e.preventDefault();
        if (!wheelRAF) wheelRAF = requestAnimationFrame(easeWheelScroll);
      }, { passive: false });

      function cardStep() {
        const card = influenceScroll.querySelector('.influence-card');
        return card ? card.getBoundingClientRect().width + 16 : 200;
      }
      function updateArrows() {
        const max = influenceScroll.scrollWidth - influenceScroll.clientWidth - 1;
        const hasOverflow = influenceScroll.scrollWidth > influenceScroll.clientWidth;
        influencesSection.classList.toggle('no-overflow', !hasOverflow);
        prevBtn.disabled = influenceScroll.scrollLeft <= 0;
        nextBtn.disabled = influenceScroll.scrollLeft >= max;
      }
      prevBtn.addEventListener('click', () => influenceScroll.scrollBy({ left: -cardStep(), behavior: 'smooth' }));
      nextBtn.addEventListener('click', () => influenceScroll.scrollBy({ left: cardStep(), behavior: 'smooth' }));
      influenceScroll.addEventListener('scroll', updateArrows);
      window.addEventListener('resize', updateArrows);
      updateArrows();
    }
  }

  /* ---------------------------------------------------------------------
     8. Footer year
  --------------------------------------------------------------------- */
  document.getElementById('year').textContent = new Date().getFullYear();

});
