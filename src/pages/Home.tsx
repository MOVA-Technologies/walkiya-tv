import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { ui, Lang } from '../lib/i18n'

type Story = { slug?: string; img?: string; id: string; title: string; excerpt: string; cat: number; time: string; breaking?: boolean }

const L = {
  en: { date: 'en-GB', popular: 'Popular Now', editor: "Editor's Choice", video: 'Video News', sponsored: 'Sponsored', adTitle: 'Advertise with WALKIYA TV', adText: 'Reach thousands of Hausa and English readers every day.', adBtn: 'Contact Advertising', follow: 'Follow us', links: ['About Us','Contact Us','Advertise With Us','Privacy Policy','Terms and Conditions'], sections: 'Sections', company: 'Company', preview: 'Preview content for demonstration', ago: 'ago', watch: 'Watch', about: 'Independent digital journalism in Hausa and English.' },
  ha: { date: 'en-GB', popular: 'Mafi Shahara', editor: 'Zaɓin Edita', video: 'Labaran Bidiyo', sponsored: 'Tallafi', adTitle: 'Yi talla a WALKIYA TV', adText: 'Isa ga dubban masu karatu cikin Hausa da Turanci kullum.', adBtn: 'Tuntuɓi Tallace-tallace', follow: 'Biyo mu', links: ['Game Da Mu','Tuntuɓe Mu','Yi Talla Tare Da Mu','Manufar Sirri','Sharuɗɗa'], sections: 'Sassa', company: 'Kamfani', preview: 'Abun samfuri don nunawa', ago: 'da suka wuce', watch: 'Kalla', about: 'Aikin jarida mai zaman kansa cikin Hausa da Turanci.' }
}

// Preview stories, shown only when the database has no published stories yet.
const demo: Record<Lang, [number, string, string][]> = {
  en: [
    [0, 'Senate committee opens hearing on proposed electoral reforms', 'Lawmakers weigh changes to voting procedures ahead of the next general election.'],
    [6, 'Security agencies strengthen cooperation along northern corridors', 'Officials say joint patrols have been expanded in several border communities.'],
    [1, 'Local traders welcome new support scheme for small businesses', 'Market associations say access to credit remains the biggest challenge.'],
    [2, 'Kano side stays top of the table after dramatic weekend win', 'A late goal secured three points in front of a packed stadium.'],
    [4, 'Young developers build mobile tools for farmers in Katsina', 'The apps give price updates and weather alerts in Hausa.'],
    [5, 'Universities announce new scholarships for science students', 'Applications open next month for undergraduates nationwide.'],
    [3, 'Nollywood and Kannywood stars team up for new film project', 'The collaboration will be shot across three northern states.'],
    [7, 'African leaders gather for regional trade summit', 'Talks focus on easing cross-border commerce and transport links.']
  ],
  ha: [
    [0, 'Kwamitin Majalisar Dattawa ya fara sauraron shawarwarin gyaran zaɓe', 'Ƴan majalisa na nazarin sauye-sauye kafin babban zaɓe mai zuwa.'],
    [6, 'Hukumomin tsaro sun ƙarfafa haɗin gwiwa a hanyoyin arewa', 'Jami’ai sun ce an ƙara yawan sintiri a wasu yankunan kan iyaka.'],
    [1, 'Ƴan kasuwa sun yi maraba da sabon tallafi ga ƙananan sana’o’i', 'Ƙungiyoyin kasuwa sun ce samun bashi ne babban ƙalubale.'],
    [2, 'Ƙungiyar Kano ta ci gaba da jagoranci bayan nasara mai ban mamaki', 'Ƙwallo a ƙarshen wasa ta tabbatar da maki uku a filin da ya cika.'],
    [4, 'Matasa masu shirya manhaja sun ƙirƙiri kayan aiki ga manoman Katsina', 'Manhajar tana ba da farashi da hasashen yanayi da Hausa.'],
    [5, 'Jami’o’i sun sanar da sabbin tallafin karatu ga ɗaliban kimiyya', 'Za a buɗe neman gurbin karatu a wata mai zuwa.'],
    [3, 'Taurarin Nollywood da Kannywood za su haɗa kai a sabon fim', 'Za a ɗauki fim ɗin a jihohin arewa uku.'],
    [7, 'Shugabannin Afirka sun taru a taron kasuwanci na yanki', 'Tattaunawa ta mayar da hankali kan sauƙaƙa kasuwanci tsakanin ƙasashe.']
  ]
}
const times = ['2h', '3h', '5h', '6h', '8h', '10h', '12h', '1d']
const grads = ['#2b5cb8,#0f2552', '#0f5132,#0a2a1c', '#7a3e00,#2d1700', '#6b1d5c,#2a0a24', '#0b5c78,#06293a', '#4a3a9a,#1a1440', '#7a1020,#2a060b', '#1f4e79,#0a1a3a']

function Cover({ cat, className = '', play = false, img }: { cat: number; className?: string; play?: boolean; img?: string }) {
  const g = grads[cat % 8].split(',')
  return <div className={`relative overflow-hidden ${className}`} style={{ background: `linear-gradient(135deg, ${g[0]}, ${g[1]})` }}>
    {img && <img src={img} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />}
    {!img && <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />}
    {!img && <div className="absolute -bottom-12 left-6 h-32 w-32 rounded-full bg-white/5" />}
    {play && <div className="absolute inset-0 grid place-items-center"><div className="grid h-14 w-14 place-items-center rounded-full bg-white/90 shadow-lg"><svg width="22" height="22" viewBox="0 0 24 24" fill="#0a1a3a"><path d="M8 5v14l11-7z" /></svg></div></div>}
  </div>
}
const Tag = ({ children, red = false }: { children: React.ReactNode; red?: boolean }) =>
  <span className={`inline-block rounded-sm px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white ${red ? 'bg-breaking' : 'bg-navy-700'}`}>{children}</span>
const Heading = ({ children }: { children: React.ReactNode }) =>
  <h2 className="mb-5 flex items-center gap-3 font-serif text-2xl font-bold text-navy-900"><span className="h-6 w-1.5 rounded bg-breaking" />{children}</h2>

function T({ s, lang, stretch = false }: { s: Story; lang: Lang; stretch?: boolean }) {
  if (!s.slug) return <>{s.title}</>
  return <Link to={`/${lang}/${s.slug}`} className={`hover:underline ${stretch ? 'after:absolute after:inset-0 after:content-[""]' : ''}`}>{s.title}</Link>
}

export default function Home() {
  const { lang: p } = useParams()
  const lang: Lang = p === 'ha' ? 'ha' : 'en'
  const t = ui[lang], x = L[lang]
  const [stories, setStories] = useState<Story[] | null>(null)
  const [isDemo, setIsDemo] = useState(false)

  useEffect(() => {
    document.documentElement.lang = lang
    const fallback = () => {
      setIsDemo(true)
      setStories(demo[lang].map(([cat, title, excerpt], i) => ({ id: 'd' + i, cat, title, excerpt, time: `${times[i]} ${x.ago}`, breaking: i === 0 })))
    }
    if (!supabase) return fallback()
    supabase.from('published_stories').select('id,title,slug,excerpt,is_breaking,published_at,featured_image_url').eq('lang', lang)
      .order('published_at', { ascending: false }).limit(20)
      .then(({ data, error }) => {
        if (error) console.error(error)
        if (error || !data || data.length === 0) return fallback()
        setIsDemo(false)
        setStories(data.map((s: any, i: number) => ({ id: s.id, title: s.title, slug: s.slug, img: s.featured_image_url ?? undefined, excerpt: s.excerpt ?? '', cat: i % 8, breaking: s.is_breaking,
          time: new Date(s.published_at).toLocaleDateString('en-GB') })))
      })
  }, [lang])

  if (!stories) return <div className="grid min-h-screen place-items-center text-navy-900">WALKIYA TV…</div>
  const lead = stories[0], side = stories.slice(1, 5), popular = stories.slice(2, 6), editor = stories.slice(4, 7), vid = stories[7] ?? stories[0]
  const other = lang === 'en' ? 'ha' : 'en'

  return <div className="bg-slate-50 text-slate-900">
    <div className="bg-navy-900 text-xs text-slate-300">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2">
        <span>{new Date().toLocaleDateString(x.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
        <Link to={`/${other}`} className="rounded-full border border-white/30 px-3 py-0.5 font-semibold text-white hover:bg-white/10">{t.switch}</Link>
      </div>
    </div>
    <header className="border-b bg-white">
      <div className="mx-auto max-w-6xl px-4 py-5 text-center">
        <div className="font-serif text-4xl font-black tracking-wide text-navy-900 md:text-5xl">WALKIYA <span className="text-breaking">TV</span></div>
        <div className="mt-1 text-xs uppercase tracking-[0.25em] text-slate-500">{t.tagline}</div>
      </div>
    </header>
    <nav className="sticky top-0 z-20 bg-navy-800 shadow">
      <div className="mx-auto flex max-w-6xl items-center gap-1 overflow-x-auto px-2 text-sm font-semibold text-white">
        <span className="whitespace-nowrap border-b-2 border-breaking px-3 py-3">{lang === 'en' ? 'Home' : 'Gida'}</span>
        {t.cats.map(c => <span key={c} className="whitespace-nowrap px-3 py-3 text-slate-200 hover:text-white">{c}</span>)}
        <svg className="ml-auto shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
      </div>
    </nav>
    <div className="bg-breaking text-white">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2 text-sm">
        <span className="shrink-0 rounded-sm bg-white px-2 py-0.5 text-[11px] font-black text-breaking">{t.breaking}</span>
        <span className="truncate font-medium">{(stories.find(s => s.breaking) ?? lead).title}</span>
      </div>
    </div>

    <main className="mx-auto max-w-6xl px-4 py-8">
      <section className="grid gap-6 lg:grid-cols-3">
        <article className="group relative overflow-hidden rounded-xl shadow-md lg:col-span-2">
          <Cover img={lead.img} cat={lead.cat} className="h-80 md:h-[26rem]" />
          <div className="absolute inset-0 bg-gradient-to-t from-navy-900/90 via-navy-900/20 to-transparent" />
          <div className="absolute bottom-0 p-5 text-white md:p-8">
            <Tag red>{t.cats[lead.cat]}</Tag>
            <h1 className="mt-3 font-serif text-2xl font-bold leading-tight md:text-4xl"><T s={lead} lang={lang} stretch /></h1>
            <p className="mt-2 hidden max-w-xl text-sm text-slate-200 md:block">{lead.excerpt}</p>
            <div className="mt-3 text-xs text-slate-300">{lead.time}</div>
          </div>
        </article>
        <aside className="rounded-xl bg-white p-5 shadow-sm">
          <div className="mb-3 border-b-2 border-navy-900 pb-2 text-sm font-black uppercase tracking-wide text-navy-900">{t.latest}</div>
          <ul className="divide-y">
            {side.map((s, i) => <li key={s.id} className="flex gap-3 py-3">
              <span className="font-serif text-2xl font-black text-breaking">{i + 1}</span>
              <div><h3 className="font-serif text-[15px] font-bold leading-snug"><T s={s} lang={lang} /></h3><div className="mt-1 text-xs text-slate-500">{t.cats[s.cat]} · {s.time}</div></div>
            </li>)}
          </ul>
        </aside>
      </section>

      <section className="mt-12">
        <Heading>{x.popular}</Heading>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {popular.map(s => <article key={s.id} className="relative overflow-hidden rounded-xl bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <Cover img={s.img} cat={s.cat} className="h-36" />
            <div className="p-4"><Tag>{t.cats[s.cat]}</Tag>
              <h3 className="mt-2 font-serif text-base font-bold leading-snug"><T s={s} lang={lang} stretch /></h3>
              <p className="mt-1 line-clamp-2 text-sm text-slate-600">{s.excerpt}</p>
              <div className="mt-2 text-xs text-slate-400">{s.time}</div></div>
          </article>)}
        </div>
      </section>

      <section className="my-12 overflow-hidden rounded-xl bg-gradient-to-r from-navy-800 to-navy-700 p-6 text-white md:flex md:items-center md:justify-between md:p-8">
        <div><span className="text-[11px] font-bold uppercase tracking-widest text-slate-300">{x.sponsored} · Ad</span>
          <h3 className="mt-1 font-serif text-2xl font-bold">{x.adTitle}</h3><p className="mt-1 text-sm text-slate-200">{x.adText}</p></div>
        <span className="mt-4 inline-block rounded-full bg-breaking px-5 py-2 text-sm font-bold md:mt-0">{x.adBtn}</span>
      </section>

      <section className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Heading>{x.editor}</Heading>
          <div className="grid gap-5 sm:grid-cols-3">
            {editor.map(s => <article key={s.id}><Cover img={s.img} cat={s.cat} className="h-32 rounded-lg" />
              <h3 className="mt-3 font-serif text-[15px] font-bold leading-snug"><T s={s} lang={lang} /></h3><div className="mt-1 text-xs text-slate-500">{s.time}</div></article>)}
          </div>
        </div>
        <div>
          <Heading>{x.video}</Heading>
          <Cover img={vid.img} cat={vid.cat} play className="h-40 rounded-lg" />
          <h3 className="mt-3 font-serif text-[15px] font-bold leading-snug"><T s={vid} lang={lang} /></h3>
          <div className="mt-1 text-xs text-slate-500">{x.watch} · {vid.time}</div>
        </div>
      </section>
      {isDemo && <p className="mt-10 text-center text-xs text-slate-400">{x.preview}</p>}
    </main>

    <footer className="bg-navy-900 text-slate-300">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-4">
        <div className="md:col-span-2"><div className="font-serif text-2xl font-black text-white">WALKIYA <span className="text-breaking">TV</span></div>
          <p className="mt-2 max-w-sm text-sm">{x.about}</p>
          <div className="mt-4 flex gap-2">{['f', 'X', '▶', 'in'].map(i => <span key={i} className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-sm font-bold text-white">{i}</span>)}</div></div>
        <div><div className="mb-3 text-sm font-bold uppercase text-white">{x.sections}</div><ul className="space-y-1 text-sm">{t.cats.slice(0, 5).map(c => <li key={c}>{c}</li>)}</ul></div>
        <div><div className="mb-3 text-sm font-bold uppercase text-white">{x.company}</div><ul className="space-y-1 text-sm">{x.links.map(c => <li key={c}>{c}</li>)}</ul></div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs">© 2026 WALKIYA TV · {t.tagline} · <Link to="/login" className="underline">Staff</Link></div>
    </footer>
  </div>
}
