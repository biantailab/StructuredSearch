function generateId(length = 6) {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const { url: longUrl } = await request.json();
    if (!longUrl) {
      return new Response(JSON.stringify({ success: false, error: 'Missing URL' }), { status: 400 });
    }

    const requestUrl = new URL(request.url);

    const urlHash = await sha256(longUrl);
    const hashKey = `hash_${urlHash}`;

    const existingId = await env.SMILES_KV.get(hashKey);
    if (existingId) {
      const shortUrl = `${requestUrl.origin}/s/${existingId}`;
      return new Response(JSON.stringify({ success: true, shortUrl, originalUrl: longUrl }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let id;
    let attempts = 0;
    while (attempts < 5) {
      id = generateId(6);
      const exists = await env.SMILES_KV.get(`id_${id}`);
      if (!exists) break;
      attempts++;
    }

    await Promise.all([
      env.SMILES_KV.put(`id_${id}`, longUrl, { expirationTtl: 60 * 60 * 24 * 30 }),
      env.SMILES_KV.put(hashKey, id, { expirationTtl: 60 * 60 * 24 * 30 })
    ]);

    const shortUrl = `${requestUrl.origin}/s/${id}`;
    return new Response(JSON.stringify({ success: true, shortUrl, originalUrl: longUrl }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500 });
  }
}