import path from 'path'
import fs from 'fs'
import express, { Express, Request, Response } from 'express'

/**
 * In production, serve the Vite build from client/dist.
 * The SPA catch-all sends every non-API route to index.html.
 */
export function serveStatic(app: Express) {
  const distPath = path.join(__dirname, '../../client/dist')
  if (!fs.existsSync(distPath)) {
    console.warn('⚠️  client/dist non trovato. Esegui `npm run build` prima di avviare in produzione.')
    return
  }
  app.use(express.static(distPath))
  app.get('*', (_req: Request, res: Response) => {
    res.sendFile(path.join(distPath, 'index.html'))
  })
  console.log('📦 Frontend servito da', distPath)
}
