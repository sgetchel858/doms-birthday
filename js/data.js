/* Trip content for the site.
   Curated from the planning itineraries (kept out of git). Only the public-safe
   parts live here: places, dates, sights. No budgets, work notes or personal notes.

   Postcard art: set `img` on a sight to a path under assets/postcards/ once it exists.
   Until then the page draws a papercraft placeholder. */

window.TRIP_DATA = (function () {
  const HOME = { id: 'sf', name: 'San Francisco', lon: -122.4194, lat: 37.7749 };

  // Every place a trip can visit. Shared between trips (Seville, Granada, Chiang Mai…).
  const PLACES = {
    lisbon: {
      name: 'Lisbon', country: 'Portugal', lon: -9.1393, lat: 38.7223, label: 'left',
      blurb: 'Tiled hills, river light and the city of viewpoints.',
      sights: [
        { id: 'alfama', name: 'Alfama & Santa Luzia', img: 'assets/postcards/lisbon-alfama.webp', note: 'Morning wander through the oldest lanes, ending on a tiled terrace above the river.' },
        { id: 'belem', name: 'Belém Tower', img: 'assets/postcards/lisbon-belem.webp', note: 'The little stone fortress on the Tagus, best before the crowds arrive.' },
        { id: 'jeronimos', name: 'Jerónimos Monastery', img: 'assets/postcards/lisbon-jeronimos.webp', note: 'Cloisters carved like lace, then warm custard tarts next door.' },
        { id: 'principe-real', name: 'Príncipe Real', img: 'assets/postcards/lisbon-principe-real.webp', note: 'Garden squares, boutiques and a quiet birthday neighborhood.' },
      ],
    },
    alentejo: {
      name: 'Alentejo', country: 'Portugal', lon: -7.9135, lat: 38.5714, label: 'bottom',
      blurb: 'A country estate, cork oaks, wine and whitewashed hill towns.',
      sights: [
        { id: 'evora-temple', name: 'Roman Temple of Évora', img: 'assets/postcards/alentejo-evora-temple.webp', note: 'Two-thousand-year-old columns in the middle of town.' },
        { id: 'monsaraz', name: 'Monsaraz', img: 'assets/postcards/alentejo-monsaraz.webp', note: 'A medieval hilltop village looking over the great lake.' },
        { id: 'vineyards', name: 'Vineyards & cork oaks', img: 'assets/postcards/alentejo-vineyards.webp', note: 'A long lunch, a winery visit and a fireplace evening.' },
      ],
    },
    seville: {
      name: 'Seville', country: 'Spain', lon: -5.9845, lat: 37.3891, label: 'left',
      blurb: 'Orange trees, palace gardens and flamenco by candlelight.',
      sights: [
        { id: 'alcazar', name: 'Real Alcázar', img: 'assets/postcards/seville-alcazar.webp', note: 'Royal palace rooms wrapped in tilework, and gardens to get lost in.' },
        { id: 'plaza-espana', name: 'Plaza de España', img: 'assets/postcards/seville-plaza-espana.webp', note: 'Tiled bridges and a half-moon of arcades, early for the light.' },
        { id: 'santa-cruz', name: 'Santa Cruz quarter', img: 'assets/postcards/seville-santa-cruz.webp', note: 'Whitewashed lanes and tiny plazas beside the cathedral.' },
        { id: 'flamenco', name: 'An intimate flamenco night', img: 'assets/postcards/seville-flamenco.webp', note: 'A small seated show, close enough to hear the footwork.' },
      ],
    },
    cordoba: {
      name: 'Córdoba', country: 'Spain', lon: -4.7794, lat: 37.8882, label: 'top',
      blurb: 'A forest of red-and-white arches and flower-hung lanes.',
      sights: [
        { id: 'mezquita', name: 'Mezquita-Catedral', img: 'assets/postcards/cordoba-mezquita.webp', note: 'Hundreds of striped arches stretching into the dim.' },
        { id: 'roman-bridge', name: 'Roman Bridge at sunset', img: 'assets/postcards/cordoba-roman-bridge.webp', note: 'The old city glowing across the Guadalquivir.' },
        { id: 'flores', name: 'Calleja de las Flores', img: 'assets/postcards/cordoba-flores.webp', note: 'A narrow lane of flowerpots framing the bell tower.' },
      ],
    },
    granada: {
      name: 'Granada', country: 'Spain', lon: -3.5986, lat: 37.1773, label: 'right',
      blurb: 'The Alhambra, snow-capped mountains and steaming hammams.',
      sights: [
        { id: 'nasrid', name: 'Nasrid Palaces', img: 'assets/postcards/granada-nasrid.webp', note: 'Carved ceilings, reflecting pools and the most beautiful rooms in Spain.' },
        { id: 'generalife', name: 'Generalife gardens', img: 'assets/postcards/granada-generalife.webp', note: 'Fountains, cypress walks and views back over the palace.' },
        { id: 'san-nicolas', name: 'Mirador de San Nicolás', img: 'assets/postcards/granada-san-nicolas.webp', note: 'The Alhambra turning gold above the Albaicín rooftops.' },
        { id: 'hammam', name: 'A traditional hammam', img: 'assets/postcards/granada-hammam.webp', note: 'Warm pools and lantern light for a slow afternoon.' },
      ],
    },
    ronda: {
      name: 'Ronda', country: 'Spain', lon: -5.1671, lat: 36.7423, label: 'left',
      blurb: 'A town split by a gorge, with white villages all around.',
      sights: [
        { id: 'puente-nuevo', name: 'Puente Nuevo & El Tajo', img: 'assets/postcards/ronda-puente-nuevo.webp', note: 'The bridge over the gorge, seen from the quiet trails below.' },
        { id: 'white-villages', name: 'The white villages', img: 'assets/postcards/ronda-white-villages.webp', note: 'Setenil, Grazalema or Zahara: whitewashed lanes in the hills.' },
        { id: 'vineyard', name: 'A mountain vineyard', img: 'assets/postcards/ronda-vineyard.webp', note: 'A tasting in the countryside, then a romantic dinner.' },
      ],
    },
    malaga: {
      name: 'Málaga', country: 'Spain', lon: -4.4214, lat: 36.7213, label: 'bottom',
      blurb: 'A last evening by the Mediterranean.',
      sights: [
        { id: 'alcazaba', name: 'The Alcazaba', img: 'assets/postcards/malaga-alcazaba.webp', note: 'A hillside Moorish fortress above the old town.' },
        { id: 'muelle-uno', name: 'Muelle Uno waterfront', img: 'assets/postcards/malaga-muelle-uno.webp', note: 'A seaside stroll before the final dinner.' },
        { id: 'cathedral', name: 'Málaga Cathedral', img: 'assets/postcards/malaga-cathedral.webp', note: 'The unfinished cathedral, one tower short and lovely anyway.' },
      ],
    },
    chiangmai: {
      name: 'Chiang Mai', country: 'Thailand', lon: 98.9853, lat: 18.7883, label: 'left',
      blurb: 'Golden temples, mountain gardens and northern Thai cooking.',
      sights: [
        { id: 'doi-suthep', name: 'Wat Phra That Doi Suthep', img: 'assets/postcards/chiangmai-doi-suthep.webp', note: 'A gilded temple on the mountain, the whole city below.' },
        { id: 'chedi-luang', name: 'Wat Chedi Luang', img: 'assets/postcards/chiangmai-chedi-luang.webp', note: 'A great ruined chedi in the heart of the Old City.' },
        { id: 'cooking', name: 'Lanna cooking class', img: 'assets/postcards/chiangmai-cooking.webp', note: 'Market herbs, curry pastes and a long lunch you made yourselves.' },
        { id: 'elephants', name: 'Ethical elephant sanctuary', img: 'assets/postcards/chiangmai-elephants.webp', note: 'Watching rescued elephants roam. No riding, ever.' },
      ],
    },
    chiangrai: {
      name: 'Chiang Rai', country: 'Thailand', lon: 99.8406, lat: 19.9105, label: 'left',
      blurb: 'The White Temple, the Blue Temple and rolling tea hills.',
      sights: [
        { id: 'white-temple', name: 'The White Temple', img: 'assets/postcards/chiangrai-white-temple.webp', note: 'Wat Rong Khun: shimmering white and mirrored, unlike anywhere else.' },
        { id: 'blue-temple', name: 'The Blue Temple', img: 'assets/postcards/chiangrai-blue-temple.webp', note: 'Wat Rong Suea Ten in deep sapphire and gold.' },
        { id: 'tea', name: 'Choui Fong tea plantation', img: 'assets/postcards/chiangrai-tea.webp', note: 'Green terraces and a tasting overlooking the hills.' },
        { id: 'baan-dam', name: 'Baan Dam (Black House)', img: 'assets/postcards/chiangrai-baan-dam.webp', note: 'A strange, dark and beautiful art village.' },
      ],
    },
    luangprabang: {
      name: 'Luang Prabang', country: 'Laos', lon: 102.1347, lat: 19.8856, label: 'right',
      blurb: 'A temple town on the Mekong, turquoise falls nearby.',
      sights: [
        { id: 'xieng-thong', name: 'Wat Xieng Thong', img: 'assets/postcards/luangprabang-xieng-thong.webp', note: 'Sweeping golden roofs and glass-mosaic walls.' },
        { id: 'kuang-si', name: 'Kuang Si Falls', img: 'assets/postcards/luangprabang-kuang-si.webp', note: 'Tiered turquoise pools in the forest, early before anyone else.' },
        { id: 'mekong', name: 'Mekong river journey', img: 'assets/postcards/luangprabang-mekong.webp', note: 'A slow boat, limestone hills and a village stop.' },
        { id: 'phousi', name: 'Mount Phousi at sunset', img: 'assets/postcards/luangprabang-phousi.webp', note: 'The whole town and both rivers from the hilltop stupa.' },
      ],
    },
    nongkhiaw: {
      name: 'Nong Khiaw', country: 'Laos', lon: 102.6167, lat: 20.5667, label: 'right',
      blurb: 'A riverside hideaway under steep limestone peaks.',
      sights: [
        { id: 'nam-ou', name: 'The Nam Ou valley', img: 'assets/postcards/nongkhiaw-nam-ou.webp', note: 'Mist on the river and karst mountains rising straight up.' },
        { id: 'boat', name: 'A boat through the gorges', img: 'assets/postcards/nongkhiaw-boat.webp', note: 'Drifting past villages with nowhere to be.' },
        { id: 'bungalow', name: 'A riverside bungalow', img: 'assets/postcards/nongkhiaw-bungalow.webp', note: 'A near-offline retreat: a balcony, a book and the river.' },
      ],
    },
    siemreap: {
      name: 'Siem Reap', country: 'Cambodia', lon: 103.8448, lat: 13.3671, label: 'right',
      blurb: 'Angkor: a kingdom of temples swallowed by jungle.',
      sights: [
        { id: 'angkor-wat', name: 'Angkor Wat at sunrise', img: 'assets/postcards/siemreap-angkor-wat.webp', note: 'The famous silhouette reflected in the lotus pond.' },
        { id: 'bayon', name: 'The Bayon', img: 'assets/postcards/siemreap-bayon.webp', note: 'Giant stone faces smiling from every tower.' },
        { id: 'ta-prohm', name: 'Ta Prohm', img: 'assets/postcards/siemreap-ta-prohm.webp', note: 'Enormous tree roots wrapped around the temple walls.' },
        { id: 'banteay-srei', name: 'Banteay Srei', img: 'assets/postcards/siemreap-banteay-srei.webp', note: 'Tiny pink-sandstone temple with the finest carvings at Angkor.' },
      ],
    },
  };

  // Each stop: place id + the first and last day spent there (ISO dates, local).
  const TRIPS = [
    {
      id: 'andalusian-romance',
      title: 'Andalusian Romance',
      subtitle: 'Southern Spain',
      countries: ['Spain'],
      countryIds: ['724'],
      accent: '#d6336c',
      tagline: 'Palaces, white villages and slow candlelit dinners.',
      depart: '2026-12-27', ret: '2027-01-13',
      stops: [
        { place: 'seville', from: '2026-12-28', to: '2027-01-01', note: 'Birthday & New Year\'s Eve' },
        { place: 'cordoba', from: '2027-01-02', to: '2027-01-03' },
        { place: 'granada', from: '2027-01-04', to: '2027-01-08' },
        { place: 'ronda', from: '2027-01-09', to: '2027-01-11' },
        { place: 'malaga', from: '2027-01-12', to: '2027-01-12' },
      ],
    },
    {
      id: 'iberian-slow-travel',
      title: 'Iberian Slow Travel',
      subtitle: 'Portugal & Southern Spain',
      countries: ['Portugal', 'Spain'],
      countryIds: ['620', '724'],
      accent: '#8a5cc7',
      tagline: 'Lisbon\'s hills, a country estate, then Moorish Spain.',
      depart: '2026-12-27', ret: '2027-01-13',
      stops: [
        { place: 'lisbon', from: '2026-12-28', to: '2027-01-01', note: 'Birthday & New Year\'s Eve' },
        { place: 'alentejo', from: '2027-01-02', to: '2027-01-04' },
        { place: 'seville', from: '2027-01-05', to: '2027-01-08', note: 'Three Kings' },
        { place: 'granada', from: '2027-01-09', to: '2027-01-11' },
        { place: 'malaga', from: '2027-01-12', to: '2027-01-12' },
      ],
    },
    {
      id: 'lost-kingdoms',
      title: 'Lost Kingdoms',
      subtitle: 'Thailand, Laos & Cambodia',
      countries: ['Thailand', 'Laos', 'Cambodia'],
      countryIds: ['764', '418', '116'],
      accent: '#c28b2c',
      tagline: 'Golden temples, turquoise falls and the stones of Angkor.',
      depart: '2026-12-27', ret: '2027-01-13',
      stops: [
        { place: 'chiangmai', from: '2026-12-29', to: '2027-01-01', note: 'Birthday & New Year\'s Eve' },
        { place: 'luangprabang', from: '2027-01-02', to: '2027-01-06' },
        { place: 'siemreap', from: '2027-01-07', to: '2027-01-11' },
      ],
    },
    {
      id: 'slow-kingdoms',
      title: 'Slow Kingdoms',
      subtitle: 'Thailand & Laos',
      countries: ['Thailand', 'Laos'],
      countryIds: ['764', '418'],
      accent: '#2a9d94',
      tagline: 'Resorts, tea hills and a hidden river valley.',
      depart: '2026-12-27', ret: '2027-01-13',
      stops: [
        { place: 'chiangmai', from: '2026-12-29', to: '2027-01-01', note: 'Birthday & New Year\'s Eve' },
        { place: 'chiangrai', from: '2027-01-02', to: '2027-01-04' },
        { place: 'luangprabang', from: '2027-01-05', to: '2027-01-08' },
        { place: 'nongkhiaw', from: '2027-01-09', to: '2027-01-10' },
        { place: 'luangprabang', from: '2027-01-11', to: '2027-01-11', note: 'One last night' },
      ],
    },
  ];

  /* Crowd levels: a best guess, 0 (empty) to 10 (Edinburgh at Hogmanay).
     Each place has a typical level for early January plus specific days that differ.
     Dates without an entry fall back to `base`. */
  const CROWDS = {
    london:    { base: 4.5, days: { '2026-12-28': 7.5, '2026-12-29': 7.5, '2026-12-30': 8, '2026-12-31': 9.5, '2027-01-01': 7.5, '2027-01-02': 7, '2027-01-03': 6.5, '2027-01-04': 5.5 } },
    edinburgh: { base: 3.5, days: { '2026-12-28': 7, '2026-12-29': 8, '2026-12-30': 9, '2026-12-31': 10, '2027-01-01': 8.5, '2027-01-02': 6, '2027-01-03': 5, '2027-01-04': 4 } },
    lisbon:    { base: 4.5, days: { '2026-12-28': 6.5, '2026-12-29': 6.5, '2026-12-30': 6.5, '2026-12-31': 8, '2027-01-01': 5 } },
    alentejo:  { base: 2.5, days: { '2027-01-02': 3.5, '2027-01-03': 3 } },
    seville:   { base: 4.5, days: { '2026-12-28': 6.5, '2026-12-29': 6.5, '2026-12-30': 6.5, '2026-12-31': 7, '2027-01-01': 5, '2027-01-02': 6, '2027-01-05': 8, '2027-01-06': 6.5 } },
    cordoba:   { base: 3.5, days: { '2027-01-02': 5, '2027-01-03': 4.5 } },
    granada:   { base: 4.5, days: { '2027-01-04': 6, '2027-01-05': 7, '2027-01-06': 6, '2027-01-09': 5, '2027-01-10': 5 } },
    ronda:     { base: 3,   days: { '2027-01-09': 4, '2027-01-10': 4 } },
    malaga:    { base: 3.5, days: {} },
    chiangmai: { base: 7,   days: { '2026-12-29': 8, '2026-12-30': 8, '2026-12-31': 9, '2027-01-01': 8 } },
    chiangrai: { base: 6,   days: { '2027-01-02': 7, '2027-01-03': 6.5 } },
    luangprabang: { base: 6, days: { '2027-01-02': 7, '2027-01-03': 6.5 } },
    nongkhiaw: { base: 3,   days: {} },
    siemreap:  { base: 7,   days: { '2027-01-08': 7.5, '2027-01-09': 7 } },
  };

  /* Travel as a Black woman: our read, based on first-hand accounts from Black women
     travelers plus general safety conditions. Ratings are 1–5:
       safety  = everyday safety for a woman visitor
       welcome = how comfortable and accepted a Black woman is likely to feel
     Laos and Cambodia have far fewer first-hand reports, so those ratings lean on
     general conditions and on accounts from neighboring Thailand. */
  const BLACK_TRAVEL = {
    trips: {
      'andalusian-romance': 'Safe and mostly welcoming. Seville and Málaga are used to visitors from everywhere; expect some curious stares, more of them in the small mountain towns. Rudeness is more likely than real danger.',
      'iberian-slow-travel': 'The most at-home of the four. Lisbon has a large, long-established Afro-Portuguese community and has become a favorite of Black American travelers. Spain and the Alentejo countryside are safe, with more stares outside the cities.',
      'lost-kingdoms': 'Safe, gentle and friendly, but you will stand out. Expect lots of curiosity: staring, photo requests, questions about hair and skin. People who have lived it describe it as curiosity far more than hostility. Colorism is real across the region.',
      'slow-kingdoms': 'Safe, gentle and friendly, and the quietest trip, but you will stand out, most of all in Chiang Rai and the Nong Khiaw valley. Expect curiosity and photo requests more than hostility. Colorism is real across the region.',
    },
    places: {
      lisbon: { safety: 4, welcome: 5, note: 'Lisbon has a large Afro-Portuguese community with roots in Cape Verde, Angola and Mozambique, and a growing Black expat scene. Many Black travelers say they feel at home here, though some report quieter, hidden prejudice.', tip: 'Try the African Lisbon Tour or a Black-owned food tour. Afro hair salons are easy to find. Watch for pickpockets on Tram 28.' },
      alentejo: { safety: 5, welcome: 3, note: 'Rural, quiet and very safe, with little diversity. People are reserved but polite; a Black woman will be noticed in the villages, and that is usually the extent of it.', tip: 'Bring your own hair products for these days.' },
      seville: { safety: 4, welcome: 3, note: 'Generally safe, and many Black women live and travel here happily. The common complaints are stares, questions about where you are from, and the odd rude comment. Real danger is rare.', tip: 'Seville has a Black women\'s social group (Black Ladies in Seville Society) if you want to connect. A few Afro hair salons exist.' },
      cordoba: { safety: 4, welcome: 3, note: 'A small, tourist-friendly city that is safe to walk day and night. Expect a similar experience to Seville: some curious looks, rarely anything more.', tip: 'Carry a copy of your passport: Spanish police do random ID checks, and rights groups report Black people are stopped more often.' },
      granada: { safety: 4, welcome: 3, note: 'A student and tourist city with a sizable North African community, so a mixed crowd is normal. Mostly safe and relaxed; some travelers report stares in the Albaicín.', tip: 'As anywhere in Spain, keep a passport copy on you for police ID checks.' },
      ronda: { safety: 5, welcome: 3, note: 'Very safe, small and touristy. In Ronda and the white villages you will be one of very few Black visitors, so expect to be noticed. Locals are used to tourists, though.', tip: 'Bring your own hair and skin products from Seville or home.' },
      malaga: { safety: 4, welcome: 4, note: 'One of Spain\'s most international cities, with a diverse population and an African community. You will blend in more here than anywhere else in Andalusia.', tip: 'A good place to restock hair products before flying home.' },
      chiangmai: { safety: 4, welcome: 3, note: 'Safe and laid-back, with a big expat and digital-nomad community that includes Black residents. Black women there report lots of curiosity about skin and hair, but outright negativity is rare.', tip: 'Skin-whitening products are everywhere, which can be jarring. Bring hair products from home. A polite "no, thank you" to photos or hair touching is fine.' },
      chiangrai: { safety: 4, welcome: 3, note: 'Smaller and less international than Chiang Mai. A Black woman may be the first some locals have met, so expect a lot of staring. It reads as curiosity, not hostility.', tip: 'A smile goes a long way. It is fine to decline photos.' },
      luangprabang: { safety: 5, welcome: 3, note: 'One of the calmest, lowest-crime towns in Asia, and used to foreign visitors. There are few first-hand reports from Black women; expect curiosity and photo requests like elsewhere in the region.', tip: 'Dress modestly near temples (shoulders and knees covered). Bring everything you need for hair and skin.' },
      nongkhiaw: { safety: 4, welcome: 3, note: 'A tiny, remote river village. Very gentle and friendly, but it sees very few Black visitors, so expect plenty of curiosity, especially from kids.', tip: 'Medical care is hours away. Stick to marked paths: there is old unexploded ordnance in the hills.' },
      siemreap: { safety: 4, welcome: 3, note: 'A busy tourist hub that is used to visitors from everywhere. There are few first-hand reports from Black women; expect curiosity, photo requests at the temples, and colorism in local beauty culture.', tip: 'Hold your bag on the side away from the road: bag snatching from passing motorbikes happens.' },
    },
  };

  return { HOME, PLACES, TRIPS, CROWDS, BLACK_TRAVEL, COMPARE: [
    { id: 'london', name: 'London' },
    { id: 'edinburgh', name: 'Edinburgh' },
  ] };
})();
