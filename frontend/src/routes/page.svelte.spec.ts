import { page } from 'vitest/browser'
import { describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-svelte'
import Page from '$routes/+page.svelte'

// Mock the Game component since we only want to test that Page mounts it
vi.mock('$components/Game.svelte', async () => {
  return await import('$components/test/MockGame.svelte')
})

describe('/+page.svelte', () => {
  // Verifies that the page mounts the Game component, ensuring the entry point is wired correctly.
  it('should render the Game component', async () => {
    render(Page)

    const game = page.getByTestId('game-component')
    await expect.element(game).toBeInTheDocument()
  })
})
