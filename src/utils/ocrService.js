const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
};

export async function imageToSmiles(file) {
  try {
    const base64Image = await fileToBase64(file);

    const response = await fetch('/api/molscribe/api/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: [base64Image]
      }),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const result = await response.json();

    if (!result.data || !Array.isArray(result.data)) {
      throw new Error('API return format error');
    }

    const smiles = result.data.find(item => {
      return (
        typeof item === 'string' &&
        !item.startsWith('data:image') &&
        !item.includes('Confidence') &&
        item.length > 0 && 
        item.length < 2000
      );
    });

    if (smiles) {
      return smiles.trim();
    } else {
      return result.data[0];
    }

  } catch (error) {
    console.error('MolScribe API Error:', error);
    throw error;
  }
}