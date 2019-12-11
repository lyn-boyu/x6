import { Cell } from '../core/cell'
import { DomEvent } from '../common'
import { hook } from './decorator'
import { events } from './events'
import { BaseGraph } from './base-graph'

export class EditingAccessor extends BaseGraph {
  @hook()
  isCellEditable(cell: Cell) {
    const style = this.getStyle(cell)
    return (
      this.isCellsEditable() &&
      !this.isCellLocked(cell) &&
      style.editable !== false
    )
  }

  @hook()
  getEditingContent(cell: Cell, e?: Event) {
    return this.dataToString(cell)
  }

  startEditing(e?: MouseEvent) {
    this.startEditingAtCell(null, e)
    return this
  }

  stopEditing(cancel: boolean = false) {
    this.cellEditor.stopEditing(cancel)
    this.trigger(events.editingStopped, { cancel })
    return this
  }

  startEditingAtCell(
    cell: Cell | null = this.getSelectedCell(),
    e?: MouseEvent,
  ) {
    if (e == null || !DomEvent.isMultiTouchEvent(e)) {
      if (cell != null && this.isCellEditable(cell)) {
        this.trigger(events.startEditing, { cell, e })
        this.cellEditor.startEditing(cell, e)
        this.trigger(events.editingStarted, { cell, e })
      }
    }
    return this
  }

  /**
   * Returns true if the given cell is currently being edited.
   */
  isEditing(cell?: Cell) {
    if (this.cellEditor != null) {
      const editingCell = this.cellEditor.getEditingCell()
      return cell == null ? editingCell != null : cell === editingCell
    }

    return false
  }

  updateLabel(cell: Cell, label: string, e?: Event) {
    this.editingManager.updateLabel(cell, label, e)
    return this
  }
}