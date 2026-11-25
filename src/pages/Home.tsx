import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase, supabaseConfigured } from '../lib/supabase'
import { ui, Lang } from '../lib/i18n'

type Story = { id: string; title: string; excerpt: string | null; slug: string; is_breaking: boolean }

export default function Home() {
  const { lang: p } = useParams()
  const lang: Lang = p === 'ha' ? 'ha' : 'en'
  const t = ui[lang]
  const [stories, setStories] = useState<Story[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    document.documentElement.lang = lang
    if (!supabase) return
    supabase.from('published_stories').select('id,title,excerpt,slug,is_breaking')
      .eq('lang', lang).order('published_at', { ascending: false }).limit(20)
      .then(({ data, error }) => error ? setError('Could not load stories.') : setStories(data as Story[]))
  }, [lang])

  const breaking = stories.find(s => s.is_breaking)
  return <div>
    <header className="bg-navy-900 text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <div><div className="font-serif text-2xl font-bold tracking-wide">WALKIYA <span className="text-breaking">TV</span></div>
          <div className="text-xs text-slate-300">{t.tagline}</div></div>
        <Link to={`/${lang === 'en' ? 'ha' : 'en'}`} className="rounded border border-white/40 px-3 py-1 text-sm hover:bg-white/10">{t.switch}</Link>
      </div>
      <nav className="mx-auto flex max-w-6xl gap-5 overflow-x-auto px-4 pb-3 text-sm">{t.cats.map(c => <span key={c} className="whitespace-nowrap">{c}</span>)}</nav>
    </header>
    {breaking && <div className="bg-breaking px-4 py-2 text-sm font-semibold text-white"><span className="mr-2">{t.breaking}</span>{breaking.title}</div>}
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h2 className="mb-4 border-b-2 border-navy-900 pb-1 font-serif text-xl font-bold">{t.latest}</h2>
      {!supabaseConfigured && <p className="rounded bg-amber-50 p-3 text-sm text-amber-900">Supabase is not configured. Copy .env.example to .env and add your project URL and anon key.</p>}
      {error && <p className="text-breaking">{error}</p>}
      {supabaseConfigured && !error && stories.length === 0 && <p className="text-slate-500">{t.empty}</p>}
      <div className="grid gap-6 md:grid-cols-3">{stories.map(s => <article key={s.id}><h3 className="font-serif text-lg font-bold">{s.title}</h3><p className="text-sm text-slate-600">{s.excerpt}</p></article>)}</div>
    </main>
  </div>
}
