import { NonUndefined } from 'utility-types'
import { KeyValue } from '../../../types'
import * as filters from './index-rollup'

export namespace Filter {
  export const presets = filters
}

export namespace Filter {
  export type Definition<T> = (args: T) => string
  export type CommonDefinition = Definition<KeyValue>
}

export namespace Filter {
  export type Presets = typeof Filter['presets']

  export type OptionsMap = {
    readonly [K in keyof Presets]-?: NonUndefined<Parameters<Presets[K]>[0]>
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
