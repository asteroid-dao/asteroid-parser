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
  either
} from 'ramda'

export const m2mt = unified().use(remarkParse).parse

export const mt2ht = mt => {
  visit(mt, ['text'], node => (node.value = node.value.replace(/\n$/, '')))
  return unified()
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(raw)
    .runSync(mt)
}

export const h2ht = unified().use(rehypeParse).parse

export const ht2mt = unified().use(rehypeRemark).runSync

export const ht2h = unified().use(rehypeStringify).stringify

export const mt2m = mt => {
  let isBlank = false
  return compose(
    join(`\n`),
    when(o(isEmpty, last), init),
    map(v => (v === '\\' ? '<br />' : v.replace(/\\$/, '  '))),
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

export const m2s = m => {
  let isBlank = false
  return compose(
    map(v => ({
      type: 'paragraph',
      children: [{ text: v === '\\' ? '<br />' : v.replace(/\\$/, '  ') }]
    })),
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
    split('\n')
  )(m)
}

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
