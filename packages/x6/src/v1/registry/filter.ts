import { Filter } from '../style'
import { Registry } from './registry'

export const FilterRegistry = Registry.create<Filter.CommonDefinition>({
  type: 'filter',
})

FilterRegistry.register(Filter.presets, true)
