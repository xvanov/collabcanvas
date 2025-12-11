/**
 * TrueCost Theme Constants
 * Matches Design Spec tokens for dynamic styling use cases.
 */
export const truecostTheme = {
  colors: {
    background: {
      primary: '#050A14',
      surface: '#0F1629',
    },
    accent: {
      cyan: '#3BE3F5',
      teal: '#17C5D1',
    },
    glass: {
      border: 'rgba(255, 255, 255, 0.16)',
      background: 'rgba(255, 255, 255, 0.07)',
    },
    text: {
      primary: '#FFFFFF',
      secondary: 'rgba(255, 255, 255, 0.75)',
      muted: 'rgba(255, 255, 255, 0.55)',
    },
    status: {
      danger: '#FF4A4A',
    },
  },
  typography: {
    fontFamily: {
      heading: "'IBM Plex Sans', system-ui, sans-serif",
      body: "'SF Pro Text', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
      accent: "'IBM Plex Serif', Georgia, serif",
    },
    fontSize: {
      h1: { size: '48px', lineHeight: '1.1', weight: '700' },
      h2: { size: '32px', lineHeight: '1.2', weight: '600' },
      h3: { size: '24px', lineHeight: '1.3', weight: '600' },
      body: { size: '16px', lineHeight: '1.5', weight: '400' },
      meta: { size: '14px', lineHeight: '1.5', weight: '400' },
    },
  },
  spacing: {
    section: '32px',
    sectionMobile: '24px',
    card: '24px',
    cardCompact: '20px',
    page: {
      desktop: '80px',
      tablet: '40px',
      mobile: '20px',
    },
  },
  effects: {
    borderRadius: {
      glass: '18px',
      glassLg: '20px',
      pill: '999px',
    },
    blur: {
      glass: '14px',
    },
    shadow: {
      glowCyan: '0 0 16px rgba(59, 227, 245, 0.5)',
      glowCyanStrong: '0 0 24px rgba(59, 227, 245, 0.7)',
      glowTeal: '0 0 16px rgba(23, 197, 209, 0.5)',
      glass: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
    },
  },
  breakpoints: {
    mobile: '320px',
    tablet: '768px',
    desktop: '1280px',
  },
} as const;

export type TruecostTheme = typeof truecostTheme;

