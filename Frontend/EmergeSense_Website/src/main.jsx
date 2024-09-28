import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import Map from './Components/map.jsx'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Map />
  </StrictMode>,
)
