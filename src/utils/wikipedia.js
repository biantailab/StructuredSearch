import { getPubChemData, getSynonymsByCID } from './pubchem';

export function findWikipediaLink(sections, recordTitle, synonyms = []) {
  for (const section of sections || []) {
    if (section.TOCHeading === 'Wikipedia') {
      const information = section.Information || [];
      if (information.length > 0) {
        const normalize = (s) =>
          (s || '')
            .trim()
            .toLowerCase()
            .replace(/_/g, ' ')
            .replace(/\s+/g, ' ');

        const titlesToMatch = [recordTitle, ...synonyms]
          .filter(Boolean)
          .map((t) => normalize(t));

        let bestUrl = null;
        let bestScore = -1;

        information.forEach((info) => {
          const url = info.URL || null;
          if (!url) return;

          const rawTitle = info.Value?.StringWithMarkup?.[0]?.String;
          const wikiTitle = normalize(rawTitle);

          const urlTitle = normalize(
            (() => {
              try {
                const u = new URL(url);
                return decodeURIComponent(u.pathname.split('/').pop() || '');
              } catch {
                return '';
              }
            })()
          );

          let score = 0;
          if (url.includes('en.wikipedia.org')) score += 20;
          const nameHint = normalize(info.Name);
          if (nameHint.includes('wikipedia') && nameHint.includes('en')) score += 10;

          if (wikiTitle && titlesToMatch.includes(wikiTitle)) {
            score += 100;
          } else if (urlTitle && titlesToMatch.includes(urlTitle)) {
            score += 100;
          } else if (wikiTitle) {
            for (const title of titlesToMatch) {
              if (title && (title.includes(wikiTitle) || wikiTitle.includes(title))) {
                score += 60;
                break;
              }
            }
          } else if (urlTitle) {
            for (const title of titlesToMatch) {
              if (title && (title.includes(urlTitle) || urlTitle.includes(title))) {
                score += 60;
                break;
              }
            }
          }

          if (score > bestScore) {
            bestScore = score;
            bestUrl = url;
          }
        });

        if (bestUrl) return bestUrl;
      }
    }

    if (section.Section) {
      const result = findWikipediaLink(section.Section, recordTitle, synonyms);
      if (result) return result;
    }
  }

  return null;
}

export async function getWikipediaUrlByCID(cid) {
  if (!cid) return { cid: null, wikipediaUrl: null };
  const data = await getPubChemData(cid);
  let synonyms = [];
  try {
    synonyms = await getSynonymsByCID(cid);
  } catch (_) {}
  const wikipediaUrl = findWikipediaLink(data.Record?.Section, data.Record?.RecordTitle, synonyms);
  return { cid, wikipediaUrl };
}
