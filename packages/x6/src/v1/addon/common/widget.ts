import { View } from '../../core/view'
import { Cell } from '../../core/cell'
import { Node } from '../../core/node'
import { Edge } from '../../core/edge'
import { Model } from '../../core/model'
import { Graph } from '../../core/graph'
import { CellView } from '../../core/cell-view'
import { KeyValue } from '../../../types'

export class Widget<
  Options extends Widget.Options = Widget.Options,
  EventArgs = any
> extends View<EventArgs> {
  // #region static

  private static readonly instanceCache: WeakMap<
    typeof Widget,
    KeyValue<KeyValue<Widget>>
  > = new WeakMap()

  private static ensureCache() {
    if (!this.instanceCache.has(this)) {
      this.instanceCache.set(this, {})
    }
    return this.instanceCache.get(this)!
  }

  public static register(instance: Widget, graph?: Graph) {
    if (graph == null) {
      // tslint:disable-next-line
      graph = instance.graph
    }
    const dic = this.ensureCache()
    let cache = dic[graph.cid]
    if (cache == null) {
      cache = dic[graph.cid] = {}
    }
    cache[instance.cid] = instance
  }

  public static unregister(instance: Widget, graph?: Graph) {
    if (graph == null) {
      // tslint:disable-next-line
      graph = instance.graph
    }
    const dic = this.ensureCache()
    if (dic[graph.cid]) {
      delete dic[graph.cid][instance.cid]
    }
  }

  public static removeInstances(graph: Graph) {
    const dic = this.ensureCache()
    const cache = dic[graph.cid]
    if (cache) {
      Object.keys(cache).forEach(cid => {
        const instance = cache[cid]
        if (instance) {
          instance.remove()
        }
      })
    }
  }

  public static getInstances(graph: Graph) {
    const dic = this.ensureCache()
    return dic[graph.cid] || {}
  }

  // #endregion

  public options: Options
  public readonly cell: Cell
  public readonly view: CellView
  public readonly model: Model
  public readonly graph: Graph

  constructor(options: Options & (Types.ViewOptions | Types.CellOptions)) {
    super()

    const { view, cell, node, edge, graph, ...localOptions } = options as any
    if (view) {
      this.view = view
      this.cell = view.cell
      this.graph = view.graph
      this.model = this.graph.model
    } else if ((cell || edge || node) && graph) {
      this.cell = node || edge || cell
      this.view = graph.findViewByCell(this.cell)!
      this.graph = graph
      this.model = this.graph.model
    }

    const ctor = this.constructor as typeof Widget
    if (options.clearAll !== false) {
      ctor.removeInstances(this.graph)
    }

    ctor.register(this)
    this.init(localOptions)
  }

  protected init(options: Options) {}

  render() {
    return this
  }

  protected startListening() {
    if (this.options.clearOnBlankMouseDown !== false) {
      this.graph.on('blank:mousedown', this.remove, this)
    }
  }

  protected stopListening() {
    if (this.options.clearOnBlankMouseDown !== false) {
      this.graph.off('blank:mousedown', this.remove, this)
    }
  }

  remove() {
    this.stopListening()
    const ctor = this.constructor as typeof Widget
    ctor.unregister(this)
    return super.remove()
  }

  @View.dispose()
  dispose() {
    this.remove()
  }
}

export namespace Widget {
  export interface Options {
    /**
     * If set to `true` (the default value), clear all the existing widget
     * from the page when a new widget is created. This is the most common
     * behavior as it is assumed that there is only one widget visible on
     * the page at a time. However, some applications might need to have more
     * than one widget visible. In this case, set `clearAll` to `false` (and
     * make sure to call `remove()` once you don't need a widget anymore)
     */
    clearAll?: boolean
    clearOnBlankMouseDown?: boolean
  }
}

namespace Types {
  export interface ViewOptions {
    view: CellView
  }

  export interface CellOptions {
    cell?: Cell
    node?: Node
    edge?: Edge
    graph: Graph
  }
}
