export default async function handler(req, res) {
  // simple serverless handler compatible with Vercel / Next-style
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // require admin cookie
  const cookieHeader = req.headers.cookie || '';
  const hasAdmin = cookieHeader.split(';').map(s=>s.trim()).some(s=>s.startsWith('admin_token='));
  if (!hasAdmin) return res.status(401).json({ error: 'Unauthorized' });

  const { path, content, message } = req.body || {};
  if (!path || typeof content !== 'string') return res.status(400).json({ error: 'Missing path/content' });

  const TOKEN = process.env.GITHUB_TOKEN || '';
  const OWNER = process.env.GITHUB_OWNER || 'abcxyznd';
  const REPO = process.env.GITHUB_REPO || '';
  const BRANCH = process.env.GITHUB_BRANCH || 'main';

  if (!TOKEN || !OWNER || !REPO) return res.status(500).json({ error: 'Server not configured (GITHUB_TOKEN/OWNER/REPO missing)' });

  try {
    // check if file exists to get sha
    const apiBase = 'https://api.github.com';
    const getUrl = `${apiBase}/repos/${OWNER}/${REPO}/contents/${encodeURIComponent(path)}?ref=${BRANCH}`;
    const headers = { 'Authorization': `Bearer ${TOKEN}`, 'Accept': 'application/vnd.github+json' };

    const getRes = await fetch(getUrl, { headers });
    let sha = undefined;
    if (getRes.status === 200) {
      const j = await getRes.json();
      sha = j.sha;
    }

    const putUrl = `${apiBase}/repos/${OWNER}/${REPO}/contents/${encodeURIComponent(path)}`;
    const body = {
      message: message || `Update ${path} via dashboard`,
      content: Buffer.from(content, 'utf8').toString('base64'),
      branch: BRANCH,
    };
    if (sha) body.sha = sha;

    const putRes = await fetch(putUrl, { method: 'PUT', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const putJson = await putRes.json();
    if (!putRes.ok) return res.status(putRes.status).json({ error: putJson.message || 'GitHub API error', details: putJson });

    const commitUrl = putJson.content && putJson.content.html_url ? putJson.content.html_url : null;
    return res.json({ success: true, commitUrl });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
