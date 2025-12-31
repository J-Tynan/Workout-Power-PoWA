// Theme helpers extracted for dynamic palette handling

const DEFAULT_LIGHT_COLOR = '#16A34A';

function hexToRgbString(hex) {
  if (!hex || typeof hex !== 'string') return '22 163 74';
  const normalized = hex.replace('#', '');
  if (normalized.length === 3) {
    const r = normalized[0];
    const g = normalized[1];
    const b = normalized[2];
    return `${parseInt(r + r, 16)} ${parseInt(g + g, 16)} ${parseInt(b + b, 16)}`;
  }
  if (normalized.length !== 6) return '22 163 74';
  const r = normalized.slice(0, 2);
  const g = normalized.slice(2, 4);
  const b = normalized.slice(4, 6);
  return `${parseInt(r, 16)} ${parseInt(g, 16)} ${parseInt(b, 16)}`;
}

function isSystemDark() {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyTheme(themeChoice = 'system', lightColor = DEFAULT_LIGHT_COLOR) {
  const theme = themeChoice || 'system';
  const accent = lightColor || DEFAULT_LIGHT_COLOR;
  const root = document.documentElement;

  const shouldUseDark = theme === 'dark' || (theme === 'system' && isSystemDark());
  root.classList.toggle('dark', shouldUseDark);

  // Keep accent in RGB form for Tailwind opacity utilities
  root.style.setProperty('--color-accent', hexToRgbString(accent));
  root.style.setProperty('--default-accent', accent);

  // Update theme-color meta for better PWA feel
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute('content', shouldUseDark ? '#0F3D1A' : '#E6F4EA');
  }
}

function applyThemeFromSettings(loadSettingsFn) {
  const settings = typeof loadSettingsFn === 'function' ? loadSettingsFn() : {};
  const theme = settings.theme ?? 'system';
  const lightColor = settings.lightColor ?? DEFAULT_LIGHT_COLOR;
  applyTheme(theme, lightColor);
}

function registerSystemThemeChangeListener(getSettingsFn) {
  const mql = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  if (!mql) return () => {};

  const handler = () => {
    const settings = typeof getSettingsFn === 'function' ? getSettingsFn() : {};
    if ((settings.theme ?? 'system') === 'system') {
      applyTheme('system', settings.lightColor ?? DEFAULT_LIGHT_COLOR);
    }
  };

  if (typeof mql.addEventListener === 'function') {
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  } else if (typeof mql.addListener === 'function') {
    mql.addListener(handler);
    return () => mql.removeListener(handler);
  }
  return () => {};
}

export { applyTheme, applyThemeFromSettings, registerSystemThemeChangeListener, DEFAULT_LIGHT_COLOR };

