import type { FeatureKind } from './feature'

export type SiteLocale = 'en' | 'hk'

export type LocalePath = {
  locale: SiteLocale
  rest: string
}

export type FeaturePath = {
  group: 'place' | 'event'
  slug: string
}

export type PlacesPath = { slug: string | null }

export const copy = {
  en: {
    title: 'HONG KONG ATLAS',
    tagline: 'Community-driven directory mapping local history.',
    seoTitle: 'HONG KONG ATLAS — Hong Kong history map of places',
    seoDescription:
      'Spatial history database — an interactive map of Hong Kong’s historical places: buildings, shops, and events over time.',
    category: 'Spatial History Database',
    aboutNav: 'About',
    menu: 'Menu',
    aboutHeading: 'About HONG KONG ATLAS',
    aboutLead: 'We are a community-built urban history map directory.',
    aboutBody:
      'We gather scattered old photos, historical archives, and maps, and archive them by real geographic coordinates. Anyone can browse, and anyone can help complete this map.',
    aboutCan: 'You can:',
    aboutBullets: [
      'Look up a building’s location, historical background, and old photo records.',
      'Submit coordinates for unlisted former sites, boundary stones, air-raid shelters, and other physical places.',
      'Correct year or location errors in existing entries.',
    ],
    aboutBack: 'Back to map',
    aboutSignIn: 'Sign in to edit',
    aboutSeoTitle: 'About HONG KONG ATLAS — Hong Kong history map',
    aboutSeoDescription:
      'About HONG KONG ATLAS, a community-built urban history map directory where anyone can browse and contribute.',
    thisSite: 'This site',
    close: 'Close',
    emptySite: 'Nothing recorded here yet.',
    sitePickPlace: 'Choose a place below for details.',
    language: 'English',
    otherLanguage: '繁',
    hint: 'Click a pin or the map for site history',
    signIn: 'Sign in',
    signInWithGoogle: 'Sign in with Google',
    signOut: 'Sign out',
    signInPromptContributeTitle: 'Sign in to contribute',
    signInPromptAddTitle: 'Sign in to add a place',
    signInPromptEditTitle: 'Sign in to edit',
    signInPromptPhotoTitle: 'Sign in to add a photo',
    signInPromptBody: 'Sign in with Google to add places, photos, and edits to HONG KONG ATLAS.',
    add: 'Add',
    addPlace: 'Add place',
    edit: 'Edit',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    kind: 'Kind',
    nameEn: 'English name',
    nameZh: 'Chinese name',
    status: 'Status',
    standing: 'Standing',
    demolished: 'Demolished',
    unknown: 'Unknown',
    start: 'Built',
    end: 'Demolished',
    year: 'year',
    circa: 'circa',
    notes: 'Notes',
    establishment: 'Building',
    shop: 'Shop',
    event: 'Event',
    clickMap: 'Click the map to set a point',
    search: 'Search',
    searchPlaceholder: 'Search places',
    noResults: 'No matches',
    history: 'History',
    noHistory: 'No history yet.',
    photoAdded: 'added photo',
    photoRemoved: 'deleted photo',
    revert: 'Revert',
    map: 'Map',
    places: 'Places',
    viewOnMap: 'View on map',
    pickPlace: 'Pick a place',
    recent: 'Recently updated',
    photos: 'Photos',
    addPhoto: 'Add photo',
    uploadPhoto: 'Upload',
    photoDone: 'Done',
    photoSource: 'Source',
    photoCaption: 'Caption',
    photoPhotographer: 'Photographer / credit',
    photoLicense: 'License / rights',
    photoTakenYear: 'Year taken',
    photoSourceUrl: 'Source URL',
    photoNote: 'No photo',
    photoIncomplete: 'Source and page link still needed.',
    discardPhotoConfirm: 'Discard this photo?',
    photoPlace: 'This place has no coordinates yet.',
    photoFile: 'Choose an image up to 20 MB.',
    photoSourceRequired: 'Add a source.',
    photoUrlRequired: 'Add an https link to the original page.',
    photoYearInvalid: 'Use a year between 1000 and 2100, or leave it blank.',
    photoRate: 'Too many edits this hour. Try again later.',
    photoFailed: 'Could not save the photo.',
    tagSearch: 'Search a place',
    tagQueryShort: 'Type at least 2 characters.',
    createPlace: 'Create place',
    signInToTag: 'Sign in to tag a place',
    removeTag: 'Remove tag',
    tagFailed: 'Could not save the tag.',
    tagMissing: 'That place or photo is no longer here.',
    tagSearchFailed: 'Could not search places.',
    photoClose: 'Close',
    photoPrev: 'Previous photo',
    photoNext: 'Next photo',
    tagHint: 'Click the photo to tag another place.',
    locatePlaceHint: 'Click where this place is in the photo.',
    showTags: 'Show tags',
    hideTags: 'Hide tags',
    photoDetails: 'Photo details',
    photoSaved: 'Saved.',
    viewSource: 'View source',
    deletePhoto: 'Delete photo',
    deletePhotoConfirm: 'Delete this photo?',
    deletePlaceConfirm: 'Delete this place?',
    removeTagConfirm: 'Remove this tag?',
    sameSite: 'Same site',
    noOtherOnSite: 'No other recorded places on this site',
    backToSite: 'Back to site',
    buildings: 'Buildings',
    parcels: 'Parcels',
    sources: 'Sources',
    images: 'Images',
  },
  hk: {
    title: '香港地圖集',
    tagline: '社群協作的城市歷史地圖目錄',
    seoTitle: '香港地圖集 — 歷史地圖',
    seoDescription: '空間歷史資料庫 — 香港歷史地方互動地圖，涵蓋樓宇、店舖與事件。',
    category: '空間歷史資料庫',
    aboutNav: '關於',
    menu: '選單',
    aboutHeading: '關於香港地圖集',
    aboutLead: '我們是由社群協作的城市歷史地圖目錄。',
    aboutBody:
      '此地圖集將分散於各處的舊相片與歷史檔案，按地理座標整理。歡迎查閱及協助補全。',
    aboutCan: '你可以：',
    aboutBullets: [
      '查閱特定建築物的地理位置、歷史背景及舊相片紀錄。',
      '提交尚未收錄的舊址、界石或防空洞等實體坐標。',
      '勘誤現存條目中的年份或定位偏差。',
    ],
    aboutBack: '返回地圖',
    aboutSignIn: '登入以編輯',
    aboutSeoTitle: '關於香港地圖集 — 歷史地圖',
    aboutSeoDescription: '關於香港地圖集：由社群協作的城市歷史地圖目錄，任何人都可以查閱與補全。',
    thisSite: '此地',
    close: '關閉',
    emptySite: '此地尚未有紀錄。',
    sitePickPlace: '點選下列地點查看詳情。',
    language: '繁',
    otherLanguage: 'English',
    hint: '點地圖或圖標查看此地紀錄',
    signIn: '登入',
    signInWithGoogle: '使用 Google 登入',
    signOut: '登出',
    signInPromptContributeTitle: '登入以貢獻',
    signInPromptAddTitle: '登入以新增地點',
    signInPromptEditTitle: '登入以編輯',
    signInPromptPhotoTitle: '登入以加入相片',
    signInPromptBody: '使用 Google 登入即可為香港地圖集新增地點、相片與編輯。',
    add: '新增',
    addPlace: '新增地點',
    edit: '編輯',
    save: '儲存',
    cancel: '取消',
    delete: '刪除',
    kind: '類型',
    nameEn: '英文名稱',
    nameZh: '中文名稱',
    status: '狀態',
    standing: '現存',
    demolished: '已拆卸',
    unknown: '不詳',
    start: '落成',
    end: '拆卸',
    year: '年份',
    circa: '大約',
    notes: '備註',
    establishment: '樓宇',
    shop: '店舖',
    event: '事件',
    clickMap: '點地圖設定位置',
    search: '搜尋',
    searchPlaceholder: '搜尋地點',
    noResults: '沒有符合的紀錄',
    history: '歷史',
    noHistory: '尚未有歷史紀錄。',
    photoAdded: '加入相片',
    photoRemoved: '刪除相片',
    revert: '還原',
    map: '地圖',
    places: '地點',
    viewOnMap: '在地圖查看',
    pickPlace: '選擇地點',
    recent: '最近更新',
    photos: '相片',
    addPhoto: '加入相片',
    uploadPhoto: '上傳',
    photoDone: '完成',
    photoSource: '來源',
    photoCaption: '說明',
    photoPhotographer: '攝影師／版權歸屬',
    photoLicense: '授權／權利說明',
    photoTakenYear: '拍攝年份',
    photoSourceUrl: '來源網址',
    photoNote: '沒有相片',
    photoIncomplete: '仍需填寫來源與原圖頁面。',
    discardPhotoConfirm: '捨棄這張相片？',
    photoPlace: '此地點尚未有座標。',
    photoFile: '請選擇 20 MB 以內的圖片。',
    photoSourceRequired: '請填來源。',
    photoUrlRequired: '請填原圖頁面的 https 連結。',
    photoYearInvalid: '請填 1000 至 2100 的年份，或留空。',
    photoRate: '這一小時的編輯太多，請稍後再試。',
    photoFailed: '未能儲存相片。',
    tagSearch: '搜尋地點',
    tagQueryShort: '請輸入至少兩個字。',
    createPlace: '新增地點',
    signInToTag: '登入以標記地點',
    removeTag: '移除標記',
    tagFailed: '未能儲存標記。',
    tagMissing: '找不到該地點或相片。',
    tagSearchFailed: '未能搜尋地點。',
    photoClose: '關閉',
    photoPrev: '上一張',
    photoNext: '下一張',
    tagHint: '點擊相片以標記其他地點。',
    locatePlaceHint: '點擊相片上以標記此地點。',
    showTags: '顯示標記',
    hideTags: '隱藏標記',
    photoDetails: '相片資料',
    photoSaved: '已儲存。',
    viewSource: '查看來源',
    deletePhoto: '刪除相片',
    deletePhotoConfirm: '刪除這張相片？',
    deletePlaceConfirm: '刪除此地？',
    removeTagConfirm: '移除此標記？',
    sameSite: '同址',
    noOtherOnSite: '同址沒有其他紀錄',
    backToSite: '返回此地',
    buildings: '樓宇',
    parcels: '地段',
    sources: '來源',
    images: '圖片',
  },
} as const

const LOCALES = new Set<SiteLocale>(['en', 'hk'])

function normalizeRest(rest: string): string {
  if (!rest || rest === '/') return '/'
  return rest.startsWith('/') ? rest : `/${rest}`
}

export function parseLocalePath(pathname: string): LocalePath {
  const parts = pathname.replace(/\/+$/, '').split('/').filter(Boolean)
  const first = parts[0]
  if (first && LOCALES.has(first as SiteLocale)) {
    const rest = parts.slice(1).join('/')
    return { locale: first as SiteLocale, rest: rest ? `/${rest}` : '/' }
  }
  return { locale: 'hk', rest: normalizeRest(pathname) }
}

export function switchLocalePath(pathname: string, locale: SiteLocale): string {
  const { rest } = parseLocalePath(pathname)
  return rest === '/' ? `/${locale}` : `/${locale}${rest}`
}

export function parseFeaturePath(rest: string): FeaturePath | null {
  const match = /^\/(place|event)\/([^/]+)$/.exec(rest)
  if (!match) return null
  return { group: match[1] as FeaturePath['group'], slug: decodeURIComponent(match[2]!) }
}

export function parsePlacesPath(rest: string): PlacesPath | null {
  if (rest === '/places') return { slug: null }
  const match = /^\/places\/([^/]+)$/.exec(rest)
  if (!match) return null
  return { slug: decodeURIComponent(match[1]!) }
}

export function placesPageRedirect(pathname: string): string | null {
  const { locale, rest } = parseLocalePath(pathname)
  const places = parsePlacesPath(rest)
  if (!places) return null
  if (!places.slug) return `/${locale}`
  return `/${locale}/place/${encodeURIComponent(places.slug)}`
}

export function featurePublicPath(locale: SiteLocale, kind: FeatureKind, slug: string): string {
  const group = kind === 'event' ? 'event' : 'place'
  return `/${locale}/${group}/${slug}`
}

export function catalogCountLine(places: number, photos: number, locale: SiteLocale): string {
  if (locale === 'hk') return `${places} 個地點，${photos} 張相片，共同記錄`
  const placeWord = places === 1 ? 'place' : 'places'
  const photoWord = photos === 1 ? 'photo' : 'photos'
  return `${places} ${placeWord}, ${photos} ${photoWord}, and growing.`
}

export function displayNames(
  names: { nameEn: string; nameZh: string },
  locale: SiteLocale,
): { title: string; secondary: string | null } {
  const en = names.nameEn.trim()
  const zh = names.nameZh.trim()
  if (locale === 'hk') {
    const title = zh || en
    return { title, secondary: en && en !== title ? en : null }
  }
  const title = en || zh
  return { title, secondary: zh && zh !== title ? zh : null }
}
