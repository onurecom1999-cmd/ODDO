// Deletes the calling account and everything tied to it (rows cascade from auth.users).
// Needs SUPABASE_SERVICE_ROLE_KEY in Netlify.
import { deleteUser, userFrom } from '../lib/supabase.mjs';

export default async req => {
  if (req.method !== 'POST') return new Response('method', { status: 405 });
  const id = await userFrom(req);
  if (!id) return new Response('unauthorized', { status: 401 });
  try {
    await deleteUser(id);
  } catch (e) {
    console.error(e);
    return new Response('failed', { status: 503 });
  }
  return new Response('ok');
};
