import { Highlighter } from '../style'
import { Registry } from './registry'

export const HighlighterRegistry = Registry.create<
  Highlighter.CommonDefinition,
  Highlighter.Presets
>({
  type: 'highlighter',
})

HighlighterRegistry.register(Highlighter.presets, true)
