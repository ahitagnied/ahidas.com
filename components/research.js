// Research section behaviour:
//   - the collapsed grid <-> expanded list transition, driven by scroll or click
//   - the sticky image that follows the active entry on narrow screens
//   - image-column sizing, so each list row is at least as tall as its text

const FADE_DURATION_MS = 200;
const FADE_STAGGER_MS = 50;

const STICKY_BREAKPOINT = 572;

export function initResearch({ gridView, listView, stickyImageEl, scrollToggleEl }) {
    let stickyActiveSrc = null;
    let stickyHref = '#';

    stickyImageEl.addEventListener('click', () => {
        window.open(stickyHref, '_blank');
    });

    scrollToggleEl.addEventListener('click', () => transitionToList());

    const galleryImages = [...document.querySelectorAll('.paper-image img')];
    let loadedCount = 0;
    const onImageLoaded = (img) => {
        img.classList.add('image-loaded');
        loadedCount++;
        if (loadedCount === galleryImages.length) {
            setTimeout(() => scrollToggleEl.classList.add('ready'), 1000);
        }
    };
    galleryImages.forEach(img => {
        if (img.complete && img.naturalWidth) {
            onImageLoaded(img);
        } else {
            img.addEventListener('load', () => onImageLoaded(img), { once: true });
        }
    });

    let currentView = 'grid';
    let transitionTimer = null;

    const stickyMql = window.matchMedia(`(max-width: ${STICKY_BREAKPOINT}px)`);
    function isStickyMode() {
        return stickyMql.matches;
    }

    function adjustImageColumnWidth() {
        const entries = listView.querySelectorAll('.entry.columns');
        if (!entries.length) return;

        // Disable transitions during measurement
        entries.forEach(el => { el.style.transition = 'none'; el.style.gridTemplateColumns = ''; });

        if (isStickyMode()) {
            entries.forEach(el => el.style.transition = '');
            return;
        }

        // Temporarily show list if hidden to measure
        const wasHidden = listView.style.display === 'none';
        if (wasHidden) {
            listView.style.visibility = 'hidden';
            listView.style.position = 'absolute';
            listView.style.display = 'block';
        }

        // Start from the natural 1fr/6fr width, floored at 120px
        const naturalWidth = entries[0].querySelector('.paper-image').offsetWidth;
        let colWidth = Math.max(120, naturalWidth);

        // Iterate: widen image column until it's at least as tall as the tallest text
        for (let i = 0; i < 5; i++) {
            entries.forEach(el => el.style.gridTemplateColumns = colWidth + 'px 1fr');

            let maxTextHeight = 0;
            entries.forEach(entry => {
                maxTextHeight = Math.max(maxTextHeight, entry.lastElementChild.offsetHeight);
            });

            if (maxTextHeight <= colWidth) break;
            colWidth = maxTextHeight;
        }

        if (wasHidden) {
            listView.style.display = 'none';
            listView.style.visibility = '';
            listView.style.position = '';
        }

        // Re-enable transitions
        void listView.offsetWidth;
        entries.forEach(el => el.style.transition = '');
    }

    function updateStickyImage() {
        if (!isStickyMode()) return;

        const stickyBottom = stickyImageEl.getBoundingClientRect().bottom;
        const entries = Array.from(listView.querySelectorAll('.entry'));
        if (entries.length === 0) return;

        let activeEntry = entries[entries.length - 1];
        for (const entry of entries) {
            const title = entry.querySelector('.paper-title');
            if (title && title.getBoundingClientRect().bottom > stickyBottom) {
                activeEntry = entry;
                break;
            }
        }

        const newSrc = activeEntry.querySelector('img').getAttribute('src');
        stickyHref = activeEntry.querySelector('.paper-image').href;

        if (stickyActiveSrc !== newSrc) {
            stickyActiveSrc = newSrc;

            const newImg = document.createElement('img');
            newImg.alt = '';

            const show = () => {
                if (stickyActiveSrc !== newSrc) return;
                stickyImageEl.appendChild(newImg);
                requestAnimationFrame(() => {
                    newImg.classList.add('image-loaded');
                    stickyImageEl.querySelectorAll('img').forEach(el => {
                        if (el !== newImg) setTimeout(() => el.remove(), FADE_DURATION_MS);
                    });
                });
            };

            newImg.addEventListener('load', show, { once: true });
            newImg.src = newSrc;
            if (newImg.complete) show();
        }
    }

    function cancelTransition() {
        if (transitionTimer) {
            clearTimeout(transitionTimer);
            transitionTimer = null;
        }
    }

    function applyLayout() {
        if (isStickyMode()) {
            cancelTransition();
            gridView.style.display = 'none';
            listView.style.display = 'block';
            listView.querySelectorAll('.entry').forEach(entry => entry.style.opacity = '1');
            currentView = 'list-static';
            updateStickyImage();
        } else {
            if (currentView === 'list-static') {
                listView.style.display = 'none';
                gridView.style.display = 'block';
                gridView.style.opacity = '1';
                currentView = 'grid';
            }
            gridView.style.transition = 'opacity 0.2s ease-in-out';
        }
        adjustImageColumnWidth();
    }

    applyLayout();
    document.fonts.ready.then(() => { adjustImageColumnWidth(); });
    window.addEventListener('resize', applyLayout);

    function transitionToList() {
        if (currentView === 'list' || currentView === 'transitioning-to-list') return;
        cancelTransition();
        currentView = 'transitioning-to-list';

        if (scrollToggleAnimStarted) scrollToggleEl.style.opacity = '1';
        scrollToggleEl.style.animation = 'none';
        scrollToggleEl.classList.remove('ready');

        // Measure positions before layout changes
        const listEntries = listView.querySelectorAll('.entry');
        const gridHeight = gridView.offsetHeight;

        // Show list immediately (entries invisible) to establish full page height,
        // preventing scroll bounce on fast scroll
        listEntries.forEach(entry => entry.style.opacity = '0');
        listView.style.display = 'block';

        // Collapse grid height so list determines page height,
        // but keep it visible so it fades out in place
        gridView.style.transition = 'none';
        gridView.style.marginBottom = -gridHeight + 'px';

        void gridView.offsetWidth;
        gridView.style.transition = 'opacity 0.2s ease-in-out';
        gridView.style.opacity = '0';

        void listView.offsetWidth;

        transitionTimer = setTimeout(() => {
            if (currentView !== 'transitioning-to-list') return;
            gridView.style.display = 'none';
            gridView.style.marginBottom = '';
            gridView.style.transition = '';

            listEntries.forEach((entry, i) => {
                setTimeout(() => entry.style.opacity = '1', i * FADE_STAGGER_MS);
            });

            transitionTimer = setTimeout(() => {
                currentView = 'list';
            }, listEntries.length * FADE_STAGGER_MS + FADE_DURATION_MS);
        }, FADE_DURATION_MS);
    }

    function transitionToGrid() {
        if (currentView === 'grid' || currentView === 'transitioning-to-grid') return;
        cancelTransition();
        currentView = 'transitioning-to-grid';

        listView.querySelectorAll('.entry').forEach(entry => entry.style.opacity = '0');

        window.scrollTo({ top: 0, behavior: 'smooth' });

        transitionTimer = setTimeout(() => {
            if (currentView !== 'transitioning-to-grid') return;
            listView.style.display = 'none';
            gridView.style.display = 'block';
            void gridView.offsetWidth;

            gridView.style.opacity = '1';
            scrollToggleEl.style.opacity = '1';
            transitionTimer = setTimeout(() => {
                currentView = 'grid';
            }, FADE_DURATION_MS);
        }, FADE_DURATION_MS);
    }

    let lastScrollY = window.scrollY;

    window.addEventListener('scroll', () => {
        const scrollingDown = window.scrollY > lastScrollY;
        lastScrollY = window.scrollY;

        if (currentView === 'list-static') {
            updateStickyImage();
            return;
        }

        if (scrollingDown && window.scrollY > 0 && (currentView === 'grid' || currentView === 'transitioning-to-grid')) {
            transitionToList();
        } else if (!scrollingDown && window.scrollY <= 0 && (currentView === 'list' || currentView === 'transitioning-to-list')) {
            transitionToGrid();
        }
    });

    let scrollToggleAnimStarted = false;
    scrollToggleEl.addEventListener('animationstart', () => {
        scrollToggleAnimStarted = true;
    }, { once: true });
    scrollToggleEl.addEventListener('animationend', () => {
        scrollToggleEl.style.opacity = '1';
        scrollToggleEl.style.animation = 'none';
    }, { once: true });
}
