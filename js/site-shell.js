if (typeof document !== 'undefined' && document.head) {
    if (!document.querySelector('link[rel="preload"][href="/img/logo-hkm.png"]')) {
        const logoPreload = document.createElement('link');
        logoPreload.rel = 'preload';
        logoPreload.as = 'image';
        logoPreload.href = '/img/logo-hkm.png';
        logoPreload.setAttribute('fetchpriority', 'high');
        document.head.appendChild(logoPreload);
    }
}

const STORE_URL = 'https://www.hiskingdomdesigns.no/';
const FACEBOOK_URL = 'https://www.facebook.com/hiskingdomministry777?locale=nb_NO';
const INSTAGRAM_URL = 'https://www.instagram.com/freedomisathand/';
const YOUTUBE_URL = 'https://www.youtube.com/@HisKingdomMinistry';

if (typeof window !== 'undefined') {
    window.hkmApplyTheme = function (theme) {
        const activeTheme = theme || (typeof localStorage !== 'undefined' && localStorage.getItem('hkm_theme')) || document.documentElement.getAttribute('data-theme') || 'light';
        
        document.documentElement.setAttribute('data-theme', activeTheme);
        document.documentElement.classList.toggle('dark', activeTheme === 'dark');
        
        if (document.body) {
            document.body.classList.toggle('dark', activeTheme === 'dark');
            document.body.classList.toggle('bible-theme-dark', activeTheme === 'dark');
            document.body.classList.toggle('bible-theme-light', activeTheme !== 'dark');
        }
        
        try {
            if (typeof localStorage !== 'undefined') localStorage.setItem('hkm_theme', activeTheme);
        } catch (e) {}

        document.querySelectorAll('.theme-toggle-icon').forEach(icon => {
            icon.textContent = activeTheme === 'dark' ? 'light_mode' : 'dark_mode';
        });

        if (window.bibleReader) {
            window.bibleReader.settings.theme = activeTheme === 'dark' ? 'dark' : 'light';
            if (typeof window.bibleReader.saveSettings === 'function') window.bibleReader.saveSettings();
            if (typeof window.bibleReader.applySettings === 'function') window.bibleReader.applySettings();
        }

        window.dispatchEvent(new CustomEvent('hkm-theme-changed', { detail: { theme: activeTheme } }));
    };

    window.hkmToggleTheme = function () {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
        window.hkmApplyTheme(nextTheme);
    };

    if (!window.hkmThemeClickBound) {
        window.hkmThemeClickBound = true;
        document.addEventListener('click', function (e) {
            const btn = e.target.closest('#theme-toggle-btn, .mobile-theme-toggle-btn, .theme-toggle-btn, [data-action="toggle-theme"]');
            if (btn) {
                e.preventDefault();
                e.stopPropagation();
                window.hkmToggleTheme();
            }
        });
    }
}

const ROUTES = {
    no: {
        home: '/',
        donate: '/donasjoner',
        regularDonor: '/bli-fast-giver',
        churches: '/for-menigheter',
        businesses: '/for-bedrifter',
        network: '/bnn',
        about: '/om-oss',
        contact: '/kontakt',
        bible: '/bibel',
        media: '/media',
        podcast: '/podcast',
        courses: '/kurs',
        readingPlans: '/leseplaner',
        events: '/arrangementer',
        blog: '/blogg',
        privacy: '/personvern',
        terms: '/betingelser',
        accessibility: '/tilgjengelighet'
    },
    en: {
        home: '/en/',
        donate: '/en/donations',
        regularDonor: '/en/regular-donors',
        churches: '/en/for-churches',
        businesses: '/en/for-businesses',
        network: '/en/bnn',
        about: '/en/about',
        contact: '/en/contact',
        bible: '/en/bibel',
        media: '/en/media',
        podcast: '/en/podcast',
        courses: '/en/courses',
        readingPlans: '/en/leseplaner',
        events: '/en/events',
        blog: '/en/blog',
        privacy: '/en/privacy',
        terms: '/betingelser',
        accessibility: '/en/accessibility'
    },
    es: {
        home: '/es/',
        donate: '/es/donaciones',
        regularDonor: '/es/donantes-regulares',
        churches: '/es/para-iglesias',
        businesses: '/es/para-empresas',
        network: '/es/bnn',
        about: '/es/sobre-nosotros',
        contact: '/es/contacto',
        bible: '/es/bibel',
        media: '/es/media',
        podcast: '/es/podcast',
        courses: '/es/cursos',
        readingPlans: '/es/leseplaner',
        events: '/es/eventos',
        blog: '/es/blog',
        privacy: '/es/privacidad',
        terms: '/betingelser',
        accessibility: '/es/accesibilidad'
    }
};

const COPY = {
    no: {
        code: 'NO',
        searchLabel: 'Søk i nettsiden',
        searchPlaceholder: 'Søk...',
        searchTitle: 'Søk i systemet',
        searchInput: 'Hva leter du etter? Skriv for forslag...',
        searchHelp: "Trykk 'Enter' for fullstendig søk.",
        closeSearch: 'Lukk søk',
        languageLabel: 'Velg språk',
        profile: 'Min Side',
        profileImage: 'Profilbilde',
        donate: 'Gi gave',
        menuToggle: 'Toggle meny',
        theme: 'Bytt tema',
        menu: {
            engage: {
                title: 'Engasjer deg',
                items: [
                    ['volunteer_activism', 'Støtt arbeidet', 'Bidra økonomisk til vår tjeneste.', 'donate', 'menu.sections.engage.supportWork'],
                    ['favorite', 'Bli fast giver', 'Støtt oss månedlig for langsiktig arbeid.', 'regularDonor', 'menu.sections.engage.regularDonor'],
                    ['church', 'For menigheter', 'Ressurser og undervisning for din kirke.', 'churches', 'menu.sections.engage.churches'],
                    ['corporate_fare', 'For bedrifter', 'Samarbeidsavtaler for næringslivet.', 'businesses', 'menu.sections.engage.businesses'],
                    ['business_center', 'Business Network', 'Nettverk for kristne ledere og gründere.', 'network', 'menu.sections.engage.network']
                ]
            },
            about: {
                title: 'Bli kjent med oss',
                items: [
                    ['info', 'Om oss', 'Lær mer om vår visjon, tro og verdier.', 'about', 'menu.sections.about.about'],
                    ['mail', 'Kontakt oss', 'Send oss en melding eller still spørsmål.', 'contact', 'menu.sections.about.contact']
                ]
            },
            resources: {
                title: 'Ressurser',
                items: [
                    ['menu_book', 'Les Bibelen', 'Les Guds ord med vår bibelleser.', 'bible', 'menu.sections.resources.bible'],
                    ['shopping_bag', 'Butikk', 'Kristne klær, kopper og tilbehør.', 'store', 'menu.sections.resources.store'],
                    ['podcasts', 'Media & Podcast', 'Se taler og lytt til våre podcaster.', 'media', 'menu.sections.resources.media'],
                    ['school', 'Kurs', 'Undervisning og kurs for vekst.', 'courses', 'menu.sections.resources.courses']
                ]
            },
            activity: {
                title: 'Aktuell aktivitet',
                items: [
                    ['calendar_month', 'Leseplaner', 'Følg våre daglige leseplaner.', 'readingPlans', 'menu.sections.resources.readingPlans'],
                    ['event', 'Arrangementer', 'Bli med på seminarer og samlinger.', 'events', 'menu.sections.resources.events'],
                    ['feed', 'Nyheter & Blogg', 'Siste oppdateringer og artikler.', 'blog', 'menu.sections.resources.blog'],
                    ['person', 'Min Side', 'Din profil og leseplaner.', 'profile', 'menu.sections.resources.myPage']
                ]
            },
            supportNow: 'Støtt nå',
            tax: 'Skattefradrag'
        },
        footer: {
            description: 'His Kingdom Ministry er en non-profit organisasjon dedikert til åndelig vekst gjennom undervisning, podcast og reisevirksomhet.',
            aboutTitle: 'Om oss',
            resourcesTitle: 'Ressurser',
            mediaTitle: 'Media',
            involvementTitle: 'Involvering',
            followTitle: 'Følg oss',
            contactTitle: 'Kontakt oss',
            contactButton: 'Kontaktskjema',
            home: 'Hjem',
            about: 'Om oss',
            vision: 'Vår visjon',
            contact: 'Kontakt oss',
            bible: 'Les Bibelen',
            teaching: 'Undervisning',
            events: 'Arrangementer',
            blog: 'Nyheter & blogg',
            store: 'Butikk',
            myPage: 'Min Side',
            podcast: 'Podcast',
            videos: 'Videoer',
            calendar: 'Kalender',
            donate: 'Gi en gave',
            privacy: 'Personvern',
            terms: 'Vilkår og betingelser',
            accessibility: 'Tilgjengelighet',
            cookies: 'Cookies',
            email: 'E-post:',
            phone: 'Telefon:',
            account: 'Konto nr.:',
            copyright: 'His Kingdom Ministry. Alle rettigheter reservert.',
            admin: 'Admin'
        }
    },
    en: {
        code: 'EN',
        searchLabel: 'Search the website',
        searchPlaceholder: 'Search...',
        searchTitle: 'Search',
        searchInput: 'What are you looking for? Start typing...',
        searchHelp: "Press 'Enter' for a full search.",
        closeSearch: 'Close search',
        languageLabel: 'Choose language',
        profile: 'My Page',
        profileImage: 'Profile picture',
        donate: 'Donate',
        menuToggle: 'Toggle menu',
        theme: 'Toggle theme',
        menu: {
            engage: {
                title: 'Get Involved',
                items: [
                    ['volunteer_activism', 'Support the Work', 'Support our ministry financially.', 'donate', 'menu.sections.engage.supportWork'],
                    ['favorite', 'Become a Monthly Donor', 'Partner with us on a monthly basis.', 'regularDonor', 'menu.sections.engage.regularDonor'],
                    ['church', 'For Churches', 'Resources and teaching for your church.', 'churches', 'menu.sections.engage.churches'],
                    ['corporate_fare', 'For Businesses', 'Partnership agreements for companies.', 'businesses', 'menu.sections.engage.businesses'],
                    ['business_center', 'Business Network', 'Networking for Christian business leaders.', 'network', 'menu.sections.engage.network']
                ]
            },
            about: {
                title: 'Get to Know Us',
                items: [
                    ['info', 'About Us', 'Learn about our vision, faith, and values.', 'about', 'menu.sections.about.about'],
                    ['mail', 'Contact Us', 'Send us a message or reach out.', 'contact', 'menu.sections.about.contact']
                ]
            },
            resources: {
                title: 'Resources',
                items: [
                    ['menu_book', 'Read the Bible', 'Read the Word of God with our reader.', 'bible', 'menu.sections.resources.bible'],
                    ['shopping_bag', 'Store', 'Christian apparel, mugs, and more.', 'store', 'menu.sections.resources.store'],
                    ['podcasts', 'Media & Podcast', 'Watch messages and listen to podcasts.', 'media', 'menu.sections.resources.media'],
                    ['school', 'Courses', 'Teaching and courses for spiritual growth.', 'courses', 'menu.sections.resources.courses']
                ]
            },
            activity: {
                title: 'Current Activity',
                items: [
                    ['calendar_month', 'Reading Plans', 'Follow our structured reading plans.', 'readingPlans', 'menu.sections.resources.readingPlans'],
                    ['event', 'Events', 'Join our seminars and gatherings.', 'events', 'menu.sections.resources.events'],
                    ['feed', 'News & Blog', 'Latest updates and articles.', 'blog', 'menu.sections.resources.blog'],
                    ['person', 'My Page', 'Your profile and progress.', 'profile', 'menu.sections.resources.myPage']
                ]
            },
            supportNow: 'Support Now',
            tax: 'Tax Deduction'
        },
        footer: {
            description: 'His Kingdom Ministry is a non-profit organization dedicated to spiritual growth through teaching, podcasts, and outreach.',
            aboutTitle: 'About',
            resourcesTitle: 'Resources',
            mediaTitle: 'Media',
            involvementTitle: 'Get involved',
            followTitle: 'Follow us',
            contactTitle: 'Contact us',
            contactButton: 'Contact form',
            home: 'Home',
            about: 'About us',
            vision: 'Our vision',
            contact: 'Contact us',
            bible: 'Read the Bible',
            teaching: 'Teaching',
            events: 'Events',
            blog: 'News & blog',
            store: 'Store',
            myPage: 'My Page',
            podcast: 'Podcast',
            videos: 'Videos',
            calendar: 'Calendar',
            donate: 'Donate',
            privacy: 'Privacy',
            terms: 'Terms and conditions',
            accessibility: 'Accessibility',
            cookies: 'Cookies',
            email: 'Email:',
            phone: 'Phone:',
            account: 'Account no.:',
            copyright: 'His Kingdom Ministry. All rights reserved.',
            admin: 'Admin'
        }
    },
    es: {
        code: 'ES',
        searchLabel: 'Buscar en el sitio web',
        searchPlaceholder: 'Buscar...',
        searchTitle: 'Buscar',
        searchInput: '¿Qué estás buscando? Empieza a escribir...',
        searchHelp: "Pulsa 'Enter' para una búsqueda completa.",
        closeSearch: 'Cerrar búsqueda',
        languageLabel: 'Elegir idioma',
        profile: 'Mi página',
        profileImage: 'Foto de perfil',
        donate: 'Donar',
        menuToggle: 'Abrir o cerrar menú',
        theme: 'Cambiar tema',
        menu: {
            engage: {
                title: 'Participa',
                items: [
                    ['volunteer_activism', 'Apoya el trabajo', 'Apoya económicamente nuestro ministerio.', 'donate', 'menu.sections.engage.supportWork'],
                    ['favorite', 'Hazte donante mensual', 'Colabora con nosotros cada mes.', 'regularDonor', 'menu.sections.engage.regularDonor'],
                    ['church', 'Para iglesias', 'Recursos y enseñanza para tu iglesia.', 'churches', 'menu.sections.engage.churches'],
                    ['corporate_fare', 'Para empresas', 'Acuerdos de colaboración para empresas.', 'businesses', 'menu.sections.engage.businesses'],
                    ['business_center', 'Business Network', 'Red para líderes y emprendedores cristianos.', 'network', 'menu.sections.engage.network']
                ]
            },
            about: {
                title: 'Conócenos',
                items: [
                    ['info', 'Sobre nosotros', 'Conoce nuestra visión, fe y valores.', 'about', 'menu.sections.about.about'],
                    ['mail', 'Contacto', 'Envíanos un mensaje o una pregunta.', 'contact', 'menu.sections.about.contact']
                ]
            },
            resources: {
                title: 'Recursos',
                items: [
                    ['menu_book', 'Leer la Biblia', 'Lee la Palabra de Dios con nuestro lector.', 'bible', 'menu.sections.resources.bible'],
                    ['shopping_bag', 'Tienda', 'Ropa cristiana, tazas y mucho más.', 'store', 'menu.sections.resources.store'],
                    ['podcasts', 'Media y pódcast', 'Mira mensajes y escucha nuestros pódcasts.', 'media', 'menu.sections.resources.media'],
                    ['school', 'Cursos', 'Enseñanza y cursos para crecer.', 'courses', 'menu.sections.resources.courses']
                ]
            },
            activity: {
                title: 'Actividad actual',
                items: [
                    ['calendar_month', 'Planes de lectura', 'Sigue nuestros planes de lectura.', 'readingPlans', 'menu.sections.resources.readingPlans'],
                    ['event', 'Eventos', 'Participa en seminarios y encuentros.', 'events', 'menu.sections.resources.events'],
                    ['feed', 'Noticias y blog', 'Últimas noticias y artículos.', 'blog', 'menu.sections.resources.blog'],
                    ['person', 'Mi página', 'Tu perfil y tu progreso.', 'profile', 'menu.sections.resources.myPage']
                ]
            },
            supportNow: 'Apoya ahora',
            tax: 'Deducción fiscal'
        },
        footer: {
            description: 'His Kingdom Ministry es una organización sin ánimo de lucro dedicada al crecimiento espiritual mediante enseñanza, pódcast y actividades.',
            aboutTitle: 'Nosotros',
            resourcesTitle: 'Recursos',
            mediaTitle: 'Media',
            involvementTitle: 'Participa',
            followTitle: 'Síguenos',
            contactTitle: 'Contacto',
            contactButton: 'Formulario de contacto',
            home: 'Inicio',
            about: 'Sobre nosotros',
            vision: 'Nuestra visión',
            contact: 'Contacto',
            bible: 'Leer la Biblia',
            teaching: 'Enseñanza',
            events: 'Eventos',
            blog: 'Noticias y blog',
            store: 'Tienda',
            myPage: 'Mi página',
            podcast: 'Pódcast',
            videos: 'Vídeos',
            calendar: 'Calendario',
            donate: 'Donar',
            privacy: 'Privacidad',
            terms: 'Términos y condiciones',
            accessibility: 'Accesibilidad',
            cookies: 'Cookies',
            email: 'Correo:',
            phone: 'Teléfono:',
            account: 'Cuenta:',
            copyright: 'His Kingdom Ministry. Todos los derechos reservados.',
            admin: 'Admin'
        }
    }
};

function getLanguage() {
    const path = window.location.pathname;
    const htmlLanguage = (document.documentElement.lang || '').toLowerCase();
    if (path.startsWith('/en/') || htmlLanguage.startsWith('en')) return 'en';
    if (path.startsWith('/es/') || htmlLanguage.startsWith('es')) return 'es';
    return 'no';
}

function contentAttributes(key, attr = '') {
    return `data-content-doc="settings_global" data-content-key="${key}"${attr ? ` data-content-attr="${attr}"` : ''}`;
}

function resolveHref(routeKey, routes) {
    if (routeKey === 'store') return STORE_URL;
    if (routeKey === 'profile') return '/minside/index.html';
    return routes[routeKey] || routes.home;
}

function menuItemMarkup(item, routes) {
    const [icon, label, description, routeKey, contentKey] = item;
    const href = resolveHref(routeKey, routes);
    const external = routeKey === 'store' ? ' target="_blank" rel="noopener noreferrer"' : '';
    const itemClass = routeKey === 'profile' ? ' class="min-side-pill"' : '';

    return `
        <li${itemClass}>
            <span class="material-symbols-outlined">${icon}</span>
            <div class="flex flex-col">
                <a href="${href}"${external} ${contentAttributes(contentKey)}>${label}</a>
                <span class="mega-menu-desc">${description}</span>
            </div>
        </li>`;
}

function menuColumnMarkup(section, sectionKey, routes) {
    return `
        <div class="menu-col">
            <div class="menu-section-title" role="heading" aria-level="3"
                ${contentAttributes(`menu.sections.${sectionKey}.title`)}>${section.title}</div>
            <ul class="mega-nav-list">
                ${section.items.map((item) => menuItemMarkup(item, routes)).join('')}
            </ul>
        </div>`;
}

export function renderSiteHeader(language = getLanguage()) {
    const copy = COPY[language];
    const routes = ROUTES[language];

    return `
        <header class="header fixed top-0 left-0 w-full z-[10001] transition-all duration-300" id="header">
            <div class="header-content" id="header-container">
                <a href="${routes.home}" class="flex items-center gap-3 font-bold text-white transition-all duration-300 logo">
                    <div class="w-[45px] h-[45px] flex items-center justify-center rounded-lg overflow-hidden shrink-0 logo-icon">
                        <img src="/img/logo-hkm.png" alt="His Kingdom Ministry Logo" class="w-full h-full object-cover" width="45" height="45" fetchpriority="high" decoding="async"
                            ${contentAttributes('brand.logoAlt', 'alt')}>
                    </div>
                    <span class="text-xl" ${contentAttributes('brand.name')}>His Kingdom Ministry</span>
                </a>

                <div class="header-actions">
                    <div class="header-actions-dock">
                        <button id="global-search-opener"
                            class="w-9 h-9 flex items-center justify-center rounded-full text-white hover:bg-white/15 active:scale-95 transition-all"
                            aria-label="${copy.searchLabel}">
                            <span class="material-symbols-outlined text-xl" style="position: relative; top: 0; left: 9px;">search</span>
                        </button>

                        <div class="header-actions-expandable">
                            <a href="${routes.bible}"
                                class="hidden md:flex w-9 h-9 items-center justify-center rounded-full text-white hover:bg-white/15 active:scale-95 transition-all header-bible-btn"
                                aria-label="${copy.menu.resources.items[0][1]}" title="${copy.menu.resources.items[0][1]}">
                                <span class="material-symbols-outlined text-xl">menu_book</span>
                            </a>
                            <a href="${routes.readingPlans}"
                                class="hidden md:flex w-9 h-9 items-center justify-center rounded-full text-white hover:bg-white/15 active:scale-95 transition-all header-reading-plans-btn"
                                aria-label="${copy.menu.activity.items[0][1]}" title="${copy.menu.activity.items[0][1]}">
                                <span class="material-symbols-outlined text-xl">calendar_today</span>
                            </a>

                            <div class="hidden md:block w-px h-5 bg-white/20 mx-1 dock-divider"></div>

                            <div class="lang-switcher relative group">
                                <button class="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-full text-white hover:bg-white/15 transition-all lang-btn"
                                    aria-label="${copy.languageLabel}">
                                    <span class="material-symbols-outlined text-lg">language</span>
                                    <span ${contentAttributes('header.currentLanguage')}>${copy.code}</span>
                                </button>
                                <div class="lang-dropdown absolute right-0 mt-2 w-40 bg-white shadow-xl rounded-lg py-2 hidden border border-gray-100">
                                    <a href="/" class="block px-4 py-2 text-gray-800 hover:bg-gray-50 lang-switch-btn" data-lang="no">🇳🇴 Norsk</a>
                                    <a href="/en/" class="block px-4 py-2 text-gray-800 hover:bg-gray-50 lang-switch-btn" data-lang="en">🇺🇸 English</a>
                                    <a href="/es/" class="block px-4 py-2 text-gray-800 hover:bg-gray-50 lang-switch-btn" data-lang="es">🇪🇸 Español</a>
                                </div>
                            </div>
                        </div>
                    </div>

                    <a href="/minside/index.html" id="header-profile-link"
                        class="w-11 h-11 flex items-center justify-center rounded-full text-white hover:bg-white/15 active:scale-95 transition-all relative overflow-hidden hidden"
                        aria-label="${copy.profile}" title="${copy.profile}">
                        <span class="material-symbols-outlined text-xl">account_circle</span>
                        <img id="header-profile-img" src="" alt="${copy.profileImage}" class="absolute inset-0 w-full h-full object-cover hidden rounded-full">
                    </a>

                    <a href="${routes.donate}"
                        class="hidden md:flex items-center gap-2 px-6 py-2.5 rounded-full font-bold text-white bg-gradient-to-br from-[#f39c12] to-[#e74c3c] hover:scale-[1.03] active:scale-[0.98] transition-all shadow-md shadow-orange-500/10 header-donate-btn">
                        <span ${contentAttributes('header.donateLabel')}>${copy.donate}</span>
                        <span class="material-symbols-outlined text-lg">favorite</span>
                    </a>

                    <button
                        class="menu-toggle w-11 h-11 rounded-full flex items-center justify-center text-white bg-white/15 border border-white/10 hover:bg-white/25 active:scale-95 transition-all relative focus:outline-none focus:ring-0"
                        id="menu-toggle" aria-label="${copy.menuToggle}" aria-controls="mega-menu" aria-expanded="false"
                        ${contentAttributes('header.menuToggleLabel', 'aria-label')}>
                        <span class="material-symbols-outlined text-2xl open-icon">menu</span>
                        <span class="material-symbols-outlined text-2xl close-icon hidden">close</span>
                    </button>
                </div>
            </div>
        </header>`;
}

export function renderMegaMenu(language = getLanguage()) {
    const copy = COPY[language];
    const routes = ROUTES[language];
    const languageCodes = ['no', 'en', 'es'];

    return `
        <div class="fixed inset-0 bg-white z-[10000] opacity-0 invisible transition-all duration-300 flex flex-col overflow-y-auto mega-menu"
            id="mega-menu" style="display: none;" aria-hidden="true">
            <div class="max-w-full mx-auto px-4 sm:px-6 lg:px-8 w-full pt-[100px] flex flex-col gap-6 justify-start">
                <div class="flex flex-col gap-6">
                    <div class="relative w-full md:hidden">
                        <i class="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                        <input type="text" placeholder="${copy.searchPlaceholder}"
                            class="w-full pl-12 pr-4 py-4 bg-gray-100 rounded-2xl border-none focus:outline-none focus:ring-0 transition-all text-gray-800">
                    </div>

                    <div class="flex items-center justify-between gap-4">
                        <div class="flex md:hidden items-center gap-4 px-5 py-3 border border-gray-100 rounded-full bg-gray-50/50">
                            <i class="fas fa-globe text-gray-400"></i>
                            <div class="flex gap-4 items-center">
                                ${languageCodes.map((code, index) => {
                                    const activeClass = code === language
                                        ? 'font-bold text-primary-orange'
                                        : 'font-semibold text-gray-500 hover:text-primary-orange';
                                    const href = code === 'no' ? '/' : `/${code}/`;
                                    return `${index ? '<div class="w-px h-3 bg-gray-300"></div>' : ''}
                                        <a href="${href}" class="text-sm ${activeClass} lang-switch-btn" data-lang="${code}">${code.toUpperCase()}</a>`;
                                }).join('')}
                            </div>
                        </div>

                        <div class="ml-auto flex items-center gap-3">
                            <a href="/minside/index.html" id="mobile-menu-profile-link"
                                class="w-12 h-12 flex items-center justify-center rounded-full border border-gray-200 bg-gray-50/50 text-gray-600 hover:text-primary-orange transition-all relative overflow-hidden hidden"
                                aria-label="${copy.profile}" title="${copy.profile}">
                                <span class="material-symbols-outlined text-2xl">account_circle</span>
                                <img id="mobile-menu-profile-img" src="" alt="${copy.profileImage}" class="absolute inset-0 w-full h-full object-cover hidden rounded-full">
                            </a>
                            <button class="mobile-theme-toggle-btn flex items-center justify-center h-12 w-12 border border-gray-200 rounded-full bg-gray-50/50 text-gray-600 hover:text-primary-orange transition-colors"
                                aria-label="${copy.theme}" title="${copy.theme}">
                                <span class="material-symbols-outlined text-2xl theme-toggle-icon">dark_mode</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div class="mega-menu-body">
                    <div class="mega-menu-grid">
                        ${menuColumnMarkup(copy.menu.engage, 'engage', routes)}
                        ${menuColumnMarkup(copy.menu.about, 'about', routes)}
                        ${menuColumnMarkup(copy.menu.resources, 'resources', routes)}
                        ${menuColumnMarkup(copy.menu.activity, 'activity', routes)}
                    </div>

                    <div class="mega-menu-footer">
                        <a href="${routes.donate}" class="btn btn-primary btn-large btn-block footer-donate-btn">
                            <span ${contentAttributes('menu.footer.cta')}>${copy.menu.supportNow}</span>
                            <i class="fas fa-heart heart"></i>
                        </a>
                        <div class="menu-footer-links">
                            <a href="${STORE_URL}" target="_blank" rel="noopener noreferrer" ${contentAttributes('menu.footer.store')}>${copy.footer.store}</a>
                            <a href="${routes.donate}" ${contentAttributes('menu.footer.taxDeduction')}>${copy.menu.tax}</a>
                            <a href="${routes.about}" ${contentAttributes('menu.footer.about')}>${copy.footer.about}</a>
                            <a href="${routes.privacy}" ${contentAttributes('menu.footer.privacy')}>${copy.footer.privacy}</a>
                            <a href="${routes.terms}" ${contentAttributes('menu.footer.terms')}>${copy.footer.terms}</a>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
}

export function renderSiteFooter(language = getLanguage()) {
    const copy = COPY[language];
    const footer = copy.footer;
    const routes = ROUTES[language];

    return `
        <footer class="footer" id="kontakt">
            <div class="container">
                <div class="footer-layout-v2">
                    <div class="footer-left">
                        <div class="footer-brand">
                            <a href="${routes.home}" class="logo">
                                <div class="logo-icon">
                                    <img src="/img/logo-hkm.png" alt="His Kingdom Ministry Logo"
                                        ${contentAttributes('brand.logoAlt', 'alt')} loading="lazy">
                                </div>
                                <span class="logo-text" ${contentAttributes('brand.name')}>His Kingdom Ministry</span>
                            </a>
                            <p class="brand-description" ${contentAttributes('footer.description')}>${footer.description}</p>
                        </div>

                        <div class="footer-nav-grid">
                            <div class="nav-col">
                                <h4 ${contentAttributes('footer.title_about')}>${footer.aboutTitle}</h4>
                                <ul>
                                    <li><a href="${routes.home}" ${contentAttributes('footer.links.about.home')}>${footer.home}</a></li>
                                    <li><a href="${routes.about}" ${contentAttributes('footer.links.about.about')}>${footer.about}</a></li>
                                    <li><a href="${routes.about}" ${contentAttributes('footer.links.about.vision')}>${footer.vision}</a></li>
                                    <li><a href="${routes.contact}" ${contentAttributes('footer.links.about.contact')}>${footer.contact}</a></li>
                                </ul>
                            </div>

                            <div class="nav-col">
                                <h4 ${contentAttributes('footer.title_resources')}>${footer.resourcesTitle}</h4>
                                <ul>
                                    <li><a href="${routes.bible}" ${contentAttributes('footer.links.resources.bible')}>${footer.bible}</a></li>
                                    <li><a href="${routes.media}" ${contentAttributes('footer.links.resources.teaching')}>${footer.teaching}</a></li>
                                    <li><a href="${routes.events}" ${contentAttributes('footer.links.resources.courses')}>${footer.events}</a></li>
                                    <li><a href="${routes.blog}" ${contentAttributes('footer.links.resources.blog')}>${footer.blog}</a></li>
                                    <li><a href="${STORE_URL}" target="_blank" rel="noopener noreferrer" ${contentAttributes('footer.links.resources.store')}>${footer.store}</a></li>
                                    <li><a href="/minside/index.html" ${contentAttributes('footer.links.resources.myPage')}>${footer.myPage}</a></li>
                                </ul>
                            </div>

                            <div class="nav-col">
                                <h4 ${contentAttributes('footer.title_media')}>${footer.mediaTitle}</h4>
                                <ul>
                                    <li><a href="${routes.podcast}" ${contentAttributes('footer.links.media.podcast')}>${footer.podcast}</a></li>
                                    <li><a href="${routes.media}" ${contentAttributes('footer.links.media.videos')}>${footer.videos}</a></li>
                                    <li><a href="${YOUTUBE_URL}" target="_blank" rel="noopener noreferrer" ${contentAttributes('footer.links.media.youtube')}>YouTube</a></li>
                                </ul>
                            </div>

                            <div class="nav-col">
                                <h4 ${contentAttributes('footer.title_involvement')}>${footer.involvementTitle}</h4>
                                <ul>
                                    <li><a href="${routes.events}" ${contentAttributes('footer.links.involvement.calendar')}>${footer.calendar}</a></li>
                                    <li><a href="${routes.donate}" ${contentAttributes('footer.links.involvement.donate')}>${footer.donate}</a></li>
                                    <li><a href="${routes.privacy}" ${contentAttributes('footer.links.involvement.privacy')}>${footer.privacy}</a></li>
                                    <li><a href="${routes.terms}">${footer.terms}</a></li>
                                    <li><a href="${routes.accessibility}" ${contentAttributes('footer.links.involvement.accessibility')}>${footer.accessibility}</a></li>
                                    <li><a href="#" data-cookie-settings-link ${contentAttributes('footer.links.involvement.cookies')}>${footer.cookies}</a></li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div class="footer-right">
                        <div class="footer-card">
                            <h4 ${contentAttributes('footer.title_follow')}>${footer.followTitle}</h4>
                            <div class="footer-social-icons">
                                <a href="${FACEBOOK_URL}" target="_blank" rel="noopener noreferrer" aria-label="Facebook"><i class="fab fa-facebook-f"></i></a>
                                <a href="${INSTAGRAM_URL}" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><i class="fab fa-instagram"></i></a>
                                <a href="${YOUTUBE_URL}" target="_blank" rel="noopener noreferrer" aria-label="YouTube"><i class="fab fa-youtube"></i></a>
                            </div>
                        </div>

                        <div class="footer-card contact-card">
                            <h4 ${contentAttributes('footer.title_contact')}>${footer.contactTitle}</h4>
                            <a href="${routes.contact}" class="btn btn-primary btn-block btn-sm"
                                ${contentAttributes('footer.contactButton')}>${footer.contactButton}</a>

                            <div class="contact-details">
                                <div class="detail-item">
                                    <strong ${contentAttributes('footer.contact.emailLabel')}>${footer.email}</strong>
                                    <p ${contentAttributes('contact.email')}>post@hiskingdomministry.no</p>
                                </div>
                                <div class="detail-item">
                                    <strong ${contentAttributes('footer.contact.phoneLabel')}>${footer.phone}</strong>
                                    <p ${contentAttributes('contact.phone')}>+47 930 94 615</p>
                                </div>
                                <div class="detail-item">
                                    <strong ${contentAttributes('footer.contact.vippsLabel')}>Vipps:</strong>
                                    <p ${contentAttributes('contact.vipps')}>938361</p>
                                </div>
                                <div class="detail-item">
                                    <strong ${contentAttributes('footer.contact.accountLabel')}>${footer.account}</strong>
                                    <p ${contentAttributes('contact.account')}>3000.66.08759</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="footer-bottom">
                    <p>&copy; <span id="copyright-year">${new Date().getFullYear()}</span>
                        <span ${contentAttributes('footer.copyright')}>${footer.copyright}</span>
                    </p>
                    <a href="/admin/login.html" class="admin-link" id="admin-link"
                        ${contentAttributes('footer.adminLink')}>${footer.admin}</a>
                </div>
            </div>
        </footer>`;
}

export function renderSearchModal(language = getLanguage()) {
    const copy = COPY[language];
    return `
        <div id="site-search-modal" class="search-overlay">
            <div class="search-modal-container">
                <button class="close-search-btn" id="close-site-search" aria-label="${copy.closeSearch}">
                    <i class="fas fa-times"></i>
                </button>
                <div class="search-modal-title" ${contentAttributes('search.modalTitle')}>${copy.searchTitle}</div>
                <div class="search-input-group">
                    <span class="material-symbols-outlined">search</span>
                    <input type="text" id="site-search-input-v2" class="search-input-field"
                        placeholder="${copy.searchInput}" autocomplete="off">
                </div>
                <div id="site-search-suggestions" class="search-suggestions-container hidden"></div>
                <div id="site-search-results-v2" class="search-suggestions-container hidden"></div>
                <div class="search-help-text">
                    <span ${contentAttributes('search.helpText')}>${copy.searchHelp}</span>
                </div>
            </div>
        </div>`;
}

function elementFromMarkup(markup) {
    const template = document.createElement('template');
    template.innerHTML = markup.trim();
    return template.content.firstElementChild;
}

function replaceOrInsert(selector, markup, insert) {
    const replacement = elementFromMarkup(markup);
    const existing = document.querySelector(selector);
    if (existing) {
        // Preserve already loaded/painted image elements (such as logo) to prevent re-decoding flash
        const existingImgs = existing.querySelectorAll('img');
        const replacementImgs = replacement.querySelectorAll('img');
        if (existingImgs.length > 0 && replacementImgs.length > 0) {
            existingImgs.forEach((oldImg) => {
                const oldSrc = oldImg.getAttribute('src');
                if (!oldSrc) return;
                replacementImgs.forEach((newImg) => {
                    if (newImg.getAttribute('src') === oldSrc && newImg.parentNode) {
                        newImg.replaceWith(oldImg);
                    }
                });
            });
        }
        existing.replaceWith(replacement);
    } else {
        insert(replacement);
    }
    return replacement;
}

function initCookieSettingsLink() {
    document.addEventListener('click', (event) => {
        const link = event.target.closest('[data-cookie-settings-link]');
        if (!link) return;
        event.preventDefault();
        if (typeof window.showCookieBanner === 'function') {
            window.showCookieBanner();
            return;
        }
        try {
            localStorage.removeItem('hkm_cookie_consent');
        } catch (error) {
            // The cookie banner can still be restored on the next regular page load.
        }
        window.location.reload();
    });
}

function bindSiteShellMenu(header, megaMenu) {
    const menuToggle = header.querySelector('#menu-toggle');
    if (!menuToggle || !megaMenu || menuToggle.dataset.hkmMenuBound === 'true') return;

    const openIcon = menuToggle.querySelector('.open-icon');
    const closeIcon = menuToggle.querySelector('.close-icon');
    let previousBodyOverflow = '';

    const isOpen = () => megaMenu.classList.contains('active');

    const setOpen = (open) => {
        menuToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        megaMenu.setAttribute('aria-hidden', open ? 'false' : 'true');
        megaMenu.style.display = open ? 'flex' : 'none';
        megaMenu.classList.toggle('invisible', !open);
        megaMenu.classList.toggle('opacity-0', !open);
        megaMenu.classList.toggle('visible', open);
        megaMenu.classList.toggle('opacity-100', open);
        megaMenu.classList.toggle('active', open);
        header.classList.toggle('menu-open', open);
        openIcon?.classList.toggle('hidden', open);
        closeIcon?.classList.toggle('hidden', !open);

        document.documentElement.classList.toggle('body-locked', open);
        document.body.classList.toggle('body-locked', open);
        if (open) {
            previousBodyOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = previousBodyOverflow;
        }

        document.dispatchEvent(new CustomEvent('hkm:mega-menu-change', { detail: { open } }));
    };

    menuToggle.dataset.hkmMenuBound = 'true';
    menuToggle.addEventListener('click', (event) => {
        event.stopPropagation();
        setOpen(!isOpen());
    });

    megaMenu.addEventListener('click', (event) => {
        if (event.target === megaMenu || event.target.closest('a')) setOpen(false);
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && isOpen()) setOpen(false);
    });

    window.HKM_UI = {
        ...(window.HKM_UI || {}),
        openMegaMenu: () => setOpen(true),
        closeMegaMenu: () => setOpen(false),
        isMegaMenuOpen: isOpen
    };
}

export function mountSiteShell() {
    if (!document.body || document.documentElement.dataset.hkmSiteShell === 'mounted') return false;
    if (/^\/(?:admin|minside)(?:\/|$)/.test(window.location.pathname)) return false;
    if (document.documentElement.dataset.siteShell === 'off' || document.body.dataset.siteShell === 'off') return false;

    const language = getLanguage();
    const header = replaceOrInsert('#header', renderSiteHeader(language), (element) => {
        document.body.prepend(element);
    });

    const megaMenu = replaceOrInsert('#mega-menu', renderMegaMenu(language), (element) => {
        header.insertAdjacentElement('afterend', element);
    });

    replaceOrInsert('footer.footer', renderSiteFooter(language), (element) => {
        document.body.append(element);
    });

    if (!document.getElementById('site-search-modal')) {
        document.body.append(elementFromMarkup(renderSearchModal(language)));
    }

    document.documentElement.dataset.hkmSiteShell = 'mounted';
    initCookieSettingsLink();
    bindSiteShellMenu(header, megaMenu);
    if (typeof window.hkmApplyTheme === 'function') window.hkmApplyTheme();
    document.dispatchEvent(new CustomEvent('hkm:site-shell-mounted', { detail: { language } }));
    return true;
}

if (typeof document !== 'undefined') {
    if (document.body) {
        mountSiteShell();
    } else {
        document.addEventListener('DOMContentLoaded', mountSiteShell, { once: true });
    }
}
