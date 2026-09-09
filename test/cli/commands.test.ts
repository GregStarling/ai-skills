import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { createCliRouter } from '../../src/cli/router.js';
import { commands } from '../../src/cli/registry/foundation.js';

describe('offline CLI', () => {
  it('returns computed paired results and rejects malformed input without a stack trace', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'governor-cli-'));
    try {
      const router = createCliRouter(commands);
      const file = join(directory, 'request.json');
      await writeFile(file, JSON.stringify({ pairs: [{taskId:'task',cohortId:'cohort',incumbentAccepted:true,candidateAccepted:true}], options:{alpha:0.05,nonInferiorityMargin:0.01} }));
      const result = await router.dispatch({ argv:['compare', '--input', file] });
      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout!).interval.lower).toBeLessThan(-0.9);
      await writeFile(file, '{"pairs":[],"options":{"alpha":2,"nonInferiorityMargin":0.1}}');
      const rejected = await router.dispatch({argv:['compare',file]});
      expect(rejected.exitCode).toBe(2);
      expect(JSON.parse(rejected.stdout!).status).toBe('ERROR');
      expect((await router.dispatch({argv:['validate-policy']})).exitCode).toBe(2);
    } finally { await rm(directory, {recursive:true,force:true}); }
  });
});
