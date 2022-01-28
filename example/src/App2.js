import React, { useMemo, useState, useEffect, createRef } from 'react'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'
import { createEditor } from 'slate'
import { useFocused, Slate, Editable, withReact } from 'slate-react'
import { ChakraProvider, Flex, Box } from '@chakra-ui/react'
import { isNil } from 'ramda'
import { s2m, s2h, q2s, s2q } from 'asteroid-editor'
import 'asteroid-editor/dist/index.css'
import AttributeMap from 'quill-delta/dist/AttributeMap'
import { Scope, EmbedBlot } from 'parchment'
const entities = require('entities')
let Parchment = ReactQuill.Quill.import('parchment')
let Delta = ReactQuill.Quill.import('delta')
let Break = ReactQuill.Quill.import('blots/break')
let Embed = ReactQuill.Quill.import('blots/embed')
let Block = ReactQuill.Quill.import('blots/block')

class SmartBreak extends Break {
  length() {
    return 1
  }

  value() {
    return '\n'
  }

  insertInto(parent, ref) {
    Embed.prototype.insertInto.call(this, parent, ref)
  }
}
SmartBreak.blotName = 'break'
SmartBreak.tagName = 'BR'

function lineBreakMatcher() {
  let newDelta = new Delta()
  newDelta.insert({ break: '' })
  return newDelta
}
ReactQuill.Quill.register(SmartBreak)
const App = () => {
  const [editor] = useState(() => withReact(createEditor()))
  const [qvalue, setQValue] = useState('')
  const [upV, setUpV] = useState(null)
  const [initQuillRef, setInitQuillRef] = useState(false)
  const [isMarkdown, setIsMarkdown] = useState(true)
  const quillRef = React.createRef()
  useEffect(() => {
    if (!isNil(quillRef.current) && !initQuillRef) {
      setInitQuillRef(true)
      quillRef.current.on('selection-change', r => {
        console.log(r.index)
      })
    }
  }, [quillRef])
  const [value, setValue] = useState([
    {
      type: 'paragraph',
      children: [{ text: '' }]
    }
  ])
  useEffect(() => {
    if (isMarkdown) {
      setQValue(s2q(value))
    }
    setUpV(false)
  }, [value])

  useEffect(() => {
    if (!isMarkdown) {
      setUpV(true)
      setValue(q2s(qvalue))
    }
  }, [qvalue])
  const options = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ['bold', 'italic', 'blockquote', 'link'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['clean']
    ],
    clipboard: {
      matchers: [['BR', lineBreakMatcher]]
    },
    keyboard: {
      bindings: {
        handleLeft: {
          key: 37,
          handler: function (range) {
            console.log('are we here?????')
            let { index } = range
            const [leaf] = this.quill.getLeaf(index)
            if (!(leaf instanceof EmbedBlot)) return true
            console.log('are we here2?????')
            console.log(this.quill.getText())
            this.quill.setSelection(
              range.index - 1,
              ReactQuill.Quill.sources.USER
            )
            return false
          }
        },
        handleBackspace: {
          key: 'Delete',
          handler: function (range, context) {
            // Check for astral symbols
            const length = /^[\uD800-\uDBFF][\uDC00-\uDFFF]/.test(
              context.suffix
            )
              ? 2
              : 1
            const textLen = this.quill.getLength()
            if (
              range.index >= textLen - length ||
              (range.index == textLen - 2 &&
                this.quill.getText(textLen - 2, textLen) === '\n\n')
            )
              return
            let formats = {}
            const [line] = this.quill.getLine(range.index)
            let delta = new Delta().retain(range.index).delete(length)
            if (context.offset >= line.length() - 1) {
              const [next] = this.quill.getLine(range.index + 1)
              if (next) {
                const curFormats = line.formats()
                const nextFormats = this.quill.getFormat(range.index, 1)
                formats = AttributeMap.diff(curFormats, nextFormats) || {}
                if (Object.keys(formats).length > 0) {
                  delta = delta.retain(next.length() - 1).retain(1, formats)
                }
              }
            } else {
            }
            this.quill.updateContents(delta, ReactQuill.Quill.sources.USER)
            this.quill.focus()
          }
        },

        handleEnter: {
          key: 13,
          handler: function (range, context) {
            if (range.length > 0) {
              this.quill.scroll.deleteAt(range.index, range.length)
            }
            let lineFormats = Object.keys(context.format).reduce(function (
              lineFormats,
              format
            ) {
              if (
                Parchment.query(format, Parchment.Scope.BLOCK) &&
                !Array.isArray(context.format[format])
              ) {
                lineFormats[format] = context.format[format]
              }
              return lineFormats
            },
            {})
            var previousChar = this.quill.getText(range.index - 1, 1)
            this.quill.insertText(
              range.index,
              '\n',
              lineFormats,
              ReactQuill.Quill.sources.USER
            )
            if (previousChar == '' || previousChar == '\n') {
              this.quill.setSelection(
                range.index + 2,
                ReactQuill.Quill.sources.SILENT
              )
            } else {
              this.quill.setSelection(
                range.index + 1,
                ReactQuill.Quill.sources.SILENT
              )
            }
            try {
              this.quill.selection.scrollIntoView()
            } catch (e) {}
            Object.keys(context.format).forEach(name => {
              if (lineFormats[name] != null) return
              if (Array.isArray(context.format[name])) return
              if (name === 'link') return
              this.quill.format(
                name,
                context.format[name],
                ReactQuill.Quill.sources.USER
              )
            })
          }
        },
        linebreak: {
          key: 13,
          shiftKey: true,
          handler: function (range, context) {
            var nextChar = this.quill.getText(range.index + 1, 1)
            var ee = this.quill.insertEmbed(range.index, 'break', true, 'user')
            if (nextChar.length == 0) {
              console.log('add another')
              var ee = this.quill.insertEmbed(
                range.index,
                'break',
                true,
                'user'
              )
            }
            this.quill.setSelection(
              range.index + 1,
              ReactQuill.Quill.sources.SILENT
            )
          }
        }
      }
    }
  }
  const modules = useMemo(() => options, [])
  function makeEmbedArrowHandler(key, shiftKey) {
    const where = key === 'ArrowLeft' ? 'prefix' : 'suffix'
    return {
      key,
      shiftKey,
      altKey: null,
      [where]: /^$/,
      handler(range) {
        let { index } = range
        if (key === 'ArrowRight') {
          index += range.length + 1
        }
        const [leaf] = this.quill.getLeaf(index)
        if (!(leaf instanceof EmbedBlot)) return true
        if (key === 'ArrowLeft') {
          if (shiftKey) {
            this.quill.setSelection(
              range.index - 1,
              range.length + 1,
              ReactQuill.Quill.sources.USER
            )
          } else {
            this.quill.setSelection(
              range.index - 1,
              ReactQuill.Quill.sources.USER
            )
          }
        } else if (shiftKey) {
          this.quill.setSelection(
            range.index,
            range.length + 1,
            ReactQuill.Quill.sources.USER
          )
        } else {
          this.quill.setSelection(
            range.index + range.length + 1,
            ReactQuill.Quill.sources.USER
          )
        }
        return false
      }
    }
  }
  return (
    <ChakraProvider>
      <Flex height='100vh'>
        <style global jsx>{`
          .quill {
            display: flex;
            flex-direction: column;
            width: 100%;
            height: 100%;
          }
          .ql-container {
            flex: 1;
            overflow-y: auto;
            font-size: 17px;
          }
          .ql-editor {
            border-left: 1px solid #ccc;
          }
          .ql-container.ql-snow {
            border: 0px;
          }
          .ql-tooltip {
            margin-left: 120px;
          }
        `}</style>
        <Flex bg='#eee' flex={1} direction='column' height='100%'>
          <Flex
            direction='column'
            flex={1}
            bg='white'
            sx={{ overflow: 'auto' }}
            height='50vh'
          >
            <Flex
              color='#222'
              justify='center'
              align='center'
              height='43px'
              borderBottom='1px solid #ccc'
            >
              Slate Editor
            </Flex>
            <Box flex={1} p={3} sx={{ wordBreak: 'break-all' }}>
              {upV ? null : (
                <Slate
                  editor={editor}
                  value={value}
                  onChange={newValue => {
                    setIsMarkdown(true)
                    setValue(newValue)
                  }}
                >
                  <Editable style={{ height: '100%' }} />
                </Slate>
              )}
            </Box>
          </Flex>
          <Flex flex={1} height='50vh'>
            <Flex direction='column' flex={1} bg='#eee'>
              <Flex
                color='#222'
                justify='center'
                align='center'
                height='43px'
                borderBottom='1px solid #aaa'
                borderTop='1px solid #aaa'
              >
                Markdown
              </Flex>
              <Flex
                p={3}
                sx={{ overflow: 'auto', wordBreak: 'break-all' }}
                flex={1}
                height='100%'
                dangerouslySetInnerHTML={{
                  __html: entities
                    .encodeHTML(s2m(value))
                    .replace(/\&NewLine\;/g, '<br />')
                }}
              ></Flex>
            </Flex>
            <Flex direction='column' flex={1} bg='#ddd'>
              <Flex
                color='#222'
                justify='center'
                align='center'
                height='43px'
                borderBottom='1px solid #aaa'
                borderTop='1px solid #aaa'
              >
                HTML
              </Flex>
              <Flex
                p={3}
                sx={{ overflow: 'auto', wordBreak: 'break-all' }}
                bg='#ddd'
                flex={1}
                height='100%'
                dangerouslySetInnerHTML={{
                  __html: entities
                    .encodeHTML(s2h(value))
                    .replace(/\&NewLine\;/g, '<br />')
                }}
              />
            </Flex>
          </Flex>
        </Flex>
        <Flex bg='#ddd' flex={1} direction='column'>
          <Box flex={1} bg='white' sx={{ overflow: 'auto' }}>
            <ReactQuill
              ref={el => {
                if (!isNil(el) && isNil(quillRef.current)) {
                  quillRef.current = el.getEditor()
                }
              }}
              theme='snow'
              value={qvalue}
              onChange={(val, d, s, e) => {
                const length = e.getLength()
                const all = e.getText()
                const text = e.getText(length - 2, 2)
                console.log(
                  'chan[' + length + ']',
                  e.getText().replace(/\n/g, '[b]'),
                  e.getSelection().index
                )
                /*
                if (text === '\n\n') {
                  console.log('deleting...[\\n]')
                  quillRef.current.deleteText(length - 1, 1)
                  console.log(
                    'change[' + length + ']',
                    e.getText().replace(/\n/g, '[b]'),
                    e.getSelection().index
                  )
                }*/
                setQValue(val)
              }}
              modules={modules}
              onFocus={() => setIsMarkdown(false)}
              onBlur={() => setIsMarkdown(true)}
            />
          </Box>
          <Flex bg='#ccc' direction='column' flex={1} sx={{ overflow: 'auto' }}>
            <Flex
              color='#222'
              justify='center'
              align='center'
              height='43px'
              borderBottom='1px solid #aaa'
              borderTop='1px solid #aaa'
            >
              Preview
            </Flex>
            <Box
              p={3}
              flex={1}
              height='100%'
              dangerouslySetInnerHTML={{
                __html: s2h(value)
              }}
            />
          </Flex>
        </Flex>
      </Flex>
    </ChakraProvider>
  )
}

export default App
