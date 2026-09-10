import { EventEmitter } from 'node:events';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ChildProcessByStdio } from 'node:child_process';
import type { Readable, Writable } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('node:child_process', () => ({
  spawn: vi.fn(),
}));

import { spawn } from 'node:child_process';
import {
  extractCodexProviderError,
  isCodexRetryNotice,
  openCodexConversationSession,
} from './codex-conversation-session.js';

describe('extractCodexProviderError', () => {
  it('returns null for a clean turn with no failure event', () => {
    const jsonl = [
      '{"type":"thread.started","thread_id":"t1"}',
      '{"type":"agent_message","message":"FOREMAN_PHASE_PLANNING_OUTPUT_JSON_BEGIN\\n{}\\nFOREMAN_PHASE_PLANNING_OUTPUT_JSON_END"}',
    ].join('\n');
    expect(extractCodexProviderError(jsonl)).toBeNull();
  });

  it('surfaces the human message from a double-encoded error event (real shape)', () => {
    // The exact shape observed from a ChatGPT-account codex login.
    const jsonl = [
      '{"type":"thread.started","thread_id":"019eaa0d"}',
      '{"type":"turn.started"}',
      '{"type":"error","message":"{\\"type\\":\\"error\\",\\"status\\":400,\\"error\\":{\\"type\\":\\"invalid_request_error\\",\\"message\\":\\"The \'gpt-5.3-codex\' model is not supported when using Codex with a ChatGPT account.\\"}}"}',
    ].join('\n');
    expect(extractCodexProviderError(jsonl)).toBe(
      "The 'gpt-5.3-codex' model is not supported when using Codex with a ChatGPT account.",
    );
  });

  it('reads turn.failed nested error.message', () => {
    const jsonl = '{"type":"turn.failed","error":{"message":"rate limit exceeded"}}';
    expect(extractCodexProviderError(jsonl)).toBe('rate limit exceeded');
  });

  it('reads Codex context-window failures from turn.failed events', () => {
    const message =
      "Codex ran out of room in the model's context window. Start a new thread or clear earlier history before retrying.";
    const jsonl = [
      '{"type":"thread.started","thread_id":"019f1b77"}',
      '{"type":"turn.started"}',
      JSON.stringify({ type: 'turn.failed', error: { message } }),
    ].join('\n');

    expect(extractCodexProviderError(jsonl)).toBe(message);
  });

  // Codex reports each transport retry as an `error` event and keeps going;
  // treating the notice as terminal killed three task-graph rounds in a row on
  // 2026-09-02 (soak attempt 9) during a network hiccup codex was riding out.
  it('ignores codex Reconnecting retry notices and reads the turn that follows', () => {
    const jsonl = [
      '{"type":"thread.started","thread_id":"01a05fc5"}',
      '{"type":"turn.started"}',
      '{"type":"error","message":"Reconnecting... 2/5 (request timed out)"}',
      '{"type":"agent_message","message":"FOREMAN_PHASE_PLANNING_OUTPUT_JSON_BEGIN\\n{}\\nFOREMAN_PHASE_PLANNING_OUTPUT_JSON_END"}',
    ].join('\n');
    expect(extractCodexProviderError(jsonl)).toBeNull();
    expect(isCodexRetryNotice('Reconnecting... 2/5 (request timed out)')).toBe(true);
    expect(isCodexRetryNotice('Reconnecting... 5/5 (stream disconnected)')).toBe(true);
    expect(isCodexRetryNotice('rate limit exceeded')).toBe(false);
    expect(isCodexRetryNotice('Connection failed: error sending request')).toBe(false);
  });

  // The uncounted shape codex emits when the link itself is down; the
  // counted-only pattern let it halt a cross-critique round continuity_failure
  // on soak attempt 13 (2026-09-02), minutes after the counted fix shipped.
  it('ignores the uncounted "waiting for network" reconnect notice too', () => {
    const notice = 'Reconnecting... waiting for network (Connection failed: error sending request)';
    expect(isCodexRetryNotice(notice)).toBe(true);
    const jsonl = [
      '{"type":"thread.started","thread_id":"01a0603e"}',
      '{"type":"turn.started"}',
      JSON.stringify({ type: 'error', message: notice }),
      '{"type":"agent_message","message":"FOREMAN_PHASE_PLANNING_OUTPUT_JSON_BEGIN\\n{}\\nFOREMAN_PHASE_PLANNING_OUTPUT_JSON_END"}',
    ].join('\n');
    expect(extractCodexProviderError(jsonl)).toBeNull();
  });

  it('returns null while a turn is still mid-retry with only a notice so far', () => {
    const jsonl = [
      '{"type":"thread.started","thread_id":"01a05fc5"}',
      '{"type":"turn.started"}',
      '{"type":"error","message":"Reconnecting... 2/5 (request timed out)"}',
    ].join('\n');
    expect(extractCodexProviderError(jsonl)).toBeNull();
  });

  it('still surfaces a genuine failure that follows a retry notice', () => {
    const jsonl = [
      '{"type":"turn.started"}',
      '{"type":"error","message":"Reconnecting... 5/5 (request timed out)"}',
      '{"type":"turn.failed","error":{"message":"stream disconnected before completion"}}',
    ].join('\n');
    expect(extractCodexProviderError(jsonl)).toBe('stream disconnected before completion');
  });
});

type FakeSpawnResult = ChildProcessByStdio<Writable, Readable, Readable>;

class FakeWritable extends EventEmitter {
  public readonly writes: string[] = [];
  public ended = false;

  end(data?: string | Buffer, callback?: () => void): this {
    if (data !== undefined) {
      this.writes.push(Buffer.isBuffer(data) ? data.toString('utf8') : data);
    }
    this.ended = true;
    callback?.();
    return this;
  }
}

class FakeCodexChild extends EventEmitter {
  public readonly pid: number;
  public readonly stdin = new FakeWritable() as Writable & FakeWritable;
  public readonly stdout = new EventEmitter() as Readable;
  public readonly stderr = new EventEmitter() as Readable;
  public readonly killSignals: (NodeJS.Signals | number | undefined)[] = [];

  constructor(pid: number) {
    super();
    this.pid = pid;
  }

  kill(signal?: NodeJS.Signals | number): boolean {
    this.killSignals.push(signal);
    return true;
  }

  emitStdout(text: string): void {
    this.stdout.emit('data', Buffer.from(text, 'utf8'));
  }

  emitStderr(text: string): void {
    this.stderr.emit('data', Buffer.from(text, 'utf8'));
  }

  emitExit(exitCode: number | null, signal: NodeJS.Signals | null = null): void {
    this.emit('exit', exitCode, signal);
  }
}

const SESSION_ID = '019e5a68-0000-7000-9000-demo9codex001';
const mockedSpawn = vi.mocked(spawn);
let tempRoot: string;
let fakeChildren: FakeCodexChild[];

function nextChild(): FakeCodexChild {
  const fake = new FakeCodexChild(4100 + fakeChildren.length);
  fakeChildren.push(fake);
  return fake;
}

function codexSessionMeta(id = SESSION_ID): string {
  return `${JSON.stringify({ type: 'session_meta', payload: { id } })}\n`;
}

function codexAgentMessage(message: string): string {
  return `${JSON.stringify({ type: 'agent_message', message })}\n`;
}

function settle(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

beforeEach(() => {
  tempRoot = mkdtempSync(join(tmpdir(), 'foreman-codex-conversation-'));
  fakeChildren = [];
  mockedSpawn.mockReset();
  mockedSpawn.mockImplementation(() => nextChild() as unknown as FakeSpawnResult);
});

afterEach(() => {
  vi.restoreAllMocks();
  rmSync(tempRoot, { recursive: true, force: true });
});

describe('openCodexConversationSession', () => {
  it('strips provider API keys from spawned Codex workers while preserving CLI auth config', async () => {
    const session = openCodexConversationSession({
      command: 'fake-codex',
      cwd: '/repo',
      artifactRoot: tempRoot,
      sessionLabel: 'sanitized-env',
      env: {
        OPENAI_API_KEY: 'sk-openai-test',
        ANTHROPIC_API_KEY: 'sk-ant-test',
        HEART_LAYER_LLM_KEY: 'heart-test',
        HOME: '/home/operator',
        CODEX_HOME: '/home/operator/.codex',
        PATH: '/usr/local/bin:/usr/bin',
        TERM: 'xterm-256color',
        NO_COLOR: '0',
      },
      terminationGraceMs: 50,
    });

    const turn = session.sendTurn({
      prompt: 'bootstrap',
      marker: 'BOOTSTRAP_DONE',
      idleTimeoutMs: 1_000,
    });
    await settle();
    const env = mockedSpawn.mock.calls[0][2]?.env as NodeJS.ProcessEnv;

    expect(env).not.toHaveProperty('OPENAI_API_KEY');
    expect(env).not.toHaveProperty('ANTHROPIC_API_KEY');
    expect(env).not.toHaveProperty('HEART_LAYER_LLM_KEY');
    expect(env.HOME).toBe('/home/operator');
    expect(env.CODEX_HOME).toBe('/home/operator/.codex');
    expect(env.PATH).toBe('/usr/local/bin:/usr/bin');
    expect(env.TERM).toBe('xterm-256color');
    expect(env.NO_COLOR).toBe('0');

    fakeChildren[0].emitStdout(codexSessionMeta() + codexAgentMessage('bootstrap\nBOOTSTRAP_DONE'));
    fakeChildren[0].emitExit(0);
    await turn;
  });

  it('preserves one Codex exec-resume session id across four sequential turns', async () => {
    const session = openCodexConversationSession({
      command: 'fake-codex',
      initialExecArgs: ['--ignore-user-config'],
      resumeExecArgs: ['--ignore-user-config'],
      cwd: '/repo',
      artifactRoot: tempRoot,
      sessionLabel: 'demo9-session-a',
      terminationGraceMs: 50,
    });
    const results = [];

    for (let index = 0; index < 4; index += 1) {
      const marker = `FOREMAN_CODEX_TURN_${index + 1}`;
      const turn = session.sendTurn({
        prompt: `turn ${index + 1} prompt`,
        marker,
        idleTimeoutMs: 1_000,
      });
      await settle();
      fakeChildren[index].emitStdout(
        codexSessionMeta() + codexAgentMessage(`turn ${index + 1} output\n${marker}`),
      );
      fakeChildren[index].emitExit(0);
      results.push(await turn);
    }

    expect(mockedSpawn).toHaveBeenCalledTimes(4);
    expect(results.map((result) => result.stopReason)).toEqual([
      'completion_marker',
      'completion_marker',
      'completion_marker',
      'completion_marker',
    ]);
    expect(results.map((result) => result.sessionIdAfter)).toEqual([
      SESSION_ID,
      SESSION_ID,
      SESSION_ID,
      SESSION_ID,
    ]);
    expect(results.map((result) => result.sessionIdBefore)).toEqual([
      null,
      SESSION_ID,
      SESSION_ID,
      SESSION_ID,
    ]);
    expect(results.every((result) => result.continuity.satisfiesDemo9Acceptance)).toBe(true);
    expect(results.slice(1).every((result) => result.continuity.sameSessionAsBefore)).toBe(true);
    expect(results.map((result) => result.sessionIdentityAfter.sessionKey)).toEqual([
      results[0].sessionIdentityAfter.sessionKey,
      results[0].sessionIdentityAfter.sessionKey,
      results[0].sessionIdentityAfter.sessionKey,
      results[0].sessionIdentityAfter.sessionKey,
    ]);

    expect(mockedSpawn.mock.calls[0][1]).toEqual([
      'exec',
      '--ignore-user-config',
      '--json',
      '--output-last-message',
      expect.stringContaining('demo9-session-a.turn-01.last-message.txt'),
      '-',
    ]);
    for (const call of mockedSpawn.mock.calls.slice(1)) {
      expect(call[1]).toEqual([
        'exec',
        'resume',
        '--ignore-user-config',
        '--json',
        '--output-last-message',
        expect.stringContaining('.last-message.txt'),
        SESSION_ID,
        '-',
      ]);
    }

    for (const result of results) {
      expect(existsSync(result.rawArtifactPath)).toBe(true);
      expect(readFileSync(result.rawArtifactPath, 'utf8')).toContain('"session_meta"');
      expect(result.continuity.observedSessionIds).toEqual([SESSION_ID]);
      expect(result.metadata.args.at(-1)).toBe('-');
    }
  });

  it('sends load-realistic prompts through stdin instead of argv and records prompt metadata', async () => {
    const largePrompt = Array.from({ length: 10_240 }, (_, index) => `fixture-token-${index}`)
      .join(' ')
      .concat('\nReturn the marker when done.');
    const session = openCodexConversationSession({
      command: 'fake-codex',
      artifactRoot: tempRoot,
      sessionLabel: 'load-realistic',
      terminationGraceMs: 50,
    });

    const firstTurn = session.sendTurn({
      prompt: 'bootstrap prompt',
      marker: 'BOOTSTRAP_DONE',
      idleTimeoutMs: 1_000,
    });
    await settle();
    fakeChildren[0].emitStdout(codexSessionMeta() + codexAgentMessage('bootstrap\nBOOTSTRAP_DONE'));
    fakeChildren[0].emitExit(0);
    await firstTurn;

    const largeTurn = session.sendTurn({
      prompt: largePrompt,
      marker: 'LARGE_DONE',
      idleTimeoutMs: 1_000,
    });
    await settle();
    fakeChildren[1].emitStdout(
      codexSessionMeta() + codexAgentMessage('large prompt accepted\nLARGE_DONE'),
    );
    fakeChildren[1].emitExit(0);
    const result = await largeTurn;

    expect(result.stopReason).toBe('completion_marker');
    expect(result.sessionIdBefore).toBe(SESSION_ID);
    expect(result.sessionIdAfter).toBe(SESSION_ID);
    expect(result.metadata.promptWordCount).toBeGreaterThanOrEqual(10_000);
    expect(result.metadata.promptBytes).toBe(Buffer.byteLength(largePrompt, 'utf8'));
    expect(result.metadata.promptSha256).toMatch(/^[a-f0-9]{64}$/u);
    expect(fakeChildren[1].stdin.writes.join('')).toBe(`${largePrompt}\n`);
    expect(JSON.stringify(mockedSpawn.mock.calls[1][1])).not.toContain('fixture-token-');
    expect(mockedSpawn.mock.calls[1][1]?.at(-1)).toBe('-');
  });

  it('records that a resumed turn without an observed matching session id is not Demo 9 continuity evidence', async () => {
    const session = openCodexConversationSession({
      command: 'fake-codex',
      artifactRoot: tempRoot,
      sessionLabel: 'mismatched-session',
      terminationGraceMs: 50,
    });

    const firstTurn = session.sendTurn({
      prompt: 'bootstrap',
      marker: 'BOOTSTRAP_DONE',
      idleTimeoutMs: 1_000,
    });
    await settle();
    fakeChildren[0].emitStdout(codexSessionMeta() + codexAgentMessage('bootstrap\nBOOTSTRAP_DONE'));
    fakeChildren[0].emitExit(0);
    await firstTurn;

    const resumedTurn = session.sendTurn({
      prompt: 'resume',
      marker: 'RESUME_DONE',
      idleTimeoutMs: 1_000,
    });
    await settle();
    fakeChildren[1].emitStdout(
      codexSessionMeta('019e5a68-ffff-7000-9000-other-session') +
        codexAgentMessage('resume\nRESUME_DONE'),
    );
    fakeChildren[1].emitExit(0);
    const result = await resumedTurn;

    expect(result.stopReason).toBe('completion_marker');
    expect(result.continuity.requestedResumeSessionId).toBe(SESSION_ID);
    expect(result.continuity.sameSessionAsBefore).toBe(false);
    expect(result.continuity.satisfiesDemo9Acceptance).toBe(false);
  });

  it('rejects a follow-up turn when the initial turn observed no Codex session id and preserves the prior raw artifact', async () => {
    const session = openCodexConversationSession({
      command: 'fake-codex',
      artifactRoot: tempRoot,
      sessionLabel: 'no-session-id',
      terminationGraceMs: 50,
    });

    const firstTurn = session.sendTurn({
      prompt: 'bootstrap',
      marker: 'BOOTSTRAP_DONE',
      idleTimeoutMs: 1_000,
    });
    await settle();
    // Codex never emits session_meta on this turn, only an agent_message.
    fakeChildren[0].emitStdout(codexAgentMessage('bootstrap output\nBOOTSTRAP_DONE'));
    fakeChildren[0].emitExit(0);
    const firstResult = await firstTurn;
    expect(firstResult.sessionIdAfter).toBeNull();
    const firstArtifactBefore = readFileSync(firstResult.rawArtifactPath, 'utf8');

    const secondResult = await session.sendTurn({
      prompt: 'resume attempt',
      marker: 'RESUME_DONE',
      idleTimeoutMs: 1_000,
    });

    expect(secondResult.stopReason).toBe('error');
    if (secondResult.stopReason === 'error') {
      expect(secondResult.errorMessage).toContain('Cannot resume Codex conversation');
    }
    // No spawn for the rejected resume.
    expect(mockedSpawn).toHaveBeenCalledTimes(1);
    // The rejected turn must not have created a phantom zero-byte artifact on
    // disk at the synthetic-error path.
    expect(existsSync(secondResult.rawArtifactPath)).toBe(false);
    expect(existsSync(secondResult.metadata.outputLastMessagePath)).toBe(false);
    expect(existsSync(secondResult.metadata.stderrArtifactPath)).toBe(false);
    // The prior turn's artifact must be untouched.
    expect(readFileSync(firstResult.rawArtifactPath, 'utf8')).toBe(firstArtifactBefore);
  });

  it('rejects a concurrent sendTurn call without writing artifacts at the in-flight turn path', async () => {
    const session = openCodexConversationSession({
      command: 'fake-codex',
      artifactRoot: tempRoot,
      sessionLabel: 'concurrent',
      terminationGraceMs: 50,
    });

    // Start the first turn but do not let it complete yet.
    const firstTurnPromise = session.sendTurn({
      prompt: 'first',
      marker: 'FIRST_DONE',
      idleTimeoutMs: 1_000,
    });
    await settle();
    expect(mockedSpawn).toHaveBeenCalledTimes(1);

    // Fire a second sendTurn while the first is still in-flight.
    const concurrentResult = await session.sendTurn({
      prompt: 'second',
      marker: 'SECOND_DONE',
      idleTimeoutMs: 1_000,
    });

    expect(concurrentResult.stopReason).toBe('error');
    if (concurrentResult.stopReason === 'error') {
      expect(concurrentResult.errorMessage).toContain('already has an active turn');
    }
    // No additional spawn was performed for the rejected call.
    expect(mockedSpawn).toHaveBeenCalledTimes(1);
    // The first turn has not written its artifacts yet, and the synthetic
    // rejection must not have created zero-byte artifacts at the shared path.
    expect(existsSync(concurrentResult.rawArtifactPath)).toBe(false);
    expect(existsSync(concurrentResult.metadata.stderrArtifactPath)).toBe(false);

    // Let the first turn complete; it should now own its artifact path.
    fakeChildren[0].emitStdout(codexSessionMeta() + codexAgentMessage('first output\nFIRST_DONE'));
    fakeChildren[0].emitExit(0);
    const firstResult = await firstTurnPromise;
    expect(firstResult.stopReason).toBe('completion_marker');
    expect(existsSync(firstResult.rawArtifactPath)).toBe(true);
  });

  it('records process_exit with the exit code when Codex exits without emitting the completion marker', async () => {
    const session = openCodexConversationSession({
      command: 'fake-codex',
      artifactRoot: tempRoot,
      sessionLabel: 'no-marker',
      terminationGraceMs: 50,
    });

    const turn = session.sendTurn({
      prompt: 'do work',
      marker: 'NEVER_EMITTED',
      idleTimeoutMs: 1_000,
    });
    await settle();
    fakeChildren[0].emitStdout(
      codexSessionMeta() + codexAgentMessage('partial output without the marker'),
    );
    fakeChildren[0].emitExit(1);
    const result = await turn;

    expect(result.stopReason).toBe('process_exit');
    if (result.stopReason === 'process_exit') {
      expect(result.exitCode).toBe(1);
      expect(result.signal).toBeNull();
    }
    expect(result.continuity.observedSessionIds).toEqual([SESSION_ID]);
  });

  it('stops waiting for the completion marker when Codex emits a provider failure event', async () => {
    const session = openCodexConversationSession({
      command: 'fake-codex',
      artifactRoot: tempRoot,
      sessionLabel: 'provider-failure',
      terminationGraceMs: 50,
    });
    const message =
      "Codex ran out of room in the model's context window. Start a new thread or clear earlier history before retrying.";

    const turn = session.sendTurn({
      prompt: 'large prompt',
      marker: 'NEVER_EMITTED',
      idleTimeoutMs: 1_000,
    });
    await settle();
    fakeChildren[0].emitStdout(
      `${codexSessionMeta()}${JSON.stringify({ type: 'turn.started' })}\n${JSON.stringify({
        type: 'turn.failed',
        error: { message },
      })}\n`,
    );
    await settle();

    expect(fakeChildren[0].killSignals).toContain('SIGTERM');
    fakeChildren[0].emitExit(null, 'SIGTERM');
    const result = await turn;

    expect(result.stopReason).toBe('error');
    if (result.stopReason === 'error') {
      expect(result.errorMessage).toContain('codex provider error');
      expect(result.errorMessage).toContain('context window');
    }
    expect(extractCodexProviderError(result.transcript)).toBe(message);
    expect(readFileSync(result.rawArtifactPath, 'utf8')).toContain('"turn.failed"');
  });

  it('stops waiting for the completion marker when Codex emits a provider error event', async () => {
    const session = openCodexConversationSession({
      command: 'fake-codex',
      artifactRoot: tempRoot,
      sessionLabel: 'provider-error',
      terminationGraceMs: 50,
    });
    const message =
      "The 'gpt-5.3-codex' model is not supported when using Codex with a ChatGPT account.";

    const turn = session.sendTurn({
      prompt: 'unsupported model',
      marker: 'NEVER_EMITTED',
      idleTimeoutMs: 1_000,
    });
    await settle();
    fakeChildren[0].emitStdout(
      [
        codexSessionMeta(),
        JSON.stringify({ type: 'turn.started' }),
        JSON.stringify({
          type: 'error',
          message: JSON.stringify({
            type: 'error',
            status: 400,
            error: { type: 'invalid_request_error', message },
          }),
        }),
      ].join('\n'),
    );
    await settle();

    expect(fakeChildren[0].killSignals).toContain('SIGTERM');
    fakeChildren[0].emitExit(null, 'SIGTERM');
    const result = await turn;

    expect(result.stopReason).toBe('error');
    if (result.stopReason === 'error') {
      expect(result.errorMessage).toContain('codex provider error');
      expect(result.errorMessage).toContain('not supported');
    }
    expect(extractCodexProviderError(result.transcript)).toBe(message);
    expect(readFileSync(result.rawArtifactPath, 'utf8')).toContain('"type":"error"');
  });

  // Codex's `Reconnecting... N/M` error event is a retry notice, not a failure:
  // the turn keeps going and either completes or fails with its own event.
  // Killing on the notice cost three task-graph rounds on 2026-09-02.
  it('keeps waiting through a Codex reconnect notice and completes on the marker', async () => {
    const session = openCodexConversationSession({
      command: 'fake-codex',
      artifactRoot: tempRoot,
      sessionLabel: 'reconnect-notice',
      terminationGraceMs: 50,
    });

    const turn = session.sendTurn({
      prompt: 'large planning prompt',
      marker: 'GRAPH_DONE',
      idleTimeoutMs: 1_000,
    });
    await settle();
    fakeChildren[0].emitStdout(
      `${[
        codexSessionMeta(),
        JSON.stringify({ type: 'turn.started' }),
        JSON.stringify({ type: 'error', message: 'Reconnecting... 2/5 (request timed out)' }),
      ].join('\n')}\n`,
    );
    await settle();

    expect(fakeChildren[0].killSignals).toEqual([]);

    fakeChildren[0].emitStdout(codexAgentMessage('graph emitted\nGRAPH_DONE'));
    fakeChildren[0].emitExit(0);
    const result = await turn;

    expect(result.stopReason).toBe('completion_marker');
    expect(extractCodexProviderError(result.transcript)).toBeNull();
    expect(readFileSync(result.rawArtifactPath, 'utf8')).toContain('Reconnecting... 2/5');
  });

  it('enforces a wall-clock turn cap even when status output keeps arriving', async () => {
    const session = openCodexConversationSession({
      command: 'fake-codex',
      artifactRoot: tempRoot,
      sessionLabel: 'wall-timeout',
      terminationGraceMs: 50,
    });

    const turn = session.sendTurn({
      prompt: 'long running',
      marker: 'NEVER_EMITTED',
      idleTimeoutMs: 1_000,
      wallTimeoutMs: 20,
    });
    await settle();
    fakeChildren[0].emitStderr('still thinking\n');
    await new Promise((resolve) => setTimeout(resolve, 30));
    fakeChildren[0].emitExit(null, 'SIGTERM');
    const result = await turn;

    expect(result.stopReason).toBe('idle_timeout');
    expect(fakeChildren[0].killSignals).toContain('SIGTERM');
    // 'still thinking\n' was emitted only on stderr, so lastOutputOffset (which
    // counts bytes written to rawArtifactPath / rawStdout) stays at 0 while
    // silenceDurationMs is still computed from the stderr-updated
    // lastOutputAtMs.
    expect(result.lastOutputOffset).toBe(0);
    expect(result.silenceDurationMs).toBeGreaterThanOrEqual(0);
  });

  it('can resume the same Codex session after a silent timed-out turn observed the session id', async () => {
    const session = openCodexConversationSession({
      command: 'fake-codex',
      artifactRoot: tempRoot,
      sessionLabel: 'resume-after-timeout',
      terminationGraceMs: 50,
    });

    const timedOutTurn = session.sendTurn({
      prompt: 'long running',
      marker: 'NEVER_EMITTED',
      idleTimeoutMs: 20,
    });
    await settle();
    fakeChildren[0].emitStdout(codexSessionMeta() + codexAgentMessage('partial output'));
    await new Promise((resolve) => setTimeout(resolve, 30));
    fakeChildren[0].emitExit(null, 'SIGTERM');
    const timedOut = await timedOutTurn;

    expect(timedOut.stopReason).toBe('idle_timeout');
    expect(timedOut.sessionIdAfter).toBe(SESSION_ID);
    expect(session.identity.sessionId).toBe(SESSION_ID);

    const resumedTurn = session.sendTurn({
      prompt: 'resume from watchdog',
      marker: 'RESUMED_DONE',
      idleTimeoutMs: 1_000,
    });
    await settle();
    fakeChildren[1].emitStdout(codexSessionMeta() + codexAgentMessage('resumed\nRESUMED_DONE'));
    fakeChildren[1].emitExit(0);
    const resumed = await resumedTurn;

    expect(resumed.stopReason).toBe('completion_marker');
    expect(resumed.continuity.sameSessionAsBefore).toBe(true);
    expect(mockedSpawn.mock.calls[1][1]).toEqual([
      'exec',
      'resume',
      '--json',
      '--output-last-message',
      expect.stringContaining('.last-message.txt'),
      SESSION_ID,
      '-',
    ]);
  });

  // Error-truth regression (2026-08-17): a spawn failure used to persist a
  // 0-byte .raw.jsonl next to a 0-byte .stderr.txt, so downstream parsing
  // mislabeled "never spawned" as malformed model output.
  it('persists the spawn error into both the raw and stderr artifacts', async () => {
    mockedSpawn.mockImplementation(() => {
      throw new Error('posix_spawnp failed.');
    });
    const session = openCodexConversationSession({
      command: 'fake-codex',
      cwd: '/repo',
      artifactRoot: tempRoot,
      sessionLabel: 'spawn-failure',
      terminationGraceMs: 50,
    });

    const turn = await session.sendTurn({
      prompt: 'bootstrap',
      marker: 'BOOTSTRAP_DONE',
      idleTimeoutMs: 1_000,
    });

    expect(turn.stopReason).toBe('error');
    expect(turn.rawStdout).toContain(
      '[foreman session spawn error] fake-codex: posix_spawnp failed.',
    );
    expect(turn.rawStderr).toContain(
      '[foreman session spawn error] fake-codex: posix_spawnp failed.',
    );
    expect(turn.output).toContain('posix_spawnp failed.');
    expect(existsSync(turn.rawArtifactPath)).toBe(true);
    expect(readFileSync(turn.rawArtifactPath, 'utf8')).toContain('posix_spawnp failed.');
    expect(readFileSync(turn.metadata.stderrArtifactPath, 'utf8')).toContain(
      'posix_spawnp failed.',
    );
  });
});
