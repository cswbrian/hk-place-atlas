import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { PlacePhotos } from './PlacePhotos'

vi.mock('../api/photos', () => ({
  fetchPhotos: vi.fn(async () => []),
  uploadPhoto: vi.fn(),
  deletePhoto: vi.fn(),
}))

describe('PlacePhotos add flow', () => {
  it('offers Add photo with a hidden file input and no upload form', () => {
    const html = renderToStaticMarkup(
      createElement(PlacePhotos, {
        featureId: 'place-1',
        placeName: 'Euro Trade Centre',
        canUpload: true,
        userSub: 'user-1',
        locale: 'en',
        signInHref: '/api/auth/google',
        onOpenPlace: () => {},
        onCreatePlace: () => {},
      }),
    )
    expect(html).toContain('Add photo')
    expect(html).toContain('type="file"')
    expect(html).toContain('accept="image/*"')
    expect(html).not.toContain('Upload the image first')
    expect(html).not.toContain('>Upload<')
  })

  it('offers Add photo when signed out without a file input', () => {
    const html = renderToStaticMarkup(
      createElement(PlacePhotos, {
        featureId: 'place-1',
        placeName: 'Euro Trade Centre',
        canUpload: true,
        userSub: null,
        locale: 'en',
        signInHref: '/api/auth/google',
        onNeedSignIn: () => {},
        onOpenPlace: () => {},
        onCreatePlace: () => {},
      }),
    )
    expect(html).toContain('Add photo')
    expect(html).not.toContain('type="file"')
  })
})

describe('PlacePhotos site browse', () => {
  it('shows the photos heading and empty note without Add photo', () => {
    const html = renderToStaticMarkup(
      createElement(PlacePhotos, {
        featureIds: ['place-1', 'place-2'],
        placeName: 'This site',
        canUpload: false,
        userSub: 'user-1',
        locale: 'en',
        signInHref: '/api/auth/google',
        onOpenPlace: () => {},
        onCreatePlace: () => {},
      }),
    )
    expect(html).toContain('Photos')
    expect(html).toContain('No photo')
    expect(html).not.toContain('Choose a photo to open it')
    expect(html).not.toContain('Add photo')
    expect(html).not.toContain('type="file"')
  })

  it('shows the empty note when the site has no places', () => {
    const html = renderToStaticMarkup(
      createElement(PlacePhotos, {
        featureIds: [],
        placeName: 'This site',
        canUpload: false,
        userSub: null,
        locale: 'en',
        signInHref: '/api/auth/google',
        onOpenPlace: () => {},
        onCreatePlace: () => {},
      }),
    )
    expect(html).toContain('Photos')
    expect(html).toContain('No photo')
    expect(html).not.toContain('Add photo')
  })
})
