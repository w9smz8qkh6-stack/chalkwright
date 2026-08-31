import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  contractVersion,
  isAuditScope,
  isCapabilityGrant,
  isCoreRequestContext,
  isScopedTarget,
  isWorkspace,
  parseAuditScope,
  parseCoreRequestContext,
  scopeIdentifier,
  toAuditScope,
  type ActorAttribution,
  type CapabilityGrant,
  type HostedCoreRequestContext,
  type HostedWorkspace,
  type RoomId,
  type ScreenId,
  type SelfHostedCoreRequestContext,
  type SelfHostedWorkspace,
} from '../../../src/contracts/v1/index.js';

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false;
type Assert<Value extends true> = Value;

const hostedRequiresOrganization: Assert<
  Equal<
    keyof HostedWorkspace,
    'contractVersion' | 'kind' | 'workspaceId' | 'organizationId'
  >
> = true;
const selfHostedExcludesOrganization: Assert<
  Equal<
    'organizationId' extends keyof SelfHostedWorkspace ? true : false,
    false
  >
> = true;
const selfHostedRequiresOperatorGrant: Assert<
  Equal<
    SelfHostedCoreRequestContext['authorization']['authority'],
    'operator-reachability'
  >
> = true;
const hostedRequiresAccountGrant: Assert<
  Equal<
    HostedCoreRequestContext['authorization']['authority'],
    'hosted-account'
  >
> = true;
const actorIsNotAGrant: Assert<
  Equal<ActorAttribution extends CapabilityGrant ? true : false, false>
> = true;
const roomAndScreenIdsAreNominallyDifferent: Assert<
  Equal<Equal<RoomId, ScreenId>, false>
> = true;

const selfHostedContext = {
  contractVersion,
  workspace: {
    contractVersion,
    kind: 'self-hosted-installation',
    workspaceId: 'workspace-local',
    installationId: 'installation-local',
  },
  actor: {
    actorId: 'actor-operator',
    actorKind: 'self-hosted-operator',
  },
  authorization: {
    contractVersion,
    authority: 'operator-reachability',
    workspaceId: 'workspace-local',
    installationId: 'installation-local',
    actorId: 'actor-operator',
    capability: 'configuration.write',
  },
  targets: [
    {
      kind: 'screen',
      workspaceId: 'workspace-local',
      roomId: 'room-b407',
      screenId: 'screen-primary',
    },
    {
      kind: 'date',
      workspaceId: 'workspace-local',
      date: '2035-02-12',
    },
  ],
  operationId: 'operation-save-preview',
  correlationId: 'correlation-request-001',
};

const hostedContext = {
  contractVersion,
  workspace: {
    contractVersion,
    kind: 'hosted-organization',
    workspaceId: 'workspace-hosted-acme',
    organizationId: 'organization-acme',
  },
  actor: {
    actorId: 'actor-account-001',
    actorKind: 'hosted-account',
  },
  authorization: {
    contractVersion,
    authority: 'hosted-account',
    workspaceId: 'workspace-hosted-acme',
    organizationId: 'organization-acme',
    actorId: 'actor-account-001',
    capability: 'configuration.read',
  },
  targets: [
    {
      kind: 'resource',
      workspaceId: 'workspace-hosted-acme',
      resourceKind: 'configuration-revision',
      resourceId: 'revision-009',
    },
  ],
  operationId: 'operation-read-configuration',
  correlationId: 'correlation-request-002',
};

function clone(value: unknown): Record<string, unknown> {
  return structuredClone(value) as Record<string, unknown>;
}

test('keeps the compile-time scope and authority distinctions explicit', () => {
  assert.equal(hostedRequiresOrganization, true);
  assert.equal(selfHostedExcludesOrganization, true);
  assert.equal(selfHostedRequiresOperatorGrant, true);
  assert.equal(hostedRequiresAccountGrant, true);
  assert.equal(actorIsNotAGrant, true);
  assert.equal(roomAndScreenIdsAreNominallyDifferent, true);

  const roomId = scopeIdentifier('room', 'room-b407');
  const screenId = scopeIdentifier('screen', 'screen-primary');
  assert.equal(roomId, 'room-b407');
  assert.equal(screenId, 'screen-primary');
  assert.throws(() => scopeIdentifier('workspace', ''), /Invalid workspace/u);
});

test('accepts exact self-hosted and hosted contexts without changing JSON shape', () => {
  for (const raw of [selfHostedContext, hostedContext]) {
    const parsed = parseCoreRequestContext(raw);
    assert.equal(parsed, raw);
    assert.deepEqual(JSON.parse(JSON.stringify(parsed)), raw);
    assert.equal(isCoreRequestContext(parsed), true);
    assert.equal(isAuditScope(toAuditScope(parsed)), true);
  }

  assert.deepEqual(toAuditScope(parseCoreRequestContext(hostedContext)), {
    contractVersion,
    workspaceKind: 'hosted-organization',
    workspaceId: 'workspace-hosted-acme',
    organizationId: 'organization-acme',
    actorId: 'actor-account-001',
    actorKind: 'hosted-account',
    authority: 'hosted-account',
    capability: 'configuration.read',
    targets: hostedContext.targets,
    operationId: 'operation-read-configuration',
    correlationId: 'correlation-request-002',
  });

  const audit = toAuditScope(parseCoreRequestContext(hostedContext));
  assert.equal(parseAuditScope(audit), audit);
  assert.equal(isAuditScope({ ...audit, session: 'raw-session' }), false);
  assert.equal(isAuditScope({ ...audit, token: 'raw-token' }), false);
  assert.equal(
    isAuditScope({ ...audit, payload: { customer: 'data' } }),
    false,
  );
});

test('rejects missing, extra, malformed, and cross-kind workspace shapes', () => {
  assert.equal(
    isWorkspace({
      contractVersion,
      kind: 'hosted-organization',
      workspaceId: 'workspace-hosted-acme',
    }),
    false,
  );
  assert.equal(
    isWorkspace({
      contractVersion,
      kind: 'self-hosted-installation',
      workspaceId: 'workspace-local',
      installationId: 'installation-local',
      organizationId: 'organization-injected',
    }),
    false,
  );
  assert.equal(
    isWorkspace({
      contractVersion,
      kind: 'hosted-organization',
      workspaceId: 'workspace with spaces',
      organizationId: 'organization-acme',
    }),
    false,
  );
  assert.equal(
    isScopedTarget({
      kind: 'room',
      workspaceId: 'workspace-local',
      roomId: 'room-b407',
      screenId: 'screen-cross-kind',
    }),
    false,
  );
});

test('fails closed when workspace, organization, actor, target, or authority differ', () => {
  const mismatches = [
    (() => {
      const value = clone(hostedContext);
      (value.workspace as Record<string, unknown>).organizationId =
        'organization-other';
      return value;
    })(),
    (() => {
      const value = clone(hostedContext);
      (value.actor as Record<string, unknown>).actorId = 'actor-other';
      return value;
    })(),
    (() => {
      const value = clone(hostedContext);
      (
        (value.targets as Record<string, unknown>[])[0] as Record<
          string,
          unknown
        >
      ).workspaceId = 'workspace-other';
      return value;
    })(),
    (() => {
      const value = clone(selfHostedContext);
      (value.authorization as Record<string, unknown>).authority =
        'hosted-account';
      return value;
    })(),
    (() => {
      const value = clone(selfHostedContext);
      (value.targets as Record<string, unknown>[])[1] = {
        kind: 'date',
        workspaceId: 'workspace-local',
        date: '2035-02-30',
      };
      return value;
    })(),
  ];

  for (const mismatch of mismatches) {
    assert.equal(isCoreRequestContext(mismatch), false);
    assert.throws(() => parseCoreRequestContext(mismatch), /Invalid Core/u);
  }
});

test('keeps all six authority grants independent and exact', () => {
  const base = {
    contractVersion,
    workspaceId: 'workspace-hosted-acme',
    actorId: 'actor-account-001',
    capability: 'resource.read',
  };
  const grants = [
    {
      ...base,
      authority: 'operator-reachability',
      installationId: 'installation-local',
    },
    {
      ...base,
      authority: 'hosted-account',
      organizationId: 'organization-acme',
    },
    { ...base, authority: 'viewer-admission', screenId: 'screen-primary' },
    {
      ...base,
      authority: 'provider-consent',
      resourceKind: 'provider-connection',
      resourceId: 'connection-001',
    },
    {
      ...base,
      authority: 'billing-entitlement',
      resourceKind: 'subscription',
      resourceId: 'subscription-001',
    },
    {
      ...base,
      authority: 'support-capability',
      resourceKind: 'support-grant',
      resourceId: 'support-grant-001',
    },
  ];
  assert.ok(grants.every(isCapabilityGrant));
  assert.equal(
    isCapabilityGrant({ ...grants[2], organizationId: 'org' }),
    false,
  );
  assert.equal(isCapabilityGrant(selfHostedContext.actor), false);
});

test('rejects non-JSON-safe accessors and sparse target arrays', () => {
  const accessorContext = clone(selfHostedContext);
  Object.defineProperty(accessorContext, 'operationId', {
    enumerable: true,
    get: () => 'operation-accessor',
  });
  assert.equal(isCoreRequestContext(accessorContext), false);

  const sparseContext = clone(selfHostedContext);
  const sparseTargets = new Array(2);
  sparseTargets[0] = selfHostedContext.targets[0];
  sparseContext.targets = sparseTargets;
  assert.equal(isCoreRequestContext(sparseContext), false);
});

test('contains no ambient/default workspace or optional organization escape hatch', () => {
  const source = readFileSync('src/contracts/v1/workspace.ts', 'utf8');
  assert.doesNotMatch(source, /organizationId\s*\?:/u);
  assert.doesNotMatch(
    source,
    /defaultWorkspace|ambientWorkspace|tenantSelector/u,
  );
});
