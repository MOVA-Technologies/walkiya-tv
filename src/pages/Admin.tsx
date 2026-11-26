import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

type Tr = { lang: 'ha' | 'en'; title: string; slug: string; excerpt: string | null; body: string }
type Row = { id: string; status: string; category_id: string | null; is_breaking: boolean; is_featured: boolean; featured_image_url: string | null; image_credit: string | null; created_at: string; article_translations: Tr[] }
type Cat = { id: string; name_en: string }
const blank = () => ({ id: '', status: 'draft', category_id: '', image: '', credit: '', breaking: false, featured: false,
  en: { title: '', excerpt: '', body: '', slug: '' }, ha: { title: '', excerpt: '', body: '', slug: '' } })
const slugify = (t: string) => (t.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'story') + '-' + Math.random().toString(36).slice(2, 7)
const field = 'w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-navy-700'

export default function Admin() {
  if (!supabase) return <p className="p-6">Supabase is not configured.</p>
  return <AdminInner sb={supabase} />
}

function AdminInner({ sb }: { sb: SupabaseClient }) {
  const [uid, setUid] = useState<string | null | undefined>(undefined)
  const [role, setRole] = useState('')
  const [name, setName] = useState('')
  const [rows, setRows] = useState<Row[]>([])
  const [cats, setCats] = useState<Cat[]>([])
  const [f, setF] = useState<any>(null)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const { data } = await sb.from('articles').select('id,status,category_id,is_breaking,is_featured,featured_image_url,image_credit,created_at,article_translations(lang,title,slug,excerpt,body)').order('created_at', { ascending: false })
    setRows((data ?? []) as unknown as Row[])
  }, [sb])

  useEffect(() => {
    sb.auth.getSession().then(({ data }) => setUid(data.session?.user.id ?? null))
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => setUid(s?.user.id ?? null))
    return () => sub.subscription.unsubscribe()
  }, [sb])

  useEffect(() => {
    if (!uid) return
    sb.from('profiles').select('role,full_name').eq('id', uid).single().then(({ data }) => { setRole(data?.role ?? ''); setName(data?.full_name ?? '') })
    sb.from('categories').select('id,name_en').order('sort_order').then(({ data }) => setCats((data ?? []) as Cat[]))
    load()
  }, [uid, sb, load])

  if (uid === undefined) return <p className="p-6">Loading…</p>
  if (uid === null) return <Navigate to="/login" replace />
  const isEditor = role === 'super_admin' || role === 'editor'
  const canWrite = isEditor || role === 'journalist'
  const set = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }))
  const setT = (l: 'en' | 'ha', k: string, v: string) => setF((p: any) => ({ ...p, [l]: { ...p[l], [k]: v } }))

  function edit(r: Row) {
    const g = blank()
    for (const t of r.article_translations) (g as any)[t.lang] = { title: t.title, excerpt: t.excerpt ?? '', body: t.body, slug: t.slug }
    setF({ ...g, id: r.id, status: r.status, category_id: r.category_id ?? '', image: r.featured_image_url ?? '', credit: r.image_credit ?? '', breaking: r.is_breaking, featured: r.is_featured })
    setMsg('')
  }

  async function upload(file?: File) {
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return setMsg('Use a JPG, PNG or WebP image.')
    if (file.size > 3 * 1024 * 1024) return setMsg('Image must be smaller than 3 MB.')
    setBusy(true); setMsg('Uploading image…')
    const path = `${uid}/${Date.now()}.${file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'}`
    const { error } = await sb.storage.from('news-images').upload(path, file)
    setBusy(false)
    if (error) return setMsg('Upload failed: ' + error.message)
    set('image', sb.storage.from('news-images').getPublicUrl(path).data.publicUrl); setMsg('Image uploaded.')
  }

  async function save(target: 'keep' | 'submitted' | 'published') {
    setBusy(true); setMsg('')
    try {
      const langs = (['en', 'ha'] as const).filter(l => f[l].title.trim())
      if (!langs.length) throw new Error('Add a title in English or Hausa.')
      const fields: any = { category_id: f.category_id || null, featured_image_url: f.image || null, image_credit: f.credit || null }
      if (isEditor) { fields.is_breaking = f.breaking; fields.is_featured = f.featured }
      let id = f.id
      if (!id) {
        const { data, error } = await sb.from('articles').insert({ ...fields, author_id: uid, status: 'draft' }).select('id').single()
        if (error) throw error
        id = data.id
      } else {
        const { error } = await sb.from('articles').update(fields).eq('id', id)
        if (error) throw error
      }
      for (const l of langs) {
        const v = f[l]
        const { error } = await sb.from('article_translations').upsert({ article_id: id, lang: l, title: v.title.trim(), slug: v.slug || slugify(v.title), excerpt: v.excerpt || null, body: v.body }, { onConflict: 'article_id,lang' })
        if (error) throw error
      }
      if (target !== 'keep' && target !== f.status) {
        const { error } = await sb.from('articles').update({ status: target }).eq('id', id)
        if (error) throw error
      }
      setF(null); await load()
    } catch (e: any) { setMsg(e.message ?? 'Could not save.') }
    setBusy(false)
  }

  async function remove(id: string) {
    if (!confirm('Delete this article permanently?')) return
    const { error } = await sb.from('articles').delete().eq('id', id)
    if (error) setMsg(error.message); else load()
  }

  const badge = (s: string) => `rounded px-2 py-0.5 text-xs font-bold uppercase ${s === 'published' ? 'bg-green-100 text-green-800' : s === 'draft' ? 'bg-slate-200 text-slate-700' : 'bg-amber-100 text-amber-800'}`

  return <div className="min-h-screen bg-slate-50">
    <header className="bg-navy-900 text-white"><div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
      <Link to="/en" className="font-serif text-xl font-black">WALKIYA <span className="text-breaking">TV</span> <span className="ml-2 text-xs font-normal text-slate-300">Newsroom</span></Link>
      <div className="text-right text-xs"><div>{name || 'Staff'} · {role.replace('_', ' ')}</div><button onClick={() => sb.auth.signOut()} className="underline">Sign out</button></div>
    </div></header>
    <main className="mx-auto max-w-4xl px-4 py-6">
      {!canWrite && <p className="rounded bg-amber-50 p-3 text-sm text-amber-900">Your role ({role || 'loading'}) cannot manage articles.</p>}
      {msg && <p className="mb-3 rounded bg-white p-3 text-sm text-breaking shadow-sm">{msg}</p>}

      {canWrite && !f && <>
        <div className="mb-4 flex items-center justify-between"><h1 className="font-serif text-2xl font-bold text-navy-900">Articles</h1>
          <button onClick={() => { setF(blank()); setMsg('') }} className="rounded bg-breaking px-4 py-2 text-sm font-bold text-white">+ New article</button></div>
        {rows.length === 0 && <p className="text-slate-500">No articles yet.</p>}
        <ul className="space-y-2">{rows.map(r => {
          const t = r.article_translations.find(x => x.lang === 'en') ?? r.article_translations[0]
          return <li key={r.id} className="flex items-center justify-between gap-3 rounded-lg bg-white p-3 shadow-sm">
            <div className="min-w-0"><div className="truncate font-semibold">{t?.title ?? '(untitled)'}</div>
              <div className="mt-1 flex gap-2 text-xs text-slate-500"><span className={badge(r.status)}>{r.status}</span>{r.article_translations.map(x => <span key={x.lang} className="uppercase">{x.lang}</span>)}</div></div>
            <div className="flex shrink-0 gap-3 text-sm"><button onClick={() => edit(r)} className="text-navy-700 underline">Edit</button>
              {isEditor && <button onClick={() => remove(r.id)} className="text-breaking underline">Delete</button>}</div>
          </li>
        })}</ul>
      </>}

      {f && <div className="space-y-4 rounded-xl bg-white p-4 shadow-sm md:p-6">
        <div className="flex items-center justify-between"><h1 className="font-serif text-xl font-bold text-navy-900">{f.id ? 'Edit article' : 'New article'}</h1>
          <button onClick={() => setF(null)} className="text-sm underline">Cancel</button></div>
        <select className={field} value={f.category_id} onChange={e => set('category_id', e.target.value)}>
          <option value="">Choose category</option>{cats.map(c => <option key={c.id} value={c.id}>{c.name_en}</option>)}</select>
        {(['en', 'ha'] as const).map(l => <fieldset key={l} className="space-y-2 rounded-lg border p-3">
          <legend className="px-1 text-sm font-bold">{l === 'en' ? 'English' : 'Hausa'}</legend>
          <input className={field} placeholder="Title" value={f[l].title} onChange={e => setT(l, 'title', e.target.value)} />
          <input className={field} placeholder="Short summary" value={f[l].excerpt} onChange={e => setT(l, 'excerpt', e.target.value)} />
          <textarea className={field} rows={7} placeholder="Story" value={f[l].body} onChange={e => setT(l, 'body', e.target.value)} />
        </fieldset>)}
        <div className="space-y-2">
          <label className="text-sm font-bold">Featured image (JPG, PNG, WebP, max 3 MB)</label>
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => upload(e.target.files?.[0])} />
          {f.image && <img src={f.image} alt="" className="h-32 rounded object-cover" />}
          <input className={field} placeholder="Image credit (e.g. Photo: Name)" value={f.credit} onChange={e => set('credit', e.target.value)} />
        </div>
        {isEditor && <div className="flex gap-5 text-sm">
          <label><input type="checkbox" checked={f.breaking} onChange={e => set('breaking', e.target.checked)} /> Breaking</label>
          <label><input type="checkbox" checked={f.featured} onChange={e => set('featured', e.target.checked)} /> Featured</label></div>}
        <div className="flex flex-wrap gap-2 pt-2">
          <button disabled={busy} onClick={() => save('keep')} className="rounded border border-navy-800 px-4 py-2 text-sm font-semibold text-navy-800">Save</button>
          {!isEditor && f.status === 'draft' && <button disabled={busy} onClick={() => save('submitted')} className="rounded bg-navy-800 px-4 py-2 text-sm font-semibold text-white">Submit for review</button>}
          {isEditor && f.status !== 'published' && <button disabled={busy} onClick={() => save('published')} className="rounded bg-breaking px-4 py-2 text-sm font-bold text-white">Publish</button>}
        </div>
      </div>}
    </main>
  </div>
}
