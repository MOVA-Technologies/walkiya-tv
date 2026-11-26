export type Lang = 'ha' | 'en'
export const catSlugs = ['politics', 'business', 'sports', 'entertainment', 'technology', 'education', 'security', 'international']
export const ui = {
 en:{tagline:'Your Voice. Your News. Your World.',breaking:'BREAKING',latest:'Latest News',
  cats:['Politics','Business','Sports','Entertainment','Technology','Education','Security','International'],
  switch:'Hausa',empty:'No published stories yet.'},
 ha:{tagline:'Muryarka. Labaranka. Duniyarka.',breaking:'LABARI MAI MUHIMMANCI',latest:'Sabbin Labarai',
  cats:['Siyasa','Kasuwanci','Wasanni','Nishaɗi','Fasaha','Ilimi','Tsaro','Ƙasashen Waje'],
  switch:'English',empty:'Babu labaran da aka wallafa tukuna.'}
} as const
