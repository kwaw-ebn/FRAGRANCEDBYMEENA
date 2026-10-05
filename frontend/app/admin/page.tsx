"use client";
import { useEffect, useState } from "react";
import type { Product } from "../store";
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const blank = {
  name: "",
  brand: "",
  category: "Perfumes",
  slug: "",
  gender: "Unisex",
  family: "",
  description: "",
  price: null,
  compare_at: null,
  stock: 0,
  low_stock: 5,
  size: "",
  notes: "",
  images: [],
  alt: "",
  featured: false,
  bestseller: false,
  is_new: false,
  published: true,
  seo_title: "",
  meta_description: "",
};
export default function Admin() {
  const [token, setToken] = useState(""),
    [tab, setTab] = useState("Dashboard"),
    [products, setProducts] = useState<Product[]>([]),
    [orders, setOrders] = useState<any[]>([]),
    [content, setContent] = useState<any[]>([]),
    [taxonomy, setTaxonomy] = useState<any[]>([]),
    [editing, setEditing] = useState<any>(null),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [q, setQ] = useState("");
  useEffect(() => {
    setToken(sessionStorage.getItem("meena-admin") || "");
  }, []);
  async function request(path: string, method = "GET", body?: unknown) {
    const r = await fetch(API + path, {
      method,
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json",
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const d = await r.json();
    if (!r.ok) {
      if (r.status === 401) {
        setToken("");
        sessionStorage.removeItem("meena-admin");
      }
      throw Error(
        typeof d.detail === "string"
          ? d.detail
          : "Check all fields. Prices must be positive and image links must use HTTPS.",
      );
    }
    return d;
  }
  async function load() {
    try {
      const [p, o, c, t] = await Promise.all([
        request("/api/admin/products"),
        request("/api/admin/orders"),
        request("/api/admin/content"),
        request("/api/taxonomies"),
      ]);
      setProducts(p);
      setOrders(o);
      setContent(c);
      setTaxonomy(t);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    if (token) load();
  }, [token]);
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await fn();
      setMessage("Saved successfully.");
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (!token)
    return (
      <main className="section narrow">
        <a className="wordmark brand-logo" href="/">
          <img src="/fragrancedbymeena-logo.webp" alt="FragrancedByMeena logo" width="150" height="122" />
        </a>
        <h1 style={{ marginTop: 60 }}>Store management</h1>
        <p>Sign in to manage your catalogue and orders.</p>
        {error && <div className="error">{error}</div>}
        <form
          className="form"
          onSubmit={async (e) => {
            e.preventDefault();
            setError("");
            setBusy(true);
            const f = Object.fromEntries(new FormData(e.currentTarget));
            try {
              const r = await fetch(API + "/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(f),
              });
              const d = await r.json();
              if (!r.ok) throw Error(d.detail);
              sessionStorage.setItem("meena-admin", d.token);
              setToken(d.token);
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Email
            <input name="email" type="email" autoComplete="username" required />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </label>
          <button className="primary" disabled={busy}>
            {busy ? "SIGNING IN…" : "SIGN IN"}
          </button>
        </form>
        <p className="muted">
          Access is configured by the store owner during setup.
        </p>
      </main>
    );
  const tabs = [
    "Dashboard",
    "Products",
    "Orders",
    "Brands & categories",
    "Blog",
    "Delivery",
    "Messages",
    "Newsletter",
    "Homepage",
    "Security",
  ];
  return (
    <main className="admin">
      <div className="admin-header">
        <div>
          <span className="eyebrow">FRAGRANCEDBYMEENA</span>
          <h1>Store management</h1>
        </div>
        <div>
          <a className="text-button" href="/">
            View store ↗
          </a>
          <button
            className="text-button"
            onClick={() => {
              sessionStorage.removeItem("meena-admin");
              setToken("");
            }}
          >
            Sign out
          </button>
        </div>
      </div>
      <div className="admin-nav">
        {tabs.map((t) => (
          <button
            key={t}
            className={t === tab ? "current" : ""}
            onClick={() => {
              setTab(t);
              setEditing(null);
            }}
          >
            {t}
          </button>
        ))}
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
      {tab === "Dashboard" && (
        <>
          <div className="admin-cards">
            <div>
              Products<b>{products.length}</b>
            </div>
            <div>
              Orders<b>{orders.length}</b>
            </div>
            <div>
              Pending orders
              <b>{orders.filter((o) => o.status === "Pending").length}</b>
            </div>
            <div>
              Low stock
              <b>
                {
                  products.filter(
                    (p) => p.price !== null && p.stock <= p.low_stock,
                  ).length
                }
              </b>
            </div>
          </div>
          <h2 style={{ marginTop: 40 }}>Ready for your next chapter.</h2>
          <p>
            Add your product prices, stock and photographs to make products
            available for checkout. Online payment integration is not active;
            all orders remain unpaid.
          </p>
          <p>
            No sales revenue is reported until verified payments are
            implemented.
          </p>
        </>
      )}
      {tab === "Products" && (
        <>
          <div className="section-head">
            <input
              aria-label="Search products"
              placeholder="Search products"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ maxWidth: 350 }}
            />
            <button
              className="primary"
              onClick={() => setEditing({ ...blank })}
            >
              ADD PRODUCT
            </button>
          </div>
          {editing && (
            <form
              className="admin-editor form"
              onSubmit={(e) => {
                e.preventDefault();
                run(async () => {
                  const { id, ...data } = editing;
                  await request(
                    "/api/admin/products" + (id ? "/" + id : ""),
                    id ? "PUT" : "POST",
                    data,
                  );
                  setEditing(null);
                });
              }}
            >
              <h2>{editing.id ? "Edit product" : "Add product"}</h2>
              <div className="two">
                {[
                  "name",
                  "brand",
                  "category",
                  "slug",
                  "gender",
                  "family",
                  "size",
                  "alt",
                  "seo_title",
                  "meta_description",
                ].map((k) => (
                  <label key={k}>
                    {k.replaceAll("_", " ")}
                    <input
                      required={["name", "brand", "category"].includes(k)}
                      value={editing[k]}
                      onChange={(e) =>
                        setEditing({ ...editing, [k]: e.target.value })
                      }
                    />
                  </label>
                ))}
              </div>
              <div className="two">
                {["price", "compare_at", "stock", "low_stock"].map((k) => (
                  <label key={k}>
                    {k.replaceAll("_", " ")}
                    <input
                      type="number"
                      step={k.includes("stock") ? "1" : "0.01"}
                      min={k.includes("stock") ? 0 : "0.01"}
                      value={editing[k] ?? ""}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          [k]:
                            e.target.value === ""
                              ? null
                              : Number(e.target.value),
                        })
                      }
                    />
                  </label>
                ))}
              </div>
              <label>
                Description
                <textarea
                  value={editing.description}
                  onChange={(e) =>
                    setEditing({ ...editing, description: e.target.value })
                  }
                />
              </label>
              <label>
                Fragrance notes
                <textarea
                  value={editing.notes}
                  onChange={(e) =>
                    setEditing({ ...editing, notes: e.target.value })
                  }
                />
              </label>
              <label>
                Photo URLs (one HTTPS URL per line)
                <textarea
                  value={editing.images.join("\n")}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      images: e.target.value.split("\n").filter(Boolean),
                    })
                  }
                />
              </label>
              <label>
                Upload photographs
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={async (e) => {
                    const files = Array.from(e.target.files || []);
                    setBusy(true);
                    try {
                      const urls: string[] = [];
                      for (const file of files) {
                        const data = new FormData();
                        data.append("file", file);
                        const r = await fetch(API + "/api/admin/upload", {
                          method: "POST",
                          headers: { Authorization: "Bearer " + token },
                          body: data,
                        });
                        const d = await r.json();
                        if (!r.ok) throw Error(d.detail);
                        urls.push(d.url);
                      }
                      setEditing((prev: any) => ({
                        ...prev,
                        images: [...prev.images, ...urls],
                      }));
                    } catch (e) {
                      setError((e as Error).message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                />
              </label>
              <div className="check-row">
                {["published", "featured", "bestseller", "is_new"].map((k) => (
                  <label key={k}>
                    <input
                      type="checkbox"
                      checked={editing[k]}
                      onChange={(e) =>
                        setEditing({ ...editing, [k]: e.target.checked })
                      }
                    />
                    {k.replaceAll("_", " ")}
                  </label>
                ))}
              </div>
              <div className="buttons">
                <button className="primary" disabled={busy}>
                  SAVE PRODUCT
                </button>
                <button type="button" onClick={() => setEditing(null)}>
                  Cancel
                </button>
              </div>
            </form>
          )}
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Brand</th>
                  <th>Price (GHS)</th>
                  <th>Stock</th>
                  <th>Visibility</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products
                  .filter((p) =>
                    (p.name + " " + p.brand)
                      .toLowerCase()
                      .includes(q.toLowerCase()),
                  )
                  .map((p) => (
                    <tr key={p.id}>
                      <td>{p.name}</td>
                      <td>{p.brand}</td>
                      <td>{p.price ?? "Awaiting price"}</td>
                      <td>{p.stock}</td>
                      <td>{p.published ? "Published" : "Draft"}</td>
                      <td>
                        <button onClick={() => setEditing(p)}>Edit</button>
                        <button
                          onClick={() => {
                            const { id, ...data } = p;
                            setEditing({
                              ...data,
                              name: p.name + " (Copy)",
                              slug: p.slug + "-copy",
                              published: false,
                            });
                          }}
                        >
                          Duplicate
                        </button>
                        <button
                          onClick={() =>
                            run(async () => {
                              const { id, ...data } = p;
                              await request(
                                "/api/admin/products/" + id,
                                "PUT",
                                { ...data, published: !p.published },
                              );
                            })
                          }
                        >
                          {p.published ? "Unpublish" : "Publish"}
                        </button>
                        <button
                          onClick={() => {
                            if (confirm("Delete " + p.name + "?"))
                              run(async () => {
                                await request(
                                  "/api/admin/products/" + p.id,
                                  "DELETE",
                                );
                              });
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {tab === "Orders" && (
        <>
          {!orders.length ? (
            <p>No orders yet. New order requests will appear here.</p>
          ) : (
            orders.map((o) => (
              <section className="admin-editor" key={o.id}>
                <h3>{o.reference}</h3>
                <p>
                  {o.customer.name} · {o.customer.phone} · GHS {o.total} ·
                  Payment {o.payment_status}
                </p>
                <p>
                  {o.customer.delivery === "pickup"
                    ? "Pickup"
                    : `${o.customer.region}, ${o.customer.town}, ${o.customer.address}`}
                  <br />
                  {o.customer.instructions}
                </p>
                {o.items.map((i: any) => (
                  <p key={i.product_id}>
                    {i.quantity} × {i.name} — GHS {i.price}
                  </p>
                ))}
                <select
                  aria-label="Order status"
                  value={o.status}
                  disabled={busy}
                  onChange={(e) =>
                    run(async () => {
                      await request("/api/admin/orders/" + o.id, "PUT", {
                        status: e.target.value,
                      });
                    })
                  }
                >
                  {[
                    "Pending",
                    "Confirmed",
                    "Processing",
                    "Packed",
                    "Out for Delivery",
                    "Delivered",
                    "Cancelled",
                    "Returned",
                  ].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
                <a
                  className="text-button"
                  href={
                    "https://wa.me/" +
                    o.customer.phone.replace(/^0/, "233").replace(/\D/g, "") +
                    "?text=" +
                    encodeURIComponent(
                      "Hello " +
                        o.customer.name +
                        ", regarding your FragrancedByMeena order " +
                        o.reference,
                    )
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Contact customer on WhatsApp ↗
                </a>
              </section>
            ))
          )}
        </>
      )}
      {tab === "Brands & categories" && (
        <>
          <form
            className="form"
            onSubmit={(e) => {
              e.preventDefault();
              const data = Object.fromEntries(new FormData(e.currentTarget));
              run(async () => {
                await request("/api/admin/taxonomies", "POST", data);
              });
            }}
          >
            <div className="two">
              <label>
                Type
                <select name="kind">
                  <option value="brand">Brand</option>
                  <option value="category">Category</option>
                  <option value="collection">Collection</option>
                </select>
              </label>
              <label>
                Name
                <input name="name" required />
              </label>
            </div>
            <button className="primary" disabled={busy}>
              ADD
            </button>
          </form>
          <div className="table-wrap">
            <table className="admin-table">
              <tbody>
                {taxonomy.map((t) => (
                  <tr key={t.id}>
                    <td>{t.kind}</td>
                    <td>{t.name}</td>
                    <td>
                      <button
                        onClick={() =>
                          run(async () => {
                            await request(
                              "/api/admin/taxonomies/" + t.id,
                              "DELETE",
                            );
                          })
                        }
                      >
                        Deactivate
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {["Blog", "Delivery", "Homepage"].includes(tab) && (
        <>
          <form
            className="form admin-editor"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const data: any = Object.fromEntries(f);
              if (tab === "Blog") data.published = f.get("published") === "on";
              if (tab === "Delivery") {
                data.active = true;
                data.fee = Number(f.get("fee"));
              }
              run(async () => {
                if (tab === "Homepage") {
                  for (const old of content.filter(
                    (c) => c.kind === "settings",
                  ))
                    await request("/api/admin/content/" + old.id, "DELETE");
                }
                await request("/api/admin/content", "POST", {
                  kind:
                    tab === "Blog"
                      ? "blog"
                      : tab === "Delivery"
                        ? "delivery"
                        : "settings",
                  data,
                });
              });
            }}
          >
            <h2>
              {tab === "Blog"
                ? "Publish an article"
                : tab === "Delivery"
                  ? "Add a delivery area"
                  : "Homepage settings"}
            </h2>
            {tab === "Blog" ? (
              <>
                <label>
                  Title
                  <input name="title" required />
                </label>
                <label>
                  Article text
                  <textarea name="body" required style={{ minHeight: 200 }} />
                </label>
                <label className="consent">
                  <input type="checkbox" name="published" defaultChecked />
                  Publish
                </label>
              </>
            ) : tab === "Delivery" ? (
              <>
                <label>
                  Area name
                  <input name="name" required />
                </label>
                <label>
                  Delivery charge (GHS)
                  <input
                    name="fee"
                    type="number"
                    min="0"
                    step="0.01"
                    required
                  />
                </label>
              </>
            ) : (
              <>
                <label>
                  Announcement
                  <input
                    name="announcement"
                    defaultValue={
                      content.find((c) => c.kind === "settings")?.data
                        .announcement || ""
                    }
                  />
                </label>
                <label>
                  Hero photograph URL
                  <input
                    name="hero_image"
                    type="url"
                    defaultValue={
                      content.find((c) => c.kind === "settings")?.data
                        .hero_image || ""
                    }
                  />
                </label>
              </>
            )}
            <button className="primary" disabled={busy}>
              SAVE
            </button>
          </form>
          {content
            .filter(
              (c) =>
                c.kind ===
                (tab === "Blog"
                  ? "blog"
                  : tab === "Delivery"
                    ? "delivery"
                    : "settings"),
            )
            .map((c) => (
              <div className="cart-line" key={c.id}>
                <p>
                  {c.data.title || c.data.name || c.data.announcement}{" "}
                  {c.data.fee !== undefined && " — GHS " + c.data.fee}
                </p>
                <button
                  onClick={() =>
                    run(async () => {
                      await request("/api/admin/content/" + c.id, "DELETE");
                    })
                  }
                >
                  Remove
                </button>
              </div>
            ))}
        </>
      )}
      {["Messages", "Newsletter"].includes(tab) && (
        <>
          {content.filter(
            (c) => c.kind === (tab === "Messages" ? "contact" : "newsletter"),
          ).length === 0 ? (
            <p>No {tab.toLowerCase()} yet.</p>
          ) : (
            content
              .filter(
                (c) =>
                  c.kind === (tab === "Messages" ? "contact" : "newsletter"),
              )
              .map((c) => (
                <div className="admin-editor" key={c.id}>
                  <h3>{c.data.name || c.data.email}</h3>
                  <p>{c.data.email}</p>
                  <p>{c.data.message}</p>
                  <small>{c.created_at}</small>
                  <button
                    className="text-button"
                    onClick={() => {
                      if (confirm("Remove this record?"))
                        run(async () => {
                          await request("/api/admin/content/" + c.id, "DELETE");
                        });
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))
          )}
        </>
      )}
      {tab === "Security" && (
        <form
          className="form admin-editor"
          onSubmit={(e) => {
            e.preventDefault();
            const data = Object.fromEntries(new FormData(e.currentTarget));
            run(async () => {
              await request("/api/admin/password", "POST", data);
            });
          }}
        >
          <h2>Change your password</h2>
          <p>
            Change your initial password after setup. Use at least 12
            characters.
          </p>
          <label>
            Current password
            <input name="current_password" type="password" required />
          </label>
          <label>
            New password
            <input
              name="new_password"
              type="password"
              minLength={12}
              required
            />
          </label>
          <button className="primary" disabled={busy}>
            UPDATE PASSWORD
          </button>
        </form>
      )}
    </main>
  );
}
