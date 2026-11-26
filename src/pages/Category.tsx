import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { ui, Lang, catSlugs } from '../lib/i18n'
import Layout from './Layout'
import { Cover, demo } from './Home'

type Item = { id: string; title: string; excerpt: string; slug?: string; img?: string; time: string }

export default function Category() {
  const { lang: p, cat } = useParams()
  const lang: Lang = p === 'ha' ? 'ha' : 'en'
  const idx = catSlugs.indexOf(cat ?? '')
  const t = ui[lang]
  const [items, setItems] = useState<Item[] | null>(null)
  const [isDemo, setIsDemo] = useState(false)

  useEffect(() => {
    setItems(null)
    const fallback = () => {
      setIsDemo(true)
      setItems(demo[lang].filter(d => d[0] === idx).map((d, i) => ({ id: 'd' + i, title: d[1], excerpt: d[2], time: '' })))
    }
    if (idx < 0) return
    const sb = supabase
    if (!sb) return fallback()
    sb.from('published_stories').select('id,title,slug,excerpt,featured_image_url,published_at')
      .eq('lang', lang).eq('category_slug', cat).order('published_at', { ascending: false }).limit(30)
      .then(({ data, error }) => {
        if (error || !data || data.length === 0) return fallback()
        setIsDemo(false)
        setItems(data.map((s: any) => ({ id: s.id, title: s.title, excerpt: s.excerpt ?? '', slug: s.slug, img: s.featured_image_url ?? undefined, time: new Date(s.published_at).toLocaleDateString('en-GB') })))
      })
  }, [lang, cat, idx])

  return <Layout lang={lang} active={idx} switchTo={`/${lang === 'en' ? 'ha' : 'en'}/category/${cat}`}>
    <main className="mx-auto max-w-6xl px-4 py-8">
      {idx < 0 ? <p className="text-breaking">Section not found.</p> : <>
        <h1 className="mb-6 flex items-center gap-3 font-serif text-3xl font-bold text-navy-900"><span className="h-8 w-1.5 rounded bg-breaking" />{t.cats[idx]}</h1>
        {!items && <p className="text-slate-500">…</p>}
        {items && items.length === 0 && <p className="text-slate-500">{t.empty}</p>}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items?.map(s => <article key={s.id} className="relative overflow-hidden rounded-xl bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <Cover img={s.img} cat={idx} className="h-44" />
            <div className="p-4">
              <h2 className="font-serif text-lg font-bold leading-snug">{s.slug ? <Link to={`/${lang}/${s.slug}`} className="after:absolute after:inset-0 after:content-['']">{s.title}</Link> : s.title}</h2>
              <p className="mt-1 line-clamp-3 text-sm text-slate-600">{s.excerpt}</p>
              {s.time && <div className="mt-2 text-xs text-slate-400">{s.time}</div>}
            </div>
          </article>)}
        </div>
        {isDemo && <p className="mt-8 text-center text-xs text-slate-400">{lang === 'en' ? 'Preview content for demonstration' : 'Abun samfuri don nunawa'}</p>}
      </>}
    </main>
  </Layout>
}
