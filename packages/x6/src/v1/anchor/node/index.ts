import { Point } from '../../../geometry'
import { Edge } from '../../core/edge'
import { EdgeView } from '../../core/edge-view'
import { NodeView } from '../../core/node-view'
import { KeyValue } from '../../../types'
import * as anchors from './index-rollup'

export namespace NodeAnchor {
  export type Definition<T> = (
    this: EdgeView,
    /**
     * The NodeView to which we are connecting.
     */
    nodeView: NodeView,
    /**
     * The SVGElement in our graph that contains the magnet
     * (element/subelement/port) to which we are connecting.
     */
    magnet: SVGElement,
    /**
     * A reference to another component of the edge path that may be
     * necessary to find this anchor point. If we are calling this method
     * for a source anchor, it is the first vertex, or if there are no
     * vertices the target anchor. If we are calling this method for a target
     * anchor, it is the last vertex, or if there are no vertices the source
     * anchor...
     */
    ref: Point | Point.PointLike | SVGElement,
    options: T,
    endType: Edge.TerminalType,
  ) => Point

  export type CommonDefinition = Definition<KeyValue>

  export type ResolvedDefinition<T> = (
    this: EdgeView,
    view: NodeView,
    magnet: SVGElement,
    refPoint: Point,
    options: T,
  ) => Point
}

export namespace NodeAnchor {
  export const presets = anchors
}

export namespace NodeAnchor {
  export type Presets = typeof NodeAnchor['presets']

  export type OptionsMap = {
    readonly [K in keyof Presets]-?: Parameters<Presets[K]>[3]
  }

  export type NativeNames = keyof Presets

  export interface NativeItem<T extends NativeNames = NativeNames> {
    name: T
    args?: OptionsMap[T]
  }

  export interface ManaualItem {
    name: Exclude<string, NativeNames>
    args?: KeyValue
  }
}
