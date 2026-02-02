export async function onRequestGet(context) {
  const { params, env } = context;
  const id = params.id;

  if (!id) {
    return new Response("Invalid Short URL<br><a href='/'>Back to home</a>", { status: 404, headers: { 'Content-Type': 'text/html' } });
  }

  try {
    const longUrl = await env.SMILES_KV.get(`id_${id}`);

    if (longUrl) {
      return Response.redirect(longUrl, 302);
    } else {
      return new Response("Short URL not found<br><a href='/'>Back to home</a>", { status: 404, headers: { 'Content-Type': 'text/html' } });
    }
  } catch (error) {
    return new Response("Database Error<br><a href='/'>Back to home</a>", { status: 500, headers: { 'Content-Type': 'text/html' } });
  }
}