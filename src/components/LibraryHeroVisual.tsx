export function LibraryHeroVisual() {
  return (
    <div className="lib-home-visual" aria-hidden="true">
      <iframe
        src="/hero-visual.html"
        title="Library hero visual"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          border: 'none',
          display: 'block',
          background: 'transparent',
        }}
        scrolling="no"
        tabIndex={-1}
      />
    </div>
  );
}
