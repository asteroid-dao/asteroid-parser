# Asteroid Parser

Parse between Slate object, Markdown, and HTML.

## Install

```bash
yarn add asteroid-parser
```

## Usage

- m: markdown
- h: HTML
- s: slate
- q: Quill (HTML)
- t: tree
- mt: remark tree
- ht: rehype tree

### API

### Core Functions

`m2h` : Markdown to HTML

`h2m` : HTML to Markdown

`s2m` : Slate to Markdown

`m2s` : Markdown to Slate

`h2s` : HTML to Slate

`s2h` : Slate to HTML

`m2q` : Markdown to Quill

`q2m` : Quill to Markdown

`h2q` : HTML to Quill

`q2h` : Quill to HTML

`s2q` : Slate to Quill

`q2q` : Quill to Slate


### Bridge Functions

`m2mt` `mt2m` `h2ht` `ht2h` `mt2h` `mt2ht` `ht2mt` `ht2m` `m2ht` `s2mt` `s2ht` `mt2s` `ht2s` `mt2q` `q2mt` `ht2q` `q2ht`
