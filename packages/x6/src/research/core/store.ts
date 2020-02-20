import { Assign } from 'utility-types'
import merge from 'lodash/merge'
import { Basecoat } from '../../entity'
import { KeyValue } from '../../types'
import { JSONObject, JSONExt, ObjectExt, JSONValue } from '../../util'

export class Store<
  D extends JSONObject = JSONObject,
  K extends Extract<keyof D, string> = Extract<keyof D, string>
> extends Basecoat<Store.EventArgs<D>> {
  public data: D
  public previous: D
  public changed: Partial<D>

  private pending: boolean = false
  private changing: boolean = false
  private pendingOptions: Store.MutateOptions | null

  constructor(data: Partial<D> = {}) {
    super()
    this.data = {} as D
    this.mutate(JSONExt.deepCopy(data))
    this.changed = {}
  }

  protected mutate(data: Partial<D>, options: Store.MutateOptions = {}) {
    const unset = options.unset === true
    const silent = options.silent === true
    const changes: K[] = []
    const changing = this.changing

    this.changing = true

    if (!changing) {
      this.previous = JSONExt.deepCopy(this.data)
      this.changed = {}
    }

    const current = this.data
    const previous = this.previous
    const changed = this.changed

    Object.keys(data).forEach(k => {
      const key = k as K
      const newValue = data[key]
      if (!JSONExt.deepEqual(current[key], newValue)) {
        changes.push(key)
      }

      if (!JSONExt.deepEqual(previous[key], newValue)) {
        changed[key] = newValue
      } else {
        delete changed[key]
      }

      if (unset) {
        delete current[key]
      } else {
        current[key] = newValue as any
      }
    })

    if (!silent && changes.length > 0) {
      this.pending = true
      this.pendingOptions = options
      changes.forEach(key => {
        this.trigger('mutated', {
          key,
          options,
          store: this,
          current: current[key],
          previous: previous[key],
        })
      })
    }

    if (changing) {
      return this
    }

    if (!silent) {
      // Changes can be recursively nested within `"change"` events.
      while (this.pending) {
        this.pending = false
        this.trigger('changed', {
          current,
          previous,
          store: this,
          options: this.pendingOptions,
        })
      }
    }

    this.pending = false
    this.changing = false
    this.pendingOptions = null

    return this
  }

  get<T>(key: K) {
    const ret = this.data[key]
    return ret == null ? null : ((ret as any) as T)
  }

  getPrevious<T>(key: K) {
    if (this.previous) {
      const ret = this.previous[key]
      return ret == null ? null : ((ret as any) as T)
    }

    return null
  }

  set(key: K, value: D[K], options?: Store.SetOptions): this
  set(data: D, options?: Store.SetOptions): this
  set(
    key: K | Partial<D>,
    value?: D[K] | Store.SetOptions,
    options?: Store.SetOptions,
  ): this {
    if (key != null) {
      if (typeof key === 'object') {
        this.mutate(key, value as Store.SetOptions)
      } else {
        this.mutate({ [key]: value } as Partial<D>, options)
      }
    }

    return this
  }

  remove(key: K | K[], options?: Store.SetOptions): this
  remove(options?: Store.SetOptions): this
  remove(key?: K | K[] | Store.SetOptions, options?: Store.SetOptions) {
    const empty = void 0
    const subset: Partial<D> = {}
    let opts

    if (typeof key === 'string') {
      subset[key] = empty
      opts = options
    } else if (Array.isArray(key)) {
      key.forEach(k => (subset[k] = empty))
      opts = options
    } else {
      for (const key in this.data) {
        subset[key] = empty
      }
      opts = key
    }

    this.mutate(subset, { ...opts, unset: true })
    return this
  }

  getByPath<T>(path: string | string[]) {
    return ObjectExt.getByPath(this.data, path, '/') as T
  }

  setByPath(
    path: string | string[],
    value: any,
    options: Store.SetByPathOptions = {},
  ) {
    const delim = '/'
    const pathArray = Array.isArray(path) ? path : path.split(delim)
    const pathString = Array.isArray(path) ? path.join(delim) : path

    const property = pathArray[0] as K
    const pathArrayLength = pathArray.length

    options.propertyPath = pathString
    options.propertyValue = value
    options.propertyPathArray = pathArray

    if (pathArrayLength === 1) {
      this.set(property, value, options)
    } else {
      const update: KeyValue = {}
      let diver = update
      let nextKey: string = property

      // Initialize the nested object. Subobjects are either arrays or objects.
      // An empty array is created if the sub-key is an integer. Otherwise, an
      // empty object is created.
      for (let i = 1; i < pathArrayLength; i += 1) {
        const key = pathArray[i]
        const isArrayIndex = Number.isFinite(Number(key))
        diver = diver[nextKey] = isArrayIndex ? [] : {}
        nextKey = key
      }

      // Fills update with the `value` on `path`.
      ObjectExt.setByPath(update, pathArray, value, delim)

      const data = JSONExt.deepCopy(this.data)

      // If rewrite mode enabled, we replace value referenced by path with the
      // new one (we don't merge).
      if (options.rewrite) {
        ObjectExt.unsetByPath(data, path, delim)
      }

      const merged = merge(data, update)
      this.set(property, merged[property], options)
    }

    return this
  }

  removeByPath(path: string | string[], options?: Store.SetOptions) {
    const keys = Array.isArray(path) ? path : path.split('/')
    const key = keys[0] as K
    if (keys.length === 1) {
      this.remove(key, options)
    } else {
      const paths = keys.slice(1)
      const prop = JSONExt.deepCopy(this.get<JSONValue>(key))
      if (prop) {
        ObjectExt.unsetByPath(prop, paths)
      }

      this.set(key, prop as D[K], options)
    }

    return this
  }

  hasChanged(key?: K | null) {
    if (key == null) {
      return Object.keys(this.changed).length > 0
    }

    return key in this.changed
  }

  /**
   * Returns an object containing all the data that have changed,
   * or `null` if there are no changes. Useful for determining what
   * parts of a view need to be updated.
   */
  getChanges(diff?: Partial<D>) {
    if (diff == null) {
      return this.hasChanged() ? JSONExt.deepCopy(this.changed) : null
    }

    const old = this.changing ? this.previous : this.data
    const changed: Partial<D> = {}
    let hasChanged
    for (const key in diff) {
      const val = diff[key]
      if (!JSONExt.deepEqual(old[key], val)) {
        changed[key] = val
        hasChanged = true
      }
    }
    return hasChanged ? JSONExt.deepCopy(changed) : null
  }

  /**
   * Returns a copy of the store's `data` object.
   */
  toJSON() {
    return JSONExt.deepCopy(this.data)
  }

  clone<T extends Store<D>>() {
    const constructor = this.constructor as any
    return new constructor(this.data) as T
  }

  @Basecoat.dispose()
  dispose() {
    this.off()
    this.data = {} as D
    this.previous = {} as D
    this.changed = {}
    this.pending = false
    this.changing = false
    this.pendingOptions = null
    this.trigger('disposed', { store: this })
  }
}

export namespace Store {
  export interface SetOptions extends KeyValue {
    silent?: boolean
  }

  export interface SetByPathOptions extends SetOptions {
    rewrite?: boolean
  }

  export interface MutateOptions extends SetOptions {
    unset?: boolean
  }

  type CommonArgs<D extends JSONObject> = { store: Store<D> }

  export interface EventArgs<
    D extends JSONObject,
    K extends Extract<keyof D, string> = Extract<keyof D, string>
  > {
    mutated: Assign<
      {
        key: K
        current: D[K]
        previous: D[K]
        options: MutateOptions | null
      },
      CommonArgs<D>
    >
    changed: Assign<
      {
        current: D
        previous: D
        options: MutateOptions | null
      },
      CommonArgs<D>
    >
    disposed: CommonArgs<D>
  }
}