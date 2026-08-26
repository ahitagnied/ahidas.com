// Publications: reads data/papers.yaml and renders the two research views.
//
// The grid view (collapsed, at the top) shows only papers marked
// `highlight: true`. The list view (expanded) shows every paper, in the order
// they appear in the YAML.

const DEFAULT_SOURCE = 'data/papers.yaml';

const LINK_ICON = `<svg class="link-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="7" y1="17" x2="17" y2="7"></line><polyline points="7 7 17 7 17 17"></polyline></svg>`;

// Minimal YAML reader for the papers file: a list of entries, each a flat set
// of "key: value" fields. Supports comments, quoted strings, and true/false.
function parsePapers(text) {
    const unquote = (value) => {
        if (value.startsWith("'") && value.endsWith("'") && value.length > 1) {
            return value.slice(1, -1).replace(/''/g, "'");
        }
        if (value.startsWith('"') && value.endsWith('"') && value.length > 1) {
            return value.slice(1, -1).replace(/\\(["\\])/g, '$1');
        }
        if (value === 'true') return true;
        if (value === 'false') return false;
        return value;
    };

    const papers = [];
    for (const line of text.split('\n')) {
        if (!line.trim() || line.trim().startsWith('#')) continue;

        const match = line.match(/^(\s*-\s+|\s+)([A-Za-z_]\w*):\s*(.*?)\s*$/);
        if (!match) throw new Error(`papers.yaml: cannot parse line: ${line}`);

        const [, prefix, key, rawValue] = match;
        if (prefix.includes('-')) papers.push({});
        if (!papers.length) throw new Error(`papers.yaml: "${key}" appears before the first "- " entry`);

        papers[papers.length - 1][key] = unquote(rawValue);
    }
    return papers;
}

export async function loadPapers(source = DEFAULT_SOURCE) {
    const response = await fetch(source);
    if (!response.ok) throw new Error(`${source}: ${response.status} ${response.statusText}`);
    return parsePapers(await response.text());
}

function imageLink(paper) {
    const href = paper.website || paper.paper || '#';
    return `<a class="paper-image" href="${href}"><img src="${paper.image}" alt=""></a>`;
}

export function renderPapers(papers, { gridContainer, listContainer }) {
    papers.forEach(paper => {
        const links = [
            paper.paper && `<a href="${paper.paper}">Paper${LINK_ICON}</a>`,
            paper.website && `<a href="${paper.website}">Website${LINK_ICON}</a>`,
            paper.code && `<a href="${paper.code}">Code${LINK_ICON}</a>`
        ].filter(Boolean).join('');

        const conf = paper.conference ? paper.conference + (paper.distinction ? ` <span class="paper-highlight">${paper.distinction}</span>` : '') : '';
        const linksHtml = links ? `<p class="paper-links">${links}</p>` : '';

        // Grid View (collapsed) — only highlighted papers
        if (paper.highlight) {
            gridContainer.insertAdjacentHTML('beforeend', imageLink(paper));
        }

        // List View
        listContainer.insertAdjacentHTML('beforeend', `
                <div class="entry columns">
                    ${imageLink(paper)}
                    <div>
                        <p class="paper-title">${paper.title}</p>
                        <p class="paper-authors">${paper.authors}</p>
                        ${conf ? `<p class="paper-conference">${conf}</p>` : ''}
                        ${linksHtml}
                    </div>
                </div>
            `);
    });
}
