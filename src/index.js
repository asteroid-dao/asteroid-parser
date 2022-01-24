import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import rehypeStringify from 'rehype-stringify'
import remarkStringify from 'remark-stringify'
import rehypeRemark from 'rehype-remark'
import rehypeParse from 'rehype-parse'
import { mdastToSlate, slateToMdast } from 'remark-slate-transformer'
import slate, { serialize } from 'remark-slate'
import { visit } from 'unist-util-visit'
import raw from 'rehype-raw'
const entities = require('entities')
import {
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
  replace
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

export const mt2m = unified().use(remarkStringify).stringify

export const mt2s = mt => o(m2s, mt2m)(mt)

export const m2ht = m => o(mt2ht, m2mt)(m)

export const h2mt = h => o(ht2mt, h2ht)(h)

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

export const ht2s = ht => o(mt2s, ht2mt)(ht)

export const m2h = m => o(ht2h, m2ht)(m)

export const m2s = m => {
  let isBlank = false
  return compose(
    map(v => ({
      type: 'paragraph',
      children: [{ text: v === '\\' ? '<br />' : v }]
    })),
    filter(v => {
      if (isBlank) {
        isBlank = false
        if (isEmpty(v)) {
          return false
        }
      } else {
        if (v === '\\') isBlank = true
      }
      return true
    }),
    init,
    split('\n')
  )(m)
}

export const h2m = h => o(mt2m, h2mt)(h)

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
  both(propEq('length', 1), pathEq([0, 'children', 0, 'text'], '')),
  always(''),
  compose(
    join(''),
    map(compose(entities.decodeHTML, replace(/^\<br\>\n/, ''), serialize))
  )
)

export const s2mt = s => o(m2mt, s2m)(s)

export const s2h = s => o(mt2h, s2mt)(s)

export const s2ht = s => o(m2ht, s2m)(s)
