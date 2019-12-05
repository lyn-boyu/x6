import * as util from '../util'
import { Style } from '../types'
import { TooltipOptions } from '../handler/tooltip/option'
import { ContextMenuOptions } from '../handler/contextmenu/option'
import { KeyboardOptions } from '../handler/keyboard/option'
import { RubberbandOptions } from '../handler/rubberband/option'
import { GuideOptions } from '../handler/guide/option'
import { GridOptions } from '../graph/property/grid'
import { PageBreakOptions } from '../graph/property/pagebreak'
import { FoldingOptions } from '../graph/property/folding'
import {
  ResizeOption,
  ResizeHandleOptions,
  ResizePreviewOptions,
} from '../handler/node/option-resize'
import {
  RotateOptions,
  RotateHandleOptions,
  RotatePreviewOptions,
} from '../handler/node/option-rotation'
import { SelectionPreviewOptions } from '../handler/node/option-selection'
import { LabelHandleOptions } from '../handler/node/option-label'
import { EdgeHandleOptions } from '../handler/edge/option'
import { AnchorOptions, AnchorHighlightOptions } from '../handler/anchor/option'
import {
  ConnectionOptions,
  ConnectionIconOptions,
  ConnectionPreviewOptions,
  ConnectionHighlightOptions,
} from '../handler/connection/option'
import {
  MovingPreviewOptions,
  DropTargetHighlightOptions,
} from '../handler/moving/option'
import { preset } from './preset'
import { IHooks } from '../graph/hook'
import { GlobalConfig } from './global'
import { GraphProperties } from '../graph/property/base'

export interface FullOptions
  extends GlobalConfig,
    GraphProperties,
    Partial<IHooks> {
  nodeStyle: Style
  edgeStyle: Style
  grid: GridOptions
  guide: GuideOptions
  tooltip: TooltipOptions
  folding: FoldingOptions
  keyboard: KeyboardOptions
  rubberband: RubberbandOptions
  pageBreak: PageBreakOptions
  contextMenu: ContextMenuOptions
  dropTargetHighlight: DropTargetHighlightOptions
  movingPreview: MovingPreviewOptions
  selectionPreview: SelectionPreviewOptions
  resize: ResizeOption
  resizeHandle: ResizeHandleOptions
  resizePreview: ResizePreviewOptions
  rotate: RotateOptions
  rotateHandle: RotateHandleOptions
  rotatePreview: RotatePreviewOptions
  labelHandle: LabelHandleOptions
  anchor: AnchorOptions
  anchorHighlight: AnchorHighlightOptions
  connection: ConnectionOptions
  connectionIcon: ConnectionIconOptions
  connectionPreview: ConnectionPreviewOptions
  connectionHighlight: ConnectionHighlightOptions
  edgeHandle: EdgeHandleOptions
}

export interface GraphOptions
  extends Partial<GlobalConfig>,
    Partial<GraphProperties>,
    Partial<IHooks> {
  nodeStyle?: Style
  edgeStyle?: Style
  grid?: Partial<GridOptions> | boolean
  guide?: Partial<GuideOptions> | boolean
  tooltip?: Partial<TooltipOptions> | boolean
  folding?: Partial<FoldingOptions> | boolean
  keyboard?: Partial<KeyboardOptions> | boolean
  rubberband?: Partial<RubberbandOptions> | boolean
  pageBreak?: Partial<PageBreakOptions> | boolean
  contextMenu?: Partial<ContextMenuOptions> | boolean
  dropTargetHighlight?: Partial<DropTargetHighlightOptions>
  movingPreview?: Partial<MovingPreviewOptions>
  selectionPreview?: Partial<SelectionPreviewOptions>
  resize?: Partial<ResizeOption> | boolean
  resizeHandle?: Partial<ResizeHandleOptions>
  resizePreview?: Partial<ResizePreviewOptions>
  rotate?: Partial<RotateOptions> | boolean
  rotateHandle?: Partial<RotateHandleOptions>
  rotatePreview?: Partial<RotatePreviewOptions>
  labelHandle?: Partial<LabelHandleOptions>
  anchor?: Partial<AnchorOptions>
  anchorHighlight?: Partial<AnchorHighlightOptions>
  connection?: Partial<ConnectionOptions> | boolean
  connectionIcon?: Partial<ConnectionIconOptions>
  connectionPreview?: Partial<ConnectionPreviewOptions>
  connectionHighlight?: Partial<ConnectionHighlightOptions>
  edgeHandle?: Partial<EdgeHandleOptions>
}

export function getOptions(options: GraphOptions) {
  const defaults = util.merge({}, preset)
  const result = util.mergec(defaults, options, {
    decorator: (target, source, key) => {
      const t = target[key]
      const s = source[key]
      if (typeof s === 'boolean' && typeof t === 'object') {
        return {
          ...t,
          enabled: s,
        }
      }

      return s
    },
    ignoreNull: false,
    ignoreUndefined: true,
  }) as FullOptions

  result.dialect = result.dialect === 'html' ? 'html' : 'svg'

  return result
}