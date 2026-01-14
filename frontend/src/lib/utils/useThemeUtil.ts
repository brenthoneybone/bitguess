import { CONFIG } from '$src/config'

const colors = CONFIG.themes

const randomizeTheme = () => {
  if (typeof document === 'undefined') return

  // Pick a random index
  const randomIndex = Math.floor(Math.random() * colors.length)
  const [color1, color2] = colors[randomIndex]

  document.documentElement.style.setProperty('--color-1', color1)
  document.documentElement.style.setProperty('--color-2', color2)
}

export const useThemeUtil = () => ({
  randomizeTheme,
})
