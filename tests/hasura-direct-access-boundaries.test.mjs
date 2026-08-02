import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { relative, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const SCAN_ROOTS = ['src', 'package.json', '.env.example', 'README.MD'].map(
  (p) => resolve(ROOT, p),
);

const FORBIDDEN_STRINGS = [
  'HASURA_ADMIN_SECRET',
  'getHasuraAdminSecretAction',
  '@refinedev/hasura',
  'dataProviderHasura',
  'graphqlWS',
  ':8090/v1/graphql',
];

const FORBIDDEN_PATHS = [
  'src/lib/server/actions/getHasuraAdminSecretAction.ts',
];

function listFiles(path) {
  if (!existsSync(path)) return [];
  if (!statSync(path).isDirectory()) return [path];
  return readdirSync(path).flatMap((e) => {
    if (e === 'node_modules' || e === '.next') return [];
    return listFiles(resolve(path, e));
  });
}

function productionFiles() {
  return SCAN_ROOTS.flatMap(listFiles).filter((p) => {
    const rel = relative(ROOT, p).replaceAll('\\', '/');
    if (rel.startsWith('tests/')) return false;
    if (rel.endsWith('.d.ts')) return false;
    if (rel.endsWith('package-lock.json')) return false;
    return true;
  });
}

test('does not ship Hasura admin-secret action', () => {
  for (const p of FORBIDDEN_PATHS) {
    assert.equal(existsSync(resolve(ROOT, p)), false, p);
  }
});

test('does not reference forbidden Hasura direct-access symbols or :8090 GraphQL', () => {
  const violations = productionFiles().flatMap((path) => {
    const contents = readFileSync(path, 'utf8');
    return FORBIDDEN_STRINGS.filter((s) => contents.includes(s)).map(
      (s) => `${relative(ROOT, path).replaceAll('\\', '/')}: ${s}`,
    );
  });
  assert.deepEqual(violations, []);
});

test('CSMS data provider is wired', () => {
  const provider = readFileSync(
    resolve(ROOT, 'src/lib/providers/data-provider/index.ts'),
    'utf8',
  );
  assert.match(provider, /csmsApiUrl|CSMS_API_URL/);
  assert.doesNotMatch(provider, /@refinedev\/hasura/);
});
