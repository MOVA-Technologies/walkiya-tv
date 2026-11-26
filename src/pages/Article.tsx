import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { ui, Lang } from '../lib/i18n'

type A = { title: string; excerpt: string | null; body: string; img: string | null; credit: string | null; date: string; breaking: boolean }

export default function Article() {
  const { lang: p, slug } = useParams()
  const lang: Lang = p === 'ha' ? 'ha' : 'en'
  const t = ui[lang]
  const [a, setA] = useState<A | null>(null)
  const [state, setState] = useState<'loading' | 'missing' | 'ok'>('loading')
  const [alt, setAlt] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const url = window.location.href
  const txt = lang === 'en' ? { copy: 'Copy link', copied: 'Link copied', share: 'Share', back: 'Back to home', missing: 'Story not found.', read: 'Read in' }
    : { copy: 'Kwafi hanyar haɗi', copied: 'An kwafi', share: 'Raba', back: 'Koma gida', missing: 'Ba a samu labarin ba.', read: 'Karanta da' }

  useEffect(() => {
    const sb = supabase
    if (!sb || !slug) { setState('missing'); return }
    setState('loading')
    sb.from('article_translations').select('article_id,title,excerpt,body,articles!inner(featured_image_url,image_credit,published_at,is_breaking)')
      .eq('lang', lang).eq('slug', slug).maybeSingle().then(async ({ data }) => {
        const d: any = data
        if (!d) { setState('missing'); return }
        const ar: any = Array.isArray(d.articles) ? d.articles[0] : d.articles
        setA({ title: d.title, excerpt: d.excerpt, body: d.body, img: ar?.featured_image_url ?? null, credit: ar?.image_credit ?? null, date: ar?.published_at ?? '', breaking: !!ar?.is_breaking })
        document.title = d.title + ' | WALKIYA TV'
        const { data: o } = await sb.from('article_translations').select('slug').eq('article_id', d.article_id).eq('lang', lang === 'en' ? 'ha' : 'en').maybeSingle()
        setAlt((o as any)?.slug ?? null)
        setState('ok')
      })
  }, [lang, slug])

  async function copy() {
    try { await navigator.clipboard.writeText(url) } catch { window.prompt('Copy this link:', url); return }
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }
  const canShare = typeof navigator !== 'undefined' && 'share' in navigator
  const btn = 'rounded-full border border-slate-300 px-4 py-1.5 text-sm font-semibold text-navy-800 hover:bg-slate-100'

  return <div className="min-h-screen bg-white">
    <header className="bg-navy-900 text-white"><div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
      <Link to={`/${lang}`} className="font-serif text-xl font-black">WALKIYA <span className="text-breaking">TV</span></Link>
      {alt && <Link to={`/${lang === 'en' ? 'ha' : 'en'}/${alt}`} className="rounded-full border border-white/40 px-3 py-0.5 text-xs font-semibold">{t.switch}</Link>}
    </div></header>
    <main className="mx-auto max-w-3xl px-4 py-6">
      {state === 'loading' && <p className="text-slate-500">…</p>}
      {state === 'missing' && <p className="text-breaking">{txt.missing}</p>}
      {state === 'ok' && a && <article>
        {a.breaking && <span className="rounded-sm bg-breaking px-2 py-0.5 text-[11px] font-black uppercase text-white">{t.breaking}</span>}
        <h1 className="mt-3 font-serif text-3xl font-bold leading-tight text-navy-900 md:text-4xl">{a.title}</h1>
        {a.excerpt && <p className="mt-3 text-lg text-slate-600">{a.excerpt}</p>}
        <div className="mt-3 text-sm text-slate-500">{a.date && new Date(a.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} · WALKIYA TV</div>
        <div className="my-5 flex flex-wrap gap-2">
          <button onClick={copy} className={btn}>{copied ? txt.copied : txt.copy}</button>
          {canShare && <button onClick={() => navigator.share({ title: a.title, url }).catch(() => {})} className={btn}>{txt.share}</button>}
          <a className={btn} target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent(a.title + ' ' + url)}`}>WhatsApp</a>
          <a className={btn} target="_blank" rel="noreferrer" href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}>Facebook</a>
        </div>
        {a.img && <figure className="mb-6"><img src={a.img} alt={a.title} className="w-full rounded-lg object-cover" />
          {a.credit && <figcaption className="mt-1 text-xs text-slate-500">{a.credit}</figcaption>}</figure>}
        <div className="space-y-4 text-lg leading-relaxed text-slate-800">{a.body.split(/\n+/).filter(Boolean).map((para, i) => <p key={i}>{para}</p>)}</div>
      </article>}
      <Link to={`/${lang}`} className="mt-10 inline-block text-sm font-semibold text-navy-700 underline">← {txt.back}</Link>
    </main>
  </div>
}
