
export async function onRequest(context) {
  const { request, params } = context;
  const url = new URL(request.url);
  
  // 提取路径并构建目标 URL
  const targetPath = params.proxy ? params.proxy.join('/') : '';
  const googleUrl = new URL(`https://generativelanguage.googleapis.com/${targetPath}${url.search}`);

  // 必须重写 Headers，特别是 Host 字段
  const newHeaders = new Headers(request.headers);
  newHeaders.set('Host', 'generativelanguage.googleapis.com');
  
  // 移除可能导致冲突的 Cloudflare 特定头部
  newHeaders.delete('cf-connecting-ip');
  newHeaders.delete('cf-ipcountry');
  newHeaders.delete('cf-ray');
  newHeaders.delete('cf-visitor');

  // 处理 WebSocket 升级请求
  if (request.headers.get("Upgrade") === "websocket") {
    return fetch(googleUrl.toString(), {
      headers: newHeaders,
    });
  }

  // 处理普通 REST 请求
  const newRequest = new Request(googleUrl.toString(), {
    method: request.method,
    headers: newHeaders,
    body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : null,
    redirect: 'follow'
  });

  try {
    const response = await fetch(newRequest);
    // 允许跨域
    const res = new Response(response.body, response);
    res.headers.set('Access-Control-Allow-Origin', '*');
    return res;
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
