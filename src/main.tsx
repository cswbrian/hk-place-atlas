import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import AtlasApp from './AtlasApp.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AtlasApp />
  </StrictMode>,
)
