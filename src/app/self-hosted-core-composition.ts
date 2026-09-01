import type {
  CoreGoal1PlannedFrameFixture,
  SelfHostedWorkspace,
} from '../core/contracts.js';
import {
  CoreOperatorShellService,
  DisplayConfigurationService,
  PlannedDisplayProjectionService,
  PresentationProfileService,
  SourceRegistryService,
  type DisplayAccessRepository,
} from '../core/operator-panel.js';
import type { VersionedConfigurationService } from '../core/configuration.js';
import { InMemoryDisplayAccessRepository } from '../infrastructure/memory/display-access.js';
import { SelfHostedCoreOperatorController } from './core-operator-controller.js';

/**
 * Dependencies owned by a single self-hosted Core installation.  The caller
 * supplies durable configuration and may replace the display-access adapter;
 * commercial accounts, ingress, and provider grants are deliberately absent.
 */
export interface SelfHostedCoreCompositionOptions {
  readonly workspace: SelfHostedWorkspace;
  readonly configuration: VersionedConfigurationService;
  readonly displayAccess?: DisplayAccessRepository;
  readonly displayOrigin?: string;
  readonly plannedFrames?: readonly CoreGoal1PlannedFrameFixture[];
  readonly plannedDisplayBasisRevisionId?: string;
}

export interface SelfHostedCoreComposition {
  readonly controller: SelfHostedCoreOperatorController;
  readonly shell: CoreOperatorShellService;
  readonly displays: DisplayConfigurationService;
  readonly sources: SourceRegistryService;
  readonly plannedDisplays: PlannedDisplayProjectionService;
  readonly presentation: PresentationProfileService;
}

/**
 * Composes the current private Core operator surface from deliberate Core
 * exports. Transport binding remains at the entry point so this composition is
 * independently testable and cannot publish an operator listener by itself.
 */
export function composeSelfHostedCore(
  options: SelfHostedCoreCompositionOptions,
): SelfHostedCoreComposition {
  const displays = new DisplayConfigurationService(
    options.workspace,
    options.configuration,
    options.displayAccess ?? new InMemoryDisplayAccessRepository(),
    options.displayOrigin ?? 'https://display.synthetic.invalid',
  );
  const sources = new SourceRegistryService(
    options.workspace,
    options.configuration,
  );
  const plannedDisplays = new PlannedDisplayProjectionService(
    options.workspace,
    options.configuration,
    options.plannedFrames ?? [],
    undefined,
    options.plannedDisplayBasisRevisionId ?? null,
  );
  const presentation = new PresentationProfileService(options.workspace);
  const shell = new CoreOperatorShellService(
    options.workspace,
    options.configuration,
    displays,
    sources,
    plannedDisplays,
  );
  return {
    controller: new SelfHostedCoreOperatorController(
      shell,
      displays,
      sources,
      plannedDisplays,
      presentation,
    ),
    shell,
    displays,
    sources,
    plannedDisplays,
    presentation,
  };
}
