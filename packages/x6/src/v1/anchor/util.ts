import { Point } from '../../geometry'
import { NumberExt } from '../../util'
import { EdgeView } from '../core/edge-view'

export interface ResolveOptions {
  fixedAt?: number | string
}

export function resolve<S extends Function, T>(fn: S): T {
  return (function(
    this: EdgeView,
    view: EdgeView,
    magnet: SVGElement,
    ref: any,
    options: ResolveOptions,
  ) {
    if (ref instanceof Element) {
      const refView = this.graph.findView(ref)
      let refPoint
      if (refView) {
        if (refView.isEdgeElement(ref)) {
          const distance = options.fixedAt != null ? options.fixedAt : '50%'
          refPoint = getPointAtLink(refView as EdgeView, distance)
        } else {
          refPoint = refView.getNodeBBox(ref).getCenter()
        }
      } else {
        refPoint = new Point()
      }
      return fn.call(this, view, magnet, refPoint, options)
    }
    return fn.apply(this, arguments)
  } as any) as T
}

export function getPointAtLink(edgeView: EdgeView, value: string | number) {
  const isPercentage = NumberExt.isPercentage(value)
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isPercentage) {
    return edgeView.getPointAtRatio(num / 100)
  }
  return edgeView.getPointAtLength(num)
}
