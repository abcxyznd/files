// export default async function handler(req, res) {
//   if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
//   const cookieHeader = req.headers.cookie || '';
//   const hasAdmin = cookieHeader.split(';').map(s=>s.trim()).some(s=>s.startsWith('admin_token='));
//   if (!hasAdmin) return res.status(401).json({ success: false, error: 'NO_AUTH_COOKIE' });
//   return res.json({ success: true });
// }

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { token } = req.body;
    const cookieToken = req.headers.cookie?.split('; ').find(row => row.startsWith('admin_token='))?.split('=')[1];
    
    // Kiểm tra token từ cả cookie và request body
    if (token && cookieToken === token) {
      return res.json({ success: true, message: 'Authenticated' });
    }
    
    return res.status(401).json({ error: 'Not authenticated' });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}