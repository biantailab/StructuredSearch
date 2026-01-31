export async function onRequestGet(context) {
  const { params, env } = context;
  const id = params.id;

  if (!id) {
    return new Response("Invalid Short URL", { status: 404 });
  }

  try {
    const longUrl = await env.SMILES_KV.get(`id_${id}`);

    if (longUrl) {
      return Response.redirect(longUrl, 302);
    } else {
      return new Response("Short URL not found", { status: 404 });
    }
  } catch (error) {
    return new Response("Database Error", { status: 500 });
  }
}