import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import rehypeStringify from 'rehype-stringify'
import remarkStringify from 'remark-stringify'
import rehypeRemark from 'rehype-remark'
import rehypeParse from 'rehype-parse'
import slate, { serialize } from 'remark-slate'
import { visit } from 'unist-util-visit'
import raw from 'rehype-raw'
const entities = require('entities')
import {
  last,
  when,
  equals,
  ifElse,
  always,
  join,
  both,
  propEq,
  map,
  init,
  reject,
  isEmpty,
  compose,
  o,
  split,
  filter,
  pathEq,
  replace,
  either,
  isNil,
  has
} from 'ramda'

let imageHook = null
export const setImageHook = hook => {
  imageHook = hook
}
export const m2mt = unified().use(remarkParse).parse

export const mt2ht = mt => {
  if (has('toBase64')(imageHook || [])) {
    visit(mt, ['image'], node => {
      node.url = imageHook.toBase64(node.url)
    })
  }
  visit(mt, ['text'], node => (node.value = node.value.replace(/\n$/, '')))
  return unified()
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(raw)
    .runSync(mt)
}

export const h2ht = unified().use(rehypeParse).parse

export const ht2mt = ht => {
  const mt = unified().use(rehypeRemark).runSync(ht)
  if (has('fromBase64')(imageHook || {})) {
    visit(mt, ['image'], node => {
      node.url = imageHook.fromBase64(node.url)
    })
  }

  return mt
}

export const ht2h = unified().use(rehypeStringify).stringify

export const mt2m = mt => {
  let isBlank = false
  return compose(
    join(`\n`),
    map(v => (v === '\\' ? '<br />' : v.replace(/\\$/, '  '))),
    filter(v => {
      if (isBlank) {
        isBlank = false
        if (isEmpty(v)) {
          return false
        }
      } else {
        if (v === '\\' || isEmpty(v)) isBlank = true
      }
      return true
    }),
    when(o(isEmpty, last), init),
    split('\n'),
    unified().use(remarkStringify).stringify
  )(mt)
}

export const mt2s = mt => o(m2s, mt2m)(mt)

export const m2ht = o(mt2ht, m2mt)

export const h2mt = o(ht2mt, h2ht)

export const mt2h = mt => {
  const ht = mt2ht(mt)
  visit(ht, ['element'], (node, i, p) => {
    if (p.type === 'root' && node.tagName === 'br') {
      node.tagName = 'p'
      node.children.push({ type: 'element', tagName: 'br', children: [] })
    }
  })
  return ht2h(ht)
}

export const ht2s = o(mt2s, ht2mt)

export const m2h = o(ht2h, m2ht)

export const m2s = o(
  map(v => ({
    type: 'paragraph',
    children: [{ text: v }]
  })),
  split('\n')
)

export const h2m = o(mt2m, h2mt)

export const h2s = ifElse(
  isEmpty,
  always([
    {
      type: 'paragraph',
      children: [{ text: '' }]
    }
  ]),
  o(ht2s, h2ht)
)

export const s2m = ifElse(
  both(
    propEq('length', 1),
    either(pathEq([0, 'children', 0, 'text'], ''), pathEq([0, 'text'], ''))
  ),
  always(''),
  compose(
    join(''),
    map(compose(entities.decodeHTML, replace(/^\<br\>\n/, ''), serialize))
  )
)

export const s2mt = o(m2mt, s2m)

export const s2h = o(mt2h, s2mt)

export const s2ht = o(m2ht, s2m)

export const h2q = replace(/\<br\>\n/g, '<br>')

export const s2q = o(h2q, s2h)

export const q2h = when(equals('<p><br></p>'), always(''))

export const q2s = o(h2s, q2h)

export const mt2q = o(h2q, mt2ht)

export const q2mt = o(h2mt, q2h)

export const m2q = o(h2q, m2h)

export const q2m = o(h2m, q2h)

export const ht2q = o(h2q, ht2h)

export const q2ht = o(h2ht, q2h)
/*
export class Parser {
  constructor({ imageHook }) {
    this.imageHook = imageHook
  }
  m2mt(m) {
    return m2mt(m)
  }
  mt2ht(mt) {
    if (!isNil(this.imageHook)) {
      visit(mt, ['image'], node => {
        node.url = this.imageHook.toBase64(node.url)
      })
    }
    return mt2ht(mt)
  }
  ht2mt(ht) {
  const mt = unified().use(rehypeRemark).runSync(ht)
    if (!isNil(this.imageHook)) {
      visit(mt, ['image'], node => {
        node.url = this.imageHook.fromBase64(node.url)
      })
    }
    return mt
  }
  h2ht(h) {
    console.log(h2ht(h))
    return h2ht(h)
  }

  ht2h(ht) {
    return ht2h(ht)
  }

  mt2m(mt) {
    return mt2m(mt)
  }
  mt2h(mt) {
    const ht = this.mt2ht(mt)
    visit(ht, ['element'], (node, i, p) => {
      if (p.type === 'root' && node.tagName === 'br') {
        node.tagName = 'p'
        node.children.push({ type: 'element', tagName: 'br', children: [] })
      }
    })
    return this.ht2h(ht)
  }

  ht2s(ht) {
    return o(this.mt2s, this.ht2mt)(ht)
  }

  m2h(m) {
    return o(this.ht2h, this.m2ht)(m)
  }

  m2s(m) {
    return m2s(m)
  }

  h2m(h) {
    return o(this.mt2m, this.h2mt)(h)
  }

  h2s(h) {
    return ifElse(
      isEmpty,
      always([
        {
          type: 'paragraph',
          children: [{ text: '' }]
        }
      ]),
      o(this.ht2s, this.h2ht)
    )(h)
  }

  s2m(s) {
    return s2m(s)
  }

  s2mt(s) {
    return o(this.m2mt, this.s2m)(s)
  }

  s2h(s) {
    return o(this.mt2h, this.s2mt)(s)
  }

  s2ht(s) {
    return o(this.m2ht, this.s2m)(s)
  }

  h2q(h) {
    return h2q(h)
  }

  s2q(s) {
    return o(this.h2q, this.s2h)(s)
  }

  q2h(q) {
    return q2h(q)
  }

  q2s(q) {
    return o(this.h2s, this.q2h)(q)
  }

  mt2q(mt) {
    return o(this.h2q, this.mt2ht)(mt)
  }

  q2mt(q) {
    return o(this.h2mt, this.q2h)(q)
  }

  m2q(m) {
    return o(this.h2q, this.m2h)(m)
  }

  q2m(q) {
    return o(this.h2m, this.q2h)(q)
  }

  ht2q(ht) {
    return o(this.h2q, this.ht2h)(ht)
  }

  q2ht(q) {
    return o(this.h2ht, this.q2h)(q)
  }
}
*/
