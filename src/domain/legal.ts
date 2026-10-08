import type { SiteLocale } from './locale'

export type LegalPageId = 'privacy' | 'terms'

export type LegalSection = { heading: string; paragraphs: string[] }

export type LegalDoc = {
  heading: string
  seoTitle: string
  seoDescription: string
  updated: string
  sections: LegalSection[]
}

export const CONTACT_EMAIL = 'info@monsoonclub.co'
export const GITHUB_URL = 'https://github.com/cswbrian/hk-place-atlas'

export const LEGAL_PAGES: readonly LegalPageId[] = ['privacy', 'terms']

export function parseLegalPage(rest: string): LegalPageId | null {
  if (rest === '/privacy') return 'privacy'
  if (rest === '/terms') return 'terms'
  return null
}

export const legal: Record<SiteLocale, Record<LegalPageId, LegalDoc>> = {
  en: {
    privacy: {
      heading: 'Privacy Policy',
      seoTitle: 'Privacy Policy · HONG KONG ATLAS',
      seoDescription: 'What personal data HONG KONG ATLAS collects, how it is used, and how to contact us.',
      updated: 'Last updated: 8 October 2026',
      sections: [
        {
          heading: 'Overview',
          paragraphs: [
            'HONG KONG ATLAS (hkatlas.fyi, “we”) is a community-built map of Hong Kong history. This policy explains what personal data we collect, why, and the choices you have. We handle personal data in line with applicable data protection laws.',
          ],
        },
        {
          heading: 'What we collect',
          paragraphs: [
            'Browsing: you can use the map without an account. We use an analytics service to count visits and understand how the site is used. It sets cookies and collects information such as your IP address, device and browser type, and the pages you view.',
            'Signing in: when you sign in with a third-party account, we receive and store that account’s ID and email address. A session cookie keeps you signed in for up to 30 days.',
            'Contributions: places, edits, photos, and photo details (source, caption, credit, licence, year) that you submit, together with the time and the account that submitted them. Uploaded image files are stored as sent and may contain embedded metadata, such as camera location. Remove it before uploading if you do not want it kept.',
          ],
        },
        {
          heading: 'What is public',
          paragraphs: [
            'Contributions are public. The edit history of each place shows the email address of the account that made each change. Do not sign in or contribute if you do not want your email address shown.',
          ],
        },
        {
          heading: 'How we use it',
          paragraphs: [
            'We use this data to run the site, attribute and review contributions, prevent abuse (for example, rate limits), and improve the service. We do not sell personal data or use it for advertising.',
          ],
        },
        {
          heading: 'Service providers',
          paragraphs: [
            'We use third-party providers for hosting, data and photo storage, sign-in, and analytics. They may process data outside Hong Kong under their own privacy terms.',
          ],
        },
        {
          heading: 'Retention',
          paragraphs: [
            'We keep account data and contributions while the site runs, or until you ask us to delete them. The edit history is kept as a record of changes to the map. Analytics data is kept for a limited period set in our analytics service.',
          ],
        },
        {
          heading: 'Your choices and rights',
          paragraphs: [
            `You may ask to access or correct your personal data, or to delete your account and the photos you uploaded, by emailing ${CONTACT_EMAIL}. You can block analytics cookies in your browser settings.`,
          ],
        },
        {
          heading: 'Changes',
          paragraphs: ['We may update this policy. Changes take effect when posted here with a new date.'],
        },
        {
          heading: 'Contact',
          paragraphs: [`Questions about privacy: ${CONTACT_EMAIL}`],
        },
      ],
    },
    terms: {
      heading: 'Terms and Conditions',
      seoTitle: 'Terms and Conditions · HONG KONG ATLAS',
      seoDescription: 'The terms for using and contributing to HONG KONG ATLAS.',
      updated: 'Last updated: 8 October 2026',
      sections: [
        {
          heading: 'Agreement',
          paragraphs: [
            'By using HONG KONG ATLAS (hkatlas.fyi, “we”), you agree to these terms. If you do not agree, please do not use the site.',
          ],
        },
        {
          heading: 'Accuracy',
          paragraphs: [
            'Information on the site comes from public records and community contributions. It may be incomplete, out of date, or wrong. It is for general reference only and must not be relied on for legal, property, survey, or safety decisions.',
          ],
        },
        {
          heading: 'Accounts',
          paragraphs: [
            'You need to sign in to contribute. You are responsible for activity under your account. We may suspend accounts that break these terms.',
          ],
        },
        {
          heading: 'Your contributions',
          paragraphs: [
            'You may only submit content you have the right to share. You keep any rights you hold in your contributions. By submitting, you give us a worldwide, non-exclusive, royalty-free licence to host, display, copy, adapt (for example, resize images), and distribute that content as part of the site and its data.',
            'Credit photos accurately and link to the original source where possible.',
          ],
        },
        {
          heading: 'Not allowed',
          paragraphs: [
            'Content that infringes copyright or other rights; personal information about private individuals without their consent; unlawful, abusive, or misleading content; spam or vandalism; and attacks or automated requests that disrupt the service.',
          ],
        },
        {
          heading: 'Moderation',
          paragraphs: [
            'We may edit, revert, or remove any content, and restrict access, at our discretion and without notice.',
          ],
        },
        {
          heading: 'Copyright complaints',
          paragraphs: [
            `If you believe content on the site infringes your rights, email ${CONTACT_EMAIL} with a link to the content and details of your claim. We will review it and remove the content where appropriate.`,
          ],
        },
        {
          heading: 'Third-party content',
          paragraphs: [
            'Base maps, government records, and other third-party data belong to their owners and are used under their terms. The source code of the site is publicly available.',
          ],
        },
        {
          heading: 'No warranty and liability',
          paragraphs: [
            'The site is provided “as is”, without warranties of any kind. To the extent permitted by law, we are not liable for any loss arising from use of the site or reliance on its content.',
          ],
        },
        {
          heading: 'Changes',
          paragraphs: ['We may update these terms. Continued use after changes are posted means you accept them.'],
        },
        {
          heading: 'Contact',
          paragraphs: [`Questions about these terms: ${CONTACT_EMAIL}`],
        },
      ],
    },
  },
  hk: {
    privacy: {
      heading: '私隱政策',
      seoTitle: '私隱政策 · 香港地圖集',
      seoDescription: '香港地圖集收集哪些個人資料、如何使用，以及聯絡方法。',
      updated: '最後更新：2026 年 10 月 8 日',
      sections: [
        {
          heading: '概覽',
          paragraphs: [
            '香港地圖集（hkatlas.fyi，「我們」）是由社群協作的香港歷史地圖。本政策說明我們收集哪些個人資料、用途，以及你的選擇。我們按照適用的資料保障法律處理個人資料。',
          ],
        },
        {
          heading: '我們收集的資料',
          paragraphs: [
            '瀏覽：無須帳戶即可使用地圖。我們使用分析服務統計瀏覽量及了解網站使用情況，它會設定 Cookie，並收集你的 IP 位址、裝置及瀏覽器類型、瀏覽過的頁面等資料。',
            '登入：使用第三方帳戶登入時，我們會接收並儲存該帳戶的 ID 及電郵地址。工作階段 Cookie 會讓你保持登入最多 30 天。',
            '貢獻內容：你提交的地點、編輯、相片及相片資料（來源、說明、版權歸屬、授權、年份），以及提交時間和提交帳戶。上傳的圖片檔案會按原樣儲存，可能包含內嵌資料（例如拍攝位置）。如不希望保留，請在上傳前移除。',
          ],
        },
        {
          heading: '公開的資料',
          paragraphs: [
            '貢獻內容會公開。每個地點的歷史紀錄會顯示作出每項更改的帳戶電郵地址。如不希望公開電郵地址，請勿登入或作出貢獻。',
          ],
        },
        {
          heading: '資料用途',
          paragraphs: [
            '我們使用這些資料以營運網站、標示及審核貢獻、防止濫用（例如次數限制）及改善服務。我們不會出售個人資料，亦不會用作廣告。',
          ],
        },
        {
          heading: '服務供應商',
          paragraphs: [
            '我們使用第三方供應商提供託管、資料及相片儲存、登入及分析服務。這些供應商可能在香港以外地方按其私隱條款處理資料。',
          ],
        },
        {
          heading: '保留期限',
          paragraphs: [
            '帳戶資料及貢獻內容會在網站營運期間保留，或直至你要求刪除。歷史紀錄會保留作為地圖更改的紀錄。分析資料按分析服務的設定保留一段有限時間。',
          ],
        },
        {
          heading: '你的選擇及權利',
          paragraphs: [
            `你可電郵至 ${CONTACT_EMAIL}，要求查閱或改正你的個人資料，或刪除你的帳戶及你上傳的相片。你可在瀏覽器設定中封鎖分析 Cookie。`,
          ],
        },
        {
          heading: '修訂',
          paragraphs: ['我們可能會更新本政策，更新會在本頁刊登並註明新日期後生效。'],
        },
        {
          heading: '聯絡我們',
          paragraphs: [`私隱相關查詢：${CONTACT_EMAIL}`],
        },
      ],
    },
    terms: {
      heading: '條款及細則',
      seoTitle: '條款及細則 · 香港地圖集',
      seoDescription: '使用及參與貢獻香港地圖集的條款。',
      updated: '最後更新：2026 年 10 月 8 日',
      sections: [
        {
          heading: '同意條款',
          paragraphs: ['使用香港地圖集（hkatlas.fyi，「我們」）即表示你同意本條款。如不同意，請勿使用本網站。'],
        },
        {
          heading: '資料準確性',
          paragraphs: [
            '網站資料來自公開紀錄及社群貢獻，可能不完整、過時或有誤，僅供一般參考，不應作為法律、物業、測量或安全決定的依據。',
          ],
        },
        {
          heading: '帳戶',
          paragraphs: ['你須登入才能作出貢獻，並須為帳戶下的活動負責。違反本條款的帳戶可能會被暫停。'],
        },
        {
          heading: '你的貢獻',
          paragraphs: [
            '你只可提交你有權分享的內容。你保留你對貢獻內容所持有的權利。提交即表示你授予我們全球、非獨家、免版稅的許可，以在本網站及其資料中託管、展示、複製、改編（例如調整圖片大小）及發布該內容。',
            '請準確標示相片版權歸屬，並盡可能附上原始來源連結。',
          ],
        },
        {
          heading: '禁止事項',
          paragraphs: [
            '侵犯版權或其他權利的內容；未經同意的私人人士個人資料；違法、濫用或誤導的內容；垃圾訊息或惡意破壞；以及干擾服務的攻擊或自動化請求。',
          ],
        },
        {
          heading: '內容管理',
          paragraphs: ['我們可酌情修改、還原或移除任何內容及限制存取，而毋須事先通知。'],
        },
        {
          heading: '版權投訴',
          paragraphs: [
            `如你認為網站內容侵犯你的權利，請電郵至 ${CONTACT_EMAIL}，附上內容連結及投訴詳情。我們會審視並在適當情況下移除內容。`,
          ],
        },
        {
          heading: '第三方內容',
          paragraphs: ['底圖、政府紀錄及其他第三方資料屬其擁有者所有，並按其條款使用。本網站的原始碼已公開。'],
        },
        {
          heading: '免責及責任限制',
          paragraphs: [
            '本網站按「現狀」提供，不作任何形式的保證。在法律允許的範圍內，我們不會為使用本網站或依賴其內容而引致的任何損失負責。',
          ],
        },
        {
          heading: '修訂',
          paragraphs: ['我們可能會更新本條款。更新刊登後繼續使用即表示你接受。'],
        },
        {
          heading: '聯絡我們',
          paragraphs: [`條款相關查詢：${CONTACT_EMAIL}`],
        },
      ],
    },
  },
}
