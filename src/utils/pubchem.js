export async function getPubChemCID(smiles) {
  const searchUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/smiles/${encodeURIComponent(smiles)}/cids/JSON`;
  try {
    const searchResponse = await fetch(searchUrl);
    if (!searchResponse.ok) {
      throw new Error(`PubChem 搜索失败: ${searchResponse.status}`);
    }
    const searchData = await searchResponse.json();
    if (!searchData.IdentifierList?.CID?.[0]) {
      return null;
    }
    return searchData.IdentifierList.CID[0];
  } catch (e) {
    return null;
  }
}

export async function getCASByCID(cid) {
  const casUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/synonyms/JSON`;
  const casResponse = await fetch(casUrl);
  if (!casResponse.ok) throw new Error('CAS 查询失败');
  const casData = await casResponse.json();
  const synonyms = casData.InformationList?.Information?.[0]?.Synonym || [];
  const casNumber = synonyms.find(syn => /^\d+-\d{2}-\d$/.test(syn) && !syn.startsWith('EC'));
  return casNumber || null;
}

export async function getPubChemData(cid) {
  const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug_view/data/compound/${cid}/JSON/`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('获取 PubChem 数据失败');
  }
  return await response.json();
}

export async function getIUPACNameByCID(cid) {
  const nameUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/property/IUPACName/JSON`;
  const nameResponse = await fetch(nameUrl);
  if (!nameResponse.ok) {
    throw new Error('获取 IUPACName 失败');
  }
  const nameData = await nameResponse.json();
  return nameData.PropertyTable?.Properties?.[0]?.IUPACName || null;
}

export function findWikipediaLink(sections, recordTitle, synonyms = []) {
  for (const section of sections || []) {
    if (section.TOCHeading === 'Wikipedia') {
      const information = section.Information || [];
      if (information.length > 0) {
        const titlesToMatch = [recordTitle, ...synonyms].filter(Boolean).map(t => t.toLowerCase());
        for (const info of information) {
          const wikiTitle = info.Value?.StringWithMarkup?.[0]?.String?.toLowerCase();
          if (wikiTitle && titlesToMatch.includes(wikiTitle)) {
            return info.URL;
          }
        }
        for (const info of information) {
          const wikiTitle = info.Value?.StringWithMarkup?.[0]?.String?.toLowerCase();
          if (wikiTitle) {
            for (const titleToMatch of titlesToMatch) {
              if (titleToMatch.includes(wikiTitle) || wikiTitle.includes(titleToMatch)) {
                return info.URL;
              }
            }
          }
        }
        const firstInfo = information[1];
        if (firstInfo && firstInfo.URL) {
          return firstInfo.URL;
        }
      }
    }
    if (section.Section) {
      const result = findWikipediaLink(section.Section, recordTitle, synonyms);
      if (result) return result;
    }
  }
  return null;
}

export async function getCASBySmiles(smiles) {
  const cid = await getPubChemCID(smiles);
  if (!cid) return { cid: null, cas: null };
  const cas = await getCASByCID(cid);
  return { cid, cas };
}

export async function getIUPACNameBySmiles(smiles) {
  const cid = await getPubChemCID(smiles);
  if (!cid) return { cid: null, iupacName: null };
  const iupacName = await getIUPACNameByCID(cid);
  return { cid, iupacName };
}

export async function getWikipediaUrlBySmiles(smiles) {
  const cid = await getPubChemCID(smiles);
  if (!cid) return { cid: null, wikipediaUrl: null };
  const data = await getPubChemData(cid);
  const wikipediaUrl = findWikipediaLink(data.Record?.Section, data.Record?.RecordTitle);
  return { cid, wikipediaUrl };
}
