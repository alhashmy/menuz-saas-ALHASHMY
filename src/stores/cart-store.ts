import { create } from 'zustand'

export interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
  imagePath: string | null
}

interface CartState {
  items: CartItem[]
  addItem: (item: { id: string; name: string; price: number; imagePath: string | null }) => void
  removeItem: (id: string) => void
  increaseQuantity: (id: string) => void
  decreaseQuantity: (id: string) => void
  setQuantity: (id: string, quantity: number) => void
  clear: () => void
  total: number
  itemCount: number
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  addItem: (item) => {
    const existing = get().items.find((i) => i.id === item.id)
    if (existing) {
      set((state) => ({
        items: state.items.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        ),
      }))
    } else {
      set((state) => ({ items: [...state.items, { ...item, quantity: 1 }] }))
    }
  },
  removeItem: (id) =>
    set((state) => ({ items: state.items.filter((i) => i.id !== id) })),
  increaseQuantity: (id) =>
    set((state) => ({
      items: state.items.map((i) =>
        i.id === id ? { ...i, quantity: i.quantity + 1 } : i
      ),
    })),
  decreaseQuantity: (id) =>
    set((state) => ({
      items: state.items.map((i) =>
        i.id === id ? { ...i, quantity: Math.max(0, i.quantity - 1) } : i
      ),
    })),
  setQuantity: (id, quantity) =>
    set((state) => ({
      items: state.items.map((i) =>
        i.id === id ? { ...i, quantity: Math.max(0, quantity) } : i
      ),
    })),
  clear: () => set({ items: [] }),
  get total() {
    return get().items.reduce(
      (sum, i) => sum + (Number(i.price) || 0) * i.quantity,
      0
    )
  },
  get itemCount() {
    return get().items.reduce((sum, i) => sum + i.quantity, 0)
  },
}))
