export function setFavicon(iconUrl: string) {
  try {
    let link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      link.type = 'image/svg+xml';
      document.head.appendChild(link);
    }
    link.href = iconUrl;
  } catch (err) {
    console.warn('Failed to update favicon:', err);
  }
}
