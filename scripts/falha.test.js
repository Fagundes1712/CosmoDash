require('node:test')('falha proposital', () => { throw new Error('teste de bloqueio'); });
