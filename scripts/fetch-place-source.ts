import { fetchGwuloPlace } from '../src/domain/gwulo.ts'
import { fetchWikipediaPlace } from '../src/domain/wikipedia.ts'

const url = process.argv[2]
if (!url) {
  console.error('Usage: npm run ingest:fetch -- https://gwulo.com/node/… | https://en.wikipedia.org/wiki/…')
  process.exit(1)
}

let host = ''
try {
  host = new URL(url).hostname
} catch {
  console.error('Not a URL')
  process.exit(1)
}

const draft = host.includes('gwulo.com')
  ? await fetchGwuloPlace(url)
  : host.includes('wikipedia.org')
    ? await fetchWikipediaPlace(url)
    : null

if (!draft) {
  console.error('Unsupported host. For other URLs or pasted text, extract a Place draft in chat.')
  process.exit(1)
}

process.stdout.write(`${JSON.stringify(draft, null, 2)}\n`)
