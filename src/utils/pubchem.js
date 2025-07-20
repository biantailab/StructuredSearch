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

export function findDrugBankId(sections) {
  for (const section of sections || []) {
    if (section.TOCHeading === 'DrugBank ID') {
      const info = section.Information?.[0];
      if (info) {
        if (info.URL) {
          return { id: info.Value?.StringWithMarkup?.[0]?.String, url: info.URL };
        }
        if (info.Value?.StringWithMarkup?.[0]?.String) {
          const id = info.Value.StringWithMarkup[0].String;
          return { id, url: `https://go.drugbank.com/drugs/${id}` };
        }
      }
    }
    if (section.Section) {
      const result = findDrugBankId(section.Section);
      if (result) return result;
    }
  }
  return null;
}

export function findWikipediaLink(sections, recordTitle) {
  for (const section of sections || []) {
    if (section.TOCHeading === 'Wikipedia') {
      const information = section.Information || [];
      if (information.length > 1 && recordTitle) {
        for (const info of information) {
          const wikiTitle = info.Value?.StringWithMarkup?.[0]?.String;
          if (wikiTitle && recordTitle.toLowerCase().includes(wikiTitle.toLowerCase())) {
            return info.URL;
          }
        }
      }
      const firstInfo = information[0];
      if (firstInfo && firstInfo.URL) {
        return firstInfo.URL;
      }
    }
    if (section.Section) {
      const result = findWikipediaLink(section.Section, recordTitle);
      if (result) return result;
    }
  }
  return null;
} 