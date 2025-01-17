import { ObjectExt } from '../../util'
import { Attr } from '.'

export const style: Attr.Definition = {
  qualify: ObjectExt.isPlainObject,
  set(styles, { view, elem }) {
    view.$(elem).css(styles as JQuery.PlainObject<string | number>)
  },
}
