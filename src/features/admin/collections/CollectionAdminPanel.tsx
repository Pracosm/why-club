import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { collectionFormToPayload, collectionToForm, EMPTY_COLLECTION_FORM, normalizeSlug } from "../lib/adminForms";
import { EditorActions, Field, Select, SimpleManagerShell, StatusPill, TextArea, TextInput } from "../components/AdminUi";
import type { CollectionDoc, CollectionFormState } from "../types";

export function CollectionAdminPanel({ collections }: { collections: CollectionDoc[] }) {
  const createCollection = useMutation(api.collections.create);
  const updateCollection = useMutation(api.collections.update);
  const removeCollection = useMutation(api.collections.remove);
  const [selected, setSelected] = useState<CollectionDoc | null>(collections[0] ?? null);
  const [form, setForm] = useState<CollectionFormState>(EMPTY_COLLECTION_FORM);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (selected) {
      setForm(collectionToForm(selected));
    }
  }, [selected]);

  async function save() {
    const payload = collectionFormToPayload(form);

    try {
      if (selected) {
        await updateCollection({ collectionId: selected._id, ...payload });
        setMessage("Collection updated.");
      } else {
        await createCollection(payload);
        setMessage("Collection created.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save collection.");
    }
  }

  async function remove() {
    if (!selected || !window.confirm(`Delete ${selected.title}?`)) {
      return;
    }

    try {
      await removeCollection({ collectionId: selected._id });
      setSelected(null);
      setForm(EMPTY_COLLECTION_FORM);
      setMessage("Collection deleted.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not delete collection.");
    }
  }

  return (
    <SimpleManagerShell
      title="Collections"
      description="Create and maintain storefront collection records."
      actionLabel="Add Collection"
      onCreate={() => {
        setSelected(null);
        setForm(EMPTY_COLLECTION_FORM);
      }}
      list={
        collections.map((collection) => (
          <button
            type="button"
            key={collection._id}
            onClick={() => setSelected(collection)}
            className={`flex w-full items-center justify-between gap-4 border-b border-slate-100 px-5 py-4 text-left hover:bg-slate-50 ${
              selected?._id === collection._id ? "bg-slate-50" : ""
            }`}
          >
            <span>
              <span className="block text-sm font-medium text-slate-950">{collection.title}</span>
              <span className="mt-1 block text-xs text-slate-500">{collection.slug}</span>
            </span>
            <StatusPill tone={collection.isActive ? "success" : "neutral"}>
              {collection.isActive ? "Active" : "Hidden"}
            </StatusPill>
          </button>
        ))
      }
      editor={
        <div className="grid gap-4">
          <Field label="Title">
            <TextInput value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
          </Field>
          <Field label="Slug">
            <TextInput value={form.slug} onChange={(event) => setForm({ ...form, slug: normalizeSlug(event.target.value) })} />
          </Field>
          <Field label="Description">
            <TextArea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
          </Field>
          <Field label="Image URL">
            <TextInput value={form.imageUrl} onChange={(event) => setForm({ ...form, imageUrl: event.target.value })} />
          </Field>
          <Field label="Visibility">
            <Select value={form.isActive ? "active" : "hidden"} onChange={(event) => setForm({ ...form, isActive: event.target.value === "active" })}>
              <option value="active">Active</option>
              <option value="hidden">Hidden</option>
            </Select>
          </Field>
          <EditorActions onSave={() => void save()} onDelete={selected ? () => void remove() : undefined} />
          {message ? <p className="text-sm text-slate-500">{message}</p> : null}
        </div>
      }
    />
  );
}
