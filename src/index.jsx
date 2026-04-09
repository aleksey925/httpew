#!/usr/bin/env bun
import React from 'react';
import { render } from 'ink';
import fs from 'node:fs';
import path from 'node:path';
import App from './app.jsx';
import pkg from '../package.json';

const args = process.argv.slice(2);

if (args.includes('-h') || args.includes('--help')) {
  console.log(`${pkg.name} — terminal HTTP client

Usage: ${pkg.name} [options] [file.http]

Options:
  -h, --help     show this help
  -v, --version  show version

If a .http file is given, it opens directly without the file browser.`);
  process.exit(0);
}

if (args.includes('-v') || args.includes('--version')) {
  const version = typeof BUILD_VERSION !== 'undefined' ? BUILD_VERSION : `dev (${pkg.version})`;
  console.log(`${pkg.name} ${version}`);
  process.exit(0);
}

const fileArg = args.find((a) => !a.startsWith('-'));
let initialFile = null;

if (fileArg) {
  initialFile = path.resolve(fileArg);
  if (!fs.existsSync(initialFile)) {
    console.error(`File not found: ${initialFile}`);
    process.exit(1);
  }
}

render(<App initialFile={initialFile} />);
