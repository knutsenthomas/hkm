// content editor methods for AdminManager.
export function createContentEditor3Methods({ firebaseService, adminUtils, showErrorUI }) {
  return {
    toggleCauseGivingFields() {
      const mode = document.getElementById("cause-amount-mode").value;
      document.getElementById("cause-fixed-group").hidden = mode !== "fixed";
      document.getElementById("cause-presets-group").hidden =
        mode !== "presets";
    },

    setCauseGivingFields(cause) {
      const giving = cause.giving || {};
      document.getElementById("cause-info-url").value = cause.infoUrl || "";
      document.getElementById("cause-hero-intro").value = cause.heroIntro || "";
      for (const lang of ["en", "es"]) {
        for (const field of ["title", "description", "heroIntro"])
          document.getElementById(`cause-${lang}-${field}`).value =
            cause.translations?.[lang]?.[field] || "";
      }
      document.getElementById("cause-amount-mode").value =
        giving.amountMode || "open";
      document.getElementById("cause-fixed-amount").value =
        giving.amounts?.[0] || 250;
      document.getElementById("cause-amount-options").value = (
        giving.amounts?.length ? giving.amounts : [100, 250, 500]
      ).join(", ");
      document.getElementById("cause-allow-custom").checked =
        giving.allowCustom !== false;
      document.getElementById("cause-frequency").value =
        giving.frequency || "both";
      document.getElementById("cause-upload-status").textContent = "";
      document.getElementById("cause-image-file").value = "";
      this.toggleCauseGivingFields();
      this.updateCauseImagePreview();
    },

    getPageContentEditorDefaults(pageId) {
      const defaults = {
        settings_global: {
          brand: {
            name: "His Kingdom Ministry",
            logoAlt: "His Kingdom Ministry Logo",
          },
          header: {
            currentLanguage: "NO",
            languages: {
              no: "Norsk",
              en: "English",
              es: "Español",
            },
            donateLabel: "Gi gave",
            menuToggleLabel: "Toggle meny",
          },
          menu: {
            searchPlaceholder: "Søk...",
            mobileLanguages: {
              no: "NO",
              en: "EN",
              es: "ES",
            },
            sections: {
              engage: {
                title: "Engasjer deg",
                supportWork: "Støtt arbeidet",
                regularDonor: "Bli fast giver",
                churches: "For menigheter",
                businesses: "For bedrifter",
                network: "Business Network",
              },
              about: {
                title: "Bli kjent med oss",
                about: "Om oss",
                contact: "Kontakt oss",
              },
              resources: {
                title: "Ressurser",
                store: "Butikk",
                events: "Arrangementer",
                media: "Media",
                blog: "Nyheter & Blogg",
                courses: "Kurs",
                myPage: "Min Side",
              },
            },
            footer: {
              cta: "Støtt nå",
              store: "Butikk",
              taxDeduction: "Skattefradrag",
              about: "Om oss",
              privacy: "Personvern",
            },
          },
          contact: {
            email: "post@hiskingdomministry.no",
            phone: "+47 930 94 615",
            vipps: "938361",
            account: "3000.66.08759",
          },
          footer: {
            description:
              "His Kingdom Ministry er en non-profit organisasjon dedikert til åndelig vekst gjennom undervisning, podcast og reisevirksomhet.",
            title_about: "Om oss",
            title_resources: "Ressurser",
            title_media: "Media",
            title_involvement: "Involvering",
            title_follow: "Følg oss",
            title_contact: "Kontakt oss",
            links: {
              about: {
                home: "Hjem",
                about: "Om oss",
                vision: "Vår visjon",
                contact: "Kontakt oss",
              },
              resources: {
                teaching: "Undervisning",
                courses: "Arrangementer",
                blog: "Nyheter & blogg",
                store: "Butikk",
                myPage: "Min Side",
              },
              media: {
                podcast: "Podcast",
                videos: "Videoer",
                youtube: "YouTube",
              },
              involvement: {
                calendar: "Kalender",
                donate: "Gi en gave",
                privacy: "Personvern",
                accessibility: "Tilgjengelighet",
                cookies: "Cookies",
              },
            },
            contact: {
              emailLabel: "E-post:",
              phoneLabel: "Telefon:",
              vippsLabel: "Vipps:",
              accountLabel: "Konto nr.:",
            },
            contactButton: "Kontaktskjema",
            copyright: "His Kingdom Ministry. Alle rettigheter reservert.",
            adminLink: "Admin",
          },
        },
        settings_facebook_feed: {
          facebookFeed: {
            enabled: true,
            useLiveFeed: true,
            livePostCount: 3,
            pageId: "",
            feedUrl: "",
            feedSource: "rss",
            juicerFeedId: "hiskingdomministry777",
            label: "Følg oss på Facebook",
            title: "Siste fra Facebook-siden vår",
            description:
              "Se oppdateringer, kunngjøringer og glimt fra arbeidet vårt direkte fra Facebook.",
            pageUrl:
              "https://www.facebook.com/hiskingdomministry777?locale=nb_NO",
            pageCta: "Åpne Facebook-siden",
            posts: {
              first: {
                image: "",
                date: "Denne uken",
                title: "Nye glimt fra tjenesten",
                excerpt:
                  "Følg med på oppdateringer, bilder og korte refleksjoner fra arbeidet vårt.",
                cta: "Les på Facebook",
                link: "https://www.facebook.com/hiskingdomministry777?locale=nb_NO",
              },
              second: {
                image: "",
                date: "Siste oppdatering",
                title: "Kunngjøringer og invitasjoner",
                excerpt:
                  "Her kan du raskt se nye invitasjoner, arrangementer og meldinger vi deler.",
                cta: "Se innlegget",
                link: "https://www.facebook.com/hiskingdomministry777?locale=nb_NO",
              },
              third: {
                image: "",
                date: "Fra fellesskapet",
                title: "Vitnesbyrd og hverdagsøyeblikk",
                excerpt:
                  "Vi deler små øyeblikk, takknemlighet og ting som skjer i og rundt fellesskapet.",
                cta: "Gå til Facebook",
                link: "https://www.facebook.com/hiskingdomministry777?locale=nb_NO",
              },
            },
          },
        },
        index: {
          hero: {
            title: "Vekst gjennom fellesskap",
            subtitle:
              "Uansett hvor du er på din vandring, ønsker vi å gå sammen med deg. Bli med i et fellesskap som utforsker Guds ord og styrker troen.",
            btnText: "Les mer",
          },
          intro: {
            imageAlt: "Fellesskap",
            label: "Velkommen til fellesskapet",
            title: "Vi er en Non-profit organisasjon",
            text: "His Kingdom Ministry driver med åndelig samlinger som bønnemøter, undervisningseminarer, og forkynnende reisevirksomhet. Vi ønsker å være et felleskap der mennesker kan vokse i sin tro og relasjon til Jesus.",
          },
          shopPromo: {
            badge: "His Kingdom Designs",
            title: "Designprodukter og gavekort i én butikk",
            description:
              "Utforsk klær, kopper, klistermerker og digitale gavekort med kristne design. Vi har også månedlige abonnement for deg som vil få nye produkter jevnlig.",
            ctaPrimary: "Besøk butikken",
            ctaSecondary: "Se produkter",
            cards: {
              clothesTitle: "Klær",
              clothesMeta: "T-skjorter og mer",
              mugsTitle: "Kopper",
              mugsMeta: "Gaver til hjemmet",
              stickersTitle: "Klistermerker",
              stickersMeta: "Små produkter, stor mening",
              giftCardsTitle: "Gavekort",
              giftCardsMeta: "Digital gave med valgfritt beløp",
            },
            note: "Enkel filtrering, mange produkter og rask oversikt i den nye butikksiden.",
          },
          features: {
            header: {
              label: "Neste steg",
              title: "Bli involvert",
              description:
                "Det finnes flere naturlige måter å bli med i arbeidet på. Velg det som passer deg best akkurat nå.",
            },
            teaching: {
              title: "Undervisning",
              text: "Bibelskoler, seminarer og dyptgående undervisning.",
              image: "/img/get-involved-teaching.svg",
              btnText: "Les mer",
            },
            podcast: {
              title: "Podcast",
              text: "Lytt til våre samtaler om tro, liv og åndelig vekst.",
              image: "/img/get-involved-podcast.svg",
              btnText: "Lytt nå",
            },
            travel: {
              title: "Reisevirksomhet",
              text: "Forkynnelse og konferanser rundt om i verden.",
              image: "/img/get-involved-travel.svg",
              btnText: "Oppdag mer",
            },
          },
          about: {
            btnText: "Oppdag mer",
            features: {
              mission: {
                title: "Vårt oppdrag",
                text: "Å utruste og inspirere mennesker til et dypere liv med Gud gjennom undervisning, fellesskap og bønn.",
              },
              story: {
                title: "Vår historie",
                text: "Startet med en visjon om å samle mennesker i åndelig vekst, har vi vokst til et levende felleskap som driver med bønnemøter, undervisning og reisevirksomhet.",
              },
            },
          },
          stats: {
            youtube_videos: 0,
            youtube_videos_label: "YouTube-videoer",
            youtube_views: 0,
            youtube_views_label: "YouTube-visninger",
            podcast_episodes: 0,
            podcast_episodes_label: "Podcast-episoder",
            countries_visited: 0,
            countries_visited_label: "Land besøkt",
          },
          impact: {
            label: "Impact",
            title: "Resultater i tall",
            description:
              "Noen nøkkeltall som viser hvor langt arbeidet vårt rekker.",
          },
          causes: {
            label: "Støtt vårt arbeid",
            title: "Aktive innsamlingsaksjoner",
            description:
              "Din gave gjør en forskjell. Se hvordan du kan bidra til vårt arbeid.",
            btnText: "Se alle innsamlinger",
            card: {
              defaultTitle: "Innsamlingsaksjon",
              collectedLabel: "samlet inn",
              goalLabel: "Mål",
              cta: "Støtt prosjektet",
            },
          },
          events: {
            label: "Kommende arrangementer",
            title: "Bli med oss",
            description: "Se våre kommende arrangementer og meld deg på.",
            btnText: "Se alle arrangementer",
          },
          teaching: {
            label: "Aktuelt",
            title: "Siste undervisning",
            description:
              "Lytt og lær fra våre nyeste ressurser, seminarer og bibelstudier.",
            btnText: "Se alle ressurser",
          },
          blog: {
            label: "Siste nytt",
            title: "Nyheter og blogg",
            description: "Les våre siste artikler og oppdateringer.",
            btnText: "Se alle nyheter",
          },
          testimonials: {
            label: "Vitnesbyrd",
            title: "Hva folk sier",
          },
          newsletter: {
            title: "Hold deg oppdatert",
            text: "Meld deg på vårt nyhetsbrev og få de siste oppdateringene om arrangementer, podcast og undervisning.",
            placeholder: "Din e-postadresse",
            btnText: "Abonner",
          },
        },
        butikk: {
          heroFallback: {
            badge: "HKM Butikk",
            title: "Ressurser og design som bygger tro",
            subtitle:
              "Produktene hentes automatisk fra Wix. Hvis de ikke vises med en gang kan du fortsatt handle trygt i den eksterne butikken.",
            ctaExternal: "Åpne Wix-butikken",
          },
          aboutStore: {
            badge: "Om butikken",
            title: "His Kingdom Designs-butikken",
            description:
              "Her finner du klær, kopper, klistermerker, gavekort og andre ressurser med design som peker på tro, håp og kjærlighet. Produktene synkroniseres fra Wix-butikken og oppdateres fortløpende.",
            description2:
              "Du kan bruke filterpanelet for å finne riktig kategori, størrelse, farge og prisnivå. Vi viser produktene direkte her, men du handler trygt via den eksterne Wix-butikken.",
            ctaProducts: "Gå til produkter",
            ctaExternal: "Åpne Wix-butikken",
            features: {
              selectionLabel: "Utvalg",
              selectionText: "Klær, kopper, plakater, stickers og mer",
              filteringLabel: "Filtrering",
              filteringText:
                "Finn raskt produkter etter kategori, pris og egenskaper",
              updatesLabel: "Oppdateringer",
              updatesText: "Produkter hentes automatisk fra Wix og vises her",
              secureLabel: "Trygg handel",
              secureText: "Bestillingen fullføres trygt i Wix-butikken",
            },
          },
          howItWorks: {
            title: "Hvordan fungerer det?",
            step1Title: "Velg din vare",
            step1Text: "Velg noen av alle de fantastiske produktene vi har.",
            step2Title: "Handlekurv",
            step2Text: "Legg dem i handlekurven og betal.",
            step3Title: "Leveranse",
            step3Text: "Få dem levert hjem til deg eller nærmeste hentested.",
          },
          categoriesShowcase: {
            title: "Våres produkter",
            description:
              "Utforsk vårt kuraterte utvalg av design og ressurser.",
            cta: "Handle nå",
            cards: {
              clothes: "Klær",
              youth: "Barneklær",
              baby: "Babyklær",
              stickers: "Klistermerker",
              accessories: "Tilbehør",
              mugs: "Kopper",
            },
          },
          subscription: {
            packageLabel: "Velg pakke",
            packageSummary: "Stickers, t-skjorter eller kopper",
            chip1: "Stickers",
            chip2: "T-skjorter",
            chip3: "Kopper",
            badge: "Månedlig abonnement",
            titleLine1: "Abonner på",
            titleLine2: "månedlige pakker",
            description:
              "Velg mellom klistermerker, t-skjorter eller kopper. Få ferdig kuratert design levert rett i postkassen hver måned.",
            benefit1: "Gratis frakt på alle abonnement",
            benefit2: "Eksklusive design kun for abonnenter",
            benefit3: "Ingen bindingstid - avslutt når du vil",
            ctaPrimary: "Bestill abonnement",
            ctaSecondary: "Se alle produkter",
          },
          giftCard: {
            badge: "Gavekort",
            titleLine1: "En minimalistisk gave",
            titleLine2: "som alltid passer",
            description:
              "Velg beløp, legg ved en personlig melding, og gi mottakeren friheten til å velge noe de faktisk ønsker seg.",
            cta: "Kjøp gavekort",
            helper: "Perfekt for bursdag, takkegave eller høytid",
            cardBrand: "His Kingdom Designs",
            cardType: "Digitalt gavekort",
            cardEyebrow: "Gavekort",
            cardHeadline: "Gi valgfri gave",
            cardDescription: "Velg beløp og legg ved en personlig melding.",
            cardPriceFrom: "Fra 100 kr",
            cardDelivery: "Sendes digitalt",
          },
          productBrowser: {
            title: "Finn din favoritt",
            searchPlaceholder: "Søk i arkivet...",
            countLoading: "Henter produkter...",
            priceLabel: "Pris",
            moreFiltersLabel: "Flere filtre",
            resetFiltersLabel: "Nullstill filtre",
            categories: {
              all: "Alle varene",
              baby: "Baby",
              youth: "Barn & Ungdom",
              clothes: "Klær",
              tshirts: "T-skjorter",
              sweaters: "Genser",
              sweatpants: "Joggebukser",
              hats: "Hatter / Caps",
              stickers: "Klistermerker",
              subscription: "Abonnement",
              accessories: "Tilbehør",
              mugs: "Kopper & Flasker",
              posters: "Bilder & Plakater",
              digital: "Digitale filer",
            },
            error: {
              badge: "His Kingdom Designs",
              title: "Kreative Ressurser",
              description:
                "Vi har for øyeblikket problemer med å hente katalogen. Du kan se alle våre produkter direkte i Wix-butikken.",
              cta: "Besøk Wix-butikken nå",
            },
          },
          ui: {
            sliderBadgeNew: "Nyhet i butikken",
            sliderDescription:
              "Oppdag den nyeste kolleksjonen fra His Kingdom Designs. Kvalitetsdesign som inspirerer og utfordrer.",
            sliderBuyNowPrefix: "Kjøp nå",
            sliderScrollIndicator: "Bla ned",
            heroFallbackExternalCta: "Gå til Wix-butikken",
            heroFallbackRetryCta: "Prøv igjen",
            heroFallbackEmptyTitle: "Butikken oppdateres akkurat nå",
            heroFallbackEmptyDescription:
              "Ingen produkter ble funnet akkurat nå. Du kan fortsatt åpne Wix-butikken direkte.",
            heroFallbackErrorTitle: "Vi fikk ikke lastet butikken",
            heroFallbackErrorDescription:
              "Produktene kunne ikke hentes nå. Prøv igjen, eller åpne den eksterne Wix-butikken.",
            loadingProgressTemplate: "Laster produkter... ({loaded}/{total})",
            loadingBackgroundTemplate:
              "Viser {loaded} av {total} produkter (laster resten i bakgrunnen...)",
            countCategoryTemplate: "Viser {count} produkter i {category}",
            countAllCategoriesLabel: "alle kategorier",
            noResultsTitle: "Ingen treff",
            noResultsDescription:
              "Prøv å endre søket ditt eller velg en annen kategori.",
            emptyCatalogTitle: "Ingen produkter funnet",
            emptyCatalogDescription:
              "Vi oppdaterer katalogen akkurat nå. Vennligst sjekk igjen senere.",
            noDynamicFilters:
              "Ingen ekstra filtre tilgjengelig for produktene akkurat nå.",
            allOptionLabel: "Alle",
          },
        },
        kurs: {
          hero: {
            badge: "Utvalgt kurs",
            title: "Seerkurs med aktivering",
            description:
              "Hvordan se i ånden og hvordan bruke bibelvers til å se i ånden",
            btnText: "Meld deg på nå",
          },
          communityBanner: {
            title: "Fellesskap & åndelig vekst i hverdagen",
            description:
              "Våre kurs gir deg mer enn bare teori – du blir en del av et oppmuntrende fellesskap der vi ber sammen, søker Guds nærvær og opplever sammenheng mellom tro og liv.",
            btnText: "Bli med i dag",
            imageUrl:
              "https://images.unsplash.com/photo-1529070538774-1843cb3265df?auto=format&fit=crop&w=1000&q=80",
          },
          features: {
            title: "Hvorfor delta på våre kurs?",
            subtitle: "Utrustning for tro og hverdag",
          },
        },
        "om-oss": {
          hero: {
            title: "Om Oss",
            subtitle: "Lær mer om vår visjon, oppdrag og historie",
            backgroundImage:
              "https://images.unsplash.com/photo-1529070538774-1843cb3265df?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80",
          },
          intro: {
            label: "Velkommen til fellesskapet",
            title: "Vi er en Non-profit organisasjon",
            text: "His Kingdom Ministry driver med åndelig samlinger som bønnemøter, undervisningseminarer, og forkynnende reisevirksomhet. Vi ønsker å være et felleskap der mennesker kan vokse i sin tro og relasjon til Jesus.",
            btnText: "Kontakt oss",
            image:
              "https://static.wixstatic.com/media/db4f96_2b25900fd882417e8fc88a62002ba11a~mv2.jpg/v1/fill/w_865,h_675,al_c,q_85,enc_avif,quality_auto/FullSizeRender_edited_edited_edited_edited%20(1).jpg",
            videoUrl: "https://www.youtube.com/watch?v=Z3jXbw0yC5E",
          },
          about: {
            features: {
              mission: {
                title: "Vårt oppdrag",
                text: "Å utruste og inspirere mennesker til et dypere liv med Gud gjennom undervisning, fellesskap og bønn.",
              },
              story: {
                title: "Vår historie",
                text: "Startet med en visjon om å samle mennesker in åndelig vekst, har vi vokst til et levende felleskap som driver med bønnemøter, undervisning og reisevirksomhet.",
              },
            },
          },
          values: {
            label: "Om oss",
            title: "Hva Vi Står For",
            bible: {
              text: "Vi forankrer alt vi gjør i Guds ord og søker å leve etter Bibelens prinsipper.",
            },
          },
          team: {
            label: "Vårt team",
            title: "Møt hjertene bak His Kingdom Ministry",
            hilde: {
              name: "Hilde Karin Knutsen",
              role: "Profetisk forbeder og underviser",
              bio: "Velkommen til siden min. Jeg heter Hilde Karin. Jeg er gift med Thomas. Vi bor i Norge. Jeg har reist som misjonær og profetisk forbeder mer enn halve livet mitt. Ved Guds nåde, gjennom Bibelens prinsipper og ved Den Hellige Ånds ledelse er jeg en profetisk stemme klar til å hjelpe deg å vokse i ditt personlige forhold to Jesus Kristus og utruste deg til å bli alt det han har gjort deg til å være.",
              image: "img/Hilde%20Karin%20Knutsen.jpg",
              instagram: "https://www.instagram.com/freedomisathand/",
              facebook:
                "https://www.facebook.com/hiskingdomministry777?locale=nb_NO",
              youtube: "https://www.youtube.com/@HisKingdomMinistry",
              tiktok: "https://www.tiktok.com/@hilde707",
            },
            thomas: {
              name: "Thomas Knutsen",
              role: "Daglig leder og Lovsang",
              bio: "Hei og velkommen til siden vår. Vi er så glade for at du kom inn på vår tjeneteside. Jeg har ikke reist rundt i verden. Jeg har jobbet og bodd stort sett i samme by hele livet. Jeg jobbet i samme kirke i 15 år før jeg møtte Hilde. Vi koblet sammen med en gang og er så velsignet at Gud forente livene våre sammen.",
              image: "img/Thomas.jpeg",
              instagram: "https://www.instagram.com/tkdesignandmusic/",
              facebook:
                "https://www.facebook.com/thomas.knutsen.75/?locale=nb_NO",
            },
          },
          cta: {
            title: "Bli Med i Fellesskapet",
            text: "Vi ønsker å være et sted der du kan vokse i din tro og oppleve Guds nærvær.",
            btn1: "Se arrangementer",
            btn2: "Kontakt oss",
          },
        },
        "for-menigheter": {
          hero: {
            title: "For Menigheter",
            subtitle:
              "Vi ønsker å stå sammen med lokale menigheter for å utruste troende og spre evangeliet.",
            bg: "https://images.unsplash.com/photo-1438232992991-995b7058bbb3?ixlib=rb-4.0.3\u0026auto=format\u0026fit=crop\u0026w=1920\u0026q=80",
          },
          intro: {
            label: "Samarbeid",
            title: "Et felles oppdrag",
            text: "His Kingdom Ministry brenner for å se den lokale kirken blomstre. Vi tilbyr ressurser, seminarer og undervisning som kan komplementere deres eksisterende arbeid og inspirere til dypere etterfølgelse av Jesus.",
            image:
              "https://images.unsplash.com/photo-1438232992991-995b7058bbb3?ixlib=rb-4.0.3\u0026auto=format\u0026fit=crop\u0026w=800\u0026q=80",
          },
          features: [
            "Seminarer om bønn og disippelskap",
            "Ressurser for smågrupper",
            "Besøk av våre undervisere",
            "Felles bønneinitiativ",
          ],
          cta: {
            title: "Vil dere høre mer?",
            text: "Vi sender gjerne mer informasjon om hvordan vi kan støtte deres menighet.",
            btnText: "Kontakt oss i dag",
          },
        },
        "for-bedrifter": {
          hero: {
            title: "For Bedrifter",
            subtitle:
              "Bli en samarbeidspartner og vær med på å finansiere viktig arbeid som forandrer liv.",
            bg: "https://images.unsplash.com/photo-1497366216548-37526070297c?ixlib=rb-4.0.3\u0026auto=format\u0026fit=crop\u0026w=1920\u0026q=80",
          },
          intro: {
            label: "Samarbeidspartner",
            title: "Bedrifter med et hjerte for misjon",
            text: "Vi inviterer bedrifter til å stå sammen med oss i vårt oppdrag. Gjennom bedriftsgaver bidrar dere direkte til åndelig vekst og hjelp til mennesker som trenger det.",
            image:
              "https://images.unsplash.com/photo-1556761175-b413da4baf72?ixlib=rb-4.0.3\u0026auto=format\u0026fit=crop\u0026w=800\u0026q=80",
          },
          features: {
            f1: {
              title: "Målbare resultater",
              text: "Vi sender regelmessige oppdateringer på hvordan deres støtte blir brukt.",
            },
            f2: {
              title: "Verdibasert samarbeid",
              text: "Vi deler verdier som integritet, omsorg og nestekjærlighet.",
            },
          },
          cta: {
            title: "Ønsker dere et bedriftssamarbeid?",
            text: "Vi tar gjerne en uforpliktende prat om hvordan din bedrift kan bidra.",
            btnText: "Kontakt oss i dag",
          },
        },
        bnn: {
          hero: {
            title: "Business Network",
            subtitle:
              "Et nettverk for kristne ledere og næringsdrivende som ønsker å bruke sine ressurser for Guds rike.",
            bg: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-4.0.3\u0026auto=format\u0026fit=crop\u0026w=1920\u0026q=80",
          },
          intro: {
            label: "Nettverk",
            title: "Mer enn bare business",
            text: "BNN er et fellesskap der vi kombinerer faglig kompetanse med åndelig fokus. Vi tror på at næringslivet spiller en nøkkelrolle i å finansiere og drive misjon fremover.",
          },
          features: {
            f1: {
              title: "Nettverkssamlinger",
              text: "Møt likesinnede ledere for inspirasjon og erfaringsutveksling.",
            },
            f2: {
              title: "Inspirasjon",
              text: "Få undervisning spesielt rettet mot kristent lederskap i arbeidslivet.",
            },
            f3: {
              title: "Vekst",
              text: "Se hvordan din bedrift kan være en plattform for Guds rike.",
            },
          },
          cta: {
            btnText: "Bli en del av nettverket",
          },
        },
        kontakt: {
          hero: {
            title: "Kontakt Oss",
            subtitle:
              "Vi vil gjerne høre fra deg. Send oss en melding eller besøk oss.",
            backgroundImage:
              "https://images.unsplash.com/photo-1423666639041-f56000c27a9a?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80",
          },
          contact: {
            info: {
              title: "Ta Kontakt",
              text: "Har du spørsmål, bønnebehov eller ønsker du å vite mer om vår tjeneste? Ikke nøl med å ta kontakt med oss.",
              email_label: "E-post",
              email: "post@hiskingdomministry.no",
              phone_label: "Telefon",
              phone: "+47 930 94 615",
              address_label: "Besøksadresse",
              address: "Oslo, Norge",
            },
          },
        },
        donasjoner: {
          hero: {
            title: "Donasjoner",
            subtitle: "Bli med og støtt vårt arbeid",
            bg: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80",
          },
          intro: {
            title: "Våre aktive innsamlingsaksjoner",
            description:
              "Din gave utgjør en forskjell. Velg et prosjekt du ønsker å støtte og bli med på å forandre liv.",
          },
          regular_donor: {
            title: "Vær med på å skape varig endring",
            description:
              "Som fast giver er du med på å sikre forutsigbarhet i vårt arbeid, slik at vi kan planlegge og gjennomføre flere prosjekter for Guds rike.",
            recurring: {
              title: "Fast gave (Vipps / Kort)",
              text: "Den enkleste måten å bli fast giver på. Du oppretter en fast avtale enkelt med Vipps eller bankkort.",
              cta: "Opprett fast gave",
            },
            bank: {
              title: "Bankoverføring",
              text: "Opprett et fast trekk i nettbanken din til vår konto. Dette gir oss de laveste gebyrene.",
              account: "Konto: 3000.66.08759",
            },
            tax: {
              title: "Visste du at du får skattefradrag?",
              description:
                "Gaver til His Kingdom Ministry gir rett til skattefradrag dersom de samlede gavene i løpet av et kalenderår er på minst 500 kroner. For å få fradrag må vi ha ditt fødselsnummer (11 siffer).",
            },
          },
          form: {
            title: "Støtt vårt arbeid",
            description:
              "Din gave gjør en reell forskjell. Velg beløp og betalingsmetode nedenfor.",
          },
        },
        undervisning: {
          hero: {
            title: "Undervisning",
            subtitle: "Dyptgående bibelundervisning",
            bg: "https://images.unsplash.com/photo-1497366216548-37526070297c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80",
          },
          intro: {
            label: "Ressurser",
            title: "Utforsk vår undervisning",
            description:
              "Velg en kategori for å utforske våre ulike undervisningsressurser.",
          },
          card_bible: {
            title: "Bibelstudier",
            text: "Systematiske studier gjennom Bibelens bøker med dyptgående forklaringer.",
          },
          card_seminar: {
            title: "Seminarer",
            text: "Opptak fra våre seminarer og konferanser om ulike temaer.",
          },
          card_series: {
            title: "Undervisningsserier",
            text: "Tematiske undervisningsserier om viktige kristne emner.",
          },
        },
        arrangementer: {
          hero: {
            title: "Arrangementer",
            subtitle: "Bli med på våre kommende hendelser",
            bg: "https://images.unsplash.com/photo-1523580494863-6f3031224c94?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80",
          },
        },
        kalender: {
          hero: {
            title: "Månedskalender",
            subtitle:
              "Her finner du en oversikt over alle våre kommende aktiviteter og samlinger.",
            backgroundImage:
              "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80",
          },
          helligdager: {
            label: "Helligdager & høytider",
            title: "Hvorfor markerer vi disse dagene?",
            description:
              "Her finner du en kort forklaring på noen av de viktigste kristne høytidsdagene og norske helligdagene som ofte påvirker kalenderen vår.",
          },
          holidays: {
            nyttarsdag: {
              title: "1. nyttårsdag",
              text: "Første dag i det nye året. En dag for ettertanke, takk for året som ligger bak, og bønn for året som kommer.",
            },
            palmesondag: {
              title: "Palmesøndag",
              text: "Markerer Jesu inntog i Jerusalem, der folket hilste ham med palmegrener og ropte «Hosianna». Innleder påskeuken.",
            },
            skjertorsdag: {
              title: "Skjærtorsdag",
              text: "Til minne om Jesu siste måltid med disiplene, der han innstiftet nattverden og viste veien til tjenende lederskap ved å vaske disiplenes føtter.",
            },
            langfredag: {
              title: "Langfredag",
              text: "Vi minnes Jesu lidelse og død på korset. En stille og alvorlig dag som peker på den store kjærligheten Gud har vist oss.",
            },
            paskedag1: {
              title: "1. påskedag",
              text: "Feiringen av Jesu oppstandelse. Denne dagen står i sentrum av den kristne tro og minner oss om seier over synd, død og mørke.",
            },
            paskedag2: {
              title: "2. påskedag",
              text: "Fortsetter gleden over oppstandelsen, og peker på møtene den oppstandne Jesus hadde med disiplene.",
            },
            himmelfart: {
              title: "Kristi himmelfartsdag",
              text: "Feirer at Jesus for opp til himmelen før Faderen, og at han fortsatt ber for oss og regjerer som Herre.",
            },
            pinsedag1: {
              title: "1. pinsedag",
              text: "Til minne om at Den hellige ånd ble utøst over de første troende i Jerusalem. Pinsen blir ofte kalt «kirkens fødselsdag».",
            },
            pinsedag2: {
              title: "2. pinsedag",
              text: "En forlengelse av pinsefeiringen, der fokuset fortsatt er på Den hellige ånds nærvær og gaver i våre liv.",
            },
            mai1: {
              title: "Arbeidernes dag (1. mai)",
              text: "Norsk offentlig fridag som hedrer arbeideres rettigheter. For mange også en dag for å be for rettferdighet og gode arbeidsforhold.",
            },
            mai17: {
              title: "Grunnlovsdagen (17. mai)",
              text: "Feiring av Norges grunnlov fra 1814. En festdag for frihet, fellesskap og takknemlighet for landet vårt.",
            },
            juledag1: {
              title: "1. juledag",
              text: "Markerer selve juledagen og feirer at Guds Sønn ble født i verden. Fokus er på inkarnasjonen – at Gud ble menneske.",
            },
            juledag2: {
              title: "2. juledag",
              text: "En roligere oppfølgingsdag i julen som gir rom for ettertanke, familie og hvile etter selve høytidsdagen.",
            },
          },
        },
        media: {
          hero: {
            title: "Media",
            subtitle: "Utforsk våre videoer, podcaster og annet innhold",
            backgroundImage:
              "https://images.unsplash.com/photo-1516280440614-37939bbacd81?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80",
          },
          youtube: {
            title: "Siste Videoer",
            description: "Se våre nyeste videoer og undervisninger",
          },
          teaching: {
            title: "Undervisningsressurser",
            description: "Dyptgående bibelstudier og undervisningsserier",
          },
        },
        seminarer: {
          hero: {
            title: "Seminarer",
            subtitle: "Temabaserte undervisningsdager",
            backgroundImage:
              "https://images.unsplash.com/photo-1497366216548-37526070297c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80",
          },
          intro: {
            label: "Tilgjengelige Seminarer",
            title: "Laster innhold...",
            description: "Lær fra våre dyptgående seminarer og konferanser",
          },
          cta: {
            title: "Lær og Voks Sammen Med Oss",
            text: "Alle våre seminarer er tilgjengelige gratis. Bli med på våre kommende arrangementer!",
          },
        },
        reisevirksomhet: {
          hero: {
            title: "Reisevirksomhet",
            subtitle:
              "Vi tar oppdrag i hele Norge for tale, undervisning og lovsang.",
            backgroundImage:
              "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80",
          },
          intro: {
            label: "Vi kommer dit du er",
            title: "Forkynnelse og lovsang over hele landet",
            text: "His Kingdom Ministry reiser til menigheter, konferanser og samlinger i hele Norge. Vi tjener gjennom forkynnelse, profetisk tjeneste, forbønn og lovsang, og ønsker å styrke det Gud allerede gjør lokalt.",
            features: {
              preaching: {
                title: "Tale og undervisning",
                text: "Vi tar oppdrag for møter, helgesamlinger og konferanser med fokus på Guds nærvær, frihet og disippelskap.",
              },
              worship: {
                title: "Lovsang og tilbedelse",
                text: "Thomas leder lovsang og bygger team i en kultur av frihet, glede og overgivelse til Jesus.",
              },
            },
          },
          booking: {
            label: "Praktisk informasjon",
            title: "Hvordan booke His Kingdom Ministry",
            text: "Vi tilpasser oppdrag etter behovene i din menighet eller samling. Ta kontakt for å avtale helger, enkeltmøter, konferanser eller lovsangskvelder. Sammen finner vi en løsning som fungerer både praktisk og økonomisk.",
          },
          cta: {
            title: "Inviter oss til din menighet eller konferanse",
            text: "Vi elsker å tjene sammen med lokale ledere og menigheter. Send oss en forespørsel, så tar vi en prat om hvordan vi kan stå sammen.",
          },
        },
        bibelstudier: {
          hero: {
            title: "Bibelstudier",
            subtitle: "Utforsk Guds ord sammen med oss",
            backgroundImage:
              "https://images.unsplash.com/photo-1491841550275-ad7854e35ca6?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80",
          },
          intro: {
            label: "Tilgjengelige Serier",
            title: "Laster innhold...",
            description:
              "Dykk dypere inn i Guds ord gjennom våre strukturerte bibelstudier",
          },
          cta: {
            title: "Begynn Din Bibelstudiereise",
            text: "Bli med oss og dykk dypere inn i Guds ord. Alle studier er gratis og tilgjengelige når som helst.",
          },
        },
        podcast: {
          hero: {
            title: "Podcast",
            subtitle: "Lytt til våre samtaler",
            backgroundImage:
              "https://images.unsplash.com/photo-1478737270239-2f02b77ac6d5?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80",
          },
          intro: {
            label: "Episodearkiv",
            title: "Alle episoder",
            description:
              "Her kan du høre på alle våre podcast-episoder direkte i nettleseren.",
          },
        },
        youtube: {
          hero: {
            title: "YouTube",
            subtitle:
              "Se videoundervisning, prekener og mer på vår YouTube-kanal.",
            backgroundImage:
              "https://images.unsplash.com/photo-1516280440614-37939bbacd81?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80",
          },
          intro: {
            label: "Videoarkiv",
            title: "Alle videoer",
            description:
              "Her finner du en oversikt over alt vårt videoinnhold direkte fra YouTube.",
          },
        },
        "bli-fast-giver": {
          hero: {
            title: "Bli fast giver",
            bg: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80",
          },
          regular_donor: {
            title: "Vær med på å skape varig endring",
            description:
              "Som fast giver er du med på å sikre forutsigbarhet i vårt arbeid, slik at vi kan planlegge og gjennomføre flere prosjekter for Guds rike.",
            vipps: {
              title: "Fast gave via Vipps",
              text: "Den enkleste måten å bli fast giver på. Du oppretter en fast avtale direkte i Vipps-appen.",
              cta: "Opprett i Vipps",
              subtext:
                "Ingen bindingstid. Avtalen kan enkelt avsluttes i Vipps eller via e-post. Se våre vilkår for faste betalinger.",
            },
            bank: {
              title: "Bankoverføring",
              text: "Opprett et fast trekk i nettbanken din til vår konto. Dette gir oss de laveste gebyrene.",
              account: "Konto: 3000.66.08759",
            },
            tax: {
              title: "Visste du at du får skattefradrag?",
              description:
                "Gaver til His Kingdom Ministry gir rett til skattefradrag dersom de samlede gavene i løpet av et kalenderår er på minst 500 kroner. For å få fradrag må vi ha ditt fødselsnummer (11 siffer).",
            },
          },
          newsletter: {
            title: "Hold deg oppdatert",
            text: "Meld deg på vårt nyhetsbrev for å få siste nytt direkte i din innboks.",
            placeholder: "Din e-postadresse",
            btnText: "Abonner",
          },
        },
        personvern: {
          hero: {
            title: "Personvernerklæring",
            subtitle: "Sist oppdatert: 13. februar 2026",
            backgroundImage:
              "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80",
          },
          content: {
            intro:
              'I His Kingdom Ministry ("vi", "oss") er vi opptatt av at du skal føle deg trygg når du besøker våre nettsider og bruker våre tjenester. Denne personvernerklæringen forklarer på en enkel og tydelig måte hvilke opplysninger vi samler inn om deg, hvorfor vi gjør det, og hvilke rettigheter du har.',
            intro2:
              "Som en kristen organisasjon basert på tillit og fellesskap, behandler vi dine data med største respekt og fortrolighet.",
            sec1_title: "1. Hvilken informasjon samler vi inn?",
            sec1_text:
              "Vi samler kun inn informasjon som er nødvendig for å gi deg tilgang til våre kurs, undervisning og fellesskap.",
            sec1_item1:
              'Ved registrering på "Min Side": Navn, e-postadresse og passord (kryptert).',
            sec1_item2:
              "Ved bruk av kursportalen: Informasjon om hvilke kurs du deltar på, og din progresjon (f.eks. hvilke videoer du har sett ferdig). Dette gjør vi for at du enkelt skal kunne fortsette der du slapp.",
            sec1_item3:
              "Ved påmelding til arrangementer: Kontaktinformasjon og evt. diettbehov (hvis du oppgir dette frivillig).",
            sec2_title: "2. Hvordan bruker vi informasjonen?",
            sec2_text: "Vi bruker opplysningene dine til følgende formål:",
            sec2_item1:
              "Å gi deg tilgang til din personlige profil og kursmateriell.",
            sec2_item2:
              "Å sende deg relevant informasjon om kurs du deltar på.",
            sec2_item3:
              "Å forbedre våre tjenester og nettsider basert på generell bruksstatistikk (anonymisert).",
            sec2_item4: "Å opprettholde sikkerheten på din brukerkonto.",
            sec3_title: "3. Informasjonskapsler (Cookies)",
            sec3_text1:
              "Vi bruker informasjonskapsler for at nettsiden skal fungere optimalt.",
            sec3_text2:
              'Nødvendige cookies: Disse er strengt nødvendige for at du skal kunne logge inn og navigere trygt på "Min Side". Disse kan ikke velges bort.',
            sec3_text3:
              "Statistikk og analyse: Vi kan bruke verktøy for å forstå hvordan nettsiden brukes, slik at vi kan gjøre den bedre. Du kan velge å takke nei til disse.",
            sec3_text4:
              "Du kan når som helst endre dine cookie-innstillinger via lenken nederst på nettsiden.",
            sec4_title: "4. Lagring og sletting",
            sec4_text1:
              "Dine personopplysninger lagres trygt i vår database (levert av Google Firebase). Vi beholder informasjonen din så lenge du har en aktiv brukerkonto hos oss.",
            sec4_text2:
              'Du kan når som helst be om å få slettet din konto og alle tilhørende data ved å kontakte oss, eller ved å bruke "Slett konto"-funksjonen inne på profilen din.',
            sec5_title: "5. Deling av informasjon",
            sec5_text1:
              "Vi selger aldri dine personopplysninger til tredjeparter.",
            sec5_text2:
              "Dersom du gjennomfører en donasjon eller kjøper et kurs, vil betalingsinformasjonen din behandles direkte av vår betalingsleverandør (f.eks. Vipps eller Stripe). Vi lagrer ikke kortnummer eller bankinformasjon selv.",
            sec6_title: "6. Dine rettigheter",
            sec6_text1:
              "I henhold til GDPR (personvernforordningen) har du rett til:",
            sec6_item1: "Innsyn i hvilke opplysninger vi har lagret om deg.",
            sec6_item2: "Korrigering av feilaktige opplysninger.",
            sec6_item3:
              'Sletting av dine opplysninger ("retten til å bli glemt").',
            sec6_item4: "Å trekke tilbake samtykket ditt når som helst.",
            sec7_title: "7. Kontakt oss",
            sec7_text1:
              "Hvis du har spørsmål om personvern eller ønsker å utøve dine rettigheter, er du hjertelig velkommen til å kontakte oss:",
            sec7_email: "E-post: post@hiskingdomministry.no",
            sec7_address: "Adresse: Norge",
            community_01: "8. HKP Community – undervisning og fellesskap",
            community_02:
              "HKP Community er His Kingdom Ministrys portal for undervisning og fellesskap. Denne delen beskriver hvordan opplysninger brukes i Community, i tillegg til informasjonen ellers i denne erklæringen. Sist oppdatert for Community: 30. september 2026.",
            community_03: "Konto, innlogging og profil",
            community_04:
              "Du logger inn med HKM-kontoen din. Community kobler kontoen til din e-postadresse, brukeridentitet og tildelte tilgang. Community mottar ikke passordet ditt fra HKM. Administratorer kan se navn, e-postadresse, rolle, tilgangsstatus, klassetilknytning og tidspunkt for siste registrerte Community-innlogging. Endringer i tilgang registreres med hvem som gjorde endringen og tidspunkt.",
            community_05:
              "Profilen kan inneholde navn, profilbilde, telefonnummer, fødselsdato, adresse, presentasjon og nødkontakt som du oppgir. Opplysningene brukes til profil og oppfølging i skolen. Del bare nødvendige opplysninger, og informer en eventuell nødkontakt før du registrerer vedkommendes kontaktinformasjon.",
            community_06: "Kurs, oppgaver og oppfølging",
            community_07:
              "Community behandler kurs- og klassetilknytning, registrert progresjon og oppmøte, oppgavebesvarelser, vedlegg eller vedleggslenker, innleveringstidspunkt, vurderinger og tilbakemeldinger. Dette brukes til undervisning og elevoppfølging. Du kan se egne innleveringer; lærere og administratorer har tilgang gjennom sine roller. Slike innleveringer er ikke publisert for alle deltakerne i fellesskapet.",
            community_08: "Meldinger og bønneemner",
            community_09:
              "Innhold du deler i fellesskapet, kan leses av brukerne som har tilgang til den aktuelle delen av appen. For bønneemner betyr «Offentlig» synlig for innloggede brukere med Community-tilgang. «Fortrolig» begrenser tilgangen til deg selv, lærere og administratorer.",
            community_10:
              "Ved «Anonymt» vises ikke navnet ditt sammen med bønneemnet i den vanlige visningen. Innlegget er likevel lagret med en kobling til brukerkontoen din og er derfor ikke fullstendig anonymisert. Registrering av at du har bedt for et bønneemne er også knyttet til kontoen.",
            community_11:
              "Bønneemner og meldinger kan avsløre personlige forhold, helse eller religiøs overbevisning. Vær varsom med hva du deler. Unngå å identifisere andre eller dele deres sensitive opplysninger. Ta kontakt dersom du trenger hjelp til å endre eller fjerne innhold.",
            community_12: "Zoom, opptak og eksterne lenker",
            community_13:
              "Undervisning kan være Live eller Pre-rec på Zoom. Når du åpner Zoom eller andre eksterne tjenester, gjelder også deres personverninformasjon. Et publisert opptak kan inneholde navn, bilde, stemme og bidrag fra deltakere dersom dette inngår i opptaket. Opptak som publiseres i Community, blir tilgjengelige for brukere med tilgang til biblioteket.",
            community_14: "Tekniske tjenester og lokal lagring",
            community_15:
              "Community bruker Google Firebase til innlogging og datalagring og Vercel til drift av nettappen. Nettleseren lagrer også opplysninger som trengs for innlogging, innstillinger og enkelte lokale utkast. Å slette nettleserdata sletter ikke automatisk opplysninger som er lagret på kontoen hos oss.",
            community_16: "Innsyn, retting og sletting i Community",
            community_17:
              'Du kan oppdatere profilopplysninger i appen. For innsyn, retting eller sletting av konto, innleveringer eller annet lagret innhold, kontakt <a href="mailto:post@hiskingdomministry.no">post@hiskingdomministry.no</a> og oppgi at henvendelsen gjelder HKP Community. Unngå å sende sensitive opplysninger i den første e-posten. Utlogging eller deaktivering av tilgang er ikke det samme som sletting.',
          },
        },
        tilgjengelighet: {
          hero: {
            title: "Tilgjengelighetserklæring",
            subtitle: "Vårt engasjement for universell utforming",
            backgroundImage:
              "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80",
          },
          content: {
            intro:
              "His Kingdom Ministry ønsker at våre nettsider og vårt innhold skal være tilgjengelig for alle mennesker, uavhengig av funksjonsevne.",
            goal_title: "Vårt mål",
            goal_text:
              "Vi arbeider kontinuerlig for å oppfylle kravene til universell utforming av IKT (WCAG 2.1). Vi tror at Guds ord og vårt fellesskap skal være åpent for alle, og digitale barrierer skal ikke stå i veien for dette.",
            status_title: "Status for samsvar",
            status_text:
              "Delvis samsvar: Vi er klar over at enkelte deler av nettstedet vårt kanskje ikke fullt ut tilfredsstiller alle krav i WCAG 2.1 nivå AA ennå, men vi jobber aktivt med forbedringer.",
            measures_title: "Hva vi gjør for tilgjengelighet",
            measures_text:
              "Vi har fokusert på følgende tiltak for å sikre god tilgjengelighet:",
            measures_item1:
              "Kontrast og lesbarhet: Vi bruker klare farger med god kontrast mellom tekst og bakgrunn for å sikre at teksten er lett å lese.",
            measures_item2:
              "Tastaturnavigasjon: Nettstedet er bygget slik at det skal være mulig å navigere i menyene og innholdet ved hjelp av tastatur (Tab-tasten).",
            measures_item3:
              "Bilder og media: Vi jobber med å inkludere tekstalternativer (alt-tekst) for bilder som bærer informasjon.",
            measures_item4:
              "Video og undervisning: Vi har som mål å tekste våre undervisningsvideoer, slik at de er tilgjengelige for hørselshemmede og de som ser video uten lyd.",
            gaps_title: "Kjente mangler",
            gaps_text:
              "Vi er oppmerksomme på følgende områder som vi jobber med å forbedre:",
            gaps_item1: "Eldre videoinnhold kan mangle teksting.",
            gaps_item2:
              "Enkelte dokumenter (PDF) er kanskje ikke optimalisert for skjermlesere.",
            feedback_title: "Gi oss tilbakemelding",
            feedback_text1:
              "Opplever du problemer med å bruke nettsiden vår, eller har du forslag til forbedringer? Vi setter stor pris på din tilbakemelding.",
            feedback_text2: "Vennligst kontakt oss på:",
            feedback_email: "E-post: post@hiskingdomministry.no",
            feedback_phone: "Telefon: +47 930 94 615",
            footer_text:
              "Denne erklæringen ble sist oppdatert 13. februar 2026.",
          },
        },
        betingelser: {
          hero: {
            title: "Vilkår og betingelser",
            subtitle: "Sist oppdatert: 5. mai 2026",
            backgroundImage:
              "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80",
          },
          content: {
            intro:
              "Vilkår og betingelser for His Kingdom Ministry. Disse vilkårene og betingelsene gjelder for alle tjenester og produkter levert av His Kingdom Ministry, herunder nettbutikk, kurs, digitale produkter og donasjoner. Ved å gjennomføre en transaksjon, påmelding eller donasjon aksepterer du disse vilkårene og betingelsene i sin helhet.",
            sec1_title: "1. Selgerinformasjon",
            sec1_item1: "Navn på virksomheten: His Kingdom Ministry",
            sec1_item2: "Organisasjonsnummer: 933728927",
            sec1_item3: "E-postadresse: post@hiskingdomministry.no",
            sec2_title: "2. Bestilling og avtaleinngåelse",
            sec2_text:
              "Bestilling av varer via nettbutikken er bindende når du har fullført bestillingsprosessen og mottatt en ordrebekreftelse fra oss per e-post. Vi forbeholder oss retten til å kansellere en bestilling dersom varen er utsolgt, det er skrivefeil i produktinformasjonen eller prisen, eller ved mistanke om svindel. Du vil i så fall bli informert så raskt som mulig.",
            sec3_title: "3. Priser",
            sec3_text:
              "Alle priser er oppgitt i [Norsk krone - NOK] og inkluderer merverdiavgift (mva.) med mindre annet er spesifikt angitt. Eventuelle fraktkostnader kommer i tillegg og vil tydelig fremgå før du fullfører kjøpet i nettbutikken. Vi forbeholder oss retten til å endre priser uten varsel. Prisen som gjaldt på tidspunktet for bestillingen vil være den gjeldende prisen.",
            sec4_title: "4. Betaling og faste betalinger",
            sec4_text:
              "Vi tilbyr kortbetaling via Stripe og faste betalinger via Vipps.",
            sec4_sub1_title: "4.1 Kortbetaling (Nettbutikk)",
            sec4_sub1_text:
              "Ved betaling med kort vil beløpet reserveres på din konto ved bestilling og trekkes når varene sendes eller hentes.",
            sec4_sub2_title: "4.2 Faste betalinger (Vipps)",
            sec4_sub2_text:
              "Ved inngåelse av avtale om faste betalinger (f.eks. fast givertjeneste eller abonnement) via Vipps, gjelder følgende:",
            sec4_sub2_item1:
              'Oppsigelse: Du kan når som helst avslutte avtalen om faste betalinger. Dette gjøres enten direkte i Vipps-appen under "Faste betalinger", eller ved å kontakte oss på post@hiskingdomministry.no. Oppsigelsen gjelder fra neste betalingstermin.',
            sec4_sub2_item2:
              "Bindingstid: Det er ingen bindingstid på faste betalinger hos His Kingdom Ministry, med mindre dette er spesifisert i det enkelte produkt eller tjeneste ved avtaleinngåelse.",
            sec4_sub2_item3:
              "Endring av avtale: Eventuelle endringer i beløp eller frekvens vil bli varslet i henhold til gjeldende regler fra betalingstjenesteleverandøren.",
            sec5_title: "5. Levering",
            sec5_text:
              "Vi tilbyr levering til adresser i Norge mot betaling. Leveringstiden er normalt 3-7 virkedager fra den dagen bestillingen er bekreftet, med forbehold om forsinkelser som skyldes forhold utenfor vår kontroll. Fraktkostnadene varierer avhengig av faktorer som påvirker fraktkostnaden, f.eks. vekt, størrelse, leveringsmetode og vil spesifiseres i bestillingsprosessen. Du er ansvarlig for å oppgi korrekt leveringsadresse.",
            sec6_title: "6. Henting i butikk",
            sec6_text:
              "Du kan velge å hente bestilte varer. Send en melding hvis du ønsker dette. Du vil motta en melding når varene er klare for henting. Ved henting må du fremvise gyldig legitimasjon og eventuelt ordrebekreftelsen.",
            sec7_title: "7. Angrerett",
            sec7_text:
              "I henhold til angrerettloven har du som forbruker rett til å angre kjøpet innen 14 dager fra den dagen du mottok varen(e) (eller fra avtaleinngåelsen ved kjøp av digitale tjenester). For å benytte deg av angreretten må du gi oss tydelig beskjed om at du ønsker å angre kjøpet, for eksempel ved å sende oss et angrerettskjema (som du finner https://om.no/2ZOA), via e-post eller per post. Varen(e) må returneres i samme stand som du mottok dem, og i originalemballasjen dersom dette er mulig. Du er ansvarlig for returkostnadene med mindre annet er avtalt. Vi vil refundere kjøpesummen innen 14 dager fra den dagen vi mottok melding om din beslutning om å angre kjøpet, forutsatt at vi har mottatt varen(e) i retur eller du har fremlagt bevis for at varen(e) er sendt.",
            sec8_title: "8. Reklamasjon",
            sec8_text:
              "Dersom det er mangler ved varen du har kjøpt, har du rett til å reklamere i henhold til forbrukerkjøpsloven. Reklamasjonsfristen er normalt to år fra kjøpsdatoen, eller fem år for varer som er ment å vare vesentlig lenger. Ta kontakt med oss så snart som mulig etter at du har oppdaget mangelen. Beskriv mangelen så detaljert som mulig. Ved godkjent reklamasjon vil vi i første omgang forsøke å reparere varen eller levere en ny tilsvarende vare. Dersom dette ikke er mulig eller uforholdsmessig kostbart, kan du ha rett til prisavslag eller heving av kjøpet.",
            sec9_title: "9. Personvern",
            sec9_text:
              "Vi behandler dine personopplysninger i henhold to vår personvernerklæring, som du finner her: https://www.hiskingdomministry.no/personvernerklæring",
            sec10_title: "10. Kurs og digitale produkter",
            sec10_text:
              "Ved påmelding til kurs eller kjøp av digitale produkter gjelder følgende:",
            sec10_item1:
              "Betaling: Kursavgiften må være betalt i sin helhet før tilgang til kurset gis, med mindre annet er avtalt eller kurset er gratis.",
            sec10_item2:
              "Tilgang: Tilgangen til kurset er personal og kan ikke deles med andre. Varigheten av tilgangen vil fremgå av kursbeskrivelsen ved påmelding.",
            sec10_item3:
              "Angrerett: Ved kjøp av digitale kurs der levering starter umiddelbart etter betaling, samtykker du til at leveringen påbegynnes og at angreretten bortfaller når du har logget inn og startet kurset, i henhold til angrerettlovens § 22 n.",
            sec10_item4:
              "Opphavsrett: Alt kursmateriell (videoer, tekster, filer) er beskyttet av opphavsrett og er kun til personlig bruk. Kommersiell bruk eller videresalg er strengt forbudt.",
            sec11_title: "11. Immaterielle rettigheter",
            sec11_text:
              "Alt innhold på vår Nettbutikk, inkludert bilder, tekster, logoer og design, er beskyttet av opphavsrett og andre immaterielle rettigheter og tilhører His Kingdom Ministry nettbutikk eller våre samarbeidspartnere. Enhver kopiering eller bruk av dette innholdet uten vår skriftlige tillatelse er forbudt.",
            sec12_title: "12. Ansvarsbegrensning",
            sec12_text:
              "Vi er ikke ansvarlig for indirekte tap, følgeskader eller tap som skyldes force majeure. Vårt ansvar er begrenset til kjøpesummen for de aktuelle varene.",
            sec13_title: "13. Tvister",
            sec13_text:
              "Eventuelle tvister som oppstår i forbindelse med disse vilkårene og betingelsene skal søkes løst i minnelighet. Dersom enighet ikke oppnås, kan saken bringes inn for de ordinære domstoler i Norge i henhold til norsk lov.",
            sec14_title: "14. Endringer i vilkårene",
            sec14_text:
              "Vi forbeholder oss retten til å endre disse vilkårene og betingelsene når som helst. De til enhver tid gjeldende vilkårene vil være tilgjengelige på vår Nettbutikk og i vår fysiske butikk.",
          },
        },
        blogg: {
          hero: {
            title: "Nyheter / Blogg",
            subtitle: "Les våre siste artikler og oppdateringer",
            bg: "https://images.unsplash.com/photo-1499750310159-5b600aaf0320?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80",
          },
          section: {
            label: "Nyheter & Blogg",
            title: "Siste Nytt",
            description: "Les våre siste artikler og oppdateringer.",
          },
        },
      };

      const safe = defaults[pageId] || {};
      return JSON.parse(JSON.stringify(safe));
    },

    mergePageContentDefaults(base, override) {
      if (Array.isArray(override)) return override.slice();
      if (!base || typeof base !== "object" || Array.isArray(base)) {
        if (
          override &&
          typeof override === "object" &&
          !Array.isArray(override)
        ) {
          return JSON.parse(JSON.stringify(override));
        }
        return override !== undefined ? override : base;
      }

      const out = JSON.parse(JSON.stringify(base));
      if (
        !override ||
        typeof override !== "object" ||
        Array.isArray(override)
      ) {
        return out;
      }

      Object.keys(override).forEach((key) => {
        const baseVal = out[key];
        const overrideVal = override[key];
        if (
          baseVal &&
          typeof baseVal === "object" &&
          !Array.isArray(baseVal) &&
          overrideVal &&
          typeof overrideVal === "object" &&
          !Array.isArray(overrideVal)
        ) {
          out[key] = this.mergePageContentDefaults(baseVal, overrideVal);
        } else {
          out[key] = overrideVal;
        }
      });

      return out;
    },

    async loadPageFields(pageId) {
      const container = document.getElementById("editor-fields");
      container.innerHTML = '<div class="loader">Laster...</div>';

      try {
        const fetchedData =
          (await firebaseService.getPageContent(pageId)) || {};

        // Migrate 'for-menigheter' features from old object format to array format
        if (
          pageId === "for-menigheter" &&
          fetchedData &&
          fetchedData.features &&
          !Array.isArray(fetchedData.features) &&
          typeof fetchedData.features === "object"
        ) {
          const f = fetchedData.features;
          const list = [f.f1, f.f2, f.f3, f.f4]
            .map((v) =>
              typeof v === "string"
                ? v.trim()
                : v && typeof v === "object" && v.title
                  ? v.title.trim()
                  : "",
            )
            .filter(Boolean);
          if (list.length > 0) {
            fetchedData.features = list;
          } else {
            fetchedData.features = Object.values(f)
              .map((v) =>
                typeof v === "string"
                  ? v.trim()
                  : v && typeof v === "object" && v.title
                    ? v.title.trim()
                    : "",
              )
              .filter(Boolean);
          }
        }

        const defaults = this.getPageContentEditorDefaults(pageId);
        const data = this.mergePageContentDefaults(defaults, fetchedData);

        if (
          pageId === "index" &&
          data &&
          typeof data === "object" &&
          data.facebookFeed
        ) {
          delete data.facebookFeed;
        }

        // For subpages, ensure hero fields exist so they show up in the editor
        if (
          pageId !== "index" &&
          pageId !== "butikk" &&
          !String(pageId).startsWith("settings_")
        ) {
          if (!data.hero) data.hero = {};
          if (data.hero.title === undefined) data.hero.title = "";
          if (data.hero.subtitle === undefined) data.hero.subtitle = "";

          // Support both backgroundImage and bg keys
          if (
            pageId === "for-bedrifter" ||
            pageId === "bnn" ||
            pageId === "for-menigheter" ||
            pageId === "blogg"
          ) {
            if (
              data.hero.bg === undefined &&
              data.hero.backgroundImage === undefined
            ) {
              data.hero.bg = ""; // Default to .bg for these
            } else if (
              data.hero.bg === undefined &&
              data.hero.backgroundImage !== undefined
            ) {
              data.hero.bg = data.hero.backgroundImage; // Migrate if needed
            }
          } else {
            if (data.hero.backgroundImage === undefined)
              data.hero.backgroundImage = "";
          }
        }

        if (pageId === "settings_facebook_feed") {
          this.renderFacebookFeedSettingsEditor(data);
          return;
        }

        if (pageId === "personvern") {
          await this.renderPrivacyDocument(data);
          return;
        }
        this.renderFields(data);
      } catch (e) {
        container.innerHTML = "<p>Error.</p>";
      }
    },

    renderFields(data) {
      const container = document.getElementById("editor-fields");
      container.innerHTML = "";
      const flattenedData = this.flatten(data);

      if (Object.keys(flattenedData).length === 0) {
        container.innerHTML =
          "<p>Ingen redigerbare felt funnet for denne siden.</p>";
        return;
      }

      Object.keys(flattenedData).forEach((key) => {
        const value = flattenedData[key];
        const formGroup = document.createElement("div");
        formGroup.className = "form-group";

        const label = document.createElement("label");
        label.textContent = key.replace(/\./g, " > ").toUpperCase();

        // Support editing arrays as dynamic lists
        if (Array.isArray(value)) {
          formGroup.classList.add("is-list-field");

          const listContainer = document.createElement("div");
          listContainer.className = "list-field-container";
          listContainer.style.display = "flex";
          listContainer.style.flexDirection = "column";
          listContainer.style.gap = "8px";
          listContainer.style.marginTop = "8px";
          listContainer.setAttribute("data-list-key", key);

          const renderListItems = () => {
            listContainer.innerHTML = "";
            value.forEach((itemVal, idx) => {
              const itemRow = document.createElement("div");
              itemRow.style.display = "flex";
              itemRow.style.gap = "8px";
              itemRow.style.alignItems = "center";

              const input = document.createElement("input");
              input.type = "text";
              input.className = "form-control list-item-input";
              input.value = itemVal || "";
              input.style.flex = "1";
              input.setAttribute("data-index", idx);

              input.addEventListener("input", (e) => {
                value[idx] = e.target.value;
              });

              const delBtn = document.createElement("button");
              delBtn.type = "button";
              delBtn.className = "btn btn-danger btn-sm";
              delBtn.innerHTML = '<i class="fas fa-trash"></i>';
              delBtn.style.padding = "8px 12px";
              delBtn.addEventListener("click", () => {
                value.splice(idx, 1);
                renderListItems();
              });

              itemRow.appendChild(input);
              itemRow.appendChild(delBtn);
              listContainer.appendChild(itemRow);
            });
          };

          renderListItems();

          const addBtn = document.createElement("button");
          addBtn.type = "button";
          addBtn.className = "btn btn-secondary btn-sm";
          addBtn.style.marginTop = "8px";
          addBtn.style.width = "fit-content";
          addBtn.innerHTML = '<i class="fas fa-plus"></i> Legg til punkt';
          addBtn.addEventListener("click", () => {
            value.push("");
            renderListItems();
          });

          formGroup.appendChild(label);
          formGroup.appendChild(listContainer);
          formGroup.appendChild(addBtn);
          container.appendChild(formGroup);
          return;
        }

        let inputElement;
        if (
          typeof value === "string" &&
          (value.length > 100 ||
            key.includes("description") ||
            key.includes("content"))
        ) {
          inputElement = document.createElement("textarea");
          inputElement.style.height = "120px";
          formGroup.classList.add("is-textarea");
        } else {
          inputElement = document.createElement("input");
          inputElement.type = "text";
        }
        inputElement.className = "form-control";
        inputElement.value = value || "";
        inputElement.setAttribute("data-key", key);

        formGroup.appendChild(label);
        formGroup.appendChild(inputElement);

        // Add image preview if it's a background image field
        if (
          key.includes("backgroundImage") ||
          key.includes("imageUrl") ||
          key.endsWith(".bg")
        ) {
          const preview = document.createElement("div");
          preview.className = "img-preview-mini";
          preview.style.marginTop = "10px";
          preview.style.height = "60px";
          preview.style.width = "100px";
          preview.style.background = "#f1f5f9";
          preview.style.borderRadius = "4px";
          preview.style.overflow = "hidden";
          preview.style.display = "flex";
          preview.style.alignItems = "center";
          preview.style.justifyContent = "center";
          preview.style.border = "1px solid #e2e8f0";

          const updateMiniPreview = (url) => {
            if (url && url.length > 5) {
              preview.innerHTML = `<img src="${url}" style="width:100%; height:100%; object-fit:cover;">`;
            } else {
              preview.innerHTML =
                '<span class="material-symbols-outlined" style="font-size:20px; color:#cbd5e1;">image</span>';
            }
          };

          updateMiniPreview(value);
          inputElement.addEventListener("input", (e) =>
            updateMiniPreview(e.target.value),
          );
          formGroup.appendChild(preview);
        }

        container.appendChild(formGroup);
      });
    },

    renderFacebookFeedField({
      key,
      label,
      value = "",
      type = "text",
      valueType = "",
      fullWidth = false,
      placeholder = "",
      help = "",
      textarea = false,
      options = null,
      min = "",
      max = "",
      step = "",
    }) {
      const widthStyle = fullWidth ? "grid-column: 1 / -1;" : "";
      const safeValue = value == null ? "" : String(value);
      const dataTypeAttr = valueType
        ? ` data-value-type="${this.escapeHtml(valueType)}"`
        : "";
      const placeholderAttr = placeholder
        ? ` placeholder="${this.escapeHtml(placeholder)}"`
        : "";
      const helpHtml = help
        ? `<div style="font-size:12px; color:#64748b; margin-top:6px;">${this.escapeHtml(help)}</div>`
        : "";

      let controlHtml = "";
      if (Array.isArray(options) && options.length > 0) {
        controlHtml = `
                <select class="form-control" data-key="${this.escapeHtml(key)}"${dataTypeAttr}>
                    ${options
                      .map(
                        (option) => `
                        <option value="${this.escapeHtml(option.value)}" ${String(option.value) === safeValue ? "selected" : ""}>
                            ${this.escapeHtml(option.label)}
                        </option>
                    `,
                      )
                      .join("")}
                </select>
            `;
      } else if (textarea) {
        controlHtml = `
                <textarea class="form-control" data-key="${this.escapeHtml(key)}"${dataTypeAttr}${placeholderAttr} style="min-height:110px;">${this.escapeHtml(safeValue)}</textarea>
            `;
      } else {
        const minAttr = min !== "" ? ` min="${this.escapeHtml(min)}"` : "";
        const maxAttr = max !== "" ? ` max="${this.escapeHtml(max)}"` : "";
        const stepAttr = step !== "" ? ` step="${this.escapeHtml(step)}"` : "";
        controlHtml = `
                <input type="${this.escapeHtml(type)}" class="form-control" data-key="${this.escapeHtml(key)}"${dataTypeAttr}
                    value="${this.escapeHtml(safeValue)}"${placeholderAttr}${minAttr}${maxAttr}${stepAttr}>
            `;
      }

      return `
            <div class="form-group" style="margin:0; ${widthStyle}">
                <label>${this.escapeHtml(label)}</label>
                ${controlHtml}
                ${helpHtml}
            </div>
        `;
    },

    renderFacebookFeedPostEditor(
      postId,
      title,
      accentColor,
      fallbackImage,
      post = {},
    ) {
      const imageValue = post.image || "";
      const previewImage = imageValue || fallbackImage;
      return `
            <div class="card" style="margin:0;">
                <div class="card-body" style="display:grid; gap:16px;">
                    <div style="display:flex; align-items:center; justify-content:space-between; gap:12px;">
                        <div style="display:flex; align-items:center; gap:10px;">
                            <span style="width:10px; height:10px; border-radius:999px; background:${this.escapeHtml(accentColor)};"></span>
                            <h3 style="margin:0; font-size:16px;">${this.escapeHtml(title)}</h3>
                        </div>
                        <span style="font-size:12px; color:#64748b;">Fallback-kort</span>
                    </div>

                    <div data-facebook-post-preview="${this.escapeHtml(postId)}" style="border:1px solid #e2e8f0; border-radius:20px; overflow:hidden; background:#fff;">
                        <div style="aspect-ratio:16/9; background:#e2e8f0;">
                            <img data-preview-key="posts.${this.escapeHtml(postId)}.image" data-fallback-src="${this.escapeHtml(fallbackImage)}"
                                src="${this.escapeHtml(previewImage)}" alt=""
                                style="width:100%; height:100%; object-fit:cover; display:block;">
                        </div>
                        <div style="padding:16px; display:grid; gap:10px;">
                            <div style="display:flex; justify-content:space-between; gap:8px; font-size:12px; color:#64748b;">
                                <span style="font-weight:700; color:${this.escapeHtml(accentColor)};">Facebook</span>
                                <span data-preview-key="posts.${this.escapeHtml(postId)}.date">${this.escapeHtml(post.date || "")}</span>
                            </div>
                            <div data-preview-key="posts.${this.escapeHtml(postId)}.title" style="font-size:18px; font-weight:700; line-height:1.3;">
                                ${this.escapeHtml(post.title || "")}
                            </div>
                            <div data-preview-key="posts.${this.escapeHtml(postId)}.excerpt" style="font-size:14px; color:#64748b; line-height:1.6;">
                                ${this.escapeHtml(post.excerpt || "")}
                            </div>
                            <div data-preview-key="posts.${this.escapeHtml(postId)}.cta" style="font-size:14px; font-weight:700; color:#f97316;">
                                ${this.escapeHtml(post.cta || "")}
                            </div>
                        </div>
                    </div>

                    <div style="display:grid; gap:14px;">
                        ${this.renderFacebookFeedField({
                          key: `facebookFeed.posts.${postId}.image`,
                          label: "Bilde-URL",
                          value: post.image || "",
                          placeholder: "https://...",
                          help: "Tomt felt bruker standard illustrasjon.",
                        })}
                        ${this.renderFacebookFeedField({
                          key: `facebookFeed.posts.${postId}.date`,
                          label: "Datoetikett",
                          value: post.date || "",
                        })}
                        ${this.renderFacebookFeedField({
                          key: `facebookFeed.posts.${postId}.title`,
                          label: "Tittel",
                          value: post.title || "",
                        })}
                        ${this.renderFacebookFeedField({
                          key: `facebookFeed.posts.${postId}.excerpt`,
                          label: "Utdrag",
                          value: post.excerpt || "",
                          textarea: true,
                        })}
                        ${this.renderFacebookFeedField({
                          key: `facebookFeed.posts.${postId}.cta`,
                          label: "Lenketekst",
                          value: post.cta || "",
                        })}
                        ${this.renderFacebookFeedField({
                          key: `facebookFeed.posts.${postId}.link`,
                          label: "Lenke",
                          value: post.link || "",
                          placeholder: "https://...",
                        })}
                    </div>
                </div>
            </div>
        `;
    },

    getFacebookFeedPreviewUrls(limit = 3, { pageId = "", pageUrl = "" } = {}) {
      const params = new URLSearchParams({ limit: String(limit) });
      if (pageId) params.set("pageId", pageId);
      if (pageUrl) params.set("pageUrl", pageUrl);

      const projectId =
        (window.firebaseConfig && window.firebaseConfig.projectId) ||
        "his-kingdom-ministry";
      const urls = [`/api/facebook-feed?${params.toString()}`];
      const cloudFunctionUrl = `https://us-central1-his-kingdom-ministry.cloudfunctions.net/facebookFeed?${params.toString()}`;

      if (!urls.includes(cloudFunctionUrl)) {
        urls.push(cloudFunctionUrl);
      }

      return urls;
    },

    renderFacebookFeedLivePreviewState(container, state = {}) {
      const previewNode = container.querySelector(
        "[data-facebook-live-preview]",
      );
      const badgeNode = container.querySelector("[data-facebook-live-badge]");
      const noteNode = container.querySelector("[data-facebook-live-note]");
      if (!previewNode || !badgeNode || !noteNode) return;

      const setBadge = (label, fg, bg) => {
        badgeNode.textContent = label;
        badgeNode.style.color = fg;
        badgeNode.style.background = bg;
      };

      const status = state.status || "idle";
      const items = Array.isArray(state.items) ? state.items : [];

      if (status === "loading") {
        setBadge("Henter...", "#2563eb", "#eff6ff");
        noteNode.textContent =
          "Henter siste innlegg fra Meta API med gjeldende innstillinger.";
        previewNode.innerHTML = `
                <div style="min-height:96px; display:flex; align-items:center; justify-content:center; border:1px dashed #dbe4ef; border-radius:18px; background:#fff;">
                    <div class="loader"></div>
                </div>
            `;
        return;
      }

      if (status === "disabled") {
        setBadge("Manuell", "#475569", "#f8fafc");
        noteNode.textContent =
          state.message ||
          "Live-feed er slått av. Kortene under brukes som fallback på forsiden.";
        previewNode.innerHTML = `
                <div style="padding:14px 16px; border:1px dashed #dbe4ef; border-radius:18px; background:#fff; color:#64748b; font-size:13px; line-height:1.6;">
                    Slå på "Bruk live Meta-feed" for å se de siste innleggene her i dashbordet.
                </div>
            `;
        return;
      }

      if (status === "error") {
        setBadge("Feil", "#b91c1c", "#fef2f2");
        noteNode.textContent =
          state.message || "Kunne ikke hente live innlegg akkurat nå.";
        previewNode.innerHTML = `
                <div style="padding:14px 16px; border:1px solid #fecaca; border-radius:18px; background:#fff; color:#991b1b; font-size:13px; line-height:1.6;">
                    Live-forhåndsvisningen feilet. Forsiden vil fortsatt bruke fallback-kort hvis Meta ikke svarer.
                </div>
            `;
        return;
      }

      if (status === "empty") {
        setBadge("Tom", "#92400e", "#fffbeb");
        noteNode.textContent =
          state.message || "Meta svarte, men returnerte ingen innlegg.";
        previewNode.innerHTML = `
                <div style="padding:14px 16px; border:1px solid #fde68a; border-radius:18px; background:#fff; color:#92400e; font-size:13px; line-height:1.6;">
                    Ingen innlegg ble funnet i feeden som ble hentet.
                </div>
            `;
        return;
      }

      if (status === "ready") {
        setBadge(`${items.length} live`, "#166534", "#f0fdf4");
        noteNode.textContent =
          state.message ||
          "Dette er innleggene som Meta API leverer akkurat nå.";
        previewNode.innerHTML = `
                <div style="display:grid; gap:12px;">
                    ${items
                      .map((item, index) => {
                        const imageHtml = item.image
                          ? `<img src="${this.escapeHtml(item.image)}" alt="" style="width:72px; height:72px; border-radius:14px; object-fit:cover; flex-shrink:0; border:1px solid #dbe4ef;">`
                          : ``;
                        const href =
                          typeof item.link === "string" && item.link.trim()
                            ? item.link.trim()
                            : typeof state.pageUrl === "string" &&
                                state.pageUrl.trim()
                              ? state.pageUrl.trim()
                              : "#";
                        const excerpt =
                          typeof item.excerpt === "string"
                            ? item.excerpt.trim()
                            : "";
                        const title =
                          typeof item.title === "string" && item.title.trim()
                            ? item.title.trim()
                            : `Innlegg ${index + 1}`;

                        return `
                            <a href="${this.escapeHtml(href)}" target="_blank" rel="noopener noreferrer"
                                style="display:flex; gap:14px; align-items:flex-start; padding:14px; border:1px solid #e2e8f0; border-radius:18px; background:#fff; text-decoration:none; color:#0f172a;">
                                ${imageHtml}
                                <div style="min-width:0; display:grid; gap:6px;">
                                    <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                                        <span style="font-size:11px; font-weight:800; letter-spacing:.06em; text-transform:uppercase; color:${String(item.source || "").toLowerCase() === "youtube" ? "#ff0000" : "#1877f2"};">${this.escapeHtml(item.source || "Facebook")}</span>
                                        <span style="font-size:12px; color:#64748b;">${this.escapeHtml(item.date || "")}</span>
                                        <span style="font-size:12px; color:#ef4444; display:inline-flex; align-items:center; gap:3px;"><i class="fas fa-heart" style="font-size:10px;"></i> ${item.likes || 0}</span>
                                        <span style="font-size:12px; color:#d17d39; display:inline-flex; align-items:center; gap:3px;"><i class="fas fa-comment" style="font-size:10px;"></i> ${item.comments || 0}</span>
                                    </div>
                                    <div style="font-size:15px; font-weight:700; line-height:1.4; color:#0f172a;">${this.escapeHtml(title)}</div>
                                    <div style="font-size:13px; line-height:1.55; color:#64748b;">${this.escapeHtml(excerpt)}</div>
                                </div>
                            </a>
                        `;
                      })
                      .join("")}
                </div>
            `;
        return;
      }

      setBadge("Klar", "#475569", "#f8fafc");
      noteNode.textContent = "";
      previewNode.innerHTML = "";
    },
  };
}
