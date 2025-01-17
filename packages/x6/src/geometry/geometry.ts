import { JSONObject, JSONArray } from '../util'
import { Point } from './point'

export abstract class Geometry {
  abstract scale(
    sx: number,
    sy: number,
    origin?: Point | Point.PointLike | Point.PointData,
  ): this

  abstract translate(p: Point | Point.PointLike | Point.PointData): this
  abstract translate(tx: number, ty: number): this

  abstract equals(g: any): boolean
  abstract clone(): Geometry
  abstract toJSON(): JSONObject | JSONArray
  abstract serialize(): string

  valueOf() {
    return this.toJSON()
  }

  toString() {
    return JSON.stringify(this.toJSON())
  }
}
