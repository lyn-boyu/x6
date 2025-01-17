import { v } from './v'

describe('v', () => {
  describe('hasClass', () => {
    it('should return `false` when element or selector is null', () => {
      expect(v.hasClass(null, null)).toBe(false)
    })

    it('should return `false` for invalid element', () => {
      const text = (document.createTextNode('') as any) as HTMLElement
      v.addClass(text, 'test')
      expect(v.hasClass(text, 'test')).toBe(false)

      const vc = v(document.createComment('') as any)
      vc.addClass('test')
      expect(vc.hasClass('test')).toBe(false)
    })
  })

  describe('#addClass', () => {
    const div = v('div')
    const vel = v('g')

    it('should add class to HTMLDivElement', () => {
      div.addClass('test').addClass(null as any)
      expect(div.hasClass('test')).toBe(true)
      expect(div.node.getAttribute('class')?.indexOf('test') !== -1).toBe(true)
      expect(div.attr('class')).toEqual('test')
    })

    it('should add class to SVGGElement', () => {
      vel.removeClass()
      vel.addClass('test')
      expect(vel.hasClass('test')).toBe(true)
      expect(vel.node.getAttribute('class')?.indexOf('test') !== -1).toBe(true)
      expect(vel.attr('class')).toEqual('test')
    })

    it('should append to class list', () => {
      vel.removeClass()
      vel.attr('class', 'foo')
      vel.addClass('test')
      expect(vel.hasClass('test')).toBe(true)
      expect(vel.node.getAttribute('class')?.indexOf('test') !== -1).toBe(true)
      expect(vel.attr('class')).toEqual('foo test')

      vel.addClass('foo bar baz')
      expect(vel.attr('class')).toEqual('foo test bar baz')
    })

    it('should not add the same class twice in same element', () => {
      div.removeClass()
      div.addClass('foo').addClass('foo')
      expect(div.attr('class')).toEqual('foo')

      vel.removeClass()
      vel.addClass('foo foo')
      expect(vel.attr('class')).toEqual('foo')
    })

    it('should not add empty string', () => {
      vel.removeClass()
      vel.addClass('test')
      vel.addClass(' ')
      expect(vel.attr('class')).toEqual('test')
    })

    it('should call hook', () => {
      vel.removeClass()
      vel.addClass('test')
      vel.addClass(' ')
      v.addClass(vel.node, cls => `${cls} foo`)
      expect(vel.attr('class')).toEqual('test foo')
    })
  })

  describe('#removeClass', () => {
    const vel = v('g')

    it('should remove one', () => {
      vel.removeClass()
      vel.addClass('foo bar')
      vel.removeClass('foo test')
      expect(vel.attr('class')).toEqual('bar')
    })

    it('should remove all', () => {
      vel.removeClass()
      vel.addClass('foo bar')
      vel.removeClass()
      expect(vel.attr('class')).toEqual('')
    })

    it('should call hook', () => {
      vel.removeClass()
      vel.addClass('foo bar')
      v.removeClass(vel.node, cls => cls.split(' ')[1])
      expect(vel.attr('class')).toEqual('foo')
    })

    it('should do nothing for invalid element or selector', () => {
      v.removeClass(null)
      v.removeClass(null, null)
    })
  })

  describe('#toggleClass', () => {
    const vel = v('g')

    it('should do nothing for invalid element or selector', () => {
      v.toggleClass(null, 'foo')
      v.toggleClass(null, null)
    })

    it('should toggle class', () => {
      vel.removeClass()

      vel.toggleClass('foo bar')
      expect(vel.attr('class')).toEqual('foo bar')

      vel.toggleClass('foo')
      expect(vel.attr('class')).toEqual('bar')

      vel.toggleClass('foo')
      expect(vel.attr('class')).toEqual('bar foo')
    })

    it('should not toggle empty strings', () => {
      vel.removeClass()

      vel.toggleClass('foo bar')
      expect(vel.attr('class')).toEqual('foo bar')

      vel.toggleClass(' ')
      expect(vel.attr('class')).toEqual('foo bar')

      vel.toggleClass(' ')
      expect(vel.attr('class')).toEqual('foo bar')
    })

    it('should work with the specified next state', () => {
      vel.removeClass()

      vel.toggleClass('foo bar')
      expect(vel.attr('class')).toEqual('foo bar')

      vel.toggleClass('foo', true)
      expect(vel.attr('class')).toEqual('foo bar')

      vel.toggleClass('foo', true)
      expect(vel.attr('class')).toEqual('foo bar')

      vel.toggleClass('foo', false)
      expect(vel.attr('class')).toEqual('bar')
    })

    it('should call hook', () => {
      vel.removeClass()

      v.toggleClass(vel.node, () => 'foo bar')
      expect(vel.attr('class')).toEqual('foo bar')

      v.toggleClass(vel.node, () => 'foo', false)
      expect(vel.attr('class')).toEqual('bar')
    })
  })
})
