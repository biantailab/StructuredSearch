import { neon } from "https://esm.sh/@neondatabase/serverless";

function generateId(length = 6) {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export default async (request, context) => {
  const url = new URL(request.url);
  
  const connectionString = Deno.env.get("NETLIFY_DATABASE_URL") || Deno.env.get("DATABASE_URL");
  if (!connectionString) {
    return new Response("Config Error: Missing DATABASE_URL", { status: 500 });
  }
  const sql = neon(connectionString);

  if (url.pathname === '/api/shorten' && request.method === 'POST') {
    try {
      await sql`CREATE TABLE IF NOT EXISTS urls (
        id TEXT PRIMARY KEY,
        long_url TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`;

      const body = await request.json();
      const longUrl = body.url;
      if (!longUrl) return new Response("Missing URL<br><a href='/'>Back to home</a>", { status: 400, headers: { 'Content-Type': 'text/html' } });

      let id = generateId(6);
      let retries = 0;
      while (retries < 5) {
        const existing = await sql`SELECT id FROM urls WHERE id = ${id}`;
        if (existing.length === 0) break;
        id = generateId(6);
        retries++;
      }

      await sql`INSERT INTO urls (id, long_url) VALUES (${id}, ${longUrl})`;

      const shortUrl = `${url.origin}/s/${id}`;
      return new Response(JSON.stringify({ success: true, shortUrl, originalUrl: longUrl }), {
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
  }

  if (url.pathname.startsWith('/s/') && request.method === 'GET') {
    const id = url.pathname.split('/s/')[1];
    
    if (!id) return new Response("Invalid ID<br><a href='/'>Back to home</a>", { status: 404, headers: { 'Content-Type': 'text/html' } });

    try {
      const result = await sql`SELECT long_url FROM urls WHERE id = ${id}`;
      if (result.length > 0) {
        return Response.redirect(result[0].long_url, 302);
      } else {
        return new Response("Short URL not found<br><a href='/'>Back to home</a>", { status: 404, headers: { 'Content-Type': 'text/html' } });
      }
    } catch (error) {
      return new Response("Database Error<br><a href='/'>Back to home</a>", { status: 500, headers: { 'Content-Type': 'text/html' } });
    }
  }

  return context.next();
};