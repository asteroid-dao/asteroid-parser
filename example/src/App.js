import React, { useMemo, useState, useEffect } from 'react'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'
import { createEditor } from 'slate'
import { useFocused, Slate, Editable, withReact } from 'slate-react'
import { ChakraProvider, Flex, Box } from '@chakra-ui/react'
import { isNil } from 'ramda'
import {
  s2ht,
  s2mt,
  s2m,
  h2m,
  m2h,
  m2mt,
  mt2ht,
  h2s,
  h2ht,
  ht2mt,
  ht2h,
  mt2m,
  s2h
} from 'asteroid-editor'
import 'asteroid-editor/dist/index.css'
const entities = require('entities')

const App = () => {
  const [editor] = useState(() => withReact(createEditor()))
  const [qvalue, setQValue] = useState('')
  const [upV, setUpV] = useState(null)
  const [isMarkdown, setIsMarkdown] = useState(true)
  const [value, setValue] = useState([
    {
      type: 'paragraph',
      children: [{ text: '' }]
    }
  ])

  useEffect(() => {
    if (isMarkdown) setQValue(s2h(value))
    setUpV(false)
  }, [value])

  useEffect(() => {
    if (!isMarkdown) {
      setUpV(true)
      setValue(h2s(qvalue === '<p><br></p>' ? '' : qvalue))
    }
  }, [qvalue])
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
              theme='snow'
              value={qvalue}
              onFocus={() => setIsMarkdown(false)}
              onBlur={() => setIsMarkdown(true)}
              onChange={setQValue}
              modules={{
                toolbar: [
                  [{ header: [1, 2, 3, false] }],
                  ['bold', 'italic', 'blockquote', 'link'],
                  [{ list: 'ordered' }, { list: 'bullet' }],
                  ['clean']
                ]
              }}
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
