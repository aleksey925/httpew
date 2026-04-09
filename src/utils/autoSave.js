import fs from 'node:fs';
import path from 'node:path';

function getExtension(headers) {
  const ct = headers?.['content-type'] || '';
  if (ct.includes('application/json')) return '.json';
  if (ct.includes('text/xml') || ct.includes('application/xml')) return '.xml';
  if (ct.includes('text/html')) return '.html';
  return '.txt';
}

export function saveBody(filePath, request, result) {
  if (!result?.body) return null;

  const dir = path.dirname(filePath);
  const baseName = path.basename(filePath, path.extname(filePath));
  const method = request?.method || 'GET';
  const urlPart = (request?.url || 'response').split('/').pop().replace(/[^a-zA-Z0-9_-]/g, '_');
  const time = new Date().toTimeString().slice(0, 8).replace(/:/g, '-');
  const ext = getExtension(result.headers);

  const fileName = `${baseName}_${method}-${urlPart}_${time}${ext}`;
  const outputPath = path.join(dir, fileName);

  fs.writeFileSync(outputPath, result.body, 'utf-8');
  return outputPath;
}
