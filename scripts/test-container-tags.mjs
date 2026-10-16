import assert from 'node:assert/strict';
import {mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';

// Exercise the actual workflow shell; stub only external registry commands.
const workflow = readFileSync(new URL('../.github/workflows/build.yml', import.meta.url), 'utf8').replaceAll('\r\n', '\n');
function step(name) {
    const block = workflow.split('      - name: ' + name + '\n')[1]?.split('\n      - name: ')[0];
    assert.ok(block, 'Workflow step exists: ' + name);
    const run = block.match(/        run: (.*)(?:\n|$)/);
    assert.ok(run, 'Workflow step has shell: ' + name);
    return run[1] === '|' ? block.slice(run.index + run[0].length).split('\n').map(line => line.replace(/^          /, '')).join('\n') : run[1];
}
const publish = step('Publish versioned service image');
const verify = step('Verify public pull without credentials');
const dir = mkdtempSync(join(tmpdir(), 'yoast-container-tags-'));
let checks = 0;
function run(shell, version, fail = '') {
    const log = join(dir, 'commands.txt'), script = join(dir, 'step.sh');
    writeFileSync(log, '');
    writeFileSync(script, 'set -euo pipefail\ndocker() { printf "%s\\n" "$*" >> "$COMMAND_LOG"; [[ "$*" != "$FAIL_COMMAND" ]]; }\n' + shell + '\n');
    const result = spawnSync(process.argv[2] || 'bash', [script], {
        encoding: 'utf8', env: {...process.env, IMAGE: 'ghcr.io/syntax-circus/seo-analysis-yoast:' + version,
            COMMAND_LOG: log.replaceAll('\\', '/'), FAIL_COMMAND: fail, GITHUB_STEP_SUMMARY: join(dir, 'summary.txt').replaceAll('\\', '/'), GITHUB_REPOSITORY: 'Syntax-Circus/SyntaxCircus.Seo.Analysis.Yoast'}
    });
    if (result.error) throw result.error;
    return {status: result.status, commands: readFileSync(log, 'utf8').trim().split('\n'), stderr: result.stderr};
}
try {
    for (const version of ['0.2.0', '0.3.0-rc.1']) {
        const image = 'ghcr.io/syntax-circus/seo-analysis-yoast:' + version;
        const latest = image.replace(/:[^:]+$/, ':latest');
        const stable = !version.includes('-');
        const pushed = run(publish, version);
        assert.equal(pushed.status, 0, pushed.stderr);
        assert.deepEqual(pushed.commands, stable ? ['push ' + image, 'tag ' + image + ' ' + latest, 'push ' + latest] : ['push ' + image]); checks++;
        const pulled = run(verify, version);
        assert.equal(pulled.status, 0, pulled.stderr);
        assert.deepEqual(pulled.commands.filter(c => c.includes(' pull ')).map(c => c.split(' pull ')[1]), stable ? [image, latest] : [image]); checks++;
        const failed = run(publish, version, 'push ' + image);
        assert.notEqual(failed.status, 0); assert.deepEqual(failed.commands, ['push ' + image]); checks++;
    }
    const failedLatest = run(publish, '0.2.0', 'push ghcr.io/syntax-circus/seo-analysis-yoast:latest');
    assert.notEqual(failedLatest.status, 0); checks++;
    console.log(`${checks} workflow tag/pull/failure checks passed.`);
} finally { rmSync(dir, {recursive: true, force: true}); }
