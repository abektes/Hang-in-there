import { createRoot } from 'react-dom/client'
import './styles.css'
import App from './App'
import { isEmbedRequest } from './utils/badgeEmbed'

if (isEmbedRequest(window.location.search)) document.documentElement.classList.add('is-embed')

createRoot(document.getElementById('root')).render(<App />)
