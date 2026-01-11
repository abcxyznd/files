export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const cookieHeader = req.headers.cookie || '';
  const hasAdmin = cookieHeader.split(';').map(s=>s.trim()).some(s=>s.startsWith('admin_token='));
  if (!hasAdmin) return res.status(401).json({ error: 'Unauthorized' });

  const TOKEN = process.env.GITHUB_TOKEN || '';
  const OWNER = process.env.GITHUB_OWNER || 'abcxyznd';
  const REPO = process.env.GITHUB_REPO || '';
  const BRANCH = process.env.GITHUB_BRANCH || 'main';
  if (!TOKEN || !OWNER || !REPO) return res.status(500).json({ error: 'Server not configured (GITHUB_TOKEN/OWNER/REPO missing)' });

  try {
    // list repository tree (shallow) by using the GitHub git/trees API
    const apiBase = 'https://api.github.com';
    // get default branch sha
    const refRes = await fetch(`${apiBase}/repos/${OWNER}/${REPO}/git/refs/heads/${BRANCH}`, { headers: { 'Authorization': `Bearer ${TOKEN}`, 'Accept': 'application/vnd.github+json' } });
    if (!refRes.ok) return res.status(refRes.status).json({ error: 'Failed to get branch ref' });
    const refJson = await refRes.json();
    const sha = refJson.object && refJson.object.sha;
    const treeRes = await fetch(`${apiBase}/repos/${OWNER}/${REPO}/git/trees/${sha}?recursive=1`, { headers: { 'Authorization': `Bearer ${TOKEN}`, 'Accept': 'application/vnd.github+json' } });
    if (!treeRes.ok) return res.status(treeRes.status).json({ error: 'Failed to get repo tree' });
    const treeJson = await treeRes.json();
    const files = (treeJson.tree || []).filter(t => t.type === 'blob' && t.path && (t.path.endsWith('.md') || t.path.endsWith('.html') || t.path.endsWith('.txt') || t.path.endsWith('.json')) ).map(t => ({ path: t.path }));

    // optionally fetch first few file contents (small optimization)
    const filesWithContent = [];
    for (let i=0;i<Math.min(60, files.length);i++){
      const p = files[i].path;
      try{
        const contentRes = await fetch(`${apiBase}/repos/${OWNER}/${REPO}/contents/${encodeURIComponent(p)}?ref=${BRANCH}`, { headers: { 'Authorization': `Bearer ${TOKEN}`, 'Accept': 'application/vnd.github+json' } });
        if (contentRes.ok){
          const cj = await contentRes.json();
          const decoded = cj.content ? Buffer.from(cj.content, 'base64').toString('utf8') : '';
          filesWithContent.push({ path: p, content: decoded });
        } else filesWithContent.push({ path: p });
      } catch(e){ filesWithContent.push({ path: p }); }
    }

    return res.json({ success: true, files: filesWithContent });
  } catch (err){ return res.status(500).json({ error: err.message }); }
}
