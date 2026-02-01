/**
 * PubChem 搜索目标相关功能
 */

/**
 * 生成 PubChem 化合物页面的 URL
 * @param cid PubChem Compound ID
 * @returns PubChem 化合物页面的 URL
 */
export function getPubChemCompoundUrlByCID(cid: number | null): string | null {
  if (!cid) return null;
  return `https://pubchem.ncbi.nlm.nih.gov/compound/${cid}`;
}