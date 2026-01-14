const API_BASE = 'https://api.binance.com'
const CURRENT_PRICE_ENDPOINT = '/api/v3/ticker/price?symbol=BTCUSDT'

const getCurrentPrice = async () => {
  try {
    const res = await fetch(`${API_BASE}${CURRENT_PRICE_ENDPOINT}`)

    if (!res.ok) {
      throw new Error(`Binance API error: ${res.statusText}`)
    }

    const d = await res.json()
    const price = Number(d.price)

    if (isNaN(price)) {
      throw new Error('Invalid price data received from Binance')
    }

    return price
  } catch (error) {
    console.error('Failed to fetch Bitcoin price:', error)
    throw error
  }
}

export const useBitcoinService = () => ({
  getCurrentPrice,
})
