import { offset, getStrokeWidth } from './util'
import { ConnectionPoint } from './index'

export interface BBoxIntersectionOptions
  extends ConnectionPoint.StrokedOptions {}

/**
 * Places the connection point at the intersection between the edge
 * path end segment and the target node bbox.
 */
export const bbox: ConnectionPoint.Definition<BBoxIntersectionOptions> = function(
  line,
  view,
  magnet,
  options,
) {
  const bbox = view.getNodeBBox(magnet)
  if (options.stroked) {
    bbox.inflate(getStrokeWidth(magnet) / 2)
  }
  const intersections = line.intersect(bbox)
  const p = intersections ? line.start.closest(intersections) : line.end
  return offset(p, line.start, options.offset)
}
