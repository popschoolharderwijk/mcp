import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './styles/popschool-calendar.css';
import { configureFavicon } from '@/lib/configure-favicon';

configureFavicon();

const rootElement = document.getElementById('root');
if (rootElement) {
	createRoot(rootElement).render(<App />);
}
