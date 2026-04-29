#!/usr/bin/env node
'use strict';

const { spawn } = require('child_process');

function start(script) {
  const proc = spawn(process.execPath, [script], { stdio: 'inherit' });

  proc.on('exit', (code, signal) => {
    console.error(`[launcher] ${script} exited (code=${code}, signal=${signal})`);
    process.exit(code ?? 1);
  });

  return proc;
}

start('dist/payments-service/main.js');
start('dist/main.js');

