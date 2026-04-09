import { useState, useEffect, useCallback, useRef } from 'react';
import * as httpyac from 'httpyac';
import fs from 'node:fs';
import path from 'node:path';

let initialized = false;

async function ensureInit() {
  if (initialized) return;
  httpyac.cli.initFileProvider();
  await httpyac.cli.initIOProvider();
  initialized = true;
}

function mapRegionsToRequests(httpFile) {
  return httpFile.httpRegions
    .filter((region) => region.request)
    .map((region, index) => {
      const name = region.symbol?.name || `Request ${index + 1}`;
      const method = region.request.method || 'GET';
      const url = region.request.url || '';
      const id = `${index}`;
      return { id, name, method, url, region };
    });
}

export function useHttpYac(filePath, activeEnvironment) {
  const [requests, setRequests] = useState([]);
  const [results, setResults] = useState(new Map());
  const [runningIds, setRunningIds] = useState(new Set());
  const runningIdsRef = useRef(runningIds);
  runningIdsRef.current = runningIds;
  const fileStoreRef = useRef(null);
  const httpFileRef = useRef(null);

  const parseAndUpdate = useCallback(async ({ forceNewStore = false, isCancelled = () => false } = {}) => {
    if (!filePath) return false;

    await ensureInit();

    if (!fileStoreRef.current || forceNewStore) {
      fileStoreRef.current = new httpyac.store.HttpFileStore();
    }

    const httpFile = await fileStoreRef.current.getOrCreate(
      filePath,
      async () => fs.readFileSync(filePath, 'utf-8'),
      0,
      { workingDir: path.dirname(filePath) }
    );

    if (isCancelled()) return false;

    httpFileRef.current = httpFile;
    setRequests(mapRegionsToRequests(httpFile));
    return true;
  }, [filePath]);

  useEffect(() => {
    if (!filePath) return;

    let cancelled = false;

    parseAndUpdate({ isCancelled: () => cancelled }).catch(() => {
      // parse error — keep previous state
    });

    return () => {
      cancelled = true;
    };
  }, [filePath, parseAndUpdate]);

  const reparse = useCallback(async () => {
    try {
      await parseAndUpdate({ forceNewStore: true });
    } catch {
      // ignore
    }
  }, [parseAndUpdate]);

  const execute = useCallback(async (requestId) => {
    if (!httpFileRef.current) return;
    if (runningIdsRef.current.has(requestId)) return;

    const request = requests.find((r) => r.id === requestId);
    if (!request) return;

    setRunningIds((prev) => new Set([...prev, requestId]));
    setResults((prev) => {
      const next = new Map(prev);
      next.set(requestId, { status: 'loading', startTime: Date.now() });
      return next;
    });

    const errors = [];
    try {
      let response = null;
      const envList = activeEnvironment ? [activeEnvironment] : [];

      const isRequestObject = (a) => typeof a === 'object' && a !== null && a.url && a.method && a.headers;

      const formatArg = (a) => {
        if (typeof a === 'string') return a;
        if (a instanceof Error) return a.message;
        if (typeof a === 'object' && a !== null) {
          // httpyac logs the raw request object on failure — skip it
          if (isRequestObject(a)) return null;
          if (a.message) return a.message;
          return JSON.stringify(a);
        }
        return String(a);
      };

      const success = await httpyac.send({
        httpFile: httpFileRef.current,
        httpRegion: request.region,
        activeEnvironment: envList,
        logResponse: (r) => {
          if (r) response = r;
        },
        scriptConsole: {
          log: () => {},
          info: () => {},
          warn: (...args) => { const msg = args.map(formatArg).filter(Boolean).join(' '); if (msg) errors.push(msg); },
          error: (...args) => {
            const requestArg = args.find(isRequestObject);
            const msg = args.map(formatArg).filter(Boolean).join(' ');
            if (msg) {
              errors.push(msg);
            } else if (requestArg) {
              errors.push(`${requestArg.method} ${requestArg.url} — connection failed`);
            }
          },
          debug: () => {},
          trace: () => {},
        },
      });

      if (response) {
        const isHttpError = response.statusCode >= 400;
        setResults((prev) => {
          const next = new Map(prev);
          next.set(requestId, {
            status: success && !isHttpError ? 'success' : 'error',
            statusCode: response.statusCode,
            statusText: response.statusMessage || '',
            time: response.timings?.total || 0,
            size: response.rawBody?.length || (response.body ? Buffer.byteLength(response.body) : 0),
            body: typeof response.body === 'string' ? response.body : JSON.stringify(response.body, null, 2),
            bodyParsed: response.parsedBody || null,
            prettyBody: response.prettyPrintBody || '',
            headers: response.headers || {},
            error: isHttpError ? `${response.statusCode} ${response.statusMessage || ''}` : null,
            url: `${request.method} ${request.url}`,
            method: request.method,
            timestamp: new Date(),
          });
          return next;
        });
      } else {
        const errorMsg = errors.length > 0
          ? errors.join('\n')
          : !success
            ? 'Request failed — unresolved variables or dependency error'
            : 'No response received';
        setResults((prev) => {
          const next = new Map(prev);
          next.set(requestId, {
            status: 'error',
            error: errorMsg,
            timestamp: new Date(),
          });
          return next;
        });
      }
    } catch (err) {
      let errorMsg;
      if (err instanceof Error) {
        errorMsg = err.message;
      } else if (errors.length > 0) {
        errorMsg = errors.join('\n');
      } else if (typeof err === 'string') {
        errorMsg = err;
      } else if (typeof err === 'object' && err !== null && err.url) {
        // httpyac sometimes throws the request object itself
        errorMsg = `Request to ${err.url} failed`;
      } else {
        errorMsg = 'Request failed with an unknown error';
      }

      setResults((prev) => {
        const next = new Map(prev);
        next.set(requestId, {
          status: 'error',
          error: errorMsg,
          timestamp: new Date(),
        });
        return next;
      });
    } finally {
      setRunningIds((prev) => {
        const next = new Set(prev);
        next.delete(requestId);
        return next;
      });
    }
  }, [requests, activeEnvironment]);

  const isRunning = useCallback((requestId) => runningIds.has(requestId), [runningIds]);

  return { requests, results, execute, isRunning, reparse };
}
