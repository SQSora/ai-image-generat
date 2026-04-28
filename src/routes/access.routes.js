/**
 * 访问控制路由
 */

const express = require('express');
const router = express.Router();
const {
  FRONTEND_ACCESS_CONTROL_ENABLED,
  FRONTEND_ACCESS_KEY,
} = require('../utils/config');
const { setAccessCookie, clearAccessCookie } = require('../middleware/auth');
const { checkAccessAuthThrottle, markAccessAuthFailure } = require('./auth.throttle');

router.get('/unlock', (req, res) => {
  if (!FRONTEND_ACCESS_CONTROL_ENABLED || !FRONTEND_ACCESS_KEY || require('../middleware/auth').isAccessAuthorized(req)) {
    return res.redirect('/');
  }
  return res.status(200).send(`<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>访问验证</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Arial,sans-serif;background:#f4f6f8;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}.card{background:#fff;padding:24px;border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.08);width:min(92vw,360px)}input{width:100%;padding:10px;border:1px solid #d0d7de;border-radius:8px;margin:10px 0 14px}button{width:100%;padding:10px;border:0;border-radius:8px;background:#1677ff;color:#fff;cursor:pointer}.msg{color:#d1242f;font-size:13px;min-height:20px}</style></head>
<body><form class="card" id="unlockForm"><h3 style="margin:0 0 6px">访问验证</h3><div style="font-size:13px;color:#57606a">请输入前端访问密钥</div><input type="password" name="accessKey" autocomplete="current-password" required /><div class="msg" id="msg"></div><button type="submit">验证并进入</button></form>
<script>
const form=document.getElementById('unlockForm');
const msg=document.getElementById('msg');
form.addEventListener('submit',async(e)=>{e.preventDefault();msg.textContent='';
const fd=new FormData(form);
const body=new URLSearchParams();body.set('accessKey',fd.get('accessKey')||'');
try{
  const res=await fetch('/api/access-auth',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:body.toString()});
  const data=await res.json().catch(()=>({error:'验证失败'}));
  if(!res.ok){msg.textContent=data.error||'验证失败';return;}
  window.location.href='/';
}catch(err){msg.textContent='网络错误，请重试';}
});
</script></body></html>`);
});

router.post('/api/access-auth', (req, res) => {
  if (!FRONTEND_ACCESS_CONTROL_ENABLED || !FRONTEND_ACCESS_KEY) {
    return res.json({ ok: true, enabled: false });
  }
  const throttle = checkAccessAuthThrottle(req);
  if (throttle.blocked) {
    res.setHeader('Retry-After', String(throttle.retryAfterSec));
    return res.status(429).json({ error: `尝试次数过多，请 ${throttle.retryAfterSec} 秒后再试` });
  }
  const input = typeof req.body?.accessKey === 'string' ? req.body.accessKey.trim() : '';
  if (!input || input !== FRONTEND_ACCESS_KEY) {
    const state = markAccessAuthFailure(req);
    const now = Date.now();
    if (state.lockUntil && state.lockUntil > now) {
      const retryAfterSec = Math.ceil((state.lockUntil - now) / 1000);
      res.setHeader('Retry-After', String(retryAfterSec));
      return res.status(429).json({ error: `尝试次数过多，请 ${retryAfterSec} 秒后再试` });
    }
    return res.status(401).json({ error: '访问密钥错误' });
  }
  require('./auth.throttle').clearAccessAuthFailure(req);
  setAccessCookie(res);
  return res.json({ ok: true });
});

router.post('/api/access-logout', (req, res) => {
  clearAccessCookie(res);
  return res.json({ ok: true });
});

module.exports = router;
