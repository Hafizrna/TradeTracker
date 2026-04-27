import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import preloader from './assets/preloader.png'

const setCircularFavicon = (imageSrc) => {
  const iconImage = new Image()
  iconImage.src = imageSrc

  iconImage.onload = () => {
    const size = 64
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size

    const context = canvas.getContext('2d')
    if (!context) {
      return
    }

    context.beginPath()
    context.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
    context.closePath()
    context.clip()
    context.drawImage(iconImage, 0, 0, size, size)

    const faviconUrl = canvas.toDataURL('image/png')
    let faviconLink = document.querySelector("link[rel='icon']")
    if (!faviconLink) {
      faviconLink = document.createElement('link')
      faviconLink.setAttribute('rel', 'icon')
      document.head.appendChild(faviconLink)
    }

    faviconLink.setAttribute('type', 'image/png')
    faviconLink.setAttribute('href', faviconUrl)
  }
}

setCircularFavicon(preloader)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
