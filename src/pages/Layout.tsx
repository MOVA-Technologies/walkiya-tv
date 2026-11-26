import { Link } from 'react-router-dom'
import { ui, Lang, catSlugs } from '../lib/i18n'

export default function Layout({ lang, active = -1, switchTo, children }: { lang: Lang; active?: number; switchTo?: string; children: React.ReactNode }) {
  const t = ui[lang]
  const other = lang === 'en' ? 'ha' : 'en'
  return <div className="min-h-screen bg-slate-50 text-slate-900">
    <div className="bg-navy-900 text-xs text-slate-300"><div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2">
      <span>{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
      <Link to={switchTo ?? `/${other}`} className="rounded-full border border-white/30 px-3 py-0.5 font-semibold text-white hover:bg-white/10">{t.switch}</Link></div></div>
    <header className="border-b bg-white"><div className="mx-auto max-w-6xl px-4 py-5 text-center">
      <Link to={`/${lang}`} className="font-serif text-4xl font-black tracking-wide text-navy-900 md:text-5xl">WALKIYA <span className="text-breaking">TV</span></Link>
      <div className="mt-1 text-xs uppercase tracking-[0.25em] text-slate-500">{t.tagline}</div></div></header>
    <nav className="sticky top-0 z-20 bg-navy-800 shadow"><div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-2 text-sm font-semibold text-white">
      <Link to={`/${lang}`} className="whitespace-nowrap px-3 py-3 text-slate-200 hover:text-white">{lang === 'en' ? 'Home' : 'Gida'}</Link>
      {t.cats.map((c, i) => <Link key={c} to={`/${lang}/category/${catSlugs[i]}`} className={`whitespace-nowrap px-3 py-3 ${i === active ? 'border-b-2 border-breaking text-white' : 'text-slate-200 hover:text-white'}`}>{c}</Link>)}
    </div></nav>
    {children}
    <footer className="mt-12 bg-navy-900 py-6 text-center text-xs text-slate-300">© 2026 WALKIYA TV · {t.tagline} · <Link to="/login" className="underline">Staff</Link></footer>
  </div>
}
