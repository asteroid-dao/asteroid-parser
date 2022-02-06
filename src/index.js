import { unified } from 'unified'
import remarkGfm from 'remark-gfm'
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
import { toHtml } from 'hast-util-to-html'
import { toMarkdown } from 'mdast-util-to-markdown'
import { all } from 'mdast-util-to-hast'
import { all as all2 } from 'hast-util-to-mdast'
import { safe } from 'mdast-util-to-markdown/lib/util/safe'
import { containerFlow } from 'mdast-util-to-markdown/lib/util/container-flow'
import { wrap } from './wrap'
import { convertElement } from 'hast-util-is-element'

const p = convertElement('p')
const input = convertElement('input')

import {
  hasPath,
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
  has,
  addIndex,
  concat,
  prop,
  sortBy
} from 'ramda'

let imageHook = null
export const setImageHook = hook => {
  imageHook = hook
}
export const m2mt = m => {
  let mt = unified()
    .use(remarkParse, {
      handlers: {
        text: (node, _, context, safeOptions) => {
          return /^\+.+\+$/.test(node.value)
            ? node.value
            : safe(context, node.value, safeOptions)
        }
      }
    })
    .use(remarkGfm)
    .parse(m)
  visit(mt, ['text'], (node, i, p) => {
    if (/\+.+\+/.test(node.value)) {
      const texts = addIndex(map)(
        (v, i) => ({ index: i * 2, val: { value: v, type: 'text' } }),
        node.value.split(/\+.+?\+/)
      )
      const us = addIndex(map)(
        (v, i) => ({
          index: i * 2 + 1,
          val: {
            type: 'u',
            children: [{ type: 'text', value: v.replace(/^\+(.+)\+$/, '$1') }]
          }
        }),
        node.value.match(/\+.+?\+/g)
      )
      p.children.splice(
        i,
        1,
        ...compose(
          map(prop('val')),
          reject(pathEq(['val', 'value'], '')),
          sortBy(prop('index'))
        )(concat(us, texts))
      )
    }
  })
  return mt
}

export const mt2ht = mt => {
  if (has('toBase64')(imageHook || [])) {
    visit(mt, ['image'], node => {
      node.url = imageHook.toBase64(node.url)
    })
  }
  visit(mt, ['text'], node => (node.value = node.value.replace(/\n$/, '')))
  visit(mt, ['html'], (node, index, parent) => {
    if (parent.type === 'root') node.value = '<p><br /></p>'
    return node
  })
  let ht = unified()
    .use(remarkRehype, {
      allowDangerousHtml: true,
      handlers: {
        u: (h, node) => h(node, 'u', all(h, node))
      }
    })
    .use(raw)
    .runSync(mt)
  return ht
}

export const h2ht = h => {
  return unified().use(rehypeParse).parse(h)
}

export const ht2mt = ht => {
  const mt = unified()
    .use(rehypeRemark, {
      handlers: {
        strong(h, node) {
          return !hasPath(['properties', 'style'])(node)
            ? h(node, 'strong', all2(h, node))
            : h(node, 'html', toHtml(node))
        },
        del(h, node) {
          return !hasPath(['properties', 'style'])(node)
            ? h(node, 'delete', all2(h, node))
            : h(node, 'html', toHtml(node))
        },
        span(h, node) {
          return !hasPath(['properties', 'style'])(node)
            ? h(node, 'paragraph', all2(h, node))
            : h(node, 'html', toHtml(node))
        },
        u(h, node) {
          node.children[0].value = `+${node.children[0].value}+`
          return !hasPath(['properties', 'style'])(node)
            ? h(node, 'paragraph', all2(h, node))
            : h(node, 'html', toHtml(node))
        },
        em(h, node) {
          return !hasPath(['properties', 'style'])(node)
            ? h(node, 'emphasis', all2(h, node))
            : h(node, 'html', toHtml(node))
        },
        li(h, node) {
          const head = node.children[0]
          /** @type {boolean|null} */
          let checked = null
          /** @type {ElementChild} */
          let checkbox
          /** @type {Element|undefined} */
          let clone

          // Check if this node starts with a checkbox.
          if (p(head)) {
            checkbox = head.children[0]

            if (
              input(checkbox) &&
              checkbox.properties &&
              (checkbox.properties.type === 'checkbox' ||
                checkbox.properties.type === 'radio')
            ) {
              checked = Boolean(checkbox.properties.checked)
              clone = {
                ...node,
                children: [
                  { ...head, children: head.children.slice(1) },
                  ...node.children.slice(1)
                ]
              }
            }
          }

          const content = wrap(all2(h, clone || node))

          return h(
            node,
            'listItem',
            { spread: content.length > 1, checked },
            content
          )
        },
        blockquote(h, node) {
          return h(node, 'blockquote', wrap(all2(h, node)))
        }
      }
    })
    .runSync(ht)
  if (has('fromBase64')(imageHook || {})) {
    visit(mt, ['image'], node => {
      node.url = imageHook.fromBase64(node.url)
    })
  }
  return mt
}

export const ht2h = ht => {
  let h = unified().use(rehypeStringify).stringify(ht)
  return h
}

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
    split('\n')
  )(
    unified()
      .use(remarkStringify, {
        handlers: {
          delete: (node, _, context, safeOptions) =>
            `~${containerFlow(node, context, safeOptions)}~`,
          text: (node, _, context, safeOptions) => {
            return /^\+.+\+$/.test(node.value)
              ? node.value
              : safe(context, node.value, safeOptions)
          }
        }
      })
      .stringify(mt)
  )
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
