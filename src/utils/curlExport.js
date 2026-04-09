function shellEscape(str) {
  return str.replace(/'/g, "'\\''");
}

export function toCurl(request, variables) {
  if (!request || !request.region?.request) return '';

  const req = request.region.request;
  let url = req.url || '';
  let bodyStr = '';

  // substitute variables
  for (const [key, value] of Object.entries(variables || {})) {
    url = url.replaceAll(`{{${key}}}`, value);
  }

  const parts = [`curl -X ${req.method || 'GET'} '${shellEscape(url)}'`];

  if (req.headers) {
    for (const [name, value] of Object.entries(req.headers)) {
      let headerVal = String(value);
      for (const [key, val] of Object.entries(variables || {})) {
        headerVal = headerVal.replaceAll(`{{${key}}}`, val);
      }
      parts.push(`  -H '${shellEscape(name)}: ${shellEscape(headerVal)}'`);
    }
  }

  if (req.body) {
    bodyStr = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    for (const [key, value] of Object.entries(variables || {})) {
      bodyStr = bodyStr.replaceAll(`{{${key}}}`, value);
    }
    parts.push(`  -d '${shellEscape(bodyStr)}'`);
  }

  return parts.join(' \\\n');
}
