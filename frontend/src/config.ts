import { PUBLIC_API_BASE_URL } from '$env/static/public'

export const CONFIG = {
  api: {
    baseUrl: PUBLIC_API_BASE_URL,
  },
  themes: [
    ['#b900c9', '#2a14f6'], // Neon Pink / Blue
    ['#ca3a1b', '#b3135d'], // Orange / Pink
    ['#0d7a71', '#1e8f4b'], // Green / Dark Green
    ['#8E2DE2', '#4A00E0'], // Purple / Dark Purple
    ['#ca3005', '#a67c00'], // Orange / Dark Gold
    ['#005C97', '#363795'], // Cool Blue / Navy
  ],
} as const
