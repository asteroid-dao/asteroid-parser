import React, { useMemo, useState, useEffect, createRef } from 'react'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'
import { createEditor } from 'slate'
import { useFocused, Slate, Editable, withReact } from 'slate-react'
import { ChakraProvider, Flex, Box } from '@chakra-ui/react'
import { isNil } from 'ramda'
import { setImageHook, s2m, s2h, q2s, s2q } from 'asteroid-parser'
import ImageUploader from 'quill-image-uploader2'
import { sha256 } from 'js-sha256'
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
SmartBreak.blotName = 'inline-break'
SmartBreak.tagName = 'BR'

const Strike = ReactQuill.Quill.import('formats/strike')
Strike.tagName = 'DEL'
ReactQuill.Quill.register(Strike, true)

function lineBreakMatcher() {
  let newDelta = new Delta()
  newDelta.insert({ ['inline-break']: '' })
  return newDelta
}
ReactQuill.Quill.register(SmartBreak)
ImageUploader(ReactQuill.Quill)
const App = () => {
  const [editor] = useState(() => withReact(createEditor()))
  const [qvalue, setQValue] = useState('')
  const [upV, setUpV] = useState(null)
  const [isMarkdown, setIsMarkdown] = useState(true)
  let quillRef = React.createRef()
  const [value, setValue] = useState([
    {
      type: 'paragraph',
      children: [{ text: '' }]
    }
  ])
  useEffect(() => {
    setImageHook({
      fromBase64: url => {
        if (/^data\:image\/.+/.test(url)) {
          const img = window.image_map[sha256(url)]
          if (!isNil(img)) return `data:image/${img.ext};local,${img.id}`
        }
        return url
      },
      toBase64: url => {
        if (/^data\:image\/.+;local,/.test(url)) {
          const img = window.image_map[url.split(',')[1]]
          if (!isNil(img)) return img.url
        }
        return url
      }
    })
  }, [])
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
      ['bold', 'italic', 'underline', 'strike', 'blockquote', 'link', 'image'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['clean']
    ],
    imageUploader: {},
    clipboard: {
      matchers: [['BR', lineBreakMatcher]]
    },
    keyboard: {
      bindings: {
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
            this.quill.setSelection(
              range.index + 1,
              ReactQuill.Quill.sources.SILENT
            )
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
            var ee = this.quill.insertEmbed(
              range.index,
              'inline-break',
              true,
              'user'
            )
            if (nextChar.length == 0) {
              var ee = this.quill.insertEmbed(
                range.index,
                'inline-break',
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
  return (
    <ChakraProvider>
      <Flex height='100vh'>
        <style global jsx>{`
          p,
          .ql-editor p {
            margin-bottom: 15px;
          }
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
                if (!isNil(el) && isNil(quillRef)) quillRef = el.getEditor()
              }}
              theme='snow'
              value={qvalue}
              onChange={(val, d, s, e) => {
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
