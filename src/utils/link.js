export async function generateSmilesLink(smiles) {
  if (!smiles) return '';
  
  const currentUrl = new URL(window.location.href);
  currentUrl.searchParams.set('smiles', smiles);
  const longUrl = currentUrl.toString();
  
  try {
    const response = await fetch('https://ssslink.netlify.app/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: longUrl })
    });
    
    console.log('Short URL response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Short URL response data:', data);
      if (data.success && data.shortUrl) {
        console.log('Using short URL:', data.shortUrl);
        return data.shortUrl;
      }
      console.log('Short URL not found in response, using original URL');
    } else {
      console.log('Short URL service failed, using original URL');
    }
  } catch (error) {
    console.error('Error creating short URL:', error);
  }
  
  return longUrl;
}
