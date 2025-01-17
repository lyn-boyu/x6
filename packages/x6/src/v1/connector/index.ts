import { KeyValue } from '../../types'
import { Point, Path } from '../../geometry'
import { EdgeView } from '../core/edge-view'
import * as connectors from './index-rollup'

export namespace Connector {
  export interface BaseOptions {
    raw?: boolean
  }

  export type Definition<T extends BaseOptions = BaseOptions> = (
    this: EdgeView,
    sourcePoint: Point.PointLike,
    targetPoint: Point.PointLike,
    routePoints: Point.PointLike[],
    options: T,
    edgeView: EdgeView,
  ) => Path | string
}

export namespace Connector {
  export const presets = connectors
}

export namespace Connector {
  export type Presets = typeof Connector['presets']

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
