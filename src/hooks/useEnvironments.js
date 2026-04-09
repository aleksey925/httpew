import { useState, useEffect, useCallback, useRef } from 'react';
import fs from 'node:fs';
import path from 'node:path';
import { watch } from 'chokidar';

function findEnvFiles(startDir) {
  let dir = startDir;
  while (true) {
    const publicPath = path.join(dir, 'http-client.env.json');
    const privatePath = path.join(dir, 'http-client.private.env.json');
    const publicExists = fs.existsSync(publicPath);
    const privateExists = fs.existsSync(privatePath);
    if (publicExists || privateExists) {
      return {
        publicPath: publicExists ? publicPath : null,
        privatePath: privateExists ? privatePath : null,
      };
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function loadEnvData(envFilePath) {
  if (!envFilePath) return null;
  try {
    return JSON.parse(fs.readFileSync(envFilePath, 'utf-8'));
  } catch {
    return null;
  }
}

function mergeEnvData(publicData, privateData) {
  if (!publicData && !privateData) return null;
  if (!publicData) return privateData;
  if (!privateData) return publicData;

  const merged = {};
  const allEnvs = new Set([...Object.keys(publicData), ...Object.keys(privateData)]);
  for (const env of allEnvs) {
    merged[env] = { ...publicData[env], ...privateData[env] };
  }
  return merged;
}

export function useEnvironments(filePath) {
  const [environments, setEnvironments] = useState([]);
  const [activeEnvironment, setActiveEnvironment] = useState(null);
  const [variables, setVariables] = useState({});
  const [envData, setEnvData] = useState(null);
  const watcherRef = useRef(null);

  useEffect(() => {
    if (!filePath) {
      setEnvironments([]);
      setEnvData(null);
      return;
    }

    const envFiles = findEnvFiles(path.dirname(filePath));
    if (!envFiles) {
      setEnvironments([]);
      setEnvData(null);
      return;
    }

    const applyEnvFiles = () => {
      const publicData = loadEnvData(envFiles.publicPath);
      const privateData = loadEnvData(envFiles.privatePath);
      const data = mergeEnvData(publicData, privateData);
      if (data) {
        setEnvData(data);
        setEnvironments(Object.keys(data));
      } else {
        setEnvData(null);
        setEnvironments([]);
      }
    };

    applyEnvFiles();

    const watchPaths = [envFiles.publicPath, envFiles.privatePath].filter(Boolean);
    const watcher = watch(watchPaths, {
      awaitWriteFinish: {
        stabilityThreshold: 200,
        pollInterval: 50,
      },
    });
    watcher.on('change', applyEnvFiles);
    watcherRef.current = watcher;

    return () => {
      watcher.close();
      watcherRef.current = null;
    };
  }, [filePath]);

  useEffect(() => {
    if (envData && activeEnvironment && envData[activeEnvironment]) {
      setVariables(envData[activeEnvironment]);
    } else {
      setVariables({});
    }
  }, [envData, activeEnvironment]);

  const setEnvironment = useCallback((name) => {
    setActiveEnvironment(name);
  }, []);

  return { environments, activeEnvironment, setEnvironment, variables };
}
