import type { OperatorPageKey } from '../contracts/v1/index.js';
import type { CoreOperatorShellService } from '../application/operator-panel/core-operator-shell-service.js';
import type { CoreOperatorHttpController } from '../infrastructure/operator-http/index.js';
import { renderCoreOperatorShellDocument } from '../presentation/core-operator-shell.js';

/** Self-hosted document controller; account and hosted authority do not exist here. */
export class SelfHostedCoreOperatorController implements CoreOperatorHttpController {
  constructor(readonly shell: CoreOperatorShellService) {}

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
    });
  }
}
