// 处理来自 URL 的 SMILES 和 CAS 参数的解析

export interface StructureParams {
  smiles?: string;
  cas?: string;
}

/**
 * 解析结构
 * @returns 包含 SMILES 和 CAS 参数的对象
 */
export function parseStructureParams(): StructureParams {
  const urlParams = new URLSearchParams(window.location.search);
  const smiles = urlParams.get('smiles');
  const cas = urlParams.get('cas');
  
  return {
    smiles: smiles ? smiles.trim() : undefined,
    cas: cas ? cas.trim() : undefined
  };
}

/**
 * 从解析参数导入结构
 * @param sketcher MarvinJS 实例
 * @param params 结构参数
 * @returns 返回一个 Promise，该 Promise 解析为导入结构的 SMILES 表示形式，如果没有导入结构，则返回 null
 */
export async function importStructureFromParams(
  sketcher: any, 
  params: StructureParams
): Promise<string | null> {
  try {
    if (params.cas) {
      await sketcher.importStructure(null, params.cas);
      const currentSmiles = await sketcher.exportStructure('smiles');
      return currentSmiles;
    } else if (params.smiles) {
      await sketcher.importStructure('smiles', params.smiles);
      return params.smiles;
    }
  } catch (err) {
    console.error("Failed to import structure from parameters", err);
    throw err;
  }
  
  return null;
}