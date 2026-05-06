import { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { formatInr } from "@/lib/utils";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import {
  EMPTY_PRODUCT_FORM,
  normalizeSlug,
  productFormToPayload,
  productToForm,
  splitList,
} from "../lib/adminForms";
import { compressImageFileToWebp } from "../lib/imageCompression";
import { AdminHeader, Detail, EmptyState, Field, Select, StatusPill, TextArea, TextInput } from "../components/AdminUi";
import type { CollectionDoc, ProductDoc, ProductFormState } from "../types";

function stockLabel(count: number) {
  if (count <= 0) {
    return { label: "Out of Stock", tone: "danger" as const };
  }

  if (count < 25) {
    return { label: "Low Stock", tone: "warning" as const };
  }

  return { label: "In Stock", tone: "success" as const };
}

export function ProductAdminPanel({
  products,
  collections,
}: {
  products: ProductDoc[];
  collections: CollectionDoc[];
}) {
  const createProduct = useMutation(api.products.create);
  const updateProduct = useMutation(api.products.update);
  const removeProduct = useMutation(api.products.remove);
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft" | "low">("all");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [selectedId, setSelectedId] = useState<Id<"products"> | null>(products[0]?._id ?? null);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<ProductFormState>(EMPTY_PRODUCT_FORM);
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const collectionById = useMemo(
    () => new Map(collections.map((collection) => [collection._id, collection])),
    [collections],
  );

  const filteredProducts = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();
    return products.filter((product) => {
      const matchesSearch =
        query.length === 0 ||
        product.title.toLowerCase().includes(query) ||
        product.slug.toLowerCase().includes(query) ||
        product.tags.some((tag) => tag.toLowerCase().includes(query));

      if (!matchesSearch) {
        return false;
      }

      if (statusFilter === "published") {
        return product.isPublished;
      }

      if (statusFilter === "draft") {
        return !product.isPublished;
      }

      if (statusFilter === "low") {
        return product.inventoryCount < 25;
      }

      return true;
    });
  }, [deferredSearch, products, statusFilter]);

  const selectedProduct =
    products.find((product) => product._id === selectedId) ?? filteredProducts[0] ?? null;

  useEffect(() => {
    if (!selectedProduct || isEditing) {
      return;
    }

    setForm(productToForm(selectedProduct));
  }, [isEditing, selectedProduct]);

  function startCreate() {
    setSelectedId(null);
    setForm(EMPTY_PRODUCT_FORM);
    setIsEditing(true);
    setMessage(null);
  }

  function startEdit(product: ProductDoc) {
    setSelectedId(product._id);
    setForm(productToForm(product));
    setIsEditing(true);
    setMessage(null);
  }

  async function saveProduct() {
    setIsSaving(true);
    setMessage(null);

    const payload = {
      collectionId: form.collectionId
        ? (form.collectionId as Id<"collections">)
        : undefined,
      ...productFormToPayload(form),
    };

    try {
      if (selectedId) {
        await updateProduct({ productId: selectedId, ...payload });
        setMessage("Product updated.");
      } else {
        const productId = await createProduct(payload);
        setSelectedId(productId);
        setMessage("Product created.");
      }
      setIsEditing(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save product.");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteProduct(product: ProductDoc) {
    if (!window.confirm(`Delete ${product.title}? This removes it from the catalog.`)) {
      return;
    }

    try {
      await removeProduct({ productId: product._id });
      setSelectedId(null);
      setMessage("Product deleted.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not delete product.");
    }
  }

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Products"
        description="Manage product pricing, stock, publishing, merchandising, and product detail content."
        action={
          <button
            type="button"
            onClick={startCreate}
            className="h-10 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Add Product
          </button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_34rem]">
        <section className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="inline-flex w-full rounded-lg border border-slate-200 bg-slate-100 p-1 lg:w-auto">
              {[
                ["all", "All"],
                ["published", "Published"],
                ["draft", "Draft"],
                ["low", "Low Stock"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => startTransition(() => setStatusFilter(value as typeof statusFilter))}
                  className={`h-9 flex-1 rounded-md px-4 text-sm transition lg:flex-none ${
                    statusFilter === value
                      ? "bg-white text-slate-950 shadow-sm"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <TextInput
              placeholder="Search products..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="lg:w-64"
            />
          </div>

          <p className="text-xs text-slate-500">{filteredProducts.length} products</p>

          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="grid grid-cols-[minmax(16rem,1fr)_9rem_7rem_6rem] gap-4 border-b border-slate-100 px-4 py-3 text-xs font-medium text-slate-500">
              <span>Product</span>
              <span>Collection</span>
              <span>Price</span>
              <span>Stock</span>
            </div>
            <div className="divide-y divide-slate-100">
              {filteredProducts.map((product) => {
                const status = stockLabel(product.inventoryCount);
                const isSelected = selectedProduct?._id === product._id;
                return (
                  <button
                    type="button"
                    key={product._id}
                    onClick={() => {
                      setSelectedId(product._id);
                      setIsEditing(false);
                      setMessage(null);
                    }}
                    className={`grid w-full grid-cols-[minmax(16rem,1fr)_9rem_7rem_6rem] gap-4 px-4 py-3 text-left transition ${
                      isSelected ? "bg-slate-50" : "hover:bg-slate-50"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md bg-slate-100">
                        {product.images[0] ? (
                          <img src={product.images[0]} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-xs text-slate-400">No image</span>
                        )}
                      </span>
                      <span>
                        <span className="block text-sm font-medium text-slate-950">{product.title}</span>
                        <span className="mt-1 block text-xs text-slate-500">{product.slug}</span>
                      </span>
                    </span>
                    <span className="self-center text-sm text-slate-600">
                      {product.collectionId
                        ? collectionById.get(product.collectionId)?.title ?? "Unassigned"
                        : "Unassigned"}
                    </span>
                    <span className="self-center text-sm text-slate-700">
                      {formatInr(product.sellingPrice)}
                    </span>
                    <span className="self-center">
                      <span className="block text-sm font-medium text-slate-950">
                        {product.inventoryCount}
                      </span>
                      <span className={`text-xs ${
                        status.tone === "success"
                          ? "text-emerald-600"
                          : status.tone === "warning"
                            ? "text-amber-600"
                            : "text-rose-600"
                      }`}>
                        {status.label}
                      </span>
                    </span>
                  </button>
                );
              })}
              {filteredProducts.length === 0 ? <EmptyState label="No products match this view." /> : null}
            </div>
          </div>
        </section>

        <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          {selectedProduct && !isEditing ? (
            <ProductDetails
              product={selectedProduct}
              collection={selectedProduct.collectionId ? collectionById.get(selectedProduct.collectionId) : undefined}
              onEdit={() => startEdit(selectedProduct)}
              onDelete={() => void deleteProduct(selectedProduct)}
            />
          ) : (
            <ProductForm
              form={form}
              collections={collections}
              isSaving={isSaving}
              onChange={setForm}
              onCancel={() => {
                setIsEditing(false);
                setSelectedId(products[0]?._id ?? null);
              }}
              onSave={() => void saveProduct()}
            />
          )}
          {message ? (
            <p className="mt-4 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">
              {message}
            </p>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function ProductDetails({
  product,
  collection,
  onEdit,
  onDelete,
}: {
  product: ProductDoc;
  collection?: CollectionDoc;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const status = stockLabel(product.inventoryCount);

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-5">
          <div className="h-36 w-36 overflow-hidden rounded-lg bg-slate-100">
            {product.images[0] ? (
              <img src={product.images[0]} alt="" className="h-full w-full object-cover" />
            ) : null}
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-950">{product.title}</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <StatusPill tone={product.isPublished ? "success" : "neutral"}>
                {product.isPublished ? "Published" : "Draft"}
              </StatusPill>
              <StatusPill tone={status.tone}>{status.label}</StatusPill>
            </div>
            <p className="mt-3 text-sm text-slate-500">{product.slug}</p>
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-5">
        <section>
          <h3 className="text-sm font-semibold text-slate-950">Description</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {product.description ?? "No description yet."}
          </p>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <Detail label="Collection" value={collection?.title ?? "Unassigned"} />
          <Detail label="Price" value={formatInr(product.sellingPrice)} />
          <Detail label="MRP" value={formatInr(product.mrp)} />
          <Detail label="Fit" value={product.fit ?? "Not set"} />
          <Detail label="Material" value={product.material ?? "Not set"} />
          <Detail label="Weight" value={product.weightGsm ? `${product.weightGsm} GSM` : "Not set"} />
        </section>

        <section>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-950">Variants</h3>
            <span className="text-xs text-slate-500">{product.sizes.length} sizes</span>
          </div>
          <div className="mt-3 overflow-hidden rounded-lg border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Size</th>
                  <th className="px-3 py-2 font-medium">State</th>
                  <th className="px-3 py-2 font-medium">Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {product.sizes.map((size) => (
                  <tr key={size}>
                    <td className="px-3 py-2">{size}</td>
                    <td className="px-3 py-2">
                      {product.soldOutSizes.includes(size) ? "Sold out" : "Available"}
                    </td>
                    <td className="px-3 py-2">{formatInr(product.sellingPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="flex gap-2 border-t border-slate-100 pt-5">
          <button type="button" onClick={onEdit} className="h-10 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white">
            Edit product
          </button>
          <button type="button" onClick={onDelete} className="h-10 rounded-md border border-rose-200 px-4 text-sm font-semibold text-rose-700">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function ProductForm({
  form,
  collections,
  isSaving,
  onChange,
  onCancel,
  onSave,
}: {
  form: ProductFormState;
  collections: CollectionDoc[];
  isSaving: boolean;
  onChange: (form: ProductFormState) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const [imageMessage, setImageMessage] = useState<string | null>(null);

  function setField<K extends keyof ProductFormState>(key: K, value: ProductFormState[K]) {
    onChange({ ...form, [key]: value });
  }

  async function addWebpImages(files: FileList | null) {
    if (!files?.length) {
      return;
    }

    setImageMessage("Converting images to WebP...");

    try {
      const convertedImages = await Promise.all(
        Array.from(files).map((file) => compressImageFileToWebp(file)),
      );
      const existingImages = splitList(form.images);
      setField("images", [...existingImages, ...convertedImages].join("\n"));
      setImageMessage(`${convertedImages.length} WebP image${convertedImages.length === 1 ? "" : "s"} added.`);
    } catch (error) {
      setImageMessage(error instanceof Error ? error.message : "Could not convert image.");
    }
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-slate-950">
        {form.slug ? "Edit product" : "Add product"}
      </h2>
      <div className="mt-5 grid gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Title">
            <TextInput value={form.title} onChange={(event) => setField("title", event.target.value)} />
          </Field>
          <Field label="Slug">
            <TextInput
              value={form.slug}
              onChange={(event) => setField("slug", normalizeSlug(event.target.value))}
              placeholder="auto-from-title"
            />
          </Field>
        </div>
        <Field label="Description">
          <TextArea value={form.description} onChange={(event) => setField("description", event.target.value)} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Collection">
            <Select value={form.collectionId} onChange={(event) => setField("collectionId", event.target.value)}>
              <option value="">Unassigned</option>
              {collections.map((collection) => (
                <option key={collection._id} value={collection._id}>
                  {collection.title}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Selling price">
            <TextInput type="number" value={form.sellingPrice} onChange={(event) => setField("sellingPrice", event.target.value)} />
          </Field>
          <Field label="MRP">
            <TextInput type="number" value={form.mrp} onChange={(event) => setField("mrp", event.target.value)} />
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Stock">
            <TextInput type="number" value={form.inventoryCount} onChange={(event) => setField("inventoryCount", event.target.value)} />
          </Field>
          <Field label="Badge">
            <Select value={form.badge} onChange={(event) => setField("badge", event.target.value as ProductFormState["badge"])}>
              <option value="">None</option>
              <option value="new">New</option>
              <option value="sale">Sale</option>
            </Select>
          </Field>
          <Field label="Published">
            <Select value={form.isPublished ? "yes" : "no"} onChange={(event) => setField("isPublished", event.target.value === "yes")}>
              <option value="yes">Published</option>
              <option value="no">Draft</option>
            </Select>
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Fit">
            <TextInput value={form.fit} onChange={(event) => setField("fit", event.target.value)} />
          </Field>
          <Field label="Material">
            <TextInput value={form.material} onChange={(event) => setField("material", event.target.value)} />
          </Field>
          <Field label="Weight GSM">
            <TextInput type="number" value={form.weightGsm} onChange={(event) => setField("weightGsm", event.target.value)} />
          </Field>
        </div>
        <Field label="Images, one URL per line">
          <TextArea value={form.images} onChange={(event) => setField("images", event.target.value)} />
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(event) => void addWebpImages(event.currentTarget.files)}
            className="mt-2 block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-950 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
          />
          {imageMessage ? <p className="mt-2 text-xs text-slate-500">{imageMessage}</p> : null}
        </Field>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Sizes">
            <TextInput value={form.sizes} onChange={(event) => setField("sizes", event.target.value)} />
          </Field>
          <Field label="Sold out sizes">
            <TextInput value={form.soldOutSizes} onChange={(event) => setField("soldOutSizes", event.target.value)} />
          </Field>
          <Field label="Tags">
            <TextInput value={form.tags} onChange={(event) => setField("tags", event.target.value)} />
          </Field>
        </div>
        <Field label="Story">
          <TextArea value={form.story} onChange={(event) => setField("story", event.target.value)} />
        </Field>
      </div>
      <div className="mt-5 flex gap-2">
        <button type="button" onClick={onSave} disabled={isSaving} className="h-10 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white disabled:opacity-50">
          {isSaving ? "Saving..." : "Save product"}
        </button>
        <button type="button" onClick={onCancel} className="h-10 rounded-md border border-slate-200 px-4 text-sm font-semibold text-slate-700">
          Cancel
        </button>
      </div>
    </div>
  );
}
