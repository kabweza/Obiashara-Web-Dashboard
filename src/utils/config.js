// src/utils/config.js

export const Config = {
  // Primary brand colors (from Flutter Config)
  primaryOrange: '#cf4638',
  lightOrange: '#f16657',
  darkOrange: '#b14639',
  softGreen: '#a24639',
  primaryText: '#1E3A8A',
  secondaryText: '#616161',
  offWhite: '#F5F5F5',
  neutralWhite: '#FFFFFF',
  cardShadow: 'rgba(0,0,0,0.10)',

  // Gradient definitions
  primaryGradient: 'linear-gradient(135deg, #cf4638 0%, #f16657 100%)',
  successGradient: 'linear-gradient(135deg, #10B981 0%, #34D399 100%)',
  warningGradient: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)',

  // CSS variable map for global use
  cssVars: {
    '--color-primary': '#cf4638',
    '--color-light': '#f16657',
    '--color-dark': '#b14639',
    '--color-text-primary': '#1E3A8A',
    '--color-text-secondary': '#616161',
    '--color-off-white': '#F5F5F5',
  }
}

export default Config
