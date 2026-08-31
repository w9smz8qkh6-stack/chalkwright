import type { OperatorPageKey } from '../contracts/v1/index.js';
import type { CoreOperatorShellService } from '../application/operator-panel/core-operator-shell-service.js';
import type { CoreOperatorHttpController } from '../infrastructure/operator-http/index.js';
import { renderCoreOperatorShellDocument } from '../presentation/core-operator-shell.js';
import {
  renderClassCodeRotatedDocument,
  renderDisplayMutationResultDocument,
} from '../presentation/core-operator-shell.js';
import type { DisplayConfigurationService } from '../application/operator-panel/display-configuration-service.js';
import { scopeIdentifier } from '../contracts/v1/index.js';

/** Self-hosted document controller; account and hosted authority do not exist here. */
export class SelfHostedCoreOperatorController implements CoreOperatorHttpController {
  constructor(
    readonly shell: CoreOperatorShellService,
    readonly displays: DisplayConfigurationService,
  ) {}

  capabilities(): unknown {
    return this.shell.discoverCapabilities();
  }

  readiness(): Promise<unknown> {
    return this.shell.readiness();
  }

  async renderPage(pageKey: OperatorPageKey): Promise<string> {
    return renderCoreOperatorShellDocument({
      model: await this.shell.page(pageKey),
      capabilities: this.shell.discoverCapabilities(),
      ...(pageKey === 'displays'
        ? { displayProjection: await this.displays.project() }
        : {}),
    });
  }

  async mutateDisplay(
    action: 'save-draft' | 'rotate-class-code' | 'revoke-class-code',
    fields: Readonly<Record<string, string>>,
  ): Promise<{ readonly status: number; readonly document: string }> {
    if (action === 'save-draft') {
      const result = await this.displays.saveDisplayDraft({
        timeZone: fields.timeZone ?? '',
        ...(fields.roomLabel === undefined
          ? {}
          : { roomLabel: fields.roomLabel }),
        ...(fields.screenLabel === undefined
          ? {}
          : { screenLabel: fields.screenLabel }),
      });
      return {
        status:
          result.status === 'saved'
            ? 200
            : result.status === 'conflict'
              ? 409
              : 422,
        document: renderDisplayMutationResultDocument(
          result.status === 'saved'
            ? `Display draft version ${result.draftVersion} was saved. The active display is unchanged until validation and activation.`
            : result.status === 'conflict'
              ? 'The display draft changed elsewhere. The active display remains unchanged; reload before trying again.'
              : 'The display draft was not saved. Check the timezone and room/screen labels.',
          result.status === 'saved' ? 'success' : 'error',
        ),
      };
    }
    let screenId;
    try {
      screenId = scopeIdentifier('screen', fields.screenId);
    } catch {
      return {
        status: 422,
        document: renderDisplayMutationResultDocument(
          'The screen reference is invalid. No class-code state changed.',
          'error',
        ),
      };
    }
    if (action === 'rotate-class-code') {
      const result = await this.displays.rotateClassCode(screenId);
      return result.status === 'rotated'
        ? {
            status: 200,
            document: renderClassCodeRotatedDocument(
              result.classCode,
              result.verifierVersion,
            ),
          }
        : {
            status: 404,
            document: renderDisplayMutationResultDocument(
              'The screen was not found. No class-code state changed.',
              'error',
            ),
          };
    }
    const result = await this.displays.revokeClassCode(screenId);
    return {
      status: result === 'revoked' ? 200 : 404,
      document: renderDisplayMutationResultDocument(
        result === 'revoked'
          ? 'The class code and every viewer session for this screen were revoked. Operator access is unchanged.'
          : 'The screen was not found. No class-code state changed.',
        result === 'revoked' ? 'success' : 'error',
      ),
    };
  }
}
