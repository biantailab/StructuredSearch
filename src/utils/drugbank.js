import { getPubChemCID, getPubChemData, getCASByCID } from './pubchem';

function findDrugBankId(sections) {
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

export async function getDrugBankInfoBySmiles(smiles) {
  try {
    const cid = await getPubChemCID(smiles);
    if (!cid) return { cid: null, drugBankUrl: null, cas: null };
    
    const data = await getPubChemData(cid);
    const result = findDrugBankId(data.Record?.Section);
    
    if (result && result.url) {
      return { cid, drugBankUrl: result.url, cas: null };
    } else {
      const cas = await getCASByCID(cid);
      return { cid, drugBankUrl: null, cas };
    }
  } catch (error) {
    console.error('DrugBank 查询失败:', error);
    throw new Error('获取 DrugBank 信息失败');
  }
}

export function getDrugBankFuzzySearchUrl(smiles) {
  return `https://go.drugbank.com/structures/search/small_molecule_drugs/structure?utf8=✓&searcher=structure&structure_search_type=substructure&structure=${encodeURIComponent(smiles)}#results`;
}

export function getDrugBankUrlByCAS(cas) {
  if (!cas) return null;
  return `https://go.drugbank.com/unearth/q?searcher=drugs&query=${encodeURIComponent(cas)}`;
}
