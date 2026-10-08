import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Button } from './Button'

function render(props: Parameters<typeof Button>[0]) {
  return renderToStaticMarkup(createElement(Button, props))
}

describe('Button', () => {
  it('defaults to a secondary type="button" with no variant class', () => {
    expect(render({ children: 'Add' })).toBe('<button type="button">Add</button>')
  })

  it('maps variants to their classes and keeps extra classes', () => {
    expect(render({ variant: 'primary', type: 'submit', children: 'Save' })).toBe(
      '<button type="submit" class="primary">Save</button>',
    )
    expect(render({ variant: 'link', className: 'form-delete', children: 'Delete' })).toContain(
      'class="linkish form-delete"',
    )
    expect(render({ variant: 'ghost', className: 'detail-back' })).toContain('class="ghost detail-back"')
  })
})
