import { BaseGraph } from './base-graph'

export class RubberbandAccessor extends BaseGraph {
  isRubberbandEnabled() {
    return this.rubberbandHandler.isEnabled()
  }

  toggleRubberband() {
    if (this.isRubberbandEnabled()) {
      this.disableRubberband()
    } else {
      this.enabledRubberband()
    }
    return this
  }

  setRubberbandEnabled(enabled: boolean) {
    if (enabled !== this.isRubberbandEnabled()) {
      if (enabled) {
        this.enabledRubberband()
      } else {
        this.disableRubberband()
      }
    }
    return this
  }

  enabledRubberband() {
    this.rubberbandHandler.enable()
    return this
  }

  disableRubberband() {
    this.rubberbandHandler.disable()
    return this
  }
}
