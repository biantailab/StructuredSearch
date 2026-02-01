export function generateHNMRUrl(smiles: string): string {
  if (!smiles) {
    throw new Error('SMILES string is required');
  }
  
  return `https://www.nmrdb.org/new_predictor/index.shtml?v=latest&smiles=${encodeURIComponent(smiles)}`;
}

export function openHNMRPrediction(smiles: string): void {
  if (!smiles) {
    console.warn('Cannot open HNMR prediction: SMILES string is empty');
    return;
  }
  
  const searchUrl = generateHNMRUrl(smiles);
  window.open(searchUrl, '_blank');
}