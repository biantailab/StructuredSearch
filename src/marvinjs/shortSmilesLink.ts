export async function generateSmilesLink(smiles: string): Promise<string> {
  if (!smiles) return '';
  
  const currentUrl = new URL(window.location.href);
  currentUrl.searchParams.set('smiles', smiles);
  const longUrl = currentUrl.toString();
  
  try {
    const response = await fetch('/api/shorten', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: longUrl })
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.shortUrl) {
        return data.shortUrl;
      }
    }
    console.warn('Short URL service returned invalid data, using long URL.');
  } catch (error) {
    console.error('Error creating short URL:', error);
  }
  
  return longUrl;
}