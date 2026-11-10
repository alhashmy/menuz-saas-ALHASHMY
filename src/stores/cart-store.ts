import { create } from 'zustand'

export const MAX_CART_ITEM_QUANTITY = 20

export interface CartItem {
  /** معرّف سطر السلة؛ يميّز نفس الوجبة عند وجود ملاحظات مختلفة. */
  lineId: string
  /** معرّف الوجبة في قاعدة البيانات. */
  id: string
  name: string
  price: number
  quantity: number
  imagePath: string | null
  notes?: string
}

interface AddCartItemInput {
  id: string
  name: string
  price: number
  imagePath: string | null
  notes?: string
  quantity?: number
}

interface CartState {
  items: CartItem[]
  addItem: (item: AddCartItemInput) => void
  removeItem: (lineId: string) => void
  increaseQuantity: (lineId: string) => void
  decreaseQuantity: (lineId: string) => void
  setQuantity: (lineId: string, quantity: number) => void
  clear: () => void
  total: number
  itemCount: number
}

function boundedQuantity(value: number) {
  if (!Number.isFinite(value)) return 1
  return Math.min(MAX_CART_ITEM_QUANTITY, Math.max(1, Math.trunc(value)))
}

function cleanNotes(notes: string | undefined) {
  const value = notes?.trim().replace(/\s+/g, ' ') ?? ''
  return value.slice(0, 240)
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  addItem: (item) => {
    const notes = cleanNotes(item.notes)
    const lineId = `${item.id}::${notes}`
    const amount = boundedQuantity(item.quantity ?? 1)
    const price =
      Number.isFinite(item.price) && item.price >= 0 ? item.price : 0
    const existing = get().items.find((cartItem) => cartItem.lineId === lineId)

    if (existing) {
      set((state) => ({
        items: state.items.map((cartItem) =>
          cartItem.lineId === lineId
            ? {
                ...cartItem,
                quantity: Math.min(
                  MAX_CART_ITEM_QUANTITY,
                  cartItem.quantity + amount
                ),
              }
            : cartItem
        ),
      }))
      return
    }

    set((state) => ({
      items: [
        ...state.items,
        {
          lineId,
          id: item.id,
          name: item.name.slice(0, 160),
          price,
          quantity: amount,
          imagePath: item.imagePath,
          notes: notes || undefined,
        },
      ],
    }))
  },
  removeItem: (lineId) =>
    set((state) => ({
      items: state.items.filter((item) => item.lineId !== lineId),
    })),
  increaseQuantity: (lineId) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.lineId === lineId
          ? {
              ...item,
              quantity: Math.min(MAX_CART_ITEM_QUANTITY, item.quantity + 1),
            }
          : item
      ),
    })),
  decreaseQuantity: (lineId) =>
    set((state) => ({
      items: state.items
        .map((item) =>
          item.lineId === lineId
            ? { ...item, quantity: item.quantity - 1 }
            : item
        )
        .filter((item) => item.quantity > 0),
    })),
  setQuantity: (lineId, quantity) => {
    const safeQuantity = Number.isFinite(quantity)
      ? Math.min(MAX_CART_ITEM_QUANTITY, Math.max(0, Math.trunc(quantity)))
      : 0
    set((state) => ({
      items: state.items
        .map((item) =>
          item.lineId === lineId ? { ...item, quantity: safeQuantity } : item
        )
        .filter((item) => item.quantity > 0),
    }))
  },
  clear: () => set({ items: [] }),
  get total() {
    return get().items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    )
  },
  get itemCount() {
    return get().items.reduce((sum, item) => sum + item.quantity, 0)
  },
}))
