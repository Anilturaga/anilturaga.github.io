// Turns the single-file Vite build into an artifact page: the artifact host
// supplies <!doctype>/<html>/<head>/<body>, so we keep only their contents.
import { readFileSync, writeFileSync } from 'node:fs'

const html = readFileSync('dist/index.html', 'utf8')
const head = html.match(/<head>([\s\S]*?)<\/head>/)[1]
const body = html.match(/<body>([\s\S]*?)<\/body>/)[1]
const keepHead = head.replace(/<meta charset[^>]*>\s*/i, '').replace(/<meta name="viewport"[^>]*>\s*/i, '')
// title first so the host finds it in the first 8KB
const title = keepHead.match(/<title>[\s\S]*?<\/title>/)[0]
writeFileSync('dist/artifact.html', `${title}\n${keepHead.replace(title, '')}\n${body}\n`)
console.log('wrote dist/artifact.html', (readFileSync('dist/artifact.html').length / 1024).toFixed(0) + ' KB')
