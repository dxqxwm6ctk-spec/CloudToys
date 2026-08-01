import { createRoot } from 'react-dom/client';
import { setBaseUrl } from '@workspace/api-client-react';

import App from './App';

import './index.css';

// When deploying to Netlify (or any standalone host), set the VITE_API_BASE_URL
// environment variable to the URL of your deployed API server, e.g.:
//   https://api.cloudtoys.com
// All /api/… calls made by the API client will be prefixed with that URL.
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;
if (apiBaseUrl) {
  setBaseUrl(apiBaseUrl);
}

createRoot(document.getElementById('root')!).render(<App />);
