import { useEffect } from 'react';
import Login from './components/Login';
import { getWebpageImageUrl } from './lib/supabase';

function App() {
  useEffect(() => {
    const faviconHref = getWebpageImageUrl('favicon.png');
    let faviconLink = document.querySelector("link[rel='icon']");

    if (!faviconLink) {
      faviconLink = document.createElement('link');
      faviconLink.setAttribute('rel', 'icon');
      document.head.appendChild(faviconLink);
    }

    faviconLink.setAttribute('type', 'image/png');
    faviconLink.setAttribute('href', faviconHref);
  }, []);

  return (
    <>
      <Login />
    </>
  );
}

export default App;
