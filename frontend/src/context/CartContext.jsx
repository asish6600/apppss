import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import api, { apiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const CartContext = createContext(null);

const EMPTY = { items: [], subtotal: 0, shipping: 0, tax: 0, donation_amount: 0, discount: 0, grand_total: 0, free_shipping_threshold: 499 };

export function CartProvider({ children }) {
  const [cart, setCart] = useState(EMPTY);
  const [open, setOpen] = useState(false);
  const { user } = useAuth();

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get("/cart");
      setCart(data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { refresh(); }, [refresh, user]);

  const count = cart.items.reduce((s, i) => s + i.qty, 0);

  const add = async (slug, qty = 1, openDrawer = true) => {
    try {
      const { data } = await api.post("/cart/items", { slug, qty });
      setCart(data);
      if (openDrawer) setOpen(true);
      toast.success("Added to cart");
    } catch (e) { toast.error(apiError(e)); }
  };
  const update = async (slug, qty) => {
    try { const { data } = await api.put(`/cart/items/${slug}`, { slug, qty }); setCart(data); }
    catch (e) { toast.error(apiError(e)); }
  };
  const remove = async (slug) => {
    try { const { data } = await api.delete(`/cart/items/${slug}`); setCart(data); }
    catch (e) { toast.error(apiError(e)); }
  };

  return (
    <CartContext.Provider value={{ cart, setCart, count, add, update, remove, refresh, open, setOpen }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
