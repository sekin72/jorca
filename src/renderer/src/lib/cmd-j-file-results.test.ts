import { describe, expect, it } from 'vitest'
import { toCmdJFileResult, buildCmdJFileResults, indexCmdJFiles } from './cmd-j-file-results'

describe('toCmdJFileResult', () => {
  it('splits filename and directory from a nested path', () => {
    expect(toCmdJFileResult('docs/reference/git-compatibility.md')).toEqual({
      id: 'file:docs/reference/git-compatibility.md',
      path: 'docs/reference/git-compatibility.md',
      filename: 'git-compatibility.md',
      directory: 'docs/reference'
    })
  })

  it('handles a root-level file (no directory)', () => {
    expect(toCmdJFileResult('README.md')).toEqual({
      id: 'file:README.md',
      path: 'README.md',
      filename: 'README.md',
      directory: ''
    })
  })

  it('normalizes backslash paths for display', () => {
    const r = toCmdJFileResult('src\\main\\index.ts')
    expect(r.filename).toBe('index.ts')
    expect(r.directory).toBe('src/main')
  })
})

describe('buildCmdJFileResults', () => {
  const files = ['docs/canvas-visual-polish.md', 'src/main/index.ts', 'README.md']

  it('returns nothing for an empty query (files only surface on search)', () => {
    expect(buildCmdJFileResults(indexCmdJFiles(files), '  ')).toEqual([])
  })

  it('ranks matches for a query and caps the result count', () => {
    const results = buildCmdJFileResults(indexCmdJFiles(files), 'canvas')
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].path).toBe('docs/canvas-visual-polish.md')
    expect(results[0].filename).toBe('canvas-visual-polish.md')
  })
})
