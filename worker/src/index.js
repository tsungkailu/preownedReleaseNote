const GITHUB_API_VERSION = '2022-11-28';
const USER_AGENT = 'preowned-elearning-worker';

function corsHeaders(env) {
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
}

function jsonResponse(body, status, env) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...corsHeaders(env),
    },
  });
}

async function sha256(text) {
  const data = new TextEncoder().encode(text);
  return crypto.subtle.digest('SHA-256', data);
}

async function timingSafeEqualString(a, b) {
  const [digestA, digestB] = await Promise.all([sha256(a), sha256(b)]);
  const bytesA = new Uint8Array(digestA);
  const bytesB = new Uint8Array(digestB);
  let diff = 0;
  for (let i = 0; i < bytesA.length; i++) {
    diff |= bytesA[i] ^ bytesB[i];
  }
  return diff === 0;
}

function githubHeaders(env) {
  return {
    'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': GITHUB_API_VERSION,
    'User-Agent': USER_AGENT,
  };
}

function contentsUrl(env) {
  return `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${env.GITHUB_PATH}`;
}

function bytesToBase64(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToText(base64) {
  const binary = atob(base64.replace(/\n/g, ''));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

function isValidEpisode(item) {
  return (
    item &&
    typeof item.ep === 'string' && item.ep.trim().length > 0 &&
    typeof item.title === 'string' && item.title.trim().length > 0 &&
    typeof item.desc === 'string' && item.desc.trim().length > 0 &&
    (item.note === undefined || typeof item.note === 'string') &&
    typeof item.link === 'string' && item.link.trim().length > 0
  );
}

async function getCurrentFile(env) {
  const res = await fetch(`${contentsUrl(env)}?ref=${env.GITHUB_BRANCH}`, {
    headers: githubHeaders(env),
  });
  if (!res.ok) {
    throw new Error(`GitHub read failed: ${res.status}`);
  }
  const data = await res.json();
  const episodes = JSON.parse(base64ToText(data.content));
  return { episodes, sha: data.sha };
}

async function handleGet(env) {
  try {
    const { episodes } = await getCurrentFile(env);
    return jsonResponse({ episodes }, 200, env);
  } catch (err) {
    return jsonResponse({ error: 'read_failed', message: err.message }, 502, env);
  }
}

async function handlePost(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'invalid_json' }, 400, env);
  }

  const { user, pass, episodes } = body || {};
  if (typeof user !== 'string' || typeof pass !== 'string') {
    return jsonResponse({ error: 'missing_credentials' }, 400, env);
  }
  const [userOk, passOk] = await Promise.all([
    timingSafeEqualString(user, env.ADMIN_USER),
    timingSafeEqualString(pass, env.ADMIN_PASS),
  ]);
  if (!userOk || !passOk) {
    return jsonResponse({ error: 'unauthorized' }, 401, env);
  }

  if (!Array.isArray(episodes) || episodes.length === 0 || !episodes.every(isValidEpisode)) {
    return jsonResponse({ error: 'invalid_episodes' }, 400, env);
  }

  try {
    const { sha } = await getCurrentFile(env);
    const content = bytesToBase64(new TextEncoder().encode(JSON.stringify(episodes, null, 2) + '\n'));
    const putRes = await fetch(contentsUrl(env), {
      method: 'PUT',
      headers: {
        ...githubHeaders(env),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: `chore: update elearning episodes via admin UI`,
        content,
        sha,
        branch: env.GITHUB_BRANCH,
      }),
    });
    if (!putRes.ok) {
      const errBody = await putRes.text();
      return jsonResponse({ error: 'write_failed', status: putRes.status, detail: errBody }, 502, env);
    }
    return jsonResponse({ episodes }, 200, env);
  } catch (err) {
    return jsonResponse({ error: 'write_failed', message: err.message }, 502, env);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(env) });
    }

    if (url.pathname !== '/api/episodes') {
      return jsonResponse({ error: 'not_found' }, 404, env);
    }

    if (request.method === 'GET') {
      return handleGet(env);
    }
    if (request.method === 'POST') {
      return handlePost(request, env);
    }
    return jsonResponse({ error: 'method_not_allowed' }, 405, env);
  },
};
