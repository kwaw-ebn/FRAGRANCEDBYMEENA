"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  ShoppingBag,
  Search,
  Heart,
  ArrowUpRight,
  Menu,
  X,
  Phone,
  Instagram,
  MapPin,
  ShieldCheck,
  Gift,
  MessageCircle,
  Truck,
  Plus,
  Minus,
} from "lucide-react";
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const WA = "https://wa.me/233591630727?text=";
const maps =
  "https://www.google.com/maps/search/?api=1&query=" +
  encodeURIComponent(
    "Gracefield Montessori School Oyarifa School Junction Accra Ghana",
  );
const mapEmbed =
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_URL ||
  "https://maps.google.com/maps?q=Gracefield%20Montessori%20School%20Oyarifa%20Accra&output=embed";
export type Product = {
  id: number;
  slug: string;
  name: string;
  brand: string;
  category: string;
  gender: string;
  family: string;
  description: string;
  price: number | null;
  compare_at: number | null;
  stock: number;
  low_stock: number;
  size: string;
  notes: string;
  images: string[];
  alt: string;
  featured: boolean;
  bestseller: boolean;
  is_new: boolean;
  published: boolean;
  seo_title: string;
  meta_description: string;
};
type CartLine = { product: Product; quantity: number };
type Content = {
  id: number;
  name?: string;
  fee?: number;
  active?: boolean;
  title?: string;
  body?: string;
  announcement?: string;
  hero_image?: string;
  published?: boolean;
};
const money = (n: number) =>
  new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(
    n,
  );
async function api(path: string, body?: unknown) {
  const r = await fetch(
    API + path,
    body
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : {},
  );
  const data = await r.json();
  if (!r.ok)
    throw Error(
      typeof data.detail === "string"
        ? data.detail
        : "Please check your details and try again.",
    );
  return data;
}
function Bottle({ category = "Perfumes" }: { category?: string }) {
  return (
    <div className="bottle-scene" aria-label="Product photograph coming soon">
      <div className={"bottle " + (category === "Diffusers" ? "diffuser" : "")}>
        <i />
        <div className="bottle-label">
          <small>FRAGRANCED</small>
          <b>BY MEENA</b>
          <span>THE COLLECTION</span>
        </div>
      </div>
      <span className="placeholder-label">PHOTOGRAPH COMING SOON</span>
    </div>
  );
}
export default function Store({
  initialProduct,
}: { initialProduct?: Product } = {}) {
  return (
    <Suspense fallback={<p className="loading">Opening the collection…</p>}>
      <Shop initialProduct={initialProduct} />
    </Suspense>
  );
}
function Shop({ initialProduct }: { initialProduct?: Product }) {
  const params = useSearchParams();
  const initial = params.get("view") || "home";
  const [view, setView] = useState(initial),
    [products, setProducts] = useState<Product[]>([]),
    [tax, setTax] = useState<{ id: number; kind: string; name: string }[]>([]),
    [query, setQuery] = useState(params.get("q") || ""),
    [category, setCategory] = useState(params.get("category") || ""),
    [brand, setBrand] = useState(""),
    [sort, setSort] = useState("name"),
    [selected, setSelected] = useState<Product | null>(initialProduct || null),
    [cart, setCart] = useState<CartLine[]>([]),
    [wishlist, setWishlist] = useState<number[]>([]),
    [ready, setReady] = useState(false),
    [mobile, setMobile] = useState(false),
    [notice, setNotice] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [zones, setZones] = useState<Content[]>([]),
    [blogs, setBlogs] = useState<Content[]>([]),
    [settings, setSettings] = useState<Content[]>([]),
    [order, setOrder] = useState<any>(null),
    [delivery, setDelivery] = useState("pickup"),
    [zoneId, setZoneId] = useState("");
  useEffect(() => {
    try {
      setCart(JSON.parse(localStorage.getItem("meena-cart") || "[]"));
      setWishlist(JSON.parse(localStorage.getItem("meena-wishlist") || "[]"));
    } catch {}
    setReady(true);
    Promise.all([
      api("/api/taxonomies"),
      api("/api/content/delivery"),
      api("/api/content/blog"),
      api("/api/content/settings"),
    ])
      .then(([t, z, b, s]) => {
        setTax(t);
        setZones(z);
        setBlogs(b);
        setSettings(s);
      })
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (ready) {
      localStorage.setItem("meena-cart", JSON.stringify(cart));
      localStorage.setItem("meena-wishlist", JSON.stringify(wishlist));
    }
  }, [cart, wishlist, ready]);
  useEffect(() => {
    setBusy(true);
    setError("");
    const p = new URLSearchParams({
      q: query,
      category,
      brand,
      sort,
      limit: "100",
    });
    if (view === "bestsellers") p.set("bestseller", "true");
    if (view === "new") p.set("is_new", "true");
    api("/api/products?" + p)
      .then((d) => setProducts(d.items))
      .catch((e) =>
        setError(
          "The collection is temporarily unavailable. Please contact us on WhatsApp.",
        ),
      )
      .finally(() => setBusy(false));
  }, [query, category, brand, sort, view]);
  const go = (v: string, c = "") => {
    setView(v);
    setCategory(c);
    setQuery("");
    setBrand("");
    setMobile(false);
    setSelected(null);
    setNotice("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const add = (p: Product) => {
    if (p.price === null || p.stock < 1) return;
    setCart((prev) => {
      const exists = prev.find((x) => x.product.id === p.id);
      if (exists && exists.quantity >= p.stock) {
        setNotice("You have added all available stock.");
        return prev;
      }
      return exists
        ? prev.map((x) =>
            x.product.id === p.id ? { ...x, quantity: x.quantity + 1 } : x,
          )
        : [...prev, { product: p, quantity: 1 }];
    });
    setNotice(p.name + " added to your bag.");
  };
  const wish = (id: number) =>
    setWishlist((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  const total = cart.reduce(
    (n, l) => n + (l.product.price || 0) * l.quantity,
    0,
  );
  const fee =
    delivery === "delivery"
      ? Number(zones.find((z) => z.id === Number(zoneId))?.fee || 0)
      : 0;
  const card = (p: Product) => (
    <article className="product" key={p.id}>
      <div className="product-picture">
        <button
          className="image-button"
          onClick={() => setSelected(p)}
          aria-label={"View " + p.name}
        >
          {p.images[0] ? (
            <img
              src={p.images[0]}
              alt={p.alt || p.name}
              width="500"
              height="600"
              loading="lazy"
            />
          ) : (
            <Bottle category={p.category} />
          )}
        </button>
        <button
          className={"wish " + (wishlist.includes(p.id) ? "active" : "")}
          onClick={() => wish(p.id)}
          aria-label={"Save " + p.name}
        >
          <Heart size={18} />
        </button>
        {(p.bestseller || p.is_new) && (
          <span className="badge">
            {p.bestseller ? "SELECTED FAVOURITE" : "NEW ARRIVAL"}
          </span>
        )}
      </div>
      <div className="product-info">
        <small>{p.brand}</small>
        <a
          className="product-title"
          href={"/products/" + p.slug}
          onClick={(e) => {
            e.preventDefault();
            setSelected(p);
          }}
        >
          {p.name}
        </a>
        <span>
          {p.price === null ? "Price Coming Soon" : money(p.price)}{" "}
          {p.compare_at && p.price !== null && p.compare_at > p.price && (
            <del>{money(p.compare_at)}</del>
          )}
        </span>
        <button
          className="add"
          onClick={() =>
            p.price !== null && p.stock > 0
              ? add(p)
              : window.open(
                  WA +
                    encodeURIComponent(
                      "Hello FragrancedByMeena, please share the price and availability of " +
                        p.name,
                    ),
                  "_blank",
                  "noopener,noreferrer",
                )
          }
        >
          {p.price === null
            ? "ENQUIRE ABOUT THIS SCENT"
            : p.stock > 0
              ? "ADD TO BAG"
              : "ASK ABOUT AVAILABILITY"}
          <Plus size={14} />
        </button>
      </div>
    </article>
  );
  const submit = async (e: React.FormEvent<HTMLFormElement>, path: string) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    const f = new FormData(e.currentTarget);
    const body: Record<string, unknown> = Object.fromEntries(f);
    if (path === "newsletter") body.consent = f.get("consent") === "on";
    try {
      const d = await api("/api/" + path, body);
      setNotice(d.message);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const checkout = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    const f = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const d = await api("/api/checkout", {
        customer: { ...f, delivery, zone_id: zoneId ? Number(zoneId) : null },
        items: cart.map((l) => ({
          product_id: l.product.id,
          quantity: l.quantity,
        })),
      });
      setOrder(d);
      setCart([]);
      localStorage.setItem("meena-last-order", JSON.stringify(d));
      setView("confirmation");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <div className="announcement">
        {settings.at(-1)?.announcement ||
          "Carefully selected scents • Personal fragrance assistance • Ghana"}
      </div>
      <header>
        <a className="wordmark brand-logo" href="/">
          <img src="/fragrancedbymeena-logo.webp" alt="FragrancedByMeena logo" width="150" height="122" />
        </a>
        <nav className={mobile ? "open" : ""}>
          {[
            ["home", "Home"],
            ["shop", "Shop"],
            ["collections", "Collections"],
            ["bestsellers", "Bestsellers"],
            ["new", "New Arrivals"],
            ["about", "Our Story"],
            ["blog", "Journal"],
            ["contact", "Contact"],
          ].map(([v, label]) => (
            <button
              className={view === v ? "current" : ""}
              key={v}
              onClick={() => go(v)}
            >
              {label}
            </button>
          ))}
        </nav>
        <div className="header-actions">
          <button onClick={() => go("shop")} aria-label="Search">
            <Search size={20} />
          </button>
          <button onClick={() => go("wishlist")} aria-label="Wishlist">
            <Heart size={20} />
          </button>
          <button onClick={() => go("cart")} aria-label="Shopping bag">
            <ShoppingBag size={20} />
            <sup>{cart.reduce((n, l) => n + l.quantity, 0)}</sup>
          </button>
          <button
            className="menu"
            onClick={() => setMobile(!mobile)}
            aria-label="Menu"
          >
            {mobile ? <X /> : <Menu />}
          </button>
        </div>
      </header>
      {notice && (
        <div className="notice" role="status">
          {notice}
          <button onClick={() => setNotice("")} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
      <main>
        {view === "home" ? (
          <>
            <section className="hero">
              <div className="hero-copy">
                <span className="eyebrow">THE ART OF EVERYDAY LUXURY</span>
                <h1>
                  Your signature
                  <br />
                  scent starts <em>here.</em>
                </h1>
                <p>
                  For every mood. Every moment. Every version of you. Discover a
                  world of carefully selected fragrances at FragrancedByMeena.
                </p>
                <div className="buttons">
                  <button className="primary" onClick={() => go("shop")}>
                    EXPLORE THE COLLECTION <ArrowUpRight size={17} />
                  </button>
                  <button
                    className="text-button"
                    onClick={() => go("collections")}
                  >
                    Find your fragrance →
                  </button>
                </div>
                <span className="hero-foot">
                  PERFUMES · HOME FRAGRANCE · GIFT SETS
                </span>
              </div>
              <div className="hero-art">
                {settings.at(-1)?.hero_image ? (
                  <img
                    src={settings.at(-1)?.hero_image}
                    alt="FragrancedByMeena fragrance collection"
                  />
                ) : (
                  <>
                    <div className="arch" />
                    <Bottle />
                    <div className="hero-caption">
                      A little luxury.
                      <br />
                      <em>A lasting impression.</em>
                    </div>
                  </>
                )}
              </div>
            </section>
            <section className="section">
              <div className="section-head">
                <div>
                  <span className="eyebrow">MAKE IT PERSONAL</span>
                  <h2>A scent for every story.</h2>
                </div>
                <button
                  className="text-button"
                  onClick={() => go("collections")}
                >
                  All collections <ArrowUpRight size={16} />
                </button>
              </div>
              <div className="categories">
                {["Perfumes", "Arabian Perfumes", "Diffusers", "Gift Sets"].map(
                  (c, i) => (
                    <button
                      key={c}
                      className={"category c" + i}
                      onClick={() => go("shop", c)}
                    >
                      <span>0{i + 1}</span>
                      <h3>{c}</h3>
                      <p>
                        {
                          [
                            "Find your signature",
                            "Rich. Warm. Unforgettable.",
                            "Make a room feel like home",
                            "Give a beautiful moment",
                          ][i]
                        }
                      </p>
                      <ArrowUpRight />
                    </button>
                  ),
                )}
              </div>
            </section>
            <section className="brands">
              {tax
                .filter((t) => t.kind === "brand")
                .map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      go("shop");
                      setBrand(t.name);
                    }}
                  >
                    {t.name}
                  </button>
                ))}
            </section>
            <section className="section">
              <div className="section-head">
                <div>
                  <span className="eyebrow">THE CURATED EDIT</span>
                  <h2>Meet your next favourite.</h2>
                </div>
                <button className="text-button" onClick={() => go("shop")}>
                  Shop all scents <ArrowUpRight size={16} />
                </button>
              </div>
              {busy ? (
                <p>Opening the collection…</p>
              ) : (
                <div className="product-grid">
                  {products
                    .filter((p) => p.featured || p.bestseller)
                    .slice(0, 4)
                    .map(card)}
                </div>
              )}
            </section>
            <section className="editorial">
              <span className="eyebrow">MORE THAN A FRAGRANCE</span>
              <h2>
                Wear confidence.
                <br />
                <em>Leave an impression.</em>
              </h2>
              <p>
                From a thoughtful gift to a new everyday favourite,
                <br />
                let us help you find something that feels like you.
              </p>
              <a
                className="primary light"
                href={
                  WA +
                  encodeURIComponent(
                    "Hello, help me choose my signature scent.",
                  )
                }
                target="_blank"
                rel="noopener noreferrer"
              >
                FIND YOUR SCENT WITH US <ArrowUpRight size={17} />
              </a>
            </section>
            <section className="section trust">
              {[
                [
                  Gift,
                  "Thoughtfully selected",
                  "Scents for every personality and occasion.",
                ],
                [
                  Truck,
                  "Delivery assistance",
                  "Contact us to confirm your delivery area.",
                ],
                [
                  MessageCircle,
                  "A personal touch",
                  "Real fragrance advice, just a message away.",
                ],
                [
                  ShieldCheck,
                  "Clear payment choices",
                  "Confirm your order securely with our team.",
                ],
              ].map(([Icon, title, copy]: any) => (
                <div key={title}>
                  <Icon size={27} />
                  <h3>{title}</h3>
                  <p>{copy}</p>
                </div>
              ))}
            </section>
            <section className="newsletter">
              <span className="eyebrow">A LITTLE LUXURY IN YOUR INBOX</span>
              <h2>Good scents. Great discoveries.</h2>
              <p>New fragrances, gift ideas and updates from our world.</p>
              <form onSubmit={(e) => submit(e, "newsletter")}>
                <div className="inline-form">
                  <input
                    aria-label="Email address"
                    name="email"
                    type="email"
                    placeholder="Your email address"
                    required
                  />
                  <button disabled={busy}>SUBSCRIBE →</button>
                </div>
                <label className="consent">
                  <input type="checkbox" name="consent" required /> I agree to
                  receive fragrance news and offers.
                </label>
              </form>
            </section>
          </>
        ) : view === "shop" ||
          view === "bestsellers" ||
          view === "new" ||
          view === "wishlist" ? (
          <section className="section shop">
            <span className="eyebrow">DISCOVER FRAGRANCEDBYMEENA</span>
            <h1>
              {view === "wishlist"
                ? "Your favourites"
                : view === "bestsellers"
                  ? "Selected favourites"
                  : view === "new"
                    ? "New arrivals"
                    : "The fragrance collection"}
            </h1>
            <p>Find something that feels like you.</p>
            <div className="filters">
              <label>
                <Search size={16} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search names, brands or notes"
                />
              </label>
              <select
                aria-label="Category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">All categories</option>
                {tax
                  .filter((t) => t.kind === "category")
                  .map((t) => (
                    <option key={t.id}>{t.name}</option>
                  ))}
              </select>
              <select
                aria-label="Brand"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
              >
                <option value="">All brands</option>
                {tax
                  .filter((t) => t.kind === "brand")
                  .map((t) => (
                    <option key={t.id}>{t.name}</option>
                  ))}
              </select>
              <select
                aria-label="Sort"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                <option value="name">A–Z</option>
                <option value="newest">Newest</option>
                <option value="price-asc">Price: low to high</option>
                <option value="price-desc">Price: high to low</option>
              </select>
            </div>
            {busy ? (
              <p>Opening the collection…</p>
            ) : (
              <>
                <div className="product-grid">
                  {products
                    .filter(
                      (p) => view !== "wishlist" || wishlist.includes(p.id),
                    )
                    .map(card)}
                </div>
                {!products.filter(
                  (p) => view !== "wishlist" || wishlist.includes(p.id),
                ).length && (
                  <div className="empty">
                    <h2>
                      {view === "wishlist"
                        ? "Save the scents you love."
                        : "More discoveries are on the way."}
                    </h2>
                    <p>
                      {view === "wishlist"
                        ? "Tap the heart on any product to start your collection."
                        : "Try another filter or ask our team for recommendations."}
                    </p>
                    <button className="primary" onClick={() => go("shop")}>
                      EXPLORE ALL PRODUCTS
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        ) : view === "collections" ? (
          <section className="section">
            <span className="eyebrow">EXPLORE YOUR WORLD OF SCENT</span>
            <h1>The collections</h1>
            <div className="categories">
              {tax
                .filter((t) => t.kind === "category")
                .map((t) => (
                  <button
                    className="category"
                    key={t.id}
                    onClick={() => go("shop", t.name)}
                  >
                    <h3>{t.name}</h3>
                    <ArrowUpRight />
                  </button>
                ))}
            </div>
          </section>
        ) : view === "cart" ? (
          <section className="section narrow">
            <span className="eyebrow">A LITTLE LUXURY, ALL YOURS</span>
            <h1>Your shopping bag</h1>
            {cart.length ? (
              <>
                {cart.map((l) => (
                  <div className="cart-line" key={l.product.id}>
                    <div>
                      <small>{l.product.brand}</small>
                      <h3>{l.product.name}</h3>
                      <span>{money(l.product.price || 0)}</span>
                    </div>
                    <div className="quantity">
                      <button
                        aria-label="Decrease quantity"
                        onClick={() =>
                          setCart(
                            cart.flatMap((x) =>
                              x.product.id === l.product.id
                                ? x.quantity > 1
                                  ? [{ ...x, quantity: x.quantity - 1 }]
                                  : []
                                : [x],
                            ),
                          )
                        }
                      >
                        <Minus size={14} />
                      </button>
                      {l.quantity}
                      <button
                        aria-label="Increase quantity"
                        onClick={() => add(l.product)}
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <button
                      className="text-button"
                      onClick={() =>
                        setCart(
                          cart.filter((x) => x.product.id !== l.product.id),
                        )
                      }
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <div className="summary">
                  <span>Subtotal</span>
                  <strong>{money(total)}</strong>
                </div>
                <p>
                  Delivery costs are shown at checkout for configured areas.
                </p>
                <button className="primary" onClick={() => go("checkout")}>
                  CONTINUE TO CHECKOUT <ArrowUpRight size={17} />
                </button>
              </>
            ) : (
              <div className="empty">
                <h2>Your bag is waiting for something beautiful.</h2>
                <button className="primary" onClick={() => go("shop")}>
                  EXPLORE THE COLLECTION
                </button>
              </div>
            )}
          </section>
        ) : view === "checkout" ? (
          <section className="section narrow">
            <span className="eyebrow">YOUR ORDER, MADE SIMPLE</span>
            <h1>Checkout</h1>
            <div className="notice">
              Online payment activation is in progress. Please use WhatsApp to
              confirm your order.
            </div>
            {!cart.length ? (
              <button className="primary" onClick={() => go("shop")}>
                EXPLORE THE COLLECTION
              </button>
            ) : (
              <form className="form" onSubmit={checkout}>
                <h3>1. Your details</h3>
                <div className="two">
                  <label>
                    Full name
                    <input name="name" required minLength={2} />
                  </label>
                  <label>
                    Phone / WhatsApp
                    <input name="phone" type="tel" required minLength={9} />
                  </label>
                </div>
                <label>
                  Email (optional)
                  <input name="email" type="email" />
                </label>
                <h3>2. Delivery</h3>
                <select
                  aria-label="Delivery method"
                  value={delivery}
                  onChange={(e) => setDelivery(e.target.value)}
                >
                  <option value="pickup">
                    Pickup at Oyarifa School Junction
                  </option>
                  <option value="delivery" disabled={!zones.length}>
                    Delivery{!zones.length ? " — contact us to arrange" : ""}
                  </option>
                </select>
                {delivery === "delivery" && (
                  <>
                    <label>
                      Delivery area
                      <select
                        required
                        value={zoneId}
                        onChange={(e) => setZoneId(e.target.value)}
                      >
                        <option value="">Choose your area</option>
                        {zones.map((z) => (
                          <option key={z.id} value={z.id}>
                            {z.name} — {money(Number(z.fee))}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="two">
                      <label>
                        Region
                        <input name="region" required />
                      </label>
                      <label>
                        City / Town
                        <input name="town" required />
                      </label>
                    </div>
                    <label>
                      Area / Address
                      <input name="address" required />
                    </label>
                    <label>
                      Digital address
                      <input name="digital_address" />
                    </label>
                    <label>
                      Landmark
                      <input name="landmark" />
                    </label>
                  </>
                )}
                <label>
                  Order / delivery instructions
                  <textarea name="instructions" />
                </label>
                <h3>3. Payment</h3>
                <div className="payment-options">
                  <div>
                    Mobile Money{" "}
                    <small>
                      MTN · Telecel · AT Money — Integration Coming Soon
                    </small>
                  </div>
                  <div>
                    Visa / Mastercard <small>Integration Coming Soon</small>
                  </div>
                  <div>
                    <b>Confirm with our team</b>
                    <small>
                      Your order remains unpaid until payment is verified.
                    </small>
                  </div>
                </div>
                <div className="summary">
                  <span>
                    Total {delivery === "delivery" ? "including delivery" : ""}
                  </span>
                  <strong>{money(total + fee)}</strong>
                </div>
                <button className="primary" disabled={busy}>
                  {busy ? "SUBMITTING…" : "PLACE ORDER FOR CONFIRMATION"}
                </button>
              </form>
            )}
          </section>
        ) : view === "confirmation" && order ? (
          <section className="section narrow">
            <span className="eyebrow">THANK YOU FOR CHOOSING MEENA</span>
            <h1>Your order request is received.</h1>
            <p>
              Reference: <strong>{order.reference}</strong>
            </p>
            <p>Total: {money(order.total)} · Payment: Pending</p>
            <p>
              Save your tracking key: <code>{order.access_token}</code>
            </p>
            <p>
              Your items and delivery arrangements will be confirmed by our
              team. Payment has not been processed.
            </p>
            <a
              className="primary"
              href={
                WA +
                encodeURIComponent(
                  "Hello FragrancedByMeena, please confirm my order " +
                    order.reference +
                    " (" +
                    money(order.total) +
                    ").",
                )
              }
              target="_blank"
              rel="noopener noreferrer"
            >
              CONFIRM ON WHATSAPP
            </a>
            <button className="text-button" onClick={() => go("tracking")}>
              Track this order
            </button>
          </section>
        ) : view === "tracking" ? (
          <section className="section narrow">
            <h1>Track your order</h1>
            <form
              className="form"
              onSubmit={async (e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                try {
                  const d = await api(
                    "/api/orders/" +
                      encodeURIComponent(String(f.get("reference"))) +
                      "?token=" +
                      encodeURIComponent(String(f.get("token"))),
                  );
                  setNotice(
                    d.reference +
                      " · " +
                      d.status +
                      " · Payment " +
                      d.payment_status,
                  );
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              <label>
                Order reference
                <input
                  name="reference"
                  defaultValue={order?.reference || ""}
                  required
                />
              </label>
              <label>
                Tracking key
                <input
                  name="token"
                  defaultValue={order?.access_token || ""}
                  required
                />
              </label>
              <button className="primary">CHECK ORDER STATUS</button>
            </form>
          </section>
        ) : view === "about" ? (
          <section className="section story">
            <span className="eyebrow">OUR WORLD</span>
            <h1>
              Fragrance is a feeling.
              <br />
              <em>Make it yours.</em>
            </h1>
            <p>
              FragrancedByMeena is a fragrance and lifestyle destination
              offering carefully selected luxury-inspired perfumes, Arabian
              fragrances, diffusers, body mists and gift sets.
            </p>
            <p>
              We believe fragrance is more than something you wear. It is an
              expression of personality, confidence and memory.
            </p>
            <p>
              Our collection brings together scents for different personalities,
              occasions and budgets while making fragrance shopping simple,
              personal and enjoyable.
            </p>
            <a
              className="primary"
              href={
                WA +
                encodeURIComponent(
                  "Hello, I would like fragrance recommendations.",
                )
              }
              target="_blank"
              rel="noopener noreferrer"
            >
              LET’S FIND YOUR SCENT
            </a>
          </section>
        ) : view === "contact" ? (
          <section className="section">
            <span className="eyebrow">WE’D LOVE TO HEAR FROM YOU</span>
            <h1>Let’s talk fragrance.</h1>
            <div className="contact-grid">
              <div>
                <h3>Visit FragrancedByMeena</h3>
                <p>
                  Gracefield Montessori School
                  <br />
                  Oyarifa School Junction
                  <br />
                  Accra, Ghana
                </p>
                <p>
                  <a href="tel:+233593044618">Call: 0593044618</a>
                  <br />
                  <a
                    href={WA + encodeURIComponent("Hello FragrancedByMeena!")}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    WhatsApp: 0591630727
                  </a>
                </p>
                <a
                  className="text-button"
                  href={maps}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Get directions <ArrowUpRight size={16} />
                </a>
                <iframe
                  src={mapEmbed}
                  title="FragrancedByMeena business area"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
              <form className="form" onSubmit={(e) => submit(e, "contact")}>
                <label>
                  Name
                  <input name="name" required />
                </label>
                <label>
                  Email
                  <input type="email" name="email" required />
                </label>
                <label>
                  Your message
                  <textarea name="message" required minLength={5} />
                </label>
                <button className="primary" disabled={busy}>
                  SEND MESSAGE
                </button>
                <small>
                  Our team receives this message in the store dashboard.
                </small>
              </form>
            </div>
          </section>
        ) : view === "blog" ? (
          <section className="section">
            <span className="eyebrow">THE FRAGRANCE JOURNAL</span>
            <h1>Notes from our world.</h1>
            {blogs.length ? (
              blogs.map((b) => (
                <article className="blog-post" key={b.id}>
                  <h2>{b.title}</h2>
                  <p>{b.body}</p>
                </article>
              ))
            ) : (
              <div className="empty">
                <h2>A beautiful story is on its way.</h2>
                <p>
                  Fragrance guides, gifting ideas and inspiration will appear
                  here.
                </p>
                <a
                  className="text-button"
                  href={
                    WA +
                    encodeURIComponent(
                      "Hello, I would like advice on choosing a fragrance.",
                    )
                  }
                >
                  Ask us for fragrance advice →
                </a>
              </div>
            )}
          </section>
        ) : (
          <section className="section narrow">
            <span className="eyebrow">SHOPPING WITH FRAGRANCEDBYMEENA</span>
            <h1>
              {view === "privacy"
                ? "Privacy"
                : view === "terms"
                  ? "Terms & conditions"
                  : view === "returns"
                    ? "Returns & refunds"
                    : view === "delivery"
                      ? "Delivery & pickup"
                      : "Frequently asked questions"}
            </h1>
            {view === "privacy" ? (
              <>
                <p>
                  When you submit an order or contact form, the store records
                  your supplied details to respond to your request and manage
                  your order. Newsletter subscriptions require your consent.
                </p>
                <p>
                  Your shopping bag and favourites are saved in this browser.
                  Please contact us on WhatsApp for questions about your data or
                  to request removal.
                </p>
                <p className="muted">
                  This policy is awaiting final business approval before a
                  production launch.
                </p>
              </>
            ) : view === "delivery" ? (
              <>
                <p>
                  Pickup is available by arrangement at Gracefield Montessori
                  School, Oyarifa School Junction, Accra.
                </p>
                <p>
                  Configured delivery areas and charges appear during checkout.
                  Contact us to confirm other areas and delivery timing.
                </p>
              </>
            ) : view === "returns" || view === "terms" ? (
              <>
                <p>
                  Online payment activation is in progress. Orders require
                  confirmation from our team, including price, availability and
                  delivery arrangements.
                </p>
                <p>
                  Please contact us before returning a product so we can explain
                  the applicable arrangements.
                </p>
                <p className="muted">
                  The final{" "}
                  {view === "returns"
                    ? "return and refund"
                    : "terms and conditions"}{" "}
                  policy requires business approval before a production launch.
                </p>
              </>
            ) : (
              <>
                <h3>How do I order?</h3>
                <p>
                  Add available priced products to your bag, submit your order
                  request and confirm with us on WhatsApp.
                </p>
                <h3>Can you help me choose?</h3>
                <p>
                  Yes. Tell us the scents you enjoy, your occasion and budget,
                  and we’ll help you explore the collection.
                </p>
                <h3>Is Mobile Money active?</h3>
                <p>
                  Online payment is not active yet. Confirm payment arrangements
                  directly with our team.
                </p>
              </>
            )}
          </section>
        )}
      </main>
      <footer>
        <div className="footer-top">
          <div>
            <a className="wordmark brand-logo" href="/">
              <img src="/fragrancedbymeena-logo.webp" alt="FragrancedByMeena logo" width="150" height="122" />
            </a>
            <p>
              Every mood. Every moment.
              <br />A fragrance that feels like you.
            </p>
            <div className="social">
              <a
                href="https://www.instagram.com/fragranced_by_meena/"
                aria-label="Instagram"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Instagram size={20} />
              </a>
              <a
                href="https://www.tiktok.com/@fragrancedbymeena"
                target="_blank"
                rel="noopener noreferrer"
              >
                TikTok ↗
              </a>
            </div>
          </div>
          <div>
            <h4>THE COLLECTION</h4>
            {["Perfumes", "Diffusers", "Body Mists", "Gift Sets"].map((c) => (
              <button key={c} onClick={() => go("shop", c)}>
                {c}
              </button>
            ))}
          </div>
          <div>
            <h4>HERE TO HELP</h4>
            {[
              ["contact", "Contact us"],
              ["tracking", "Track your order"],
              ["delivery", "Delivery & pickup"],
              ["returns", "Returns & refunds"],
              ["faq", "FAQs"],
            ].map(([v, l]) => (
              <button key={v} onClick={() => go(v)}>
                {l}
              </button>
            ))}
          </div>
          <div>
            <h4>COME SAY HELLO</h4>
            <p>
              Gracefield Montessori School
              <br />
              Oyarifa School Junction, Accra
            </p>
            <a href="tel:+233593044618">0593044618</a>
            <a href={WA + encodeURIComponent("Hello FragrancedByMeena!")}>
              WhatsApp us ↗
            </a>
            <a href={maps} target="_blank" rel="noopener noreferrer">
              Find us on the map ↗
            </a>
          </div>
        </div>
        <div className="footer-bottom">
          <span>
            © {new Date().getFullYear()} FragrancedByMeena. All rights reserved.
          </span>
          <div>
            <button onClick={() => go("privacy")}>Privacy</button>
            <button onClick={() => go("terms")}>Terms</button>
            <a href="/admin">Store management</a>
          </div>
          <span>Mobile Money activation in progress</span>
        </div>
      </footer>
      <a
        className="floating-wa"
        href={
          WA +
          encodeURIComponent(
            "Hello FragrancedByMeena, I would like to enquire about your fragrances.",
          )
        }
        aria-label="Chat on WhatsApp"
        target="_blank"
        rel="noopener noreferrer"
      >
        <MessageCircle size={25} />
      </a>
      {selected && (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <section
            className="product-modal"
            role="dialog"
            aria-modal="true"
            aria-label={selected.name}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="close"
              onClick={() => setSelected(null)}
              aria-label="Close product"
            >
              <X />
            </button>
            <div className="detail-image">
              {selected.images[0] ? (
                <img
                  src={selected.images[0]}
                  alt={selected.alt || selected.name}
                />
              ) : (
                <Bottle />
              )}
              {selected.images.slice(1).map((src) => (
                <img
                  key={src}
                  src={src}
                  alt={selected.name + " additional view"}
                />
              ))}
            </div>
            <div className="detail-copy">
              <span className="eyebrow">{selected.brand}</span>
              <h2>{selected.name}</h2>
              <a className="text-button" href={"/products/" + selected.slug}>
                Product details ↗
              </a>
              <p>
                {selected.description ||
                  "Discover this fragrance with our team."}
              </p>
              <p>
                {selected.price === null
                  ? "Price Coming Soon"
                  : money(selected.price)}
              </p>
              {selected.size && <p>Size: {selected.size}</p>}
              {selected.notes && <p>Fragrance notes: {selected.notes}</p>}
              <p>
                {selected.price === null
                  ? "Contact us for current availability."
                  : selected.stock > 0
                    ? "In stock"
                    : "Out of stock"}
              </p>
              {selected.price !== null && selected.stock > 0 && (
                <button className="primary" onClick={() => add(selected)}>
                  ADD TO BAG <ShoppingBag size={17} />
                </button>
              )}
              <a
                className="text-button"
                href={
                  WA +
                  encodeURIComponent(
                    "Hello FragrancedByMeena, I would like to enquire about " +
                      selected.name +
                      ".",
                  )
                }
                target="_blank"
                rel="noopener noreferrer"
              >
                Enquire on WhatsApp <ArrowUpRight size={16} />
              </a>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
