import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { YearField } from './YearField'

describe('YearField', () => {
  it('renders a numeric year input with a circa checkbox', () => {
    const html = renderToStaticMarkup(
      createElement(YearField, {
        label: 'Start',
        year: '1924',
        circa: true,
        onYear: () => {},
        onCirca: () => {},
        yearPlaceholder: 'Year',
        circaLabel: 'circa',
      }),
    )
    expect(html).toContain('Start<input placeholder="Year" inputMode="numeric" value="1924"/>')
    expect(html).toContain('<input type="checkbox" checked=""/>circa')
  })
})
