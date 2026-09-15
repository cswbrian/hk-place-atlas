import { fetchCommonsCategory } from '../src/domain/commons.ts'

const url = process.argv[2]
if (!url) {
  console.error('Usage: npm run commons:fetch -- https://commons.wikimedia.org/wiki/Category:…')
  process.exit(1)
}

const draft = await fetchCommonsCategory(url)
process.stdout.write(`${JSON.stringify(draft, null, 2)}\n`)
