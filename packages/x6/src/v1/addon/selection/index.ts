import { ObjectExt, StringExt } from '../../../util'
import { Rectangle, Angle, snapToGrid, Point } from '../../../geometry'
import { Cell } from '../../core/cell'
import { Edge } from '../../core/edge'
import { Node } from '../../core/node'
import { View } from '../../core/view'
import { Model } from '../../core/model'
import { Graph } from '../../core/graph'
import { CellView } from '../../core/cell-view'
import { Collection } from '../../core/collection'
import { Handle } from '../common/handle'

export class Selection extends View<Selection.EventArgs> {
  public readonly options: Selection.Options
  public readonly collection: Collection

  protected $container: JQuery<HTMLElement>
  protected $selectionContainer: JQuery<HTMLElement>
  protected $selectionContent: JQuery<HTMLElement>

  protected boxCount: number
  protected boxesUpdated: boolean

  public get graph() {
    return this.options.graph
  }

  protected get boxClassName() {
    return this.prefixClassName(Private.classNames.box)
  }

  protected get selectionBoxes() {
    return this.$container.children(`.${this.boxClassName}`)
  }

  constructor(options: Selection.Options) {
    super()
    this.options = ObjectExt.merge({}, Private.defaultOptions, options)

    if (this.options.model) {
      this.options.collection = this.options.model.collection
    }

    if (this.options.collection) {
      this.collection = this.options.collection
    } else {
      this.collection = new Collection([], {
        comparator: Private.depthComparator,
      })
      this.options.collection = this.collection
    }

    this.boxCount = 0
    this.handles = []

    this.createContainer()

    if (this.options.handles) {
      this.options.handles.forEach(handle => this.addHandle(handle))
    }

    this.startListening()
  }

  protected startListening() {
    const graph = this.graph
    const collection = this.collection

    this.delegateEvents({
      [`mousedown .${this.boxClassName}`]: 'onSelectionBoxMouseDown',
      [`touchstart .${this.boxClassName}`]: 'onSelectionBoxMouseDown',
      [`mousedown .${this.handleClassName}`]: 'onHandleMouseDown',
      [`touchstart .${this.handleClassName}`]: 'onHandleMouseDown',
    })

    graph.on('scale', this.onGraphTransformed, this)
    graph.on('translate', this.onGraphTransformed, this)

    collection.on('added', this.onCellAdded, this)
    collection.on('removed', this.onCellRemoved, this)
    collection.on('reseted', this.onReseted, this)
    collection.on('updated', this.onCollectionUpdated, this)
    collection.on('cell:change:*', this.onCellChanged, this)
  }

  protected stopListening() {
    const graph = this.graph
    const collection = this.collection

    this.undelegateEvents()

    graph.off('scale', this.onGraphTransformed, this)
    graph.off('translate', this.onGraphTransformed, this)

    collection.off('removed', this.onCellRemoved, this)
    collection.off('reseted', this.onReseted, this)
    collection.off('added', this.onCellAdded, this)
    collection.off('cell:change:*', this.onCellChanged, this)
  }

  protected onRemove() {
    this.stopListening()
  }

  protected onGraphTransformed() {
    this.updateSelectionBoxes({ async: false })
  }

  protected onCellChanged() {
    this.updateSelectionBoxes()
  }

  isEmpty() {
    return this.getSelectedCellCount() <= 0
  }

  isCellSelected(cell: Cell | string) {
    return this.collection.has(cell)
  }

  getSelectedCellCount() {
    return this.collection.length
  }

  getSelectedCells() {
    return this.collection.toArray()
  }

  selectCell(cell: Cell, options: Collection.AddOptions) {
    this.collection.add(cell, options)
    return this
  }

  selectCells(cells: Cell | Cell[], options: Collection.AddOptions) {
    this.collection.add(cells, options)
    return this
  }

  unselectCell(cell: Cell, options: Collection.RemoveOptions) {
    this.collection.remove(cell, options)
    return this
  }

  unselectCells(cells: Cell | Cell[], options: Collection.RemoveOptions) {
    this.collection.remove(Array.isArray(cells) ? cells : [cells], options)
    return this
  }

  clearSelection() {
    this.collection.reset([], { ui: true })
    return this
  }

  startSelecting(evt: JQuery.MouseDownEvent) {
    // Flow: startSelecting => adjustSelection => stopSelecting

    evt = this.normalizeEvent(evt) // tslint:disable-line
    this.clearSelection()
    let x
    let y
    const graphContainer = this.graph.container
    if (
      null != evt.offsetX &&
      null != evt.offsetY &&
      graphContainer.contains(evt.target)
    ) {
      x = evt.offsetX
      y = evt.offsetY
    } else {
      const offset = this.$(graphContainer).offset()!
      const scrollLeft = graphContainer.scrollLeft
      const scrollTop = graphContainer.scrollTop
      x = evt.clientX - offset.left + window.pageXOffset + scrollLeft
      y = evt.clientY - offset.top + window.pageYOffset + scrollTop
    }

    this.$container
      .css({
        width: 1,
        height: 1,
        left: x,
        top: y,
      })
      .appendTo(this.graph.container)

    this.showLasso()
    this.setEventData<EventData.Selecting>(evt, {
      action: 'selecting',
      clientX: evt.clientX,
      clientY: evt.clientY,
      offsetX: x,
      offsetY: y,
    })
    this.delegateDocumentEvents(Private.documentEvents, evt.data)
  }

  protected stopSelecting(evt: JQuery.MouseUpEvent) {
    const graph = this.graph
    const action = this.getEventData<EventData.Common>(evt).action
    switch (action) {
      case 'selecting': {
        let width = this.$container.width()!
        let height = this.$container.height()!
        const offset = this.$container.offset()!
        const origin = graph.pageToLocalPoint(offset.left, offset.top)
        const scale = graph.getScale()
        width = width / scale.sx
        height = height / scale.sy
        const rect = new Rectangle(origin.x, origin.y, width, height)
        let views = this.getNodesInArea(rect)
        const filter = this.options.filter

        if (Array.isArray(filter)) {
          views = views.filter(
            view =>
              !filter.includes(view.cell) && !filter.includes(view.cell.type),
          )
        } else {
          if (typeof filter === 'function') {
            views = views.filter(view => !filter(view.cell as Node))
          }
        }
        const cells = views.map(view => view.cell)
        this.collection.reset(cells, { ui: true })
        break
      }

      case 'translating': {
        this.graph.model.stopBatch('selection-translate')
        const client = graph.snapToGrid(evt.clientX, evt.clientY)
        this.notifyBoxEvent('selection-box:mouseup', evt, client.x, client.y)
        break
      }

      default: {
        if (!action) {
          this.clearSelection()
        }
      }
    }
  }

  protected onSelectionBoxMouseDown(evt: JQuery.MouseDownEvent) {
    evt.stopPropagation()
    evt = this.normalizeEvent(evt) // tslint:disable-line

    if (this.options.movable) {
      this.startTranslating(evt)
    }

    const activeView = this.getCellViewFromElem(evt.target)!
    this.setEventData<EventData.SelectionBox>(evt, { activeView })
    const client = this.graph.snapToGrid(evt.clientX, evt.clientY)
    this.notifyBoxEvent('selection-box:mousedown', evt, client.x, client.y)
    this.delegateDocumentEvents(Private.documentEvents, evt.data)
  }

  protected startTranslating(evt: JQuery.MouseDownEvent) {
    this.graph.model.startBatch('selection-translate')
    const client = this.graph.snapToGrid(evt.clientX, evt.clientY)
    this.setEventData<EventData.Translating>(evt, {
      action: 'translating',
      clientX: client.x,
      clientY: client.y,
    })
  }

  protected adjustSelection(evt: JQuery.MouseMoveEvent) {
    evt = this.normalizeEvent(evt) // tslint:disable-line
    const eventData = this.getEventData<EventData.Common>(evt)
    const action = eventData.action
    switch (action) {
      case 'selecting': {
        const data = eventData as EventData.Selecting
        const dx = evt.clientX - data.clientX
        const dy = evt.clientY - data.clientY
        const left = parseInt(this.$container.css('left'), 10)
        const top = parseInt(this.$container.css('top'), 10)
        this.$container.css({
          left: dx < 0 ? data.offsetX + dx : left,
          top: dy < 0 ? data.offsetY + dy : top,
          width: Math.abs(dx),
          height: Math.abs(dy),
        })
        break
      }

      case 'translating': {
        const data = eventData as EventData.Translating
        const client = this.graph.snapToGrid(evt.clientX, evt.clientY)
        let dx = client.x - data.clientX
        let dy = client.y - data.clientY
        const restrictedArea = this.graph.getRestrictedArea()
        if (restrictedArea) {
          const cells = this.collection.toArray()
          const totalBBox = Cell.getCellsBBox(cells)!
          const minDx = restrictedArea.x - totalBBox.x
          const minDy = restrictedArea.y - totalBBox.y
          const maxDx =
            restrictedArea.x +
            restrictedArea.width -
            (totalBBox.x + totalBBox.width)
          const maxDy =
            restrictedArea.y +
            restrictedArea.height -
            (totalBBox.y + totalBBox.height)
          if (dx < minDx) {
            dx = minDx
          }
          if (dy < minDy) {
            dy = minDy
          }
          if (maxDx < dx) {
            dx = maxDx
          }
          if (maxDy < dy) {
            dy = maxDy
          }
        }
        if (dx || dy) {
          if ((this.translateSelectedNodes(dx, dy), this.boxesUpdated)) {
            if (this.collection.length > 1) {
              this.updateSelectionBoxes()
            }
          } else {
            const scale = this.graph.getScale()
            this.selectionBoxes.add(this.$selectionContainer).css({
              left: `+=${dx * scale.sx}`,
              top: `+=${dy * scale.sy}`,
            })
          }
          data.clientX = client.x
          data.clientY = client.y
        }

        this.notifyBoxEvent('selection-box:mousemove', evt, client.x, client.y)
        break
      }

      default: {
        if (action) {
          this.onMouseMove(evt)
        }
      }
    }
    this.boxesUpdated = false
  }

  protected translateSelectedNodes(dx: number, dy: number) {
    const map: { [id: string]: boolean } = {}
    this.collection.toArray().forEach(cell => {
      if (!map[cell.id]) {
        const options = {
          selection: this.cid,
        }
        cell.translate(dx, dy, options)
        cell.getDescendants({ deep: true }).forEach(child => {
          map[child.id] = true
        })
        this.graph.model.getConnectedEdges(cell).forEach(edge => {
          if (!map[edge.id]) {
            edge.translate(dx, dy, options)
            map[edge.id] = true
          }
        })
      }
    })
  }

  protected getNodesInArea(rect: Rectangle) {
    const graph = this.graph
    const options = {
      strict: this.options.strict,
    }

    return this.options.useCellGeometry
      ? (graph.model
          .getNodesInArea(rect, options)
          .map(node => graph.findViewByCell(node))
          .filter(view => view != null) as CellView[])
      : graph.findViewsInArea(rect, options)
  }

  protected notifyBoxEvent<
    K extends keyof Selection.BoxEventArgs,
    T extends JQuery.TriggeredEvent
  >(name: K, e: T, x: number, y: number) {
    const data = this.getEventData<EventData.SelectionBox>(e)
    const view = data.activeView
    this.trigger(name, { e, view, x, y })
  }

  protected destroySelectionBox(cell: Cell) {
    this.$container.find(`[data-cell="${cell.id}"]`).remove()
    if (this.selectionBoxes.length === 0) {
      this.hide()
    }
    this.boxCount = Math.max(0, this.boxCount - 1)
  }

  protected destroyAllSelectionBoxes() {
    this.hide()
    this.selectionBoxes.remove()
    this.boxCount = 0
  }

  hide() {
    this.$container
      .removeClass(this.prefixClassName(Private.classNames.lasso))
      .removeClass(this.prefixClassName(Private.classNames.selected))
  }

  protected showLasso() {
    this.$container.addClass(this.prefixClassName(Private.classNames.lasso))
  }

  protected showSelected() {
    this.$container.addClass(this.prefixClassName(Private.classNames.selected))
  }

  protected createContainer() {
    this.container = document.createElement('div')
    this.$container = this.$(this.container)
    this.$container.addClass(this.prefixClassName(Private.classNames.root))
    if (this.options.className) {
      this.$container.addClass(this.options.className)
    }

    this.$selectionContainer = this.$('<div/>').addClass(
      this.prefixClassName(Private.classNames.inner),
    )

    this.$selectionContent = this.$('<div/>').addClass(
      this.prefixClassName(Private.classNames.content),
    )

    this.$selectionContainer.append(this.$selectionContent)
    this.$selectionContainer.attr(
      'data-selection-length',
      this.collection.length,
    )

    this.$container.prepend(this.$selectionContainer)
    this.$handleContainer = this.$selectionContainer
  }

  protected updateContainer() {
    const origin = { x: Infinity, y: Infinity }
    const corner = { x: 0, y: 0 }

    this.collection.toArray().forEach(cell => {
      const view = this.graph.findViewByCell(cell)
      if (view) {
        const bbox = view.getBBox({
          fromCell: this.options.useCellGeometry,
        })
        origin.x = Math.min(origin.x, bbox.x)
        origin.y = Math.min(origin.y, bbox.y)
        corner.x = Math.max(corner.x, bbox.x + bbox.width)
        corner.y = Math.max(corner.y, bbox.y + bbox.height)
      }
    })

    this.$selectionContainer
      .css({
        left: origin.x,
        top: origin.y,
        width: corner.x - origin.x,
        height: corner.y - origin.y,
      })
      .attr('data-selection-length', this.collection.length)

    const boxContent = this.options.content
    if (boxContent) {
      if (typeof boxContent === 'function') {
        const content = boxContent.call(this, this.$selectionContent[0])
        if (content) {
          this.$selectionContent.html(content)
        }
      } else {
        this.$selectionContent.html(boxContent)
      }
    }

    if (this.collection.length > 0 && !this.container.parentNode) {
      this.$container.appendTo(this.graph.container)
    } else if (this.collection.length <= 0 && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container)
    }
  }

  protected createSelectionBox(cell: Cell) {
    const view = this.graph.findViewByCell(cell)
    if (view) {
      const bbox = view.getBBox({
        fromCell: this.options.useCellGeometry,
      })
      this.$('<div/>')
        .addClass(this.boxClassName)
        .attr('data-cell', cell.id)
        .css({
          left: bbox.x,
          top: bbox.y,
          width: bbox.width,
          height: bbox.height,
        })
        .appendTo(this.container)
      this.showSelected()
      this.boxCount += 1
    }
  }

  protected updateSelectionBoxes(options: Graph.RequestViewUpdateOptions = {}) {
    if (this.collection.length > 0) {
      this.boxesUpdated = true
      this.graph.requestViewUpdate(this as any, 1, 2, options)
    }
  }

  confirmUpdate() {
    if (this.boxCount) {
      this.hide()
      this.selectionBoxes.each((_, elem) => {
        const cellId = this.$(elem)
          .remove()
          .attr('data-cell')
        const cell = this.collection.get(cellId)
        if (cell) {
          this.createSelectionBox(cell)
        }
      })

      this.updateContainer()
    }
    return 0
  }

  protected getCellViewFromElem(elem: Element) {
    const id = elem.getAttribute('data-cell')
    if (id) {
      const cell = this.collection.get(id)
      if (cell) {
        return this.graph.findViewByCell(cell)
      }
    }
    return null
  }

  protected onHandleMouseDown(e: JQuery.MouseDownEvent) {
    const action = this.$(e.currentTarget).attr('data-action')
    if (action) {
      e.preventDefault()
      e.stopPropagation()
      e = this.normalizeEvent(e) // tslint:disable-line
      this.triggerAction(action, 'mousedown', e)
      this.setEventData(e, {
        action,
        clientX: e.clientX,
        clientY: e.clientY,
        startClientX: e.clientX,
        startClientY: e.clientY,
      })
      this.delegateDocumentEvents(Private.documentEvents, e.data)
    }
  }

  protected onMouseMove(evt: JQuery.MouseMoveEvent) {
    const data = this.getEventData(evt)
    const action = data.action
    if (action) {
      const client = this.graph.snapToGrid(evt.clientX, evt.clientY)
      const origin = this.graph.snapToGrid(data.clientX, data.clientY)
      const dx = client.x - origin.x
      const dy = client.y - origin.y
      this.triggerAction(action, 'mousemove', evt, {
        dx,
        dy,
        offsetX: evt.clientX - data.startClientX,
        offsetY: evt.clientY - data.startClientY,
      })
      data.clientX = evt.clientX
      data.clientY = evt.clientY
    }
  }

  protected onMouseUp(evt: JQuery.MouseUpEvent) {
    const action = this.getEventData<EventData.Common>(evt).action
    if (action) {
      this.triggerAction(action, 'mouseup', evt)
      this.stopSelecting(evt)
      this.undelegateDocumentEvents()
    }
  }

  protected triggerAction(
    action: string,
    eventName: string,
    e: JQuery.TriggeredEvent,
    args?: any,
  ) {
    this.trigger(`action:${action}:${eventName}`, { e, ...args })
  }

  protected onCellRemoved({ cell }: Collection.EventArgs['removed']) {
    this.destroySelectionBox(cell)
    this.updateContainer()
  }

  protected onReseted({ current }: Collection.EventArgs['reseted']) {
    this.destroyAllSelectionBoxes()
    current.forEach(cell => this.createSelectionBox(cell))
    this.updateContainer()
  }

  protected onCellAdded({ cell }: Collection.EventArgs['added']) {
    this.createSelectionBox(cell)
    this.updateContainer()
  }

  protected onCollectionUpdated({
    added,
    removed,
    options,
  }: Collection.EventArgs['updated']) {
    added.forEach(cell => {
      this.trigger('cell:selected', { cell, options })
      this.graph.trigger('cell:selected', { cell, options })
      if (cell.isNode()) {
        this.trigger('node:selected', { cell, options, node: cell })
        this.graph.trigger('node:selected', { cell, options, node: cell })
      } else if (cell.isEdge()) {
        this.trigger('edge:selected', { cell, options, edge: cell })
        this.graph.trigger('edge:selected', { cell, options, edge: cell })
      }
    })

    removed.forEach(cell => {
      this.trigger('cell:unselected', { cell, options })
      this.graph.trigger('cell:unselected', { cell, options })
      if (cell.isNode()) {
        this.trigger('node:unselected', { cell, options, node: cell })
        this.graph.trigger('node:unselected', { cell, options, node: cell })
      } else if (cell.isEdge()) {
        this.trigger('edge:unselected', { cell, options, edge: cell })
        this.graph.trigger('edge:unselected', { cell, options, edge: cell })
      }
    })

    const args = {
      added,
      removed,
      options,
      selected: this.getSelectedCells(),
    }
    this.trigger('selection:changed', args)
    this.graph.trigger('selection:changed', args)
  }

  protected removeSelectedCells() {
    const cells = this.collection.toArray()
    this.clearSelection()
    this.graph.model.removeCells(cells, {
      selection: this.cid,
    })
  }

  protected startRotating({ e }: Handle.EventArgs) {
    const cells = this.collection.toArray()
    const center = Cell.getCellsBBox(cells)!.getCenter()
    const client = this.graph.snapToGrid(e.clientX!, e.clientY!)
    const angles = cells.reduce<{ [id: string]: number }>(
      (memo, cell: Node) => {
        memo[cell.id] = Angle.normalize(cell.getRotation())
        return memo
      },
      {},
    )

    this.setEventData<EventData.Rotation>(e, {
      center,
      angles,
      start: client.theta(center),
    })
  }

  protected doRotate({ e }: Handle.EventArgs) {
    const data = this.getEventData<EventData.Rotation>(e)
    const grid = this.options.rotateGrid!
    const client = this.graph.snapToGrid(e.clientX!, e.clientY!)
    const delta = data.start - client.theta(data.center)
    if (Math.abs(delta) > 0.001) {
      this.collection.toArray().forEach((node: Node) => {
        const angle = snapToGrid(data.angles[node.id] + delta, grid)
        node.rotate(angle, true, data.center, {
          selection: this.cid,
        })
      })
      this.updateSelectionBoxes()
    }
  }

  protected stopRotate() {}

  protected startResizing({ e }: Handle.EventArgs) {
    const gridSize = this.graph.options.gridSize
    const cells = this.collection.toArray()
    const bbox = Cell.getCellsBBox(cells)!
    const bboxes = cells.map(cell => cell.getBBox())
    const maxWidth = bboxes.reduce((maxWidth, bbox) => {
      return bbox.width < maxWidth ? bbox.width : maxWidth
    }, Infinity)
    const maxHeight = bboxes.reduce((maxHeight, bbox) => {
      return bbox.height < maxHeight ? bbox.height : maxHeight
    }, Infinity)

    this.setEventData<EventData.Resizing>(e, {
      bbox,
      cells: this.graph.model.getSubGraph(cells),
      minWidth: (gridSize * bbox.width) / maxWidth,
      minHeight: (gridSize * bbox.height) / maxHeight,
    })
  }

  protected doResize({ e, dx, dy }: Handle.EventArgs) {
    const data = this.eventData<EventData.Resizing>(e)
    const bbox = data.bbox
    const width = bbox.width
    const height = bbox.height
    const newWidth = Math.max(width + dx, data.minWidth)
    const newHeight = Math.max(height + dy, data.minHeight)
    if (
      0.001 < Math.abs(width - newWidth) ||
      0.001 < Math.abs(height - newHeight)
    ) {
      this.graph.model.resizeCells(newWidth, newHeight, data.cells, {
        selection: this.cid,
      })
      bbox.width = newWidth
      bbox.height = newHeight
      this.updateSelectionBoxes()
    }
  }

  protected stopResize() {}
}

export namespace Selection {
  export interface Options {
    graph: Graph
    model?: Model
    collection?: Collection
    className?: string
    strict?: boolean
    movable?: boolean
    useCellGeometry?: boolean
    rotateGrid?: number
    handles?: Handle.Options[] | null
    content?:
      | false
      | string
      | ((this: Selection, contentElement: HTMLElement) => string)
    filter?: (string | Cell)[] | filterFunction
  }

  export type filterFunction = (node: Node) => boolean
}

export namespace Selection {
  interface SelectionBoxEventArgs<T> {
    e: T
    view: CellView
    cell: Cell
    x: number
    y: number
  }

  export interface BoxEventArgs {
    'selection-box:mousedown': SelectionBoxEventArgs<JQuery.MouseDownEvent>
    'selection-box:mousemove': SelectionBoxEventArgs<JQuery.MouseMoveEvent>
    'selection-box:mouseup': SelectionBoxEventArgs<JQuery.MouseUpEvent>
  }

  export interface SelectionEventArgs {
    'cell:selected': { cell: Cell; options: Model.SetOptions }
    'node:selected': { cell: Cell; node: Node; options: Model.SetOptions }
    'edge:selected': { cell: Cell; edge: Edge; options: Model.SetOptions }
    'cell:unselected': { cell: Cell; options: Model.SetOptions }
    'node:unselected': { cell: Cell; node: Node; options: Model.SetOptions }
    'edge:unselected': { cell: Cell; edge: Edge; options: Model.SetOptions }
    'selection:changed': {
      added: Cell[]
      removed: Cell[]
      selected: Cell[]
      options: Model.SetOptions
    }
  }

  export interface EventArgs extends BoxEventArgs, SelectionEventArgs {}
}

export interface Selection extends Handle {}

ObjectExt.applyMixins(Selection, Handle)

// private
// -------
namespace Private {
  const baseClassName = 'widget-selection'

  export const classNames = {
    root: baseClassName,
    inner: `${baseClassName}-inner`,
    box: `${baseClassName}-box`,
    content: `${baseClassName}-content`,
    lasso: `${baseClassName}-lasso`,
    selected: `${baseClassName}-selected`,
  }

  export const documentEvents = {
    mousemove: 'adjustSelection',
    touchmove: 'adjustSelection',
    mouseup: 'onMouseUp',
    touchend: 'onMouseUp',
    touchcancel: 'onMouseUp',
  }

  export const defaultOptions: Partial<Selection.Options> = {
    movable: true,
    strict: false,
    useCellGeometry: false,
    rotateGrid: 15,
    content() {
      return StringExt.template(
        '<%= length %> node<%= length > 1 ? "s":"" %> selected.',
      )({
        length: this.collection.length,
      })
    },
    handles: [
      {
        name: 'remove',
        position: 'nw',
        events: {
          mousedown: 'removeSelectedCells',
        },
      },
      {
        name: 'rotate',
        position: 'sw',
        events: {
          mousedown: 'startRotating',
          mousemove: 'doRotate',
          mouseup: 'stopRotate',
        },
      },
      {
        name: 'resize',
        position: 'se',
        events: {
          mousedown: 'startResizing',
          mousemove: 'doResize',
          mouseup: 'stopResize',
        },
      },
    ],
  }

  export function depthComparator(cell: Cell) {
    return cell.getAncestors().length
  }
}

namespace EventData {
  export interface Common {
    action: 'selecting' | 'translating'
  }

  export interface Selecting extends Common {
    action: 'selecting'
    clientX: number
    clientY: number
    offsetX: number
    offsetY: number
  }

  export interface Translating extends Common {
    action: 'translating'
    clientX: number
    clientY: number
  }

  export interface SelectionBox {
    activeView: CellView
  }

  export interface Rotation {
    center: Point.PointLike
    start: number
    angles: { [id: string]: number }
  }

  export interface Resizing {
    bbox: Rectangle
    cells: Cell[]
    minWidth: number
    minHeight: number
  }
}
