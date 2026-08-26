import { loadPapers, renderPapers } from './components/papers.js';
import { initResearch } from './components/research.js';

const papers = await loadPapers();

renderPapers(papers, {
    gridContainer: document.getElementById('grid-images-container'),
    listContainer: document.getElementById('research-list-view'),
});

initResearch({
    gridView: document.getElementById('research-grid-view'),
    listView: document.getElementById('research-list-view'),
    stickyImageEl: document.getElementById('sticky-image'),
    scrollToggleEl: document.getElementById('scroll-toggle'),
});
