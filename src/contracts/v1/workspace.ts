import {
  contractVersion,
  type ContractEnvelope,
  type IsoDate,
} from './common.js';

declare const scopeIdentifierBrand: unique symbol;

export const scopeIdentifierKinds = [
  'workspace',
  'installation',
  'organization',
  'room',
  'screen',
  'resource',
  'resource-kind',
  'actor',
  'capability',
  'operation',
  'correlation',
] as const;

export type ScopeIdentifierKind = (typeof scopeIdentifierKinds)[number];
export type ScopeIdentifier<Kind extends ScopeIdentifierKind> = string & {
  readonly [scopeIdentifierBrand]: Kind;
};

export type WorkspaceId = ScopeIdentifier<'workspace'>;
export type InstallationId = ScopeIdentifier<'installation'>;
export type OrganizationId = ScopeIdentifier<'organization'>;
export type RoomId = ScopeIdentifier<'room'>;
export type ScreenId = ScopeIdentifier<'screen'>;
export type ResourceId = ScopeIdentifier<'resource'>;
export type ResourceKind = ScopeIdentifier<'resource-kind'>;
export type ActorId = ScopeIdentifier<'actor'>;
export type CapabilityId = ScopeIdentifier<'capability'>;
export type OperationId = ScopeIdentifier<'operation'>;
export type CorrelationId = ScopeIdentifier<'correlation'>;

/**
 * Converts an externally validated identifier into its nominal contract type.
 * The kind is explicit so callers cannot casually exchange workspace, actor,
 * target, capability, or audit identifiers at compile time.
 */
export function scopeIdentifier<Kind extends ScopeIdentifierKind>(
  kind: Kind,
  value: unknown,
): ScopeIdentifier<Kind> {
  if (!isScopeIdentifier(value)) {
    throw new TypeError(`Invalid ${kind} identifier.`);
  }
  return value as ScopeIdentifier<Kind>;
}

export type WorkspaceKind = 'self-hosted-installation' | 'hosted-organization';

export interface SelfHostedWorkspace extends ContractEnvelope {
  readonly kind: 'self-hosted-installation';
  readonly workspaceId: WorkspaceId;
  readonly installationId: InstallationId;
}

export interface HostedWorkspace extends ContractEnvelope {
  readonly kind: 'hosted-organization';
  readonly workspaceId: WorkspaceId;
  readonly organizationId: OrganizationId;
}

/** A reusable Core request always receives one shell-constructed workspace. */
export type Workspace = SelfHostedWorkspace | HostedWorkspace;

export const actorKinds = [
  'self-hosted-operator',
  'hosted-account',
  'viewer',
  'service',
  'support',
] as const;

export type ActorKind = (typeof actorKinds)[number];

/** Attribution only. This structure is deliberately not an authorization grant. */
export interface ActorAttribution {
  readonly actorId: ActorId;
  readonly actorKind: ActorKind;
}

interface CapabilityGrantBase extends ContractEnvelope {
  readonly workspaceId: WorkspaceId;
  readonly actorId: ActorId;
  readonly capability: CapabilityId;
}

export interface OperatorCapabilityGrant extends CapabilityGrantBase {
  readonly authority: 'operator-reachability';
  readonly installationId: InstallationId;
}

export interface HostedAccountCapabilityGrant extends CapabilityGrantBase {
  readonly authority: 'hosted-account';
  readonly organizationId: OrganizationId;
}

export interface ViewerCapabilityGrant extends CapabilityGrantBase {
  readonly authority: 'viewer-admission';
  readonly screenId: ScreenId;
}

export interface ProviderConsentCapabilityGrant extends CapabilityGrantBase {
  readonly authority: 'provider-consent';
  readonly resourceKind: ResourceKind;
  readonly resourceId: ResourceId;
}

export interface BillingCapabilityGrant extends CapabilityGrantBase {
  readonly authority: 'billing-entitlement';
  readonly resourceKind: ResourceKind;
  readonly resourceId: ResourceId;
}

export interface SupportCapabilityGrant extends CapabilityGrantBase {
  readonly authority: 'support-capability';
  readonly resourceKind: ResourceKind;
  readonly resourceId: ResourceId;
}

/**
 * Each authority is a separate discriminated contract. A caller must request
 * the authority required by a use case; one grant never stands in for another.
 */
export type CapabilityGrant =
  | OperatorCapabilityGrant
  | HostedAccountCapabilityGrant
  | ViewerCapabilityGrant
  | ProviderConsentCapabilityGrant
  | BillingCapabilityGrant
  | SupportCapabilityGrant;

export type ShellAuthorizationGrant =
  OperatorCapabilityGrant | HostedAccountCapabilityGrant;

export interface WorkspaceTarget {
  readonly kind: 'workspace';
  readonly workspaceId: WorkspaceId;
}

export interface RoomTarget {
  readonly kind: 'room';
  readonly workspaceId: WorkspaceId;
  readonly roomId: RoomId;
}

export interface ScreenTarget {
  readonly kind: 'screen';
  readonly workspaceId: WorkspaceId;
  readonly roomId: RoomId;
  readonly screenId: ScreenId;
}

export interface DateTarget {
  readonly kind: 'date';
  readonly workspaceId: WorkspaceId;
  readonly date: IsoDate;
}

export interface ResourceTarget {
  readonly kind: 'resource';
  readonly workspaceId: WorkspaceId;
  readonly resourceKind: ResourceKind;
  readonly resourceId: ResourceId;
}

export type ScopedTarget =
  WorkspaceTarget | RoomTarget | ScreenTarget | DateTarget | ResourceTarget;

/** One or more independently scoped targets can be composed for a use case. */
export type ScopedTargets = readonly [ScopedTarget, ...ScopedTarget[]];

interface CoreRequestContextBase extends ContractEnvelope {
  readonly actor: ActorAttribution;
  readonly targets: ScopedTargets;
  readonly operationId: OperationId;
  readonly correlationId: CorrelationId;
}

export interface SelfHostedCoreRequestContext extends CoreRequestContextBase {
  readonly workspace: SelfHostedWorkspace;
  readonly authorization: OperatorCapabilityGrant;
}

export interface HostedCoreRequestContext extends CoreRequestContextBase {
  readonly workspace: HostedWorkspace;
  readonly authorization: HostedAccountCapabilityGrant;
}

/**
 * Shells authenticate and authorize before constructing this context. Core
 * validates its workspace/actor/target invariants but does not authenticate it.
 */
export type CoreRequestContext =
  SelfHostedCoreRequestContext | HostedCoreRequestContext;

interface AuditScopeBase extends ContractEnvelope {
  readonly workspaceId: WorkspaceId;
  readonly actorId: ActorId;
  readonly actorKind: ActorKind;
  readonly capability: CapabilityId;
  readonly targets: ScopedTargets;
  readonly operationId: OperationId;
  readonly correlationId: CorrelationId;
}

export interface SelfHostedAuditScope extends AuditScopeBase {
  readonly workspaceKind: 'self-hosted-installation';
  readonly installationId: InstallationId;
  readonly authority: 'operator-reachability';
}

export interface HostedAuditScope extends AuditScopeBase {
  readonly workspaceKind: 'hosted-organization';
  readonly organizationId: OrganizationId;
  readonly authority: 'hosted-account';
}

/** Bounded audit attribution; payloads, sessions, tokens, and secrets are absent. */
export type AuditScope = SelfHostedAuditScope | HostedAuditScope;

type PlainObject = Record<string, unknown>;

function isPlainObject(value: unknown): value is PlainObject {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  try {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return false;
    return Reflect.ownKeys(value).every((key) => {
      if (typeof key !== 'string') return false;
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      return (
        descriptor !== undefined &&
        'value' in descriptor &&
        descriptor.enumerable
      );
    });
  } catch {
    return false;
  }
}

function hasExactKeys(value: PlainObject, keys: readonly string[]): boolean {
  const actual = Object.keys(value);
  return (
    actual.length === keys.length &&
    keys.every((key) => Object.hasOwn(value, key) && value[key] !== undefined)
  );
}

function isScopeIdentifier(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length <= 128 &&
    /^[A-Za-z0-9][A-Za-z0-9._:-]*$/u.test(value)
  );
}

function isIsoDate(value: unknown): value is IsoDate {
  if (typeof value !== 'string') return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value);
  if (match === null) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1) return false;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= (days[month - 1] ?? 0);
}

function isDenseArray(value: unknown): value is readonly unknown[] {
  if (!Array.isArray(value)) return false;
  try {
    const ownKeys = Reflect.ownKeys(value);
    if (ownKeys.some((key) => typeof key !== 'string')) return false;
    const entries = ownKeys.filter((key) => key !== 'length');
    if (entries.length !== value.length) return false;
    return entries.every((key) => {
      if (typeof key !== 'string' || !/^(?:0|[1-9]\d*)$/u.test(key)) {
        return false;
      }
      const index = Number(key);
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      return (
        Number.isSafeInteger(index) &&
        index < value.length &&
        descriptor !== undefined &&
        'value' in descriptor &&
        descriptor.enumerable
      );
    });
  } catch {
    return false;
  }
}

export function isWorkspace(value: unknown): value is Workspace {
  if (!isPlainObject(value) || value.contractVersion !== contractVersion) {
    return false;
  }
  if (value.kind === 'self-hosted-installation') {
    return (
      hasExactKeys(value, [
        'contractVersion',
        'kind',
        'workspaceId',
        'installationId',
      ]) &&
      isScopeIdentifier(value.workspaceId) &&
      isScopeIdentifier(value.installationId)
    );
  }
  if (value.kind === 'hosted-organization') {
    return (
      hasExactKeys(value, [
        'contractVersion',
        'kind',
        'workspaceId',
        'organizationId',
      ]) &&
      isScopeIdentifier(value.workspaceId) &&
      isScopeIdentifier(value.organizationId)
    );
  }
  return false;
}

export function isActorAttribution(value: unknown): value is ActorAttribution {
  return (
    isPlainObject(value) &&
    hasExactKeys(value, ['actorId', 'actorKind']) &&
    isScopeIdentifier(value.actorId) &&
    typeof value.actorKind === 'string' &&
    (actorKinds as readonly string[]).includes(value.actorKind)
  );
}

export function isCapabilityGrant(value: unknown): value is CapabilityGrant {
  if (!isPlainObject(value) || value.contractVersion !== contractVersion) {
    return false;
  }
  const baseValid =
    isScopeIdentifier(value.workspaceId) &&
    isScopeIdentifier(value.actorId) &&
    isScopeIdentifier(value.capability);
  if (!baseValid) return false;

  if (value.authority === 'operator-reachability') {
    return (
      hasExactKeys(value, [
        'contractVersion',
        'authority',
        'workspaceId',
        'actorId',
        'capability',
        'installationId',
      ]) && isScopeIdentifier(value.installationId)
    );
  }
  if (value.authority === 'hosted-account') {
    return (
      hasExactKeys(value, [
        'contractVersion',
        'authority',
        'workspaceId',
        'actorId',
        'capability',
        'organizationId',
      ]) && isScopeIdentifier(value.organizationId)
    );
  }
  if (value.authority === 'viewer-admission') {
    return (
      hasExactKeys(value, [
        'contractVersion',
        'authority',
        'workspaceId',
        'actorId',
        'capability',
        'screenId',
      ]) && isScopeIdentifier(value.screenId)
    );
  }
  if (
    value.authority === 'provider-consent' ||
    value.authority === 'billing-entitlement' ||
    value.authority === 'support-capability'
  ) {
    return (
      hasExactKeys(value, [
        'contractVersion',
        'authority',
        'workspaceId',
        'actorId',
        'capability',
        'resourceKind',
        'resourceId',
      ]) &&
      isScopeIdentifier(value.resourceKind) &&
      isScopeIdentifier(value.resourceId)
    );
  }
  return false;
}

export function isScopedTarget(value: unknown): value is ScopedTarget {
  if (!isPlainObject(value) || !isScopeIdentifier(value.workspaceId)) {
    return false;
  }
  switch (value.kind) {
    case 'workspace':
      return hasExactKeys(value, ['kind', 'workspaceId']);
    case 'room':
      return (
        hasExactKeys(value, ['kind', 'workspaceId', 'roomId']) &&
        isScopeIdentifier(value.roomId)
      );
    case 'screen':
      return (
        hasExactKeys(value, ['kind', 'workspaceId', 'roomId', 'screenId']) &&
        isScopeIdentifier(value.roomId) &&
        isScopeIdentifier(value.screenId)
      );
    case 'date':
      return (
        hasExactKeys(value, ['kind', 'workspaceId', 'date']) &&
        isIsoDate(value.date)
      );
    case 'resource':
      return (
        hasExactKeys(value, [
          'kind',
          'workspaceId',
          'resourceKind',
          'resourceId',
        ]) &&
        isScopeIdentifier(value.resourceKind) &&
        isScopeIdentifier(value.resourceId)
      );
    default:
      return false;
  }
}

function isScopedTargets(value: unknown): value is ScopedTargets {
  return isDenseArray(value) && value.length > 0 && value.every(isScopedTarget);
}

function hasAlignedRequestScope(value: {
  readonly workspace: Workspace;
  readonly actor: ActorAttribution;
  readonly authorization: CapabilityGrant;
  readonly targets: ScopedTargets;
}): boolean {
  if (
    value.workspace.workspaceId !== value.authorization.workspaceId ||
    value.actor.actorId !== value.authorization.actorId ||
    value.targets.some(
      (target) => target.workspaceId !== value.workspace.workspaceId,
    )
  ) {
    return false;
  }
  if (value.workspace.kind === 'self-hosted-installation') {
    return (
      value.authorization.authority === 'operator-reachability' &&
      value.authorization.installationId === value.workspace.installationId
    );
  }
  return (
    value.authorization.authority === 'hosted-account' &&
    value.authorization.organizationId === value.workspace.organizationId
  );
}

export function isCoreRequestContext(
  value: unknown,
): value is CoreRequestContext {
  if (
    !isPlainObject(value) ||
    !hasExactKeys(value, [
      'contractVersion',
      'workspace',
      'actor',
      'authorization',
      'targets',
      'operationId',
      'correlationId',
    ]) ||
    value.contractVersion !== contractVersion ||
    !isWorkspace(value.workspace) ||
    !isActorAttribution(value.actor) ||
    !isCapabilityGrant(value.authorization) ||
    !isScopedTargets(value.targets) ||
    !isScopeIdentifier(value.operationId) ||
    !isScopeIdentifier(value.correlationId)
  ) {
    return false;
  }
  return hasAlignedRequestScope({
    workspace: value.workspace,
    actor: value.actor,
    authorization: value.authorization,
    targets: value.targets,
  });
}

export function parseCoreRequestContext(value: unknown): CoreRequestContext {
  if (!isCoreRequestContext(value)) {
    throw new TypeError('Invalid Core request context.');
  }
  return value;
}

export function toAuditScope(context: CoreRequestContext): AuditScope {
  const common = {
    contractVersion,
    workspaceId: context.workspace.workspaceId,
    actorId: context.actor.actorId,
    actorKind: context.actor.actorKind,
    capability: context.authorization.capability,
    targets: context.targets,
    operationId: context.operationId,
    correlationId: context.correlationId,
  } as const;

  if (context.workspace.kind === 'self-hosted-installation') {
    return {
      ...common,
      workspaceKind: context.workspace.kind,
      installationId: context.workspace.installationId,
      authority: 'operator-reachability',
    };
  }
  return {
    ...common,
    workspaceKind: context.workspace.kind,
    organizationId: context.workspace.organizationId,
    authority: 'hosted-account',
  };
}

export function isAuditScope(value: unknown): value is AuditScope {
  if (!isPlainObject(value) || value.contractVersion !== contractVersion) {
    return false;
  }
  const commonValid =
    isScopeIdentifier(value.workspaceId) &&
    isScopeIdentifier(value.actorId) &&
    typeof value.actorKind === 'string' &&
    (actorKinds as readonly string[]).includes(value.actorKind) &&
    isScopeIdentifier(value.capability) &&
    isScopedTargets(value.targets) &&
    value.targets.every((target) => target.workspaceId === value.workspaceId) &&
    isScopeIdentifier(value.operationId) &&
    isScopeIdentifier(value.correlationId);
  if (!commonValid) return false;

  if (value.workspaceKind === 'self-hosted-installation') {
    return (
      value.authority === 'operator-reachability' &&
      hasExactKeys(value, [
        'contractVersion',
        'workspaceKind',
        'workspaceId',
        'installationId',
        'actorId',
        'actorKind',
        'authority',
        'capability',
        'targets',
        'operationId',
        'correlationId',
      ]) &&
      isScopeIdentifier(value.installationId)
    );
  }
  if (value.workspaceKind === 'hosted-organization') {
    return (
      value.authority === 'hosted-account' &&
      hasExactKeys(value, [
        'contractVersion',
        'workspaceKind',
        'workspaceId',
        'organizationId',
        'actorId',
        'actorKind',
        'authority',
        'capability',
        'targets',
        'operationId',
        'correlationId',
      ]) &&
      isScopeIdentifier(value.organizationId)
    );
  }
  return false;
}

export function parseAuditScope(value: unknown): AuditScope {
  if (!isAuditScope(value)) throw new TypeError('Invalid audit scope.');
  return value;
}
