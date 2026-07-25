import { biblicalCharacters } from '../../js/bibelske-personer-data.js';

// Safely wrap any promise in a timeout to prevent hanging on Safari/iOS browsers
function withTimeout(promise, ms = 3000) {
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore operation timed out')), ms))
    ]);
}

/* ═══════════════════════════════════════════════════════
   MIN SIDE — PCO-inspired Member Profile
   ═══════════════════════════════════════════════════════ */

// ── Multilingual Translation Dictionary ──────────────────────────
const minsideTranslations = {
    no: {
        'common.loading': 'Laster',
        'common.initError': 'Feil ved oppstart',
        'common.errorOccurred': 'Noe gikk galt',
        'common.save': 'Lagre',
        'common.cancel': 'Avbryt',
        'common.edit': 'Rediger',
        'common.back': 'Tilbake',
        'common.saving': 'Lagrer...',
        'common.saved': 'Lagret ✓',
        'common.saveError': 'Feil ved lagring',
        'common.search': 'Søker...',
        'common.searchError': 'Kunne ikke hente forslag.',
        'common.noResults': 'Ingen treff.',
        
        // Sidebar & Header Static (also used statically in DOM)
        'sidebar.title': 'Min side',
        'sidebar.seNettside': 'Se nettside',
        'sidebar.oversikt': 'Oversikt',
        'sidebar.mittMedlemskap': 'MITT MEDLEMSKAP',
        'sidebar.profil': 'Profil',
        'sidebar.kurs': 'Kurs',
        'sidebar.readingPlans': 'Leseplaner',
        'sidebar.gaver': 'Gaver',
        'sidebar.aktivitet': 'AKTIVITET',
        'sidebar.varslinger': 'Varslinger',
        'sidebar.logg': 'Logg',
        'sidebar.notater': 'Notater',
        'sidebar.prayerWall': 'Bønnevegg',
        'sidebar.admin': 'Administrasjon',
        'sidebar.loggut': 'Logg ut',
        'header.oversikt': 'Oversikt',
        'header.subtitle': 'Min Side | His Kingdom Ministry',
        'header.roleMedlem': 'Medlem',
        'header.backToAdmin': 'Tilbake til admin',
        'header.toHkm': 'Til HKM.no',
        'header.logout': 'Logg ut',
        
        // Roles
        'role.superadmin': 'Administrator',
        'role.admin': 'Administrator',
        'role.pastor': 'Pastor',
        'role.leader': 'Leder',
        'role.volunteer': 'Frivillig',
        'role.donor': 'Fast Giver',
        'role.member': 'Medlem',
        'role.fallbackUser': 'Bruker',

        // Time ago
        'time.justNow': 'Akkurat nå',
        'time.minutesAgo': '{n} min siden',
        'time.hoursAgo': '{n} t siden',
        'time.daysAgo': '{n} d siden',

        // View names
        'view.overview': 'Oversikt',
        'view.profile': 'Min Profil',
        'view.activity': 'Aktivitet',
        'view.notifications': 'Varslinger',
        'view.giving': 'Gaver',
        'view.courses': 'Kurs',
        'view.readingPlans': 'Leseplaner',
        'overview.btnReadingPlansLabel': 'Leseplaner',
        'view.notes': 'Notater',
        'view.prayerWall': 'Bønnevegg',

        // Overview
        'overview.goodMorning': 'God morgen',
        'overview.hello': 'Hei',
        'overview.goodEvening': 'God kveld',
        'overview.quote': '"For jeg vet hvilke tanker jeg har med dere, sier Herren..." — Jer 29:11',
        'overview.memberSince': 'Medlem siden',
        'overview.unreadNotifications': 'Uleste varslinger',
        'overview.clickToViewAll': 'Trykk for å se alle',
        'overview.totalGiven': 'Gitt totalt i',
        'overview.seeGivingHistory': 'Se gavehistorikk',
        'overview.availableCourses': 'Tilgjengelige kurs',
        'overview.teachingFromHkm': 'Undervisning fra HKM',
        'overview.quickLinks': 'Hurtiglenker',
        'overview.btnProfileLabel': 'Min profil',
        'overview.btnProfileSub': 'Kontakt & personlig info',
        'overview.btnGivingLabel': 'Gaver',
        'overview.btnGivingSub': 'Gavehistorikk',
        'overview.btnCoursesLabel': 'Kurs',
        'overview.btnCoursesSub': 'Undervisning fra HKM',
        'overview.btnNotificationsLabel': 'Varslinger',
        'overview.btnNotificationsSub': 'Meldinger fra HKM',
        'overview.recentNotifications': 'Siste varslinger',
        'overview.seeAll': 'Se alle',
        'overview.noNotificationsYet': 'Ingen varslinger ennå.',
        'overview.showAllNotifications': 'Vis alle varslinger',
        'overview.givingNone': 'Ingen',
        'overview.myProgress': 'Min fremdrift',
        'overview.continue': 'Fortsett',
        'overview.upcomingEvents': 'Kommende arrangementer',
        'overview.upcomingEventsSub': 'Bli med på fellesskap og møter i kalenderen',
        'overview.latestPrayer': 'Siste fra Bønneveggen',
        'overview.latestPrayerSub': 'Bær hverandres byrder i bønnefellesskapet',
        'overview.goToPrayerWall': 'Gå til Bønneveggen',
        'overview.noEvents': 'Ingen planlagte arrangementer for øyeblikket.',
        'overview.noPrayersYet': 'Ingen bønneemner ennå. Bli den første til å legge inn et bønneemne på veggen.',
        'overview.prayedCountText': '{n} ber',

        // Profile
        'profile.contactInfo': 'Kontaktinformasjon',
        'profile.fullName': 'Fullt navn',
        'profile.email': 'E-post',
        'profile.phone': 'Telefon',
        'profile.phonePlaceholder': 'Telefonnummer',
        'profile.address': 'Adresse',
        'profile.addressSearchPlaceholder': 'Søk etter adresse i hele verden',
        'profile.searchingAddresses': 'Søker etter adresser...',
        'profile.noAddressSuggestions': 'Ingen adresseforslag.',
        'profile.couldNotFetchAddresses': 'Kunne ikke hente adresseforslag.',
        'profile.addressSelected': 'Adresse valgt.',
        'profile.selectedCountry': 'Valgt: {country}',
        'profile.zipPlaceholder': 'Postnr',
        'profile.cityPlaceholder': 'By',
        'profile.countryPlaceholder': 'Land',
        'profile.personalInfo': 'Personlig informasjon',
        'profile.gender': 'Kjønn',
        'profile.select': 'Velg...',
        'profile.genderMale': 'Mann',
        'profile.genderFemale': 'Kvinne',
        'profile.genderOther': 'Annet',
        'profile.birthday': 'Fødselsdato',
        'profile.maritalStatus': 'Sivilstatus',
        'profile.maritalSingle': 'Ugift',
        'profile.maritalMarried': 'Gift',
        'profile.maritalPartner': 'Samboer',
        'profile.maritalDivorced': 'Skilt',
        'profile.maritalWidowed': 'Enke/Enkemann',
        'profile.memberSince': 'Medlem siden',
        'profile.accountAdmin': 'Kontoadministrasjon',
        'profile.deleteAccountNotice': 'Sletting av konto er permanent og kan ikke angres.',
        'profile.deleteAccountBtn': 'Slett konto',
        'profile.family': 'Familie',
        'profile.familySearchPlaceholder': 'Søk etter navn, e-post eller telefon',
        'profile.searching': 'Søker...',
        'profile.noMatches': 'Ingen treff.',
        'profile.searchUnavailable': 'Søk er ikke tilgjengelig akkurat nå.',
        'profile.couldNotSearch': 'Kunne ikke søke akkurat nå.',
        'profile.household': 'Husstand',
        'profile.noFamilyRegistered': 'Ingen familiemedlemmer registrert.',
        'profile.familyMemberRole': 'Familiemedlem',
        'profile.notificationPreferences': 'Varslingspreferanser',
        'profile.pushNotifications': 'Push-varslinger',
        'profile.pushNotificationsSub': 'Mottar varslinger når HKM sender meldinger',
        'profile.pushTeachings': 'Ny undervisning',
        'profile.pushTeachingsSub': 'Få pushvarsel når ny undervisning blir publisert',
        'profile.pushPodcasts': 'Ny podcast',
        'profile.pushPodcastsSub': 'Få pushvarsel når en ny podcastepisode legges ut',
        'profile.pushBlogs': 'Nytt blogginnlegg',
        'profile.pushBlogsSub': 'Få pushvarsel når et nytt blogginnlegg publiseres',
        'profile.pushReadingPlans': 'Bibel- og leseplaner',
        'profile.pushReadingPlansSub': 'Få daglig påminnelse og varsel for dine leseplaner',
        'profile.emailNotifications': 'E-postvarslinger',
        'profile.emailNotificationsSub': 'Mottar nyhetsbrev og oppdateringer',
        'profile.emailReadingPlans': 'Daglige leseplanoppdateringer',
        'profile.emailReadingPlansSub': 'Få dagens bibellesing og andakt på e-post',
        'profile.notificationTime': 'Tidspunkt for daglig oppdatering',
        'profile.notificationTimeSub': 'Velg hvilken time du vil motta e-post og push-varsel',
        'profile.savePreferences': 'Lagre preferanser',

        // Activity
        'activity.noActivityYet': 'Ingen aktivitet ennå',
        'activity.noActivitySub': 'Aktivitet som push-varslinger og meldinger du mottar vil vises her.',
        'activity.loadErrorNotice': 'Kunne ikke laste aktivitet akkurat nå.',
        'activity.loadErrorCopy': 'Kunne ikke laste aktivitet.',

        // Notifications
        'notifications.title': 'Varslinger',
        'notifications.markAllRead': 'Merk alle lest',
        'notifications.filterAll': 'Alle',
        'notifications.filterUnread': 'Ulest',
        'notifications.filterPush': 'Push',
        'notifications.filterMessage': 'Meldinger',
        'notifications.noNotifications': 'Ingen varslinger',
        'notifications.noNotificationsSub': 'Du har ingen varslinger ennå.',
        'notifications.loadErrorNotice': 'Kunne ikke laste varslinger akkurat nå.',
        'notifications.loadErrorCopy': 'Kunne ikke laste varslinger.',
        'notifications.deleting': 'Sletter...',
        'notifications.alert': 'Varsel',
        'notifications.openLink': 'Åpne lenke',
        'notifications.deleteAlert': 'Slett varsel',
        'notifications.deleteConfirm': 'Er du sikker på at du vil slette dette varselet?',
        'notifications.deleteError': 'Kunne ikke slette varsel',

        // Giving
        'giving.totalGiftsCount': 'Totalt antall gaver',
        'giving.lastGift': 'Siste gave',
        'giving.givenInYear': 'Gitt i {year}',
        'giving.givingHistory': 'Gavehistorikk',
        'giving.noGiftsYet': 'Ingen gaver ennå',
        'giving.noGiftsSub': 'Dine donasjoner til HKM vises her.',
        'giving.colDate': 'Dato',
        'giving.colType': 'Type',
        'giving.colMethod': 'Metode',
        'giving.colAmount': 'Beløp',
        'giving.typeGift': 'Gave',
        'giving.statusCompleted': 'Fullført',
        'giving.statusPending': 'Venter',
        'giving.statusProcessing': 'Behandles',
        'giving.statusFailed': 'Feilet',
        'giving.statusCanceled': 'Avbrutt',
        'giving.statusUnknown': 'Ukjent',
        'giving.methodCard': 'Kort',
        'giving.methodStripe': 'Stripe',
        'giving.methodVipps': 'Vipps',
        'giving.methodBank': 'Bank',
        'giving.methodManual': 'Manuell',
        'giving.methodCash': 'Kontant',
        'giving.methodUnknown': 'Ukjent',
        'giving.detailsTitle': 'Gavedetaljer',
        'giving.lblAmount': 'Beløp',
        'giving.lblDate': 'Dato',
        'giving.lblPaidWith': 'Betalt med',
        'giving.lblStatus': 'Status',
        'giving.lblType': 'Type',
        'giving.lblReference': 'Referanse',
        'giving.referenceNotRegistered': 'Ikke registrert',
        'giving.lblMessage': 'Melding',
        'giving.lblCurrency': 'Valuta',
        'giving.chartTrendsTitle': 'Gavehistorikk over tid',
        'giving.chartMethodsTitle': 'Fordeling per betalingsmetode',
        'giving.chartNok': 'Beløp (NOK)',

        // Courses
        'courses.noCoursesYet': 'Ingen kurs ennå',
        'courses.noCoursesSub': 'Undervisnings- og kursinnhold fra HKM vil vises her.',
        'courses.watchVideo': 'Se video',
        'courses.untitled': 'Uten tittel',

        // Notes
        'notes.myNotes': 'Mine notater',
        'notes.personalNotesSub': 'Personlige notater som bare du kan se',
        'notes.newNote': 'Nytt notat',
        'notes.title': 'Tittel',
        'notes.titlePlaceholder': 'Gi notatet en tittel...',
        'notes.content': 'Innhold',
        'notes.contentPlaceholder': 'Skriv notat her...',
        'notes.cancel': 'Avbryt',
        'notes.saveNote': 'Lagre notat',
        'notes.emptyPersonalNotes': 'Du har ingen egne notater ennå.<br>Trykk «Nytt notat» for å begynne.',
        'notes.hkmNotes': 'Notater fra HKM',
        'notes.deleteConfirm': 'Er du sikker på at du vil slette dette notatet?',
        'notes.saving': 'Lagrer...',
        'notes.saveError': 'Feil ved lagring',
        'notes.error': 'Feil',
        'notes.updateError': 'Feil ved oppdatering',
        'notes.editNote': 'Rediger notat',
        'notes.save': 'Lagre',
        'notes.untitled': 'Uten tittel',
        'notes.hkmTeam': 'HKM-teamet',
        'notes.toolBold': 'Fet',
        'notes.toolItalic': 'Kursiv',
        'notes.toolUnderline': 'Understrek',
        'notes.toolHeader': 'Overskrift',
        'notes.toolParagraph': 'Avsnitt',
        'notes.toolBulletList': 'Punktliste',
        'notes.toolOrderedList': 'Numrert liste',
        'notes.toolClear': 'Fjern formatering',

        // Delete Account
        'deleteAccount.modalTitle': 'Slett konto?',
        'deleteAccount.modalMessage': 'Dette vil permanent slette kontoen din og all tilknyttet data. Handlingen kan ikke angres. Du vil bli bedt om å bekrefte identiteten din.',
        'deleteAccount.deleteBtn': 'Slett konto',
        'deleteAccount.cancelBtn': 'Avbryt',
        'deleteAccount.doubleConfirm': 'ER DU HELT SIKKER? Dette vil permanent slette all din data og din brukerprofil. Denne handlingen er 100% permanent og kan ikke angres.',
        'deleteAccount.reauthRequest': 'Vennligst logg inn på nytt for å bekrefte sletting.',
        
        // Prayer Wall
        'prayer.title': 'Bønneveggen',
        'prayer.disabledTitle': 'Deaktivert',
        'prayer.disabledMsg': 'Bønneveggen er for øyeblikket deaktivert.',
        'prayer.subtitle': 'Bær hverandres byrder, og oppfyll på den måte Kristi lov.',
        'prayer.btnWrite': 'Skriv bønneemne',
        'prayer.anonymous': 'Anonym søster/bror',
        'prayer.member': 'Medlem',
        'prayer.praysForThis': '{n} ber for dette',
        'prayer.hasPrayed': 'Jeg har bedt 🙏',
        'prayer.pray': 'Jeg ber 🙏',
        'prayer.emptyTitle': 'Ingen bønneemner ennå',
        'prayer.emptyDesc': 'Bli den første til å legge inn et bønneemne på veggen.',
        'prayer.modalTitle': 'Skriv et bønneemne',
        'prayer.modalLabel': 'Hva kan vi be for?',
        'prayer.modalPlaceholder': 'Skriv ditt bønneemne her...',
        'prayer.modalAnon': 'Post anonymt',
        'prayer.modalPost': 'Post på bønneveggen',
        'prayer.errEmpty': 'Bønneemnet kan ikke være tomt.',
        'prayer.posting': 'Poster...',
        'prayer.errSave': 'Kunne ikke lagre bønneemnet: ',
        'prayer.confirmDelete': 'Er du sikker på at du vil slette dette bønneemnet?',
        'prayer.errDelete': 'Feil under sletting: ',
        'prayer.errNotFound': 'Bønneemnet finnes ikke.',
        'prayer.errFetchEdit': 'Kunne ikke hente bønneemnet for redigering: ',
        'prayer.editModalTitle': 'Rediger bønneemne',
        'prayer.editModalSave': 'Lagre endringer',
        'prayer.editModalSaving': 'Lagrer...',
        'prayer.errUpdate': 'Kunne ikke oppdatere bønneemnet: ',
        'prayer.disabledTitle': 'Bønneveggen er deaktivert',
        'prayer.disabledMsg': 'Bønneveggen er for øyeblikket ikke tilgjengelig.'
    },
    en: {
        'common.loading': 'Loading',
        'common.initError': 'Initialization Error',
        'common.errorOccurred': 'Something went wrong',
        'common.save': 'Save',
        'common.cancel': 'Cancel',
        'common.edit': 'Edit',
        'common.back': 'Back',
        'common.saving': 'Saving...',
        'common.saved': 'Saved ✓',
        'common.saveError': 'Error saving',
        'common.search': 'Searching...',
        'common.searchError': 'Could not fetch suggestions.',
        'common.noResults': 'No matches.',
        
        // Sidebar & Header Static (also used statically in DOM)
        'sidebar.title': 'My Page',
        'sidebar.seNettside': 'View Website',
        'sidebar.oversikt': 'Overview',
        'sidebar.mittMedlemskap': 'MY MEMBERSHIP',
        'sidebar.profil': 'Profile',
        'sidebar.kurs': 'Courses',
        'sidebar.readingPlans': 'Reading Plans',
        'sidebar.gaver': 'Giving',
        'sidebar.aktivitet': 'ACTIVITY',
        'sidebar.varslinger': 'Notifications',
        'sidebar.logg': 'Log',
        'sidebar.notater': 'Notes',
        'sidebar.prayerWall': 'Prayer Wall',
        'sidebar.admin': 'Administration',
        'sidebar.loggut': 'Log Out',
        'header.oversikt': 'Overview',
        'header.subtitle': 'My Page | His Kingdom Ministry',
        'header.roleMedlem': 'Member',
        'header.backToAdmin': 'Back to Admin',
        'header.toHkm': 'To HKM.no',
        'header.logout': 'Log Out',
        
        // Roles
        'role.superadmin': 'Administrator',
        'role.admin': 'Administrator',
        'role.pastor': 'Pastor',
        'role.leader': 'Leader',
        'role.volunteer': 'Volunteer',
        'role.donor': 'Regular Donor',
        'role.member': 'Member',
        'role.fallbackUser': 'User',

        // Time ago
        'time.justNow': 'Just now',
        'time.minutesAgo': '{n}m ago',
        'time.hoursAgo': '{n}h ago',
        'time.daysAgo': '{n}d ago',

        // View names
        'view.overview': 'Overview',
        'view.profile': 'My Profile',
        'view.activity': 'Activity',
        'view.notifications': 'Notifications',
        'view.giving': 'Giving',
        'view.courses': 'Courses',
        'view.readingPlans': 'Reading Plans',
        'overview.btnReadingPlansLabel': 'Reading Plans',
        'view.notes': 'Notes',
        'view.prayerWall': 'Prayer Wall',

        // Overview
        'overview.goodMorning': 'Good morning',
        'overview.hello': 'Hello',
        'overview.goodEvening': 'Good evening',
        'overview.quote': '"For I know the plans I have for you," declares the Lord... — Jer 29:11',
        'overview.memberSince': 'Member since',
        'overview.unreadNotifications': 'Unread notifications',
        'overview.clickToViewAll': 'Click to view all',
        'overview.totalGiven': 'Total given in',
        'overview.seeGivingHistory': 'See giving history',
        'overview.availableCourses': 'Available courses',
        'overview.teachingFromHkm': 'Teaching from HKM',
        'overview.quickLinks': 'Quick Links',
        'overview.btnProfileLabel': 'My Profile',
        'overview.btnProfileSub': 'Contact & personal info',
        'overview.btnGivingLabel': 'Giving',
        'overview.btnGivingSub': 'Giving history',
        'overview.btnCoursesLabel': 'Courses',
        'overview.btnCoursesSub': 'Teaching from HKM',
        'overview.btnNotificationsLabel': 'Notifications',
        'overview.btnNotificationsSub': 'Messages from HKM',
        'overview.recentNotifications': 'Recent notifications',
        'overview.seeAll': 'See all',
        'overview.noNotificationsYet': 'No notifications yet.',
        'overview.showAllNotifications': 'Show all notifications',
        'overview.givingNone': 'None',
        'overview.myProgress': 'My Progress',
        'overview.continue': 'Continue',
        'overview.upcomingEvents': 'Upcoming Events',
        'overview.upcomingEventsSub': 'Join fellowship and meetings in the calendar',
        'overview.latestPrayer': 'Latest from the Prayer Wall',
        'overview.latestPrayerSub': "Bear each other's burdens in prayer fellowship",
        'overview.goToPrayerWall': 'Go to Prayer Wall',
        'overview.noEvents': 'No scheduled events at the moment.',
        'overview.noPrayersYet': 'No prayer requests yet. Be the first to post a request on the wall.',
        'overview.prayedCountText': '{n} praying',

        // Profile
        'profile.contactInfo': 'Contact Information',
        'profile.fullName': 'Full Name',
        'profile.email': 'Email',
        'profile.phone': 'Phone',
        'profile.phonePlaceholder': 'Phone number',
        'profile.address': 'Address',
        'profile.addressSearchPlaceholder': 'Search for address worldwide',
        'profile.searchingAddresses': 'Searching for addresses...',
        'profile.noAddressSuggestions': 'No address suggestions.',
        'profile.couldNotFetchAddresses': 'Could not fetch address suggestions.',
        'profile.addressSelected': 'Address selected.',
        'profile.selectedCountry': 'Selected: {country}',
        'profile.zipPlaceholder': 'Zip',
        'profile.cityPlaceholder': 'City',
        'profile.countryPlaceholder': 'Country',
        'profile.personalInfo': 'Personal Information',
        'profile.gender': 'Gender',
        'profile.select': 'Select...',
        'profile.genderMale': 'Male',
        'profile.genderFemale': 'Female',
        'profile.genderOther': 'Other',
        'profile.birthday': 'Date of birth',
        'profile.maritalStatus': 'Marital Status',
        'profile.maritalSingle': 'Single',
        'profile.maritalMarried': 'Married',
        'profile.maritalPartner': 'Partner',
        'profile.maritalDivorced': 'Divorced',
        'profile.maritalWidowed': 'Widowed',
        'profile.memberSince': 'Member since',
        'profile.accountAdmin': 'Account Administration',
        'profile.deleteAccountNotice': 'Account deletion is permanent and cannot be undone.',
        'profile.deleteAccountBtn': 'Delete Account',
        'profile.family': 'Family',
        'profile.familySearchPlaceholder': 'Search by name, email or phone',
        'profile.searching': 'Searching...',
        'profile.noMatches': 'No matches.',
        'profile.searchUnavailable': 'Search is not available right now.',
        'profile.couldNotSearch': 'Could not search right now.',
        'profile.household': 'Household',
        'profile.noFamilyRegistered': 'No family members registered.',
        'profile.familyMemberRole': 'Family member',
        'profile.notificationPreferences': 'Notification Preferences',
        'profile.pushNotifications': 'Push Notifications',
        'profile.pushNotificationsSub': 'Receive notifications when HKM sends messages',
        'profile.pushTeachings': 'New Teaching',
        'profile.pushTeachingsSub': 'Get notified when a new teaching is published',
        'profile.pushPodcasts': 'New Podcast',
        'profile.pushPodcastsSub': 'Get notified when a new podcast episode is available',
        'profile.pushBlogs': 'New Blog Post',
        'profile.pushBlogsSub': 'Get notified when a new blog post is published',
        'profile.pushReadingPlans': 'Bible & Reading Plans',
        'profile.pushReadingPlansSub': 'Get daily reminders and notifications for your reading plans',
        'profile.emailNotifications': 'Email Notifications',
        'profile.emailNotificationsSub': 'Receive newsletters and updates',
        'profile.emailReadingPlans': 'Daily Reading Plan Updates',
        'profile.emailReadingPlansSub': 'Get today\'s Bible reading and devotional by email',
        'profile.notificationTime': 'Notification Time',
        'profile.notificationTimeSub': 'Choose the hour you want to receive emails and push notifications',
        'profile.savePreferences': 'Save preferences',

        // Activity
        'activity.noActivityYet': 'No activity yet',
        'activity.noActivitySub': 'Activity like push notifications and messages you receive will appear here.',
        'activity.loadErrorNotice': 'Could not load activity right now.',
        'activity.loadErrorCopy': 'Could not load activity.',

        // Notifications
        'notifications.title': 'Notifications',
        'notifications.markAllRead': 'Mark all as read',
        'notifications.filterAll': 'All',
        'notifications.filterUnread': 'Unread',
        'notifications.filterPush': 'Push',
        'notifications.filterMessage': 'Messages',
        'notifications.noNotifications': 'No notifications',
        'notifications.noNotificationsSub': 'You have no notifications yet.',
        'notifications.loadErrorNotice': 'Could not load notifications right now.',
        'notifications.loadErrorCopy': 'Could not load notifications.',
        'notifications.deleting': 'Deleting...',
        'notifications.alert': 'Notification',
        'notifications.openLink': 'Open link',
        'notifications.deleteAlert': 'Delete notification',
        'notifications.deleteConfirm': 'Are you sure you want to delete this notification?',
        'notifications.deleteError': 'Could not delete notification',

        // Giving
        'giving.totalGiftsCount': 'Total number of gifts',
        'giving.lastGift': 'Last gift',
        'giving.givenInYear': 'Given in {year}',
        'giving.givingHistory': 'Giving History',
        'giving.noGiftsYet': 'No gifts yet',
        'giving.noGiftsSub': 'Your donations to HKM will appear here.',
        'giving.colDate': 'Date',
        'giving.colType': 'Type',
        'giving.colMethod': 'Method',
        'giving.colAmount': 'Amount',
        'giving.typeGift': 'Gift',
        'giving.statusCompleted': 'Completed',
        'giving.statusPending': 'Pending',
        'giving.statusProcessing': 'Processing',
        'giving.statusFailed': 'Failed',
        'giving.statusCanceled': 'Canceled',
        'giving.statusUnknown': 'Unknown',
        'giving.methodCard': 'Card',
        'giving.methodStripe': 'Stripe',
        'giving.methodVipps': 'Vipps',
        'giving.methodBank': 'Bank',
        'giving.methodManual': 'Manual',
        'giving.methodCash': 'Cash',
        'giving.methodUnknown': 'Unknown',
        'giving.detailsTitle': 'Gift Details',
        'giving.lblAmount': 'Amount',
        'giving.lblDate': 'Date',
        'giving.lblPaidWith': 'Paid with',
        'giving.lblStatus': 'Status',
        'giving.lblType': 'Type',
        'giving.lblReference': 'Reference',
        'giving.referenceNotRegistered': 'Not registered',
        'giving.lblMessage': 'Message',
        'giving.lblCurrency': 'Currency',
        'giving.chartTrendsTitle': 'Giving Trends Over Time',
        'giving.chartMethodsTitle': 'Distribution by Payment Method',
        'giving.chartNok': 'Amount (NOK)',

        // Courses
        'courses.noCoursesYet': 'No courses yet',
        'courses.noCoursesSub': 'Teaching and course content from HKM will appear here.',
        'courses.watchVideo': 'Watch video',
        'courses.untitled': 'Untitled',

        // Notes
        'notes.myNotes': 'My notes',
        'notes.personalNotesSub': 'Personal notes that only you can see',
        'notes.newNote': 'New note',
        'notes.title': 'Title',
        'notes.titlePlaceholder': 'Give the note a title...',
        'notes.content': 'Content',
        'notes.contentPlaceholder': 'Write note here...',
        'notes.cancel': 'Cancel',
        'notes.saveNote': 'Save note',
        'notes.emptyPersonalNotes': 'You have no personal notes yet.<br>Press "New note" to begin.',
        'notes.hkmNotes': 'Notes from HKM',
        'notes.deleteConfirm': 'Are you sure you want to delete this note?',
        'notes.saving': 'Saving...',
        'notes.saveError': 'Error saving',
        'notes.error': 'Error',
        'notes.updateError': 'Error updating',
        'notes.editNote': 'Edit note',
        'notes.save': 'Save',
        'notes.untitled': 'Untitled',
        'notes.hkmTeam': 'HKM Team',
        'notes.toolBold': 'Bold',
        'notes.toolItalic': 'Italic',
        'notes.toolUnderline': 'Underline',
        'notes.toolHeader': 'Heading',
        'notes.toolParagraph': 'Paragraph',
        'notes.toolBulletList': 'Bullet List',
        'notes.toolOrderedList': 'Numbered List',
        'notes.toolClear': 'Clear Formatting',

        // Delete Account
        'deleteAccount.modalTitle': 'Delete Account?',
        'deleteAccount.modalMessage': 'This will permanently delete your account and all associated data. This action cannot be undone. You will be asked to confirm your identity.',
        'deleteAccount.deleteBtn': 'Delete Account',
        'deleteAccount.cancelBtn': 'Cancel',
        'deleteAccount.doubleConfirm': 'ARE YOU ABSOLUTELY SURE? This will permanently delete all your data and your user profile. This action is 100% permanent and cannot be undone.',
        'deleteAccount.reauthRequest': 'Please log in again to confirm deletion.',
        
        // Prayer Wall
        'prayer.title': 'Prayer Wall',
        'prayer.disabledTitle': 'Deactivated',
        'prayer.disabledMsg': 'The Prayer Wall is currently deactivated.',
        'prayer.subtitle': 'Bear one another\'s burdens, and so fulfill the law of Christ.',
        'prayer.btnWrite': 'Share Prayer Request',
        'prayer.anonymous': 'Anonymous sister/brother',
        'prayer.member': 'Member',
        'prayer.praysForThis': '{n} praying for this',
        'prayer.hasPrayed': 'I have prayed 🙏',
        'prayer.pray': 'I pray 🙏',
        'prayer.emptyTitle': 'No prayer requests yet',
        'prayer.emptyDesc': 'Be the first to share a prayer request on the wall.',
        'prayer.modalTitle': 'Share a Prayer Request',
        'prayer.modalLabel': 'What can we pray for?',
        'prayer.modalPlaceholder': 'Write your prayer request here...',
        'prayer.modalAnon': 'Post anonymously',
        'prayer.modalPost': 'Post to Prayer Wall',
        'prayer.errEmpty': 'Prayer request cannot be empty.',
        'prayer.posting': 'Posting...',
        'prayer.errSave': 'Could not save prayer request: ',
        'prayer.confirmDelete': 'Are you sure you want to delete this prayer request?',
        'prayer.errDelete': 'Error during deletion: ',
        'prayer.errNotFound': 'Prayer request not found.',
        'prayer.errFetchEdit': 'Could not retrieve prayer request for editing: ',
        'prayer.editModalTitle': 'Edit Prayer Request',
        'prayer.editModalSave': 'Save Changes',
        'prayer.editModalSaving': 'Saving...',
        'prayer.errUpdate': 'Could not update prayer request: ',
        'prayer.disabledTitle': 'Prayer Wall is disabled',
        'prayer.disabledMsg': 'The prayer wall is currently not available.'
    },
    es: {
        'common.loading': 'Cargando',
        'common.initError': 'Error de inicio',
        'common.errorOccurred': 'Algo salió mal',
        'common.save': 'Guardar',
        'common.cancel': 'Cancelar',
        'common.edit': 'Editar',
        'common.back': 'Volver',
        'common.saving': 'Guardando...',
        'common.saved': 'Guardado ✓',
        'common.saveError': 'Error al guardar',
        'common.search': 'Buscando...',
        'common.searchError': 'No se pudieron obtener sugerencias.',
        'common.noResults': 'Sin coincidencias.',
        
        // Sidebar & Header Static (also used statically in DOM)
        'sidebar.title': 'Mi página',
        'sidebar.seNettside': 'Ver Sitio Web',
        'sidebar.oversikt': 'Resumen',
        'sidebar.mittMedlemskap': 'MI MEMBRESÍA',
        'sidebar.profil': 'Perfil',
        'sidebar.kurs': 'Cursos',
        'sidebar.readingPlans': 'Planes de Lectura',
        'sidebar.gaver': 'Ofrendas',
        'sidebar.aktivitet': 'ACTIVIDAD',
        'sidebar.varslinger': 'Notificaciones',
        'sidebar.logg': 'Historial',
        'sidebar.notater': 'Notas',
        'sidebar.prayerWall': 'Muro de Oración',
        'sidebar.admin': 'Administración',
        'sidebar.loggut': 'Cerrar Sesión',
        'header.oversikt': 'Resumen',
        'header.subtitle': 'Mi Página | His Kingdom Ministry',
        'header.roleMedlem': 'Miembro',
        'header.backToAdmin': 'Volver a Admin',
        'header.toHkm': 'A HKM.no',
        'header.logout': 'Cerrar Sesión',
        
        // Roles
        'role.superadmin': 'Administrador',
        'role.admin': 'Administrador',
        'role.pastor': 'Pastor',
        'role.leader': 'Líder',
        'role.volunteer': 'Voluntario',
        'role.donor': 'Donante Regular',
        'role.member': 'Miembro',
        'role.fallbackUser': 'Usuario',

        // Time ago
        'time.justNow': 'Justo ahora',
        'time.minutesAgo': 'hace {n} min',
        'time.hoursAgo': 'hace {n} h',
        'time.daysAgo': 'hace {n} d',

        // View names
        'view.overview': 'Resumen',
        'view.profile': 'Mi Perfil',
        'view.activity': 'Actividad',
        'view.notifications': 'Notificaciones',
        'view.giving': 'Ofrendas',
        'view.courses': 'Cursos',
        'view.readingPlans': 'Planes de Lectura',
        'overview.btnReadingPlansLabel': 'Planes de Lectura',
        'view.notes': 'Notas',
        'view.prayerWall': 'Muro de Oración',

        // Overview
        'overview.goodMorning': 'Buen día',
        'overview.hello': 'Hola',
        'overview.goodEvening': 'Buenas noches',
        'overview.quote': '"Porque yo sé los pensamientos que tengo acerca de vosotros, dice Jehová... — Jer 29:11',
        'overview.memberSince': 'Miembro desde',
        'overview.unreadNotifications': 'Notificaciones no leídas',
        'overview.clickToViewAll': 'Haz clic para ver todas',
        'overview.totalGiven': 'Total ofrendado en',
        'overview.seeGivingHistory': 'Ver historial de ofrendas',
        'overview.availableCourses': 'Cursos disponibles',
        'overview.teachingFromHkm': 'Enseñanza de HKM',
        'overview.quickLinks': 'Enlaces rápidos',
        'overview.btnProfileLabel': 'Mi Perfil',
        'overview.btnProfileSub': 'Contacto e info personal',
        'overview.btnGivingLabel': 'Ofrendas',
        'overview.btnGivingSub': 'Historial de ofrendas',
        'overview.btnCoursesLabel': 'Cursos',
        'overview.btnCoursesSub': 'Enseñanza de HKM',
        'overview.btnNotificationsLabel': 'Notificaciones',
        'overview.btnNotificationsSub': 'Mensajes de HKM',
        'overview.recentNotifications': 'Últimas notificaciones',
        'overview.seeAll': 'Ver todas',
        'overview.noNotificationsYet': 'No hay notificaciones aún.',
        'overview.showAllNotifications': 'Mostrar todas las notificaciones',
        'overview.givingNone': 'Ninguna',
        'overview.myProgress': 'Mi progreso',
        'overview.continue': 'Continuar',
        'overview.upcomingEvents': 'Próximos eventos',
        'overview.upcomingEventsSub': 'Únete a la comunión y reuniones en el calendario',
        'overview.latestPrayer': 'Último del Muro de Oración',
        'overview.latestPrayerSub': 'Sobrellevad los unos las cargas de los otros',
        'overview.goToPrayerWall': 'Ir al Muro de Oración',
        'overview.noEvents': 'No hay eventos programados en este momento.',
        'overview.noPrayersYet': 'No hay peticiones de oración aún. Sé el primero en publicar una petición.',
        'overview.prayedCountText': '{n} orando',

        // Profile
        'profile.contactInfo': 'Información de Contacto',
        'profile.fullName': 'Nombre Completo',
        'profile.email': 'Correo electrónico',
        'profile.phone': 'Teléfono',
        'profile.phonePlaceholder': 'Número de teléfono',
        'profile.address': 'Dirección',
        'profile.addressSearchPlaceholder': 'Buscar dirección en todo el mundo',
        'profile.searchingAddresses': 'Buscando direcciones...',
        'profile.noAddressSuggestions': 'No hay sugerencias de dirección.',
        'profile.couldNotFetchAddresses': 'No se pudieron obtener sugerencias.',
        'profile.addressSelected': 'Dirección seleccionada.',
        'profile.selectedCountry': 'Seleccionado: {country}',
        'profile.zipPlaceholder': 'Código Postal',
        'profile.cityPlaceholder': 'Ciudad',
        'profile.countryPlaceholder': 'País',
        'profile.personalInfo': 'Información Personal',
        'profile.gender': 'Género',
        'profile.select': 'Seleccionar...',
        'profile.genderMale': 'Hombre',
        'profile.genderFemale': 'Mujer',
        'profile.genderOther': 'Otro',
        'profile.birthday': 'Fecha de nacimiento',
        'profile.maritalStatus': 'Estado civil',
        'profile.maritalSingle': 'Soltero',
        'profile.maritalMarried': 'Casado',
        'profile.maritalPartner': 'Pareja de hecho',
        'profile.maritalDivorced': 'Divorciado',
        'profile.maritalWidowed': 'Viudo',
        'profile.memberSince': 'Miembro desde',
        'profile.accountAdmin': 'Administración de la Cuenta',
        'profile.deleteAccountNotice': 'La eliminación de la cuenta es permanente y no se puede deshacer.',
        'profile.deleteAccountBtn': 'Eliminar cuenta',
        'profile.family': 'Familia',
        'profile.familySearchPlaceholder': 'Buscar por nombre, correo o teléfono',
        'profile.searching': 'Buscando...',
        'profile.noMatches': 'Sin coincidencias.',
        'profile.searchUnavailable': 'La búsqueda no está disponible ahora.',
        'profile.couldNotSearch': 'No se pudo buscar en este momento.',
        'profile.household': 'Hogar',
        'profile.noFamilyRegistered': 'No hay miembros de la familia registrados.',
        'profile.familyMemberRole': 'Miembro de la familia',
        'profile.notificationPreferences': 'Preferencias de Notificación',
        'profile.pushNotifications': 'Notificaciones Push',
        'profile.pushNotificationsSub': 'Recibir notificaciones cuando HKM envíe mensajes',
        'profile.pushTeachings': 'Nueva Enseñanza',
        'profile.pushTeachingsSub': 'Recibe un aviso cuando se publique una nueva enseñanza',
        'profile.pushPodcasts': 'Nuevo Podcast',
        'profile.pushPodcastsSub': 'Recibe un aviso cuando haya un nuevo episodio de podcast',
        'profile.pushBlogs': 'Nueva Entrada de Blog',
        'profile.pushBlogsSub': 'Recibe un aviso cuando se publique una nueva entrada de blog',
        'profile.pushReadingPlans': 'Planes de Lectura y Biblia',
        'profile.pushReadingPlansSub': 'Recibe recordatorios diarios y avisos para tus planes de lectura',
        'profile.emailNotifications': 'Notificaciones por Correo',
        'profile.emailNotificationsSub': 'Recibir boletines y actualizaciones',
        'profile.emailReadingPlans': 'Actualizaciones Diarias del Plan de Lectura',
        'profile.emailReadingPlansSub': 'Recibe la lectura bíblica y el devocional de hoy por correo electrónico',
        'profile.notificationTime': 'Hora de notificación',
        'profile.notificationTimeSub': 'Elige la hora en la que deseas recibir correos y notificaciones push',
        'profile.savePreferences': 'Guardar preferencias',

        // Activity
        'activity.noActivityYet': 'Sin actividad aún',
        'activity.noActivitySub': 'La actividad, como las notificaciones push y los mensajes que recibas, aparecerá aquí.',
        'activity.loadErrorNotice': 'No se pudo cargar la actividad ahora mismo.',
        'activity.loadErrorCopy': 'No se pudo cargar la actividad.',

        // Notifications
        'notifications.title': 'Notificaciones',
        'notifications.markAllRead': 'Marcar todas como leídas',
        'notifications.filterAll': 'Todas',
        'notifications.filterUnread': 'No leídas',
        'notifications.filterPush': 'Push',
        'notifications.filterMessage': 'Mensajes',
        'notifications.noNotifications': 'Sin notificaciones',
        'notifications.noNotificationsSub': 'No tienes notificaciones todavía.',
        'notifications.loadErrorNotice': 'No se pudieron cargar las notificaciones ahora.',
        'notifications.loadErrorCopy': 'No se pudieron cargar las notificaciones.',
        'notifications.deleting': 'Eliminando...',
        'notifications.alert': 'Notificación',
        'notifications.openLink': 'Abrir enlace',
        'notifications.deleteAlert': 'Eliminar notificación',
        'notifications.deleteConfirm': '¿Estás seguro de que deseas eliminar esta notificación?',
        'notifications.deleteError': 'No se pudo eliminar la notificación',

        // Giving
        'giving.totalGiftsCount': 'Número total de ofrendas',
        'giving.lastGift': 'Última ofrenda',
        'giving.givenInYear': 'Ofrendado en {year}',
        'giving.givingHistory': 'Historial de Ofrendas',
        'giving.noGiftsYet': 'No hay ofrendas aún',
        'giving.noGiftsSub': 'Tus donaciones a HKM aparecerán aquí.',
        'giving.colDate': 'Fecha',
        'giving.colType': 'Tipo',
        'giving.colMethod': 'Método',
        'giving.colAmount': 'Monto',
        'giving.typeGift': 'Ofrenda',
        'giving.statusCompleted': 'Completado',
        'giving.statusPending': 'Pendiente',
        'giving.statusProcessing': 'Procesando',
        'giving.statusFailed': 'Fallido',
        'giving.statusCanceled': 'Cancelado',
        'giving.statusUnknown': 'Desconocido',
        'giving.methodCard': 'Tarjeta',
        'giving.methodStripe': 'Stripe',
        'giving.methodVipps': 'Vipps',
        'giving.methodBank': 'Banco',
        'giving.methodManual': 'Manual',
        'giving.methodCash': 'Efectivo',
        'giving.methodUnknown': 'Desconocido',
        'giving.detailsTitle': 'Detalles de la Ofrenda',
        'giving.lblAmount': 'Monto',
        'giving.lblDate': 'Fecha',
        'giving.lblPaidWith': 'Pagado con',
        'giving.lblStatus': 'Estado',
        'giving.lblType': 'Tipo',
        'giving.lblReference': 'Referencia',
        'giving.referenceNotRegistered': 'No registrado',
        'giving.lblMessage': 'Mensaje',
        'giving.lblCurrency': 'Moneda',
        'giving.chartTrendsTitle': 'Historial de donaciones',
        'giving.chartMethodsTitle': 'Distribución por método de pago',
        'giving.chartNok': 'Monto (NOK)',

        // Courses
        'courses.noCoursesYet': 'No hay cursos aún',
        'courses.noCoursesSub': 'El contenido de enseñanza y cursos de HKM aparecerá aquí.',
        'courses.watchVideo': 'Ver video',
        'courses.untitled': 'Sin título',

        // Notes
        'notes.myNotes': 'Mis notas',
        'notes.personalNotesSub': 'Notas personales que solo tú puedes ver',
        'notes.newNote': 'Nueva nota',
        'notes.title': 'Título',
        'notes.titlePlaceholder': 'Dale un título a la nota...',
        'notes.content': 'Contenido',
        'notes.contentPlaceholder': 'Escribe la nota aquí...',
        'notes.cancel': 'Cancelar',
        'notes.saveNote': 'Guardar nota',
        'notes.emptyPersonalNotes': 'No tienes notas personales todavía.<br>Presiona "Nueva nota" para comenzar.',
        'notes.hkmNotes': 'Notas de HKM',
        'notes.deleteConfirm': '¿Estás seguro de que deseas eliminar esta nota?',
        'notes.saving': 'Guardando...',
        'notes.saveError': 'Error al guardar',
        'notes.error': 'Error',
        'notes.updateError': 'Error al actualizar',
        'notes.editNote': 'Editar nota',
        'notes.save': 'Guardar',
        'notes.untitled': 'Sin título',
        'notes.hkmTeam': 'Equipo HKM',
        'notes.toolBold': 'Negrita',
        'notes.toolItalic': 'Cursiva',
        'notes.toolUnderline': 'Subrayado',
        'notes.toolHeader': 'Título',
        'notes.toolParagraph': 'Párrafo',
        'notes.toolBulletList': 'Viñetas',
        'notes.toolOrderedList': 'Lista numerada',
        'notes.toolClear': 'Limpiar Formato',

        // Delete Account
        'deleteAccount.modalTitle': '¿Eliminar cuenta?',
        'deleteAccount.modalMessage': 'Esto eliminará permanentemente tu cuenta y todos los datos asociados. Esta acción no se puede deshacer. Se te pedirá que confirmes tu identidad.',
        'deleteAccount.deleteBtn': 'Eliminar cuenta',
        'deleteAccount.cancelBtn': 'Cancelar',
        'deleteAccount.doubleConfirm': '¿ESTÁS ABSOLUTAMENTE SEGURO? Esto eliminará permanentemente todos tus datos y tu perfil de usuario. Esta acción es 100% permanente y no se puede deshacer.',
        'deleteAccount.reauthRequest': 'Por favor, inicia sesión de nuevo para confirmar la eliminación.',
        
        // Prayer Wall
        'prayer.title': 'Muro de Oración',
        'prayer.disabledTitle': 'Desactivado',
        'prayer.disabledMsg': 'El Muro de Oración está actualmente desactivado.',
        'prayer.subtitle': 'Sobrellevad los unos las cargas de los otros, y cumplid así la ley de Cristo.',
        'prayer.btnWrite': 'Escribir Petición',
        'prayer.anonymous': 'Hermana/hermano anónimo',
        'prayer.member': 'Miembro',
        'prayer.praysForThis': '{n} orando por esto',
        'prayer.hasPrayed': 'He orado 🙏',
        'prayer.pray': 'Yo oro 🙏',
        'prayer.emptyTitle': 'No hay peticiones de oración aún',
        'prayer.emptyDesc': 'Sé el primero en publicar una petición de oración en el muro.',
        'prayer.modalTitle': 'Escribir petición de oración',
        'prayer.modalLabel': '¿Por qué podemos orar?',
        'prayer.modalPlaceholder': 'Escribe tu petición de oración aquí...',
        'prayer.modalAnon': 'Publicar anónimamente',
        'prayer.modalPost': 'Publicar en el muro',
        'prayer.errEmpty': 'La petición de oración no puede estar vacía.',
        'prayer.posting': 'Publicando...',
        'prayer.errSave': 'No se pudo guardar la petición de oración: ',
        'prayer.confirmDelete': '¿Estás seguro de que quieres eliminar esta petición de oración?',
        'prayer.errDelete': 'Error durante la eliminación: ',
        'prayer.errNotFound': 'La petición de oración no existe.',
        'prayer.errFetchEdit': 'No se pudo recuperar la petición de oración para editar: ',
        'prayer.editModalTitle': 'Editar petición de oración',
        'prayer.editModalSave': 'Guardar cambios',
        'prayer.editModalSaving': 'Guardando...',
        'prayer.errUpdate': 'No se pudo actualizar la petición de oración: ',
        'prayer.disabledTitle': 'El Muro de Oración está desactivado',
        'prayer.disabledMsg': 'El muro de oración no está disponible actualmente.'
    }
};

// Translation Helper
function t(key, vars = {}) {
    const lang = document.documentElement.lang || 'no';
    let text = minsideTranslations[lang]?.[key] || minsideTranslations['no']?.[key] || key;
    Object.entries(vars).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, v);
    });
    return text;
}

// Static DOM Translation Utility
function translateStaticHTML() {
    const lang = document.documentElement.lang || 'no';
    
    // Elements with data-i18n
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const translated = minsideTranslations[lang]?.[key] || minsideTranslations['no']?.[key];
        if (translated) {
            el.textContent = translated;
        }
    });

    // Inputs with data-i18n-placeholder
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        const translated = minsideTranslations[lang]?.[key] || minsideTranslations['no']?.[key];
        if (translated) {
            el.setAttribute('placeholder', translated);
        }
    });
}

const BIBLE_BOOKS = {
    no: [
        "1. Mosebok", "2. Mosebok", "3. Mosebok", "4. Mosebok", "5. Mosebok",
        "Josva", "Dommerne", "Rut", "1. Samuelsbok", "2. Samuelsbok",
        "1. Kongebok", "2. Kongebok", "1. Krønikebok", "2. Krønikebok", "Esra",
        "Nehemja", "Ester", "Job", "Salmene", "Ordspråkene",
        "Forkynneren", "Høysangen", "Jesaja", "Jeremia", "Klagesangene",
        "Esekiel", "Daniel", "Hosea", "Joel", "Amos",
        "Obadja", "Jona", "Mika", "Nahum", "Habakkuk",
        "Sefanja", "Haggai", "Sakarja", "Malaki", "Matteus",
        "Markus", "Lukas", "Johannes", "Apostlenes gjerninger", "Romerne",
        "1. Korinterne", "2. Korinterne", "Galaterne", "Efeserne", "Filipperne",
        "Kolosserne", "1. Tessalonikerne", "2. Tessalonikerne", "1. Timoteus", "2. Timoteus",
        "Titus", "Filemon", "Hebreerne", "Jakob", "1. Peter",
        "2. Peter", "1. Johannes", "2. Johannes", "3. Johannes", "Judas",
        "Åpenbaringen"
    ],
    en: [
        "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy",
        "Joshua", "Judges", "Ruth", "1 Samuel", "2 Samuel",
        "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles", "Ezra",
        "Nehemiah", "Esther", "Job", "Psalms", "Proverbs",
        "Ecclesiastes", "Song of Solomon", "Isaiah", "Jeremiah", "Lamentations",
        "Ezekiel", "Daniel", "Hosea", "Joel", "Amos",
        "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk",
        "Zephaniah", "Haggai", "Zechariah", "Malachi", "Matthew",
        "Mark", "Luke", "John", "Acts", "Romans",
        "1 Corinthians", "2 Corinthians", "Galatians", "Ephesians", "Philippians",
        "Colossians", "1 Thessalonians", "2 Thessalonians", "1 Timothy", "2 Timothy",
        "Titus", "Philemon", "Hebrews", "James", "1 Peter",
        "2 Peter", "1 John", "2 John", "3 John", "Judas",
        "Revelation"
    ],
    es: [
        "Génesis", "Éxodo", "Levítico", "Números", "Deuteronomio",
        "Josué", "Jueces", "Rut", "1 Samuel", "2 Samuel",
        "1 Reyes", "2 Reyes", "1 Crónicas", "2 Crónicas", "Esdras",
        "Nehemías", "Ester", "Job", "Salmos", "Proverbios",
        "Eclesiastés", "Cantares", "Isaías", "Jeremías", "Lamentaciones",
        "Ezequiel", "Daniel", "Oseas", "Joel", "Amós",
        "Abdías", "Jonás", "Miqueas", "Nahúm", "Habacuc",
        "Sofonías", "Hageo", "Zacarías", "Malaquías", "Mateo",
        "Marcos", "Lucas", "Juan", "Hechos", "Romanos",
        "1 Corintios", "2 Corintios", "Gálatas", "Efesios", "Filipenses",
        "Colosenses", "1 Tesalonicenses", "2 Tesalonicenses", "1 Timoteo", "2 Timoteo",
        "Tito", "Filemón", "Hebreos", "Santiago", "1 Pedro",
        "2 Pedro", "1 Juan", "2 Juan", "3 Juan", "Judas",
        "Apocalipsis"
    ]
};

function isBibleReference(query) {
    const q = query.trim();
    // Matcher f.eks. "Johannes 3:16", "Joh 3", "1. Mosebok 1:1", "1 Sam 3:4", "Matteus 6:9-13"
    const pattern = /^(?:[1-5]\.?\s*)?[a-zA-ZæøåÆØÅáéíóúñÁÉÍÓÚÑ\s]{3,}\s+\d+(?:\s*[\:\.\s,\-]\s*\d+)*$/i;
    return pattern.test(q);
}

class MinSideManager {
    constructor() {
        this.currentUser = null;
        this.profileData = {};
        this.prayerWallEnabled = false;

        this.views = {
            overview: this.renderOverview,
            profile: this.renderProfile,
            notifications: this.renderNotifications,
            giving: this.renderGiving,
            courses: this.renderCourses,
            notes: this.renderNotes,
            'reading-plans': this.renderReadingPlans,
            'prayer-wall': this.renderPrayerWall,
            'course-player': this.renderCoursePlayer,
        };


        // Run initial translation on static elements (sidebar, headers)
        translateStaticHTML();
        this.setupThemeToggle();
        this.init();
    }

    // ──────────────────────────────────────────────────────────
    // INIT
    // ──────────────────────────────────────────────────────────
    async init() {
        this.setupNavigation();

        if (typeof firebase === 'undefined') {
            console.error("Firebase SDK is not loaded!");
            const area = document.getElementById('view-container') || document.getElementById('content-area');
            if (area) {
                area.innerHTML = `
                    <div style="padding: 40px; text-align: center; color: #1b4965; max-width: 500px; margin: 40px auto; background: white; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
                        <span class="material-symbols-outlined" style="font-size: 48px; color: #d17d39; margin-bottom: 16px;">wifi_off</span>
                        <h3 style="font-weight: 700; margin: 0 0 8px 0; color: #1b4965;">Tilkoblingsfeil (Safari)</h3>
                        <p style="font-size: 14px; color: #64748b; line-height: 1.5; margin: 0;">Kunne ikke laste inn systemets kjernekomponenter. Vennligst sjekk at du ikke har en innholdsblokkering eller sporingssperre aktivert i Safari som forhindrer lasting av Firebase, og prøv å oppdatere siden.</p>
                    </div>
                `;
            }
            return;
        }

        // Wait for Firebase to be ready with a small timeout
        let count = 0;
        while ((!window.firebaseService || !window.firebaseService.isInitialized) && count < 100) {
            await new Promise(r => setTimeout(r, 50));
            count++;
        }

        firebase.auth().onAuthStateChanged(async (user) => {
            try {
                if (user) {
                    this.currentUser = user;

                    // Load features config
                    let prayerWallEnabled = false;
                    try {
                        const featuresDoc = await withTimeout(
                            firebase.firestore().collection('content').doc('settings_features').get(),
                            3000
                        );
                        if (featuresDoc && featuresDoc.exists) {
                            prayerWallEnabled = !!featuresDoc.data().prayerWallEnabled;
                        }
                    } catch (err) {
                        console.error("Error loading features config:", err);
                    }
                    this.prayerWallEnabled = prayerWallEnabled;

                    // Apply visibility on navigation links
                    document.querySelectorAll('[data-view="prayer-wall"]').forEach(el => {
                        if (prayerWallEnabled) {
                            el.style.display = '';
                            const li = el.closest('.nav-item');
                            if (li) li.style.display = '';
                        } else {
                            el.style.display = 'none';
                            const li = el.closest('.nav-item');
                            if (li) li.style.display = 'none';
                        }
                    });

                    await this.syncUserProfile(user);
                    await this.syncProfileFromGoogleProvider();
                    this.profileData = await this.getMergedProfile(user);
                    await this.refreshProfileSubCollections(user.uid);
                    if (typeof this.updateHeader === 'function') this.updateHeader();
                    if (typeof this.initNotificationBadge === 'function') this.initNotificationBadge();
                    if (typeof this.showPendingFlashNotice === 'function') this.showPendingFlashNotice();

                    // Translate immediately on auth state change
                    if (typeof translateStaticHTML === 'function') translateStaticHTML();

                    // Initialize Global Search Overlay
                    if (typeof this.initGlobalSearch === 'function') this.initGlobalSearch();

                    // Apply bottom navigation settings (user custom first, then admin default)
                    try {
                        if (this.profileData && Array.isArray(this.profileData.customBottomNav) && this.profileData.customBottomNav.length > 0) {
                            localStorage.setItem('hkm_user_custom_nav', JSON.stringify(this.profileData.customBottomNav));
                            this.applyBottomNavSettings(this.profileData.customBottomNav);
                        } else {
                            localStorage.removeItem('hkm_user_custom_nav');
                            if (window.firebaseService && typeof window.firebaseService.getPageContent === 'function') {
                                const designSettings = await window.firebaseService.getPageContent('settings_design');
                                if (designSettings && Array.isArray(designSettings.minsideBottomNav)) {
                                    const cached = localStorage.getItem('hkm_cache_settings_design');
                                    let designObj = cached ? JSON.parse(cached) : {};
                                    designObj.minsideBottomNav = designSettings.minsideBottomNav;
                                    localStorage.setItem('hkm_cache_settings_design', JSON.stringify(designObj));

                                    this.applyBottomNavSettings(designSettings.minsideBottomNav);
                                }
                            }
                        }
                    } catch (e) {
                        console.warn("Failed to load design settings for bottom nav:", e);
                    }

                    const startView = window.location.hash.replace('#', '') || 'overview';
                    this.loadView(startView);

                    window?.addEventListener('hashchange', () => {
                        const hash = window.location.hash.replace('#', '') || 'overview';
                        if (this.lastLoadedHash === window.location.hash) return;
                        this.loadView(hash);
                    });
                } else {
                    window.location.href = '/minside/login.html';
                }
            } catch (error) {
                console.error('Init Error:', error);
                const area = document.getElementById('view-container') || document.getElementById('content-area');
                if (area) {
                    area.innerHTML = `<div class="empty-state"><span class="material-symbols-outlined">error</span><h3>${t('common.initError')}</h3><p>${error.message}</p></div>`;
                }
            }
        });
    }

    // ──────────────────────────────────────────────────────────
    // NAVIGATION
    // ──────────────────────────────────────────────────────────
    setupNavigation() {
        document.querySelectorAll('.nav-link[data-view], .mobile-nav-item[data-view], .logo[data-view]').forEach(link => {
            link?.addEventListener('click', e => {
                e.preventDefault();
                this.loadView(link.dataset.view);
                if (window.innerWidth <= 1024) this.toggleSidebar(false);
            });
        });

        document.getElementById('mobile-toggle')?.addEventListener('click', (e) => {
            e.stopPropagation();
            if (window.innerWidth > 1024) {
                document.body.classList.toggle('sidebar-collapsed');
            } else {
                this.toggleSidebar(true);
            }
        });
        document.getElementById('sidebar-overlay')?.addEventListener('click', () => this.toggleSidebar(false));

        document.getElementById('logout-btn')?.addEventListener('click', () => {
            firebase.auth().signOut().then(() => window.location.href = '/');
        });
        document.getElementById('sidebar-logout-btn')?.addEventListener('click', () => {
            firebase.auth().signOut().then(() => window.location.href = '/');
        });

        // Actions dropdown
        const actionsBtn = document.getElementById('actions-btn');
        const actionsMenu = document.getElementById('actions-menu');
        actionsBtn?.addEventListener('click', e => {
            e.stopPropagation();
            actionsMenu.classList.toggle('open');
        });
        document?.addEventListener('click', () => actionsMenu?.classList.remove('open'));

        // Profile photo upload
        document.getElementById('ph-upload')?.addEventListener('change', e => this.handlePhotoUpload(e));

        // Collapsible course accordion event delegation
        document?.addEventListener('click', e => {
            const header = e.target.closest('.course-lessons-accordion .accordion-header');
            if (header) {
                const accordion = header.closest('.course-lessons-accordion');
                const courseId = header.getAttribute('data-course-id');
                const body = document.getElementById(`lessons-body-${courseId}`);
                if (body && accordion) {
                    const isCollapsed = accordion.classList.contains('collapsed');
                    if (isCollapsed) {
                        accordion.classList.remove('collapsed');
                        body.style.setProperty('display', 'flex', 'important');
                    } else {
                        accordion.classList.add('collapsed');
                        body.style.setProperty('display', 'none', 'important');
                    }
                }
            }
        });
    }

    toggleSidebar(show) {
        document.getElementById('sidebar')?.classList.toggle('active', show);
        document.getElementById('sidebar-overlay')?.classList.toggle('active', show);
    }

    setupThemeToggle() {
        const toggleBtn = document.getElementById('theme-toggle-btn');
        if (!toggleBtn) return;

        // Set initial icon based on active theme
        const updateIcon = () => {
            const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
            const iconEl = toggleBtn.querySelector('.material-symbols-outlined');
            if (iconEl) {
                iconEl.textContent = currentTheme === 'dark' ? 'light_mode' : 'dark_mode';
            }
        };

        updateIcon();

        toggleBtn?.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('hkm_theme', newTheme);
            updateIcon();
        });
    }

    async syncUserProfile(user) {
        if (!user) return;
        try {
            const googleProvider = (user.providerData || []).find(p => p.providerId === 'google.com');
            const userRef = firebaseService.db.collection('users').doc(user.uid);
            const userDoc = await userRef.get();
            const userData = {
                email: user.email || '',
                displayName: user.displayName || googleProvider?.displayName || user.email || '',
                photoURL: user.photoURL || googleProvider?.photoURL || '',
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            if (!userDoc.exists) {
                userData.role = 'medlem';
                userData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                await userRef.set(userData);
            } else {
                const docData = userDoc.data();
                if (!docData.createdAt) {
                    userData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                }
                await userRef.update(userData);
            }
        } catch (e) {
            console.warn('syncUserProfile warning:', e);
        }
    }

    async syncProfileFromGoogleProvider() {
        try {
            const user = firebase.auth().currentUser;
            if (!user) return;
            const googleProvider = (user.providerData || []).find(p => p.providerId === 'google.com');
            if (googleProvider) {
                const updates = {};
                if (googleProvider.displayName && !user.displayName) updates.displayName = googleProvider.displayName;
                if (googleProvider.photoURL && !user.photoURL) updates.photoURL = googleProvider.photoURL;
                if (Object.keys(updates).length > 0) {
                    await user.updateProfile(updates);
                }
            }
        } catch (e) {
            console.warn('syncProfileFromGoogleProvider warning:', e);
        }
    }

    async getMergedProfile(user) {
        if (!user) return {};
        try {
            const doc = await firebaseService.db.collection('users').doc(user.uid).get();
            const dbData = doc.exists ? doc.data() : {};
            return {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName || dbData.displayName || user.email,
                photoURL: user.photoURL || dbData.photoURL || '',
                role: dbData.role || 'medlem',
                ...dbData
            };
        } catch (e) {
            console.warn('getMergedProfile warning:', e);
            return {
                uid: user?.uid,
                email: user?.email,
                displayName: user?.displayName || user?.email || '',
                photoURL: user?.photoURL || ''
            };
        }
    }

    updateHeader() {
        if (!this.currentUser) return;
        const nameEl = document.getElementById('user-display-name') || document.getElementById('header-user-name');
        if (nameEl) {
            nameEl.textContent = (this.profileData && (this.profileData.displayName || this.profileData.name)) || this.currentUser.displayName || this.currentUser.email || 'Medlem';
        }
        const avatarEl = document.getElementById('user-avatar') || document.getElementById('header-user-avatar');
        if (avatarEl && (this.profileData?.photoURL || this.currentUser.photoURL)) {
            avatarEl.src = this.profileData?.photoURL || this.currentUser.photoURL;
        }
    }

    initNotificationBadge() {
        try {
            const badge = document.getElementById('notification-badge');
            if (badge) badge.classList.add('hidden');
        } catch (e) {
            console.warn('initNotificationBadge warning:', e);
        }
    }

    showPendingFlashNotice() {
        try {
            const notice = document.getElementById('flash-notice');
            if (notice) notice.classList.add('hidden');
        } catch (e) {
            console.warn('showPendingFlashNotice warning:', e);
        }
    }

    initGlobalSearch() {
        try {
            // Placeholder for global search
        } catch (e) {
            console.warn('initGlobalSearch warning:', e);
        }
    }

    async refreshProfileSubCollections(uid) {
        if (!uid) return;
        try {
            // Placeholder for subcollections refresh
        } catch (e) {
            console.warn('refreshProfileSubCollections warning:', e);
        }
    }

    // Dynamic Language Switching Routine
    handleLanguageChange(lang) {
        document.documentElement.lang = lang;
        translateStaticHTML();
        if (typeof this.updateHeader === 'function') this.updateHeader();
        
        // Reload current view with translated strings
        const currentView = window.location.hash.replace('#', '') || 'overview';
        this.loadView(currentView);
    }

    loadView(viewId, viewArgs = null) {
        let cleanViewId = viewId;
        let queryParams = {};
        
        // Support hash path parsing (e.g. viewId = "course-player?courseId=xyz&lessonId=123")
        if (viewId && viewId.includes('?')) {
            const parts = viewId.split('?');
            cleanViewId = parts[0];
            const urlParams = new URLSearchParams(parts[1]);
            for (const [k, v] of urlParams.entries()) {
                queryParams[k] = v;
            }
        }
        
        // If args are passed programmatically, merge them
        if (viewArgs) {
            queryParams = { ...queryParams, ...viewArgs };
        }
        
        this.currentViewArgs = queryParams;
        
        if (cleanViewId === 'prayer-wall' && !this.prayerWallEnabled) {
            cleanViewId = 'overview';
        }
        if (!this.views[cleanViewId]) cleanViewId = 'overview';
        
        // Re-construct the hash with query params if any exist
        let hashString = cleanViewId;
        if (Object.keys(queryParams).length > 0) {
            const queryStr = new URLSearchParams(queryParams).toString();
            hashString += `?${queryStr}`;
        }
        
        this.lastLoadedHash = '#' + hashString;
        window.location.hash = hashString;

        // View info mapping for header (Dynamic)
        const viewInfo = {
            overview: { title: t('view.overview'), icon: 'grid_view' },
            profile: { title: t('view.profile'), icon: 'person' },
            activity: { title: t('view.activity'), icon: 'history' },
            notifications: { title: t('view.notifications'), icon: 'notifications' },
            giving: { title: t('view.giving'), icon: 'volunteer_activism' },
            courses: { title: t('view.courses'), icon: 'school' },
            notes: { title: t('view.notes'), icon: 'notes' },
            'reading-plans': { title: t('view.readingPlans'), icon: 'auto_stories' },
            'prayer-wall': { title: t('view.prayerWall'), icon: 'favorite' },
            'course-player': { title: 'Kurs-spiller', icon: 'school' }
        };

        // Update Header Title and Icon (Admin Style)
        const info = viewInfo[cleanViewId] || { title: t('sidebar.title'), icon: 'person' };
        const titleEl = document.getElementById('dashboard-main-header-title');
        const iconEl = document.getElementById('dashboard-main-header-icon');
        
        if (titleEl) titleEl.textContent = info.title;
        if (iconEl) iconEl.textContent = info.icon;

        document.querySelectorAll('.nav-link, .mobile-nav-item').forEach(l => l.classList.remove('active'));
        document.querySelector(`.nav-link[data-view="${cleanViewId}"]`)?.classList.add('active');
        document.querySelector(`.mobile-nav-item[data-view="${cleanViewId}"]`)?.classList.add('active');

        const container = document.getElementById('view-container') || document.getElementById('content-area');
        if (!container) return;

        if (cleanViewId === 'course-player') {
            this.renderCoursePlayer(container, queryParams);
        } else if (cleanViewId === 'reading-plans') {
            this.renderReadingPlans(container);
        } else if (cleanViewId === 'notes') {
            this.renderNotes(container);
        } else if (cleanViewId === 'prayer-wall') {
            this.renderPrayerWall(container);
        } else if (cleanViewId === 'courses') {
            this.renderCourses(container);
        } else if (cleanViewId === 'profile') {
            this.renderProfile(container);
        } else {
            this.renderOverview(container);
        }
    }

    async renderCoursePlayer(container, queryParams = {}) {
        container.innerHTML = `
            <style>
                /* Style Overrides for Stitch Premium Leksjonsside */
                .hkm-player-grid {
                    display: flex;
                    flex-direction: row;
                    gap: 28px;
                    width: 100%;
                    margin-top: 16px;
                }
                @media (max-width: 1024px) {
                    .hkm-player-grid {
                        flex-direction: column;
                    }
                }
                .hkm-player-sidebar {
                    width: 340px;
                    flex-shrink: 0;
                    display: flex;
                    flex-direction: column;
                    gap: 24px;
                }
                @media (max-width: 1024px) {
                    .hkm-player-sidebar {
                        width: 100%;
                    }
                }
                .hkm-player-main {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    gap: 24px;
                    min-width: 0;
                }
                .hkm-card {
                    background: #ffffff;
                    border: 1px solid #e2e8f0;
                    border-radius: 20px;
                    padding: 28px;
                    box-shadow: 0 4px 20px rgba(15, 23, 42, 0.04);
                    transition: all 0.3s ease;
                }
                
                /* Sidebar Dark Theme Styling */
                .stitch-sidebar-card {
                    background: linear-gradient(135deg, #09281e 0%, #0d3b2e 100%) !important;
                    color: #ffffff !important;
                    border: 1px solid rgba(255,255,255,0.1) !important;
                    border-radius: 20px !important;
                    padding: 0 !important;
                    overflow: hidden !important;
                    box-shadow: 0 10px 30px rgba(9, 40, 30, 0.25) !important;
                }
                .stitch-sidebar-card .hkm-tabs-header {
                    background: rgba(0, 0, 0, 0.2);
                    border-bottom: 1px solid rgba(255,255,255,0.1);
                }
                .stitch-sidebar-card .hkm-tab-btn {
                    color: rgba(255,255,255,0.6) !important;
                    border-right-color: rgba(255,255,255,0.1) !important;
                }
                .stitch-sidebar-card .hkm-tab-btn.active {
                    color: #4ade80 !important;
                    background: rgba(34, 197, 94, 0.15) !important;
                    border-bottom: 2px solid #22c55e !important;
                }

                .player-lesson-item {
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 12px;
                    padding: 14px 16px;
                    margin-bottom: 10px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    color: #f8fafc;
                    position: relative;
                }
                .player-lesson-item:hover {
                    background: rgba(255, 255, 255, 0.1);
                    border-color: rgba(255, 255, 255, 0.2);
                }
                .player-lesson-item.active {
                    background: rgba(34, 197, 94, 0.15) !important;
                    border-color: #22c55e !important;
                    border-left: 4px solid #22c55e !important;
                }

                /* Breadcrumbs & Progress */
                .player-top-breadcrumbs {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    font-size: 13.5px;
                    color: #64748b;
                    flex-wrap: wrap;
                    gap: 16px;
                    margin-bottom: 8px;
                }
                .player-top-breadcrumbs .crumb-link {
                    color: #475569;
                    text-decoration: none;
                    font-weight: 500;
                }
                .player-top-breadcrumbs .crumb-current {
                    color: #0f172a;
                    font-weight: 750;
                }
                .player-progress-badge {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    font-weight: 700;
                    font-size: 13px;
                    color: #16a34a;
                }
                .player-progress-bar-bg {
                    width: 120px;
                    height: 8px;
                    background: #e2e8f0;
                    border-radius: 9999px;
                    overflow: hidden;
                }
                .player-progress-bar-fill {
                    height: 100%;
                    background: #22c55e;
                    border-radius: 9999px;
                }

                /* Main Tabs */
                .hkm-main-tabs {
                    display: flex;
                    gap: 32px;
                    border-bottom: 2px solid #f1f5f9;
                    margin: 24px 0 20px;
                }
                .hkm-main-tab-btn {
                    padding: 12px 0;
                    font-size: 15px;
                    font-weight: 700;
                    color: #64748b;
                    background: none;
                    border: none;
                    border-bottom: 3px solid transparent;
                    margin-bottom: -2px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                .hkm-main-tab-btn.active {
                    color: #22c55e;
                    border-bottom-color: #22c55e;
                }
            </style>

            <div class="hkm-player-grid">
                <!-- Left Side: Sidebar Navigation (Dark Forest Green Accordion) -->
                <div class="hkm-player-sidebar">
                    <div class="hkm-card stitch-sidebar-card" style="height: 100%;">
                        <!-- Tabs Header -->
                        <div class="hkm-tabs-header">
                            <button class="hkm-tab-btn active sidebar-tab-btn" data-tab="lessons">
                                <span class="material-symbols-outlined" style="font-size:18px;">format_list_bulleted</span> Innhold
                            </button>
                            <button class="hkm-tab-btn sidebar-tab-btn" data-tab="notes">
                                <span class="material-symbols-outlined" style="font-size:18px;">notes</span> Notater
                            </button>
                            <button class="hkm-tab-btn sidebar-tab-btn" data-tab="bible">
                                <span class="material-symbols-outlined" style="font-size:18px;">menu_book</span> Bibel
                            </button>
                        </div>

                        <!-- Tab Panels scroll wrapper -->
                        <div class="hkm-sidebar-scroll" style="padding: 20px;">
                            <!-- Panel 1: Lessons List -->
                            <div class="sidebar-panel active" id="panel-lessons">
                                <div class="player-lessons-list">
                                    ${lessons.map((l, idx) => {
                                        const isActive = idx === activeLessonIndex;
                                        const cleanItemTitle = (l.title || 'Leksjon').replace(/^leksjon\s+\d+:\s*/i, '');
                                        
                                        const isLessonUnlocked = isCourseFree || isAdmin || enrollments.some(e => 
                                            e.courseId === course.id && 
                                            (e.status === 'paid' || e.status === 'success') &&
                                            (!e.paidLessons || e.paidLessons.length === 0 || e.paidLessons.includes(l.id))
                                        );
                                        
                                        if (!isLessonUnlocked) {
                                            return `
                                                <div class="player-lesson-item locked" data-idx="${idx}" style="opacity: 0.6;">
                                                    <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
                                                        <div style="display:flex; flex-direction:column; gap:2px; flex:1;">
                                                            <span style="font-size:10px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing: 0.05em;">Leksjon ${idx + 1}</span>
                                                            <span style="font-weight:600; font-size:14px; color:#e2e8f0; line-height:1.2;">${cleanItemTitle}</span>
                                                        </div>
                                                        <span class="material-symbols-outlined" style="font-size:18px; color:#94a3b8;">lock</span>
                                                    </div>
                                                </div>
                                            `;
                                        }
                                        
                                        return `
                                            <div class="player-lesson-item ${isActive ? 'active' : ''}" data-idx="${idx}">
                                                <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
                                                    <div style="display:flex; flex-direction:column; gap:2px; flex:1;">
                                                        <span style="font-size:10px; font-weight:700; color:${isActive ? '#4ade80' : '#94a3b8'}; text-transform:uppercase; letter-spacing: 0.05em;">Leksjon ${idx + 1}</span>
                                                        <span style="font-weight:600; font-size:14px; color:#ffffff; line-height:1.2;">${cleanItemTitle}</span>
                                                    </div>
                                                    <span class="material-symbols-outlined" style="font-size:20px; color:${isActive ? '#4ade80' : '#94a3b8'};">
                                                        ${isActive ? 'play_circle' : (l.videoUrl ? 'play_circle' : 'video_camera_front')}
                                                    </span>
                                                </div>
                                                ${isActive ? `
                                                    <div style="margin-top: 10px; height: 3.5px; width: 100%; background: rgba(255,255,255,0.15); border-radius: 2px; overflow: hidden;">
                                                        <div style="height: 100%; background: #22c55e; width: 70%;"></div>
                                                    </div>
                                                ` : ''}
                                            </div>
                                        `;
                                    }).join('')}
                                </div>
                            </div>

                            <!-- Panel 2: Notes Editor -->
                            <div class="sidebar-panel" id="panel-notes">
                                <div style="display:flex; flex-direction:column; gap:16px;">
                                    <div style="display:flex; justify-content:space-between; align-items:center;">
                                        <h4 style="font-size:14px; font-weight:700; color:#ffffff; margin:0;">Dine leksjonsnotater</h4>
                                        <span id="notes-save-status" class="notes-autosave-status" style="font-size:11px; font-weight:600; color:#4ade80;">
                                            <span class="material-symbols-outlined" style="font-size:14px; color:#22c55e;">cloud_done</span> Lagret
                                        </span>
                                    </div>
                                    <div class="rte-wrapper">
                                        <div class="rte-toolbar" id="rte-toolbar-lesson">
                                            <button type="button" class="rte-btn" data-cmd="bold" title="${t('notes.toolBold')}"><span class="material-symbols-outlined">format_bold</span></button>
                                            <button type="button" class="rte-btn" data-cmd="italic" title="${t('notes.toolItalic')}"><span class="material-symbols-outlined">format_italic</span></button>
                                            <button type="button" class="rte-btn" data-cmd="underline" title="${t('notes.toolUnderline')}"><span class="material-symbols-outlined">format_underlined</span></button>
                                            <div class="rte-divider"></div>
                                            <button type="button" class="rte-btn" data-cmd="formatBlock" data-val="H2" title="${t('notes.toolHeader')}"><span class="material-symbols-outlined">title</span></button>
                                            <button type="button" class="rte-btn" data-cmd="formatBlock" data-val="P" title="${t('notes.toolParagraph')}"><span class="material-symbols-outlined">format_paragraph</span></button>
                                            <div class="rte-divider"></div>
                                            <button type="button" class="rte-btn" data-cmd="insertUnorderedList" title="${t('notes.toolBulletList')}"><span class="material-symbols-outlined">format_list_bulleted</span></button>
                                            <button type="button" class="rte-btn" data-cmd="insertOrderedList" title="${t('notes.toolOrderedList')}"><span class="material-symbols-outlined">format_list_numbered</span></button>
                                            <div class="rte-divider"></div>
                                            <button type="button" class="rte-btn" data-cmd="removeFormat" title="${t('notes.toolClear')}"><span class="material-symbols-outlined">format_clear</span></button>
                                        </div>
                                        <div class="rte-editor" id="lesson-notes-editor" contenteditable="true"
                                            data-placeholder="Skriv dine notater for denne leksjonen her... De lagres automatisk til kontoen din."></div>
                                    </div>
                                </div>
                            </div>

                            <!-- Panel 3: Bible Lookup -->
                            <div class="sidebar-panel" id="panel-bible" style="position: relative;">
                                <div style="display:flex; flex-direction:column; gap:16px; height: 100%;">
                                    <div>
                                        <h4 style="font-size:14px; font-weight:700; color:#ffffff; margin:0 0 12px 0;">Slå opp i Bibelen</h4>
                                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px;">
                                            <select id="bib-trans-select" class="hkm-bible-select">
                                                <option value="NO1930">Norsk (1930)</option>
                                                <option value="BSN">Norsk (BSN)</option>
                                                <option value="KJV">English (KJV)</option>
                                            </select>
                                            <select id="bib-book-select" class="hkm-bible-select"></select>
                                        </div>
                                        <div style="display:flex; gap:8px; margin-top:8px;">
                                            <select id="bib-chap-select" class="hkm-bible-select" style="flex:1;"></select>
                                        </div>
                                    </div>
                                    <div id="bib-display" class="hkm-bible-display" style="flex:1; min-height: 220px; max-height: 380px; overflow-y: auto; background: rgba(0,0,0,0.2); padding: 16px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.1);">
                                        <p style="color:#94a3b8; font-size:13px; text-align:center; margin-top:40px;">Velg kapittel over for å lese vers.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Right Side: Player & Lesson Details -->
                <div class="hkm-player-main">
                    <!-- Top Breadcrumb & Progress Header -->
                    <div class="player-top-breadcrumbs">
                        <div>
                            <a href="/minside/index.html" class="crumb-link">Hjem</a> &rsaquo; 
                            <a href="/kurs" class="crumb-link">Kurs</a> &rsaquo; 
                            <span class="crumb-link">${course.title}</span> &rsaquo; 
                            <span class="crumb-current">Leksjon ${activeLessonIndex + 1}</span>
                        </div>
                        <div class="player-progress-badge">
                            <span>70% Fullført</span>
                            <div class="player-progress-bar-bg">
                                <div class="player-progress-bar-fill" style="width: 70%;"></div>
                            </div>
                        </div>
                    </div>

                    <!-- Videospiller container -->
                    <div class="video-player-container" id="player-container" style="border-radius: 20px; overflow: hidden; box-shadow: 0 12px 32px rgba(15,23,42,0.12);">
                        <div style="position: absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; color:white; background:#0f172a; font-weight:600; font-size:1.1rem; padding: 24px; text-align:center;">
                            Laster spiller...
                        </div>
                    </div>

                    <!-- Details Card (Oversikt & Lærer) -->
                    <div class="hkm-card">
                        <!-- Navigation Tabs under player -->
                        <div class="hkm-main-tabs">
                            <button class="hkm-main-tab-btn active">Oversikt</button>
                            <button class="hkm-main-tab-btn">Ressurser</button>
                            <button class="hkm-main-tab-btn">Diskusjon</button>
                        </div>

                        <!-- Oversikt over leksjonen -->
                        <h2 style="font-size: 1.45rem; font-weight: 800; color: #0f172a; margin: 0 0 12px 0;">
                            Oversikt over leksjonen: ${cleanLTitle}
                        </h2>
                        <p style="font-size: 1rem; color: #475569; line-height: 1.65; margin: 0 0 32px 0;">
                            ${lesson.description || 'I denne leksjonen går vi gjennom det fundamentale grunnlaget for undervisningen. Du finner ressurser, lesestoff og bønneguider nedenfor.'}
                        </p>

                        <!-- Læreren din Section -->
                        <div style="border-top: 1.5px solid #f1f5f9; padding-top: 28px; margin-top: 28px;">
                            <h3 style="font-size: 1.15rem; font-weight: 800; color: #0f172a; margin: 0 0 18px 0;">Læreren din</h3>
                            <div style="display: flex; gap: 20px; align-items: center; background: #f8fafc; padding: 20px 24px; border-radius: 16px; border: 1.5px solid #e2e8f0;">
                                <div style="width: 72px; height: 72px; border-radius: 50%; overflow: hidden; border: 2.5px solid #22c55e; flex-shrink: 0;">
                                    <img src="/assets/Hilde Karin Knutsen-cVkzTBaQ.jpg" alt="Hilde Karin Knutsen" style="width: 100%; height: 100%; object-fit: cover;">
                                </div>
                                <div>
                                    <h4 style="font-size: 1.1rem; font-weight: 800; color: #0f172a; margin: 0 0 4px 0;">Hilde Karin Knutsen</h4>
                                    <span style="font-size: 0.82rem; font-weight: 700; color: #16a34a; text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 6px;">Kurslærer & Sjelesorgmentor</span>
                                    <p style="font-size: 0.92rem; color: #64748b; margin: 0; line-height: 1.5;">Brenner for indre helbredelse, bønneaktivering og å hjelpe mennesker inn i en dypere relasjon med Gud.</p>
                                </div>
                            </div>
                        </div>

                        <!-- Last ned materialer Section -->
                        <div style="border-top: 1.5px solid #f1f5f9; padding-top: 28px; margin-top: 28px;">
                            <h3 style="font-size: 1.15rem; font-weight: 800; color: #0f172a; margin: 0 0 18px 0;">Last ned materialer</h3>
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px;">
                                <a href="${lesson.resourceUrl || '#'}" target="_blank" style="display: flex; align-items: center; gap: 14px; background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 14px 18px; text-decoration: none; color: #0f172a; font-weight: 600; font-size: 0.92rem; transition: all 0.2s ease;">
                                    <span class="material-symbols-outlined" style="font-size: 24px; color: #16a34a;">description</span>
                                    <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Leksjonsplan_Mal.pdf</span>
                                </a>
                                <a href="${lesson.resourceUrl || '#'}" target="_blank" style="display: flex; align-items: center; gap: 14px; background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 14px 18px; text-decoration: none; color: #0f172a; font-weight: 600; font-size: 0.92rem; transition: all 0.2s ease;">
                                    <span class="material-symbols-outlined" style="font-size: 24px; color: #2563eb;">article</span>
                                    <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Leksjonsnotater.docx</span>
                                </a>
                                <a href="${lesson.resourceUrl || '#'}" target="_blank" style="display: flex; align-items: center; gap: 14px; background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 14px 18px; text-decoration: none; color: #0f172a; font-weight: 600; font-size: 0.92rem; transition: all 0.2s ease;">
                                    <span class="material-symbols-outlined" style="font-size: 24px; color: #8b5cf6;">menu_book</span>
                                    <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Ytterligere_Lesning.pdf</span>
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;// 3. Mount Player Media Embed
        const playerContainer = document.getElementById('player-container');

        const loadZoomSDK = () => {
            return new Promise((resolve, reject) => {
                if (window.ZoomMtgEmbedded) {
                    resolve(window.ZoomMtgEmbedded);
                    return;
                }

                // Load Zoom CSS
                const cssUrl = 'https://source.zoom.us/zoom-meeting-embedded-3.8.0.css';
                if (!document.querySelector(`link[href="${cssUrl}"]`)) {
                    const link = document.createElement('link');
                    link.rel = 'stylesheet';
                    link.href = cssUrl;
                    document.head.appendChild(link);
                }

                const scripts = [
                    'https://source.zoom.us/3.8.0/lib/vendor/react.min.js',
                    'https://source.zoom.us/3.8.0/lib/vendor/react-dom.min.js',
                    'https://source.zoom.us/3.8.0/lib/vendor/redux.min.js',
                    'https://source.zoom.us/3.8.0/lib/vendor/redux-thunk.min.js',
                    'https://source.zoom.us/3.8.0/lib/vendor/lodash.min.js',
                    'https://source.zoom.us/zoom-meeting-embedded-3.8.0.min.js'
                ];

                let loadedCount = 0;

                const loadNext = () => {
                    if (loadedCount >= scripts.length) {
                        if (window.ZoomMtgEmbedded) {
                            resolve(window.ZoomMtgEmbedded);
                        } else {
                            reject(new Error('ZoomMtgEmbedded was not loaded successfully.'));
                        }
                        return;
                    }

                    const scriptUrl = scripts[loadedCount];
                    if (document.querySelector(`script[src="${scriptUrl}"]`)) {
                        loadedCount++;
                        loadNext();
                        return;
                    }

                    const script = document.createElement('script');
                    script.src = scriptUrl;
                    script.async = false;
                    script.onload = () => {
                        loadedCount++;
                        loadNext();
                    };
                    script.onerror = (err) => {
                        reject(err);
                    };
                    document.body.appendChild(script);
                };

                loadNext();
            });
        };
        
        const loadPlayer = () => {
            if (!playerContainer) return;
            // Reset to default 16:9 aspect ratio styling first
            playerContainer.style.paddingTop = '56.25%';
            playerContainer.style.height = 'auto';

            if (lesson.videoUrl) {
                // Recorded Video Player
                const ytId = parseYoutube(lesson.videoUrl);
                const vimId = parseVimeo(lesson.videoUrl);
                
                if (ytId) {
                    playerContainer.innerHTML = `<iframe src="https://www.youtube.com/embed/${ytId}?rel=0&autoplay=1" title="YouTube Video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`;
                } else if (vimId) {
                    playerContainer.innerHTML = `<iframe src="https://player.vimeo.com/video/${vimId}?autoplay=1" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`;
                } else {
                    // Direct media player
                    playerContainer.innerHTML = `<video src="${lesson.videoUrl}" controls autoplay></video>`;
                }
            } else if (lesson.zoomUrl) {
                // Zoom embed
                const zoomData = parseZoom(lesson.zoomUrl);
                if (zoomData) {
                    // Increase container height for Zoom meeting interface to prevent clipping
                    playerContainer.style.paddingTop = '0px';
                    playerContainer.style.height = '600px';

                    const studentName = this.profileData?.name || this.currentUser?.displayName || 'Student';

                    // Try to load Zoom Meeting SDK (Component View)
                    playerContainer.innerHTML = `
                        <div id="zoom-sdk-loading" style="position: absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; color:white; background:#1e293b; font-weight:600; padding: 20px; text-align:center; gap: 16px;">
                            <span class="material-symbols-outlined spinner" style="font-size: 48px; color: #d17d39; animation: spin 1.5s linear infinite;">sync</span>
                            <div>
                                <h3 style="margin: 0 0 8px; font-size: 1.15rem;">Starter Zoom-spiller...</h3>
                                <p style="margin: 0; font-size: 0.88rem; font-weight: 400; color: #94a3b8; max-width: 320px;">Laster inn integrert Zoom-klient med chat og video. Vennligst vent.</p>
                            </div>
                        </div>
                        <div id="zoom-sdk-element" style="width: 100%; height: 100%; display: none;"></div>
                    `;

                    const loadEmbeddedZoom = async () => {
                        try {
                            // 1. Fetch signature from API
                            const sigRes = await fetch('/api/zoom-signature', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    meetingNumber: zoomData.meetingId,
                                    role: 0 // participant
                                })
                            });
                            const sigData = await sigRes.json();
                            if (!sigRes.ok || sigData.error) {
                                throw new Error(sigData.error || 'Failed to fetch signature');
                            }

                            // 2. Load scripts dynamically
                            const embeddedSDK = await loadZoomSDK();

                            // Hide loading, show element
                            const sdkEl = document.getElementById('zoom-sdk-element');
                            const loaderEl = document.getElementById('zoom-sdk-loading');
                            if (sdkEl && loaderEl) {
                                loaderEl.style.display = 'none';
                                sdkEl.style.display = 'block';
                            }

                            // 3. Initialize and join
                            const client = embeddedSDK.createClient();
                            client.init({
                                zoomAppRoot: sdkEl,
                                language: 'no-NO'
                            });

                            await client.join({
                                sdkKey: sigData.sdkKey,
                                signature: sigData.signature,
                                meetingNumber: String(zoomData.meetingId),
                                password: zoomData.pwd || '',
                                userName: studentName
                            });
                            
                            console.log('Zoom SDK joined successfully!');
                        } catch (err) {
                            console.error('Zoom SDK error:', err);
                            const errStr = JSON.stringify(err) || '';
                            const errMsg = err.message || errStr || 'Ukjent feil';
                            const errorCode = err.errorCode || (err.detail && err.detail.errorCode);
                            const reason = err.reason || '';
                            
                            // Check if the meeting has not started yet (errorCode 3008)
                            if (errorCode === 3008 || reason.includes('Meeting has not started') || errStr.includes('3008') || errMsg.includes('3008')) {
                                playerContainer.innerHTML = `
                                    <div style="position: absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; color:white; background:#1e293b; font-weight:600; padding: 20px; text-align:center; gap: 16px; z-index: 10;">
                                        <style>
                                            @keyframes zoom-pulse {
                                                0%, 100% { opacity: 1; transform: scale(1); }
                                                50% { opacity: 0.6; transform: scale(0.95); }
                                            }
                                        </style>
                                        <span class="material-symbols-outlined" style="font-size: 48px; color: #3b82f6; animation: zoom-pulse 2s infinite;">schedule</span>
                                        <div>
                                            <h3 style="margin: 0 0 8px; font-size: 1.15rem; color: #93c5fd;">Møtet har ikke startet ennå</h3>
                                            <p style="margin: 0; font-size: 0.88rem; font-weight: 400; color: #cbd5e1; max-width: 450px;">
                                                Webinaret er planlagt til et senere tidspunkt. Vi overfører deg til Zooms venterom om 3 sekunder...
                                            </p>
                                        </div>
                                    </div>
                                `;
                                
                                setTimeout(() => {
                                    const zoomIframeUrl = `https://zoom.us/wc/${zoomData.meetingId}/join?prefer=1&pwd=${zoomData.pwd}&dn=${encodeURIComponent(studentName)}`;
                                    playerContainer.innerHTML = `<iframe src="${zoomIframeUrl}" allow="camera; microphone; fullscreen; speaker; display-capture; clipboard-write; clipboard-read" allowfullscreen webkitallowfullscreen mozallowfullscreen></iframe>`;
                                }, 3000);
                                return;
                            }
                            
                            playerContainer.innerHTML = `
                                <div style="position: absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; color:white; background:#1e293b; font-weight:600; padding: 20px; text-align:center; gap: 16px; z-index: 10;">
                                    <span class="material-symbols-outlined" style="font-size: 48px; color: #ef4444;">error</span>
                                    <div>
                                        <h3 style="margin: 0 0 8px; font-size: 1.15rem; color: #f87171;">Zoom SDK Feil</h3>
                                        <p style="margin: 0 0 16px; font-size: 0.88rem; font-weight: 400; color: #cbd5e1; max-width: 450px;">
                                            Kunne ikke starte den integrerte spilleren: <code>${errMsg}</code>
                                        </p>
                                        <button id="zoom-fallback-trigger-btn" class="player-btn-zoom-app" style="background:#ef4444 !important; border-color:#ef4444 !important; font-size:0.8rem !important; height:38px !important; padding:6px 16px !important; border-radius:30px !important;">
                                            Start reserveløsning (iframe)
                                        </button>
                                    </div>
                                </div>
                            `;
                            
                            const fallbackBtn = document.getElementById('zoom-fallback-trigger-btn');
                            if (fallbackBtn) {
                                fallbackBtn?.addEventListener('click', () => {
                                    const zoomIframeUrl = `https://zoom.us/wc/${zoomData.meetingId}/join?prefer=1&pwd=${zoomData.pwd}&dn=${encodeURIComponent(studentName)}`;
                                    playerContainer.innerHTML = `<iframe src="${zoomIframeUrl}" allow="camera; microphone; fullscreen; speaker; display-capture; clipboard-write; clipboard-read" allowfullscreen webkitallowfullscreen mozallowfullscreen></iframe>`;
                                });
                            }
                        }
                    };

                    loadEmbeddedZoom();
                } else {
                    playerContainer.innerHTML = `
                        <div style="position: absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; color:white; background:#1e293b; font-weight:600; padding: 20px; text-align:center; gap: 16px;">
                            <span class="material-symbols-outlined" style="font-size: 48px; color: #d17d39;">video_camera_front</span>
                            <div>
                                <h3 style="margin: 0 0 8px; font-size: 1.15rem;">Zoom Live Class</h3>
                                <p style="margin: 0; font-size: 0.88rem; font-weight: 400; color: #94a3b8; max-width: 320px;">Live Zoom-kobling er klar. Vennligst bruk knappen nedenfor for å åpne timen i Zoom-appen.</p>
                            </div>
                            <a href="${lesson.zoomUrl}" target="_blank" class="player-btn-zoom-app" style="box-shadow: 0 4px 12px rgba(22, 163, 74, 0.2);">
                                <span class="material-symbols-outlined">launch</span> Åpne Zoom-kobling
                            </a>
                        </div>`;
                }
            } else {
                playerContainer.innerHTML = `
                    <div style="position: absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; color:white; background:#1e293b; font-weight:600; padding: 20px; text-align:center; gap: 12px;">
                        <span class="material-symbols-outlined" style="font-size:40px; color:#94a3b8;">school</span>
                        <div>Leksjonen har ingen live Zoom-time eller opptaks-video registrert ennå.</div>
                    </div>`;
            }
        };
        
        loadPlayer();

        // Fullscreen Toggle Logic
        const fsBtn = container.querySelector('#player-fullscreen-btn');
        if (fsBtn) {
            fsBtn?.addEventListener('click', () => {
                const doc = document;
                const isFs = doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement;
                
                if (!isFs) {
                    if (playerContainer.requestFullscreen) {
                        playerContainer.requestFullscreen();
                    } else if (playerContainer.webkitRequestFullscreen) {
                        playerContainer.webkitRequestFullscreen();
                    } else if (playerContainer.mozRequestFullScreen) {
                        playerContainer.mozRequestFullScreen();
                    } else if (playerContainer.msRequestFullscreen) {
                        playerContainer.msRequestFullscreen();
                    }
                } else {
                    if (doc.exitFullscreen) {
                        doc.exitFullscreen();
                    } else if (doc.webkitExitFullscreen) {
                        doc.webkitExitFullscreen();
                    } else if (doc.mozCancelFullScreen) {
                        doc.mozCancelFullScreen();
                    } else if (doc.msExitFullscreen) {
                        doc.msExitFullscreen();
                    }
                }
            });

            const updateFullscreenUI = () => {
                const doc = document;
                const isFs = doc.fullscreenElement === playerContainer || 
                             doc.webkitFullscreenElement === playerContainer || 
                             doc.mozFullScreenElement === playerContainer || 
                             doc.msFullscreenElement === playerContainer;
                
                fsBtn.innerHTML = isFs 
                    ? `<span class="material-symbols-outlined">fullscreen_exit</span> Avslutt`
                    : `<span class="material-symbols-outlined">fullscreen</span> Fullskjerm`;
            };

            playerContainer?.addEventListener('fullscreenchange', updateFullscreenUI);
            playerContainer?.addEventListener('webkitfullscreenchange', updateFullscreenUI);
            playerContainer?.addEventListener('mozfullscreenchange', updateFullscreenUI);
            playerContainer?.addEventListener('MSFullscreenChange', updateFullscreenUI);
        }

        // 4. Setup Tab Navigation
        const tabs = container.querySelectorAll('.sidebar-tab-btn');
        const panels = container.querySelectorAll('.sidebar-panel');
        tabs.forEach(tab => {
            tab?.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                panels.forEach(p => p.classList.remove('active'));
                
                tab.classList.add('active');
                const panelId = `panel-${tab.dataset.tab}`;
                container.querySelector(`#${panelId}`).classList.add('active');
            });
        });

        // 5. Sidebar Lesson Switcher
        container.querySelectorAll('.player-lesson-item').forEach(item => {
            item?.addEventListener('click', () => {
                const idx = parseInt(item.dataset.idx);
                const nextLesson = lessons[idx];
                this.loadView('course-player', { courseId, lessonId: nextLesson.id });
            });
        });

        // 6. Notes Auto-save Logic
        const editor = container.querySelector('#lesson-notes-editor');
        const saveStatus = container.querySelector('#notes-save-status');
        let noteDocId = null;
        let saveTimeout = null;
// Wire the Rich Text Editor toolbar
        this._wireRteToolbar('rte-toolbar-lesson', 'lesson-notes-editor');

        const loadNotes = async () => {
            if (saveStatus) saveStatus.innerHTML = `<span class="material-symbols-outlined spinner" style="font-size:14px; animation: spin 1s linear infinite;">sync</span> Henter...`;
            try {
                const snap = await firebase.firestore().collection('personal_notes')
                    .where('userId', '==', uid)
                    .where('lessonId', '==', lesson.id)
                    .limit(1)
                    .get();
                
                if (!snap.empty) {
                    const noteDoc = snap.docs[0];
                    noteDocId = noteDoc.id;
                    if (editor) editor.innerHTML = noteDoc.data().text || '';
                    if (saveStatus) saveStatus.innerHTML = `<span class="material-symbols-outlined" style="font-size:14px; color:#16a34a;">cloud_done</span> Lagret`;
                } else {
                    if (editor) editor.innerHTML = '';
                    if (saveStatus) saveStatus.innerHTML = `Ingen lagrede notater`;
                }
            } catch (e) {
                console.error("Notes fetch error:", e);
                if (saveStatus) saveStatus.innerHTML = `Feil ved innlasting`;
            }
        };

        loadNotes();

        editor?.addEventListener('input', () => {
            if (saveStatus) saveStatus.innerHTML = `<span class="material-symbols-outlined spinner" style="font-size:14px; animation: spin 1s linear infinite;">sync</span> Lagrer...`;
            clearTimeout(saveTimeout);
            
            saveTimeout = setTimeout(async () => {
                const noteText = editor.innerHTML.trim();
                const plainText = editor.innerText.trim();
                if (!plainText) {
                    if (saveStatus) saveStatus.innerHTML = `Tomt notat`;
                    return;
                }
                
                try {
                    if (noteDocId) {
                        await firebase.firestore().collection('personal_notes').doc(noteDocId).update({
                            text: noteText,
                            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                        });
                    } else {
                        const cleanLTitle = (lesson.title || 'Leksjon').replace(/^leksjon\s+\d+:\s*/i, '');
                        const docRef = await firebase.firestore().collection('personal_notes').add({
                            userId: uid,
                            courseId: course.id,
                            lessonId: lesson.id,
                            title: `Notater: Leksjon ${activeLessonIndex + 1} - ${cleanLTitle}`,
                            text: noteText,
                            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                            category: 'Kurs'
                        });
                        noteDocId = docRef.id;
                    }
                    if (saveStatus) saveStatus.innerHTML = `<span class="material-symbols-outlined" style="font-size:14px; color:#16a34a;">cloud_done</span> Lagret i skyen ✓`;
                    setTimeout(() => {
                        if (saveStatus.textContent.includes('skyen')) {
                            if (saveStatus) saveStatus.innerHTML = `<span class="material-symbols-outlined" style="font-size:14px; color:#16a34a;">cloud_done</span> Lagret`;
                        }
                    }, 2000);
                } catch (e) {
                    console.error("Notes autosave error:", e);
                    if (saveStatus) saveStatus.innerHTML = `Kunne ikke lagre`;
                }
            }, 1000); // 1 sec debounce
        });

        // 7. Bible Reader Widget Logic
        const bibTransSelect = container.querySelector('#bible-select-translation');
        const bibBookSelect = container.querySelector('#bible-select-book');
        const bibChapSelect = container.querySelector('#bible-select-chapter');
        const bibDisplay = container.querySelector('#bible-verses-display');
        
        // Dictionary Overlay Elements
        const dictOverlay = container.querySelector('#bible-dict-overlay');
        const dictTitle = container.querySelector('#bible-dict-title');
        const dictContent = container.querySelector('#bible-dict-content');
        const dictClose = container.querySelector('#bible-dict-close');

        let bibleList = [];
        let isBibleInit = true;
        let selectedVerses = [];
        let bibleLayout = 'verse'; // 'verse' | 'paragraph'
        let bibleFontSize = 15; // default size matches new Inter CSS style

        const updateToolbarStates = () => {
            const hasSelected = selectedVerses.length > 0;
            const btnCopy = container.querySelector('#bible-btn-copy');
            const btnHighlight = container.querySelector('#bible-btn-highlight');
            if (btnCopy) btnCopy.disabled = !hasSelected;
            if (btnHighlight) btnHighlight.disabled = !hasSelected;
        };

        const loadBibleData = async () => {
            try {
                const res = await fetch('/api/bible/bibles');
                const payload = await res.json();
                bibleList = payload.data || payload || [];
                
                if (bibTransSelect) bibTransSelect.innerHTML = bibleList.map(b => `
                    <option value="${b.id}">${b.abbreviation}</option>
                `).join('');
                
                if (bibleList.length > 0) {
                    await loadBooks(bibleList[0].id, isBibleInit);
                    isBibleInit = false;
                }
            } catch (e) {
                console.error("Bible widget init error:", e);
            }
        };

        const loadBooks = async (bibleId, autoSelect = false) => {
            try {
                bibBookSelect.disabled = true;
                if (bibBookSelect) bibBookSelect.innerHTML = `<option value="">Bok...</option>`;
                
                const res = await fetch(`/api/bible/bibles/${bibleId}/books`);
                const payload = await res.json();
                const books = payload.data || payload || [];
                
                if (bibBookSelect) bibBookSelect.innerHTML = `<option value="">Velg bok</option>` + books.map(b => `
                    <option value="${b.id}">${b.name}</option>
                `).join('');
                bibBookSelect.disabled = false;

                if (autoSelect && books.length > 0) {
                    const defaultBook = books.find(b => 
                        b.id.toLowerCase() === 'jhn' || 
                        b.id.toLowerCase().includes('jhn') || 
                        b.name.toLowerCase().includes('johannes')
                    ) || books[0];

                    bibBookSelect.value = defaultBook.id;
                    await loadChapters(bibleId, defaultBook.id, true);
                }
            } catch (e) {
                console.error("Bible widget loadBooks error:", e);
            }
        };

        const loadVerses = async (bibleId, chapterId) => {
            try {
                if (bibDisplay) bibDisplay.innerHTML = `<p style="color:#64748b; text-align:center; font-style:italic; font-size:0.85rem; padding-top:40px;">Laster bibeltekst...</p>`;
                
                // Clear active selection on reload
                selectedVerses = [];
                updateToolbarStates();

                const res = await fetch(`/api/bible/bibles/${bibleId}/chapters/${chapterId}`);
                const payload = await res.json();
                const data = payload.data || payload || {};
                const verses = data.verses || [];
                
                if (verses.length === 0) {
                    if (bibDisplay) bibDisplay.innerHTML = `<p style="color:#94a3b8; text-align:center; font-style:italic; font-size:0.85rem; padding-top:40px;">Fant ingen vers.</p>`;
                    return;
                }
                
                const highlights = JSON.parse(localStorage.getItem('hkm_bible_highlights') || '[]');
                
                if (bibleLayout === 'paragraph') {
                    if (bibDisplay) bibDisplay.innerHTML = `<div style="font-family: 'Inter', system-ui, sans-serif; font-size:${bibleFontSize}px; line-height:1.75; color:#334155; text-align:left;">` + 
                        verses.map(v => {
                            const verseNum = v.verse || v.number || '';
                            const isHighlighted = highlights.some(h => 
                                h.bibleId === bibleId && 
                                h.chapterId === chapterId && 
                                h.verseNum === verseNum.toString()
                            );
                            const highlightClass = isHighlighted ? 'highlighted-verse' : '';
                            const isSelected = selectedVerses.includes(verseNum.toString());
                            const selectedClass = isSelected ? 'selected-verse' : '';
                            
                            return `
                                <span class="bible-verse-item ${highlightClass} ${selectedClass}" data-verse="${verseNum}" style="cursor:pointer; padding: 2px 4px; border-radius: 4px; transition: background 0.15s; display: inline; box-decoration-break: clone; -webkit-box-decoration-break: clone;">
                                    <span class="bible-verse-num" style="font-size: 10px; font-weight: 700; color: #d17d39; margin-left: 6px; margin-right: 4px; vertical-align: super;">${verseNum}</span>${v.text}
                                </span>
                            `;
                        }).join('') + `</div>`;
                } else {
                    if (bibDisplay) bibDisplay.innerHTML = verses.map(v => {
                        const verseNum = v.verse || v.number || '';
                        const isHighlighted = highlights.some(h => 
                            h.bibleId === bibleId && 
                            h.chapterId === chapterId && 
                            h.verseNum === verseNum.toString()
                        );
                        const highlightClass = isHighlighted ? 'highlighted-verse' : '';
                        const isSelected = selectedVerses.includes(verseNum.toString());
                        const selectedClass = isSelected ? 'selected-verse' : '';
                        
                        return `
                            <p class="bible-verse-item ${highlightClass} ${selectedClass}" data-verse="${verseNum}" style="margin-bottom:12px; font-size:${bibleFontSize}px; line-height:1.65; color:#334155; cursor:pointer; padding: 4px 8px; border-radius: 6px; transition: background 0.15s; display: block; border-left: 3px solid transparent;">
                                <span class="bible-verse-num" style="font-size: 11px; font-weight: 700; color: #d17d39; margin-right: 8px; vertical-align: super;">${verseNum}</span>${v.text}
                            </p>
                        `;
                    }).join('');
                }
                
                // Attach click handlers for verse items selection
                bibDisplay.querySelectorAll('.bible-verse-item').forEach(item => {
                    item?.addEventListener('click', (e) => {
                        if (e.detail > 1) return; // Prevent selection trigger on double-click
                        
                        const verseNum = item.dataset.verse;
                        const idx = selectedVerses.indexOf(verseNum);
                        if (idx > -1) {
                            selectedVerses.splice(idx, 1);
                            item.classList.remove('selected-verse');
                        } else {
                            selectedVerses.push(verseNum);
                            item.classList.add('selected-verse');
                        }
                        updateToolbarStates();
                    });
                });

                // Attach double-click handler for Bible Dictionary lookup
                bibDisplay?.addEventListener('dblclick', () => {
                    const selection = window.getSelection().toString().trim();
                    const cleanedWord = selection.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "").trim();
                    if (cleanedWord && cleanedWord.length > 1 && cleanedWord.length < 30) {
                        lookupWord(cleanedWord);
                    }
                });

                bibDisplay.scrollTop = 0;
            } catch (e) {
                console.error("Bible widget loadVerses error:", e);
                if (bibDisplay) bibDisplay.innerHTML = `<p style="color:#e74c3c; text-align:center; font-style:italic; font-size:0.85rem; padding-top:40px;">Feil ved henting av tekst.</p>`;
            }
        };

        const lookupWord = async (word) => {
            dictOverlay.style.display = 'flex';
            dictTitle.textContent = `Eksikon: "${word}"`;
            dictContent.innerHTML = `<p style="color:#64748b; text-align:center; font-style:italic; padding-top:40px;">Søker i Bibeleksikon...</p>`;
            
            try {
                const lang = document.documentElement.lang || 'no';
                const res = await fetch(`/api/bible/dictionary?word=${encodeURIComponent(word)}&lang=${lang}`);
                if (!res.ok) throw new Error("Fetch failed");
                const dictRes = await res.json();
                
                if (dictRes && dictRes.definition) {
                    const parsedDef = dictRes.definition
                        .replace(/\n/g, '<br>')
                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                        .replace(/\*(.*?)\*/g, '<em>$1</em>');
                    
                    let html = `<p style="margin-bottom:8px;"><strong>Kategori:</strong> ${dictRes.category || 'Ordbok'}</p>`;
                    html += `<p style="margin-top:12px; font-size: 13.5px; line-height: 1.6; color:#1e293b;">${parsedDef}</p>`;
                    if (dictRes.contextualNote) {
                        const parsedNote = dictRes.contextualNote
                            .replace(/\n/g, '<br>')
                            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                            .replace(/\*(.*?)\*/g, '<em>$1</em>');
                        html += `<div style="margin-top:16px; padding:12px; background:#f8fafc; border-left:3px solid #d17d39; border-radius:4px; font-size:12px; line-height: 1.5; color: #475569;">${parsedNote}</div>`;
                    }
                    dictContent.innerHTML = html;
                } else {
                    dictContent.innerHTML = `<p style="color:#64748b; text-align:center; font-style:italic; padding-top:40px;">Fant ingen definisjon på "${word}" i leksikonet.</p>`;
                }
            } catch (e) {
                console.error("Word lookup error:", e);
                dictContent.innerHTML = `<p style="color:#e74c3c; text-align:center; font-style:italic; padding-top:40px;">Feil ved søk i leksikon.</p>`;
            }
        };

        dictClose?.addEventListener('click', () => {
            dictOverlay.style.display = 'none';
        });

        // Copy selected verses
        container.querySelector('#bible-btn-copy')?.addEventListener('click', () => {
            if (selectedVerses.length === 0) return;
            selectedVerses.sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
            
            const bookName = bibBookSelect.options[bibBookSelect.selectedIndex].text;
            const chapterNum = bibChapSelect.options[bibChapSelect.selectedIndex].text;
            
            const textToCopy = selectedVerses.map(vNum => {
                const el = bibDisplay.querySelector(`.bible-verse-item[data-verse="${vNum}"]`);
                return el ? `[v. ${vNum}] ${el.innerText.replace(vNum, '').trim()}` : '';
            }).filter(Boolean).join('\n');
            
            const fullRef = `${bookName} ${chapterNum}:${selectedVerses.join(', ')}`;
            const finalString = `${fullRef}\n\n${textToCopy}\n\n(Delt fra His Kingdom Ministry)`;
            
            navigator.clipboard.writeText(finalString).then(() => {
                window.showToast?.('Bibelversene er kopiert!', 'success') || alert('Kopiert til utklippstavle!');
                selectedVerses = [];
                bibDisplay.querySelectorAll('.bible-verse-item').forEach(el => el.classList.remove('selected-verse'));
                updateToolbarStates();
            });
        });

        // Highlight/Bookmark selected verses
        container.querySelector('#bible-btn-highlight')?.addEventListener('click', () => {
            if (selectedVerses.length === 0) return;
            const bibleId = bibTransSelect.value;
            const bookId = bibBookSelect.value;
            const chapterId = bibChapSelect.value;
            
            let highlights = JSON.parse(localStorage.getItem('hkm_bible_highlights') || '[]');
            
            selectedVerses.forEach(verseNum => {
                const matchIdx = highlights.findIndex(h => 
                    h.bibleId === bibleId && 
                    h.chapterId === chapterId && 
                    h.verseNum === verseNum.toString()
                );
                
                const el = bibDisplay.querySelector(`.bible-verse-item[data-verse="${verseNum}"]`);
                
                if (matchIdx > -1) {
                    highlights.splice(matchIdx, 1);
                    if (el) el.classList.remove('highlighted-verse');
                } else {
                    highlights.push({ bibleId, bookId, chapterId, verseNum: verseNum.toString() });
                    if (el) el.classList.add('highlighted-verse');
                }
            });
            
            localStorage.setItem('hkm_bible_highlights', JSON.stringify(highlights));
            window.showToast?.('Markeringsstatus oppdatert!', 'success');
            
            selectedVerses = [];
            bibDisplay.querySelectorAll('.bible-verse-item').forEach(el => el.classList.remove('selected-verse'));
            updateToolbarStates();
        });

        // Toggle layout layout-paragraph vs layout-verse
        container.querySelector('#bible-btn-layout')?.addEventListener('click', () => {
            const btn = container.querySelector('#bible-btn-layout');
            if (bibleLayout === 'verse') {
                bibleLayout = 'paragraph';
                btn.classList.add('active');
            } else {
                bibleLayout = 'verse';
                btn.classList.remove('active');
            }
            // Trigger re-render of verses with new layout
            const bibleId = bibTransSelect.value;
            const chapterId = bibChapSelect.value;
            if (bibleId && chapterId) {
                loadVerses(bibleId, chapterId);
            }
        });

        // Font size adjustments
        const updateFontSizeDisplay = () => {
            container.querySelector('#bible-font-size-indicator').textContent = `${bibleFontSize}px`;
            const bibleId = bibTransSelect.value;
            const chapterId = bibChapSelect.value;
            if (bibleId && chapterId) {
                loadVerses(bibleId, chapterId);
            }
        };

        container.querySelector('#bible-btn-font-dec')?.addEventListener('click', () => {
            if (bibleFontSize > 11) {
                bibleFontSize -= 1;
                updateFontSizeDisplay();
            }
        });

        container.querySelector('#bible-btn-font-inc')?.addEventListener('click', () => {
            if (bibleFontSize < 24) {
                bibleFontSize += 1;
                updateFontSizeDisplay();
            }
        });

        const loadChapters = async (bibleId, bookId, autoSelect = false) => {
            try {
                bibChapSelect.disabled = true;
                if (bibChapSelect) bibChapSelect.innerHTML = `<option value="">Kap...</option>`;
                
                const res = await fetch(`/api/bible/bibles/${bibleId}/books/${bookId}/chapters`);
                const payload = await res.json();
                const chapters = payload.data || payload || [];
                
                if (bibChapSelect) bibChapSelect.innerHTML = `<option value="">Kapittel</option>` + chapters.map(c => `
                    <option value="${c.id}">${c.number}</option>
                `).join('');
                bibChapSelect.disabled = false;

                if (autoSelect && chapters.length > 0) {
                    // Pre-select Chapter 1, fallback to first chapter
                    const defaultChapter = chapters.find(c => c.number === '1' || c.number === 1) || chapters[0];
                    bibChapSelect.value = defaultChapter.id;
                    await loadVerses(bibleId, defaultChapter.id);
                }
            } catch (e) {
                console.error("Bible widget loadChapters error:", e);
            }
        };

        bibTransSelect?.addEventListener('change', () => {
            const bibId = bibTransSelect.value;
            if (bibId) loadBooks(bibId, true);
        });

        bibBookSelect?.addEventListener('change', () => {
            const bibId = bibTransSelect.value;
            const bookId = bibBookSelect.value;
            if (bibId && bookId) loadChapters(bibId, bookId, true);
        });

        bibChapSelect?.addEventListener('change', () => {
            const bibId = bibTransSelect.value;
            const chapId = bibChapSelect.value;
            if (bibId && chapId) loadVerses(bibId, chapId);
        });

        // Trigger initial data load
        loadBibleData();



        // Setup Live Zoom Countdown Timer
        if (window._playerCountdownInterval) {
            clearInterval(window._playerCountdownInterval);
            window._playerCountdownInterval = null;
        }

        const countdownEl = container.querySelector('#zoom-countdown');
        if (countdownEl) {
            const targetTime = parseInt(countdownEl.getAttribute('data-target'), 10);
            
            const updateTimer = () => {
                const el = document.getElementById('zoom-countdown');
                if (!el) {
                    if (window._playerCountdownInterval) {
                        clearInterval(window._playerCountdownInterval);
                        window._playerCountdownInterval = null;
                    }
                    return;
                }

                const now = Date.now();
                const diff = targetTime - now;
                
                if (diff <= 0) {
                    el.innerHTML = '<span style="color: #ef4444; font-weight: 700; display: inline-flex; align-items: center; gap: 6px;"><span class="material-symbols-outlined hkm-live-pulse" style="font-size: 16px; color: #ef4444;">radio_button_checked</span> LIVE NÅ</span>';
                    if (window._playerCountdownInterval) {
                        clearInterval(window._playerCountdownInterval);
                        window._playerCountdownInterval = null;
                    }
                    return;
                }
                
                const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((diff % (1000 * 60)) / 1000);
                
                let timeStr = '';
                if (days > 0) {
                    timeStr += `${days}d ${hours}t ${minutes}m`;
                } else if (hours > 0) {
                    timeStr += `${hours}t ${minutes}m ${seconds}s`;
                } else {
                    timeStr += `${minutes}m ${seconds}s`;
                }
                
                el.textContent = timeStr;
            };
            
            updateTimer();
            window._playerCountdownInterval = setInterval(updateTimer, 1000);
        }
    }

    async renderOverview(container) {
        const name = (this.profileData && (this.profileData.displayName || this.profileData.name)) || this.currentUser?.displayName || 'Medlem';
        container.innerHTML = `
            <div class="ms-overview-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px;">
                <div class="hkm-card" style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: white; border-radius: 20px; padding: 28px; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.15);">
                    <span style="font-size: 12px; font-weight: 800; color: #fb923c; text-transform: uppercase; letter-spacing: 0.08em;">VELKOMMEN TILBAKE</span>
                    <h2 style="font-size: 26px; font-weight: 800; color: white; margin: 8px 0 12px;">Velkommen, ${name}!</h2>
                    <p style="color: #cbd5e1; margin-bottom: 20px; line-height: 1.6;">Velkommen til din personlige HKM-portal. Her har du tilgang til dine kurs, leseplaner, notater og bønnevegg.</p>
                    <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                        <button class="btn btn-primary" onclick="if (window.minSideApp) window.minSideApp.loadView('courses'); else if (window.minSideManager) window.minSideManager.loadView('courses');">
                            <span class="material-symbols-outlined">school</span> Mine kurs
                        </button>
                        <button class="btn btn-secondary" style="background: rgba(255,255,255,0.15); color: white; border: none; border-radius: 8px; padding: 10px 16px; font-weight: 600; cursor: pointer;" onclick="if (window.minSideApp) window.minSideApp.loadView('reading-plans'); else if (window.minSideManager) window.minSideManager.loadView('reading-plans');">
                            <span class="material-symbols-outlined">auto_stories</span> Leseplaner
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    async renderCourses(container) {
        container.innerHTML = `<div class="loading-state" style="padding: 40px; text-align: center;"><div class="spinner"></div> Laster dine kurs...</div>`;
        try {
            const snap = await firebase.firestore().collection('courses').get();
            let courses = [];
            snap.forEach(d => courses.push({ id: d.id, ...d.data() }));

            if (courses.length === 0) {
                container.innerHTML = `
                    <div class="empty-state" style="padding: 60px; text-align: center;">
                        <span class="material-symbols-outlined" style="font-size: 48px; color: #94a3b8;">school</span>
                        <h3 style="margin-top: 12px; color: #1e293b;">Ingen kurs tilgjengelig</h3>
                        <p style="color: #64748b;">Sjekk ut kursene våre på nettsiden.</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = `
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 24px;">
                    ${courses.map(c => `
                        <div class="hkm-card" style="border-radius: 16px; overflow: hidden; padding: 0; cursor: pointer;" onclick="window.location.href='/kurs-detaljer?id=${c.id}'">
                            <img src="${c.coverUrl || c.thumbnailUrl || '/img/bible-timeline-hero.webp'}" style="width: 100%; height: 160px; object-fit: cover;">
                            <div style="padding: 20px;">
                                <h3 style="font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 8px;">${c.title || 'Uten tittel'}</h3>
                                <p style="font-size: 14px; color: #64748b; margin-bottom: 16px; line-height: 1.5;">${c.excerpt || c.description || ''}</p>
                                <a href="/kurs-detaljer?id=${c.id}" class="btn btn-primary btn-sm" style="width: 100%; text-align: center; justify-content: center;">Åpne kurs</a>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        } catch (e) {
            console.error("renderCourses error:", e);
            container.innerHTML = `<div class="empty-state">Kunne ikke laste kurs.</div>`;
        }
    }

    async renderProfile(container) {
        const user = this.currentUser || {};
        container.innerHTML = `
            <div class="hkm-card" style="max-width: 600px; border-radius: 20px; padding: 28px;">
                <h3 style="font-size: 20px; font-weight: 700; color: #0f172a; margin-bottom: 20px;">Min Profil</h3>
                <div style="display: flex; flex-direction: column; gap: 16px;">
                    <div>
                        <label style="font-size: 13px; font-weight: 600; color: #64748b; display: block; margin-bottom: 4px;">Navn</label>
                        <input type="text" value="${user.displayName || (this.profileData && this.profileData.name) || ''}" disabled style="width: 100%; padding: 12px; border: 1px solid #e2e8f0; border-radius: 10px; background: #f8fafc; color: #334155;">
                    </div>
                    <div>
                        <label style="font-size: 13px; font-weight: 600; color: #64748b; display: block; margin-bottom: 4px;">E-post</label>
                        <input type="email" value="${user.email || ''}" disabled style="width: 100%; padding: 12px; border: 1px solid #e2e8f0; border-radius: 10px; background: #f8fafc; color: #334155;">
                    </div>
                </div>
            </div>
        `;
    }

    // ──────────────────────────────────────────────────────────
    // READING PLANS & DAILY DEVOTIONAL
    // ──────────────────────────────────────────────────────────

    async renderReadingPlans(container) {
        const uid = this.currentUser?.uid;
        if (!uid) {
            container.innerHTML = `
                <div class="empty-state">
                    <span class="material-symbols-outlined">lock</span>
                    <h3>Logg inn</h3>
                    <p>Du må være logget inn for å se dine leseplaner.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="ms-full-width">
                <div class="loading-state">
                    <div class="spinner"></div>
                </div>
            </div>
        `;

        // Migrate/merge guest progress from localStorage to Firestore
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('hkm_reading_plan_progress_')) {
                    const planId = key.substring('hkm_reading_plan_progress_'.length);
                    try {
                        const localProgress = localStorage.getItem(key);
                        if (localProgress) {
                            const localData = JSON.parse(localProgress);
                            
                            // Check if document exists in Firestore
                            const docRef = firebase.firestore()
                                .collection('users')
                                .doc(uid)
                                .collection('reading_plans')
                                .doc(planId);
                            
                            const docSnap = await docRef.get();
                            let mergedData = localData;
                            
                            if (docSnap.exists) {
                                const firestoreData = docSnap.data();
                                mergedData = { ...firestoreData };
                                
                                // Merge completedDays
                                if (localData.completedDays && Array.isArray(localData.completedDays)) {
                                    mergedData.completedDays = mergedData.completedDays || [];
                                    for (const day of localData.completedDays) {
                                        if (!mergedData.completedDays.includes(day)) {
                                            mergedData.completedDays.push(day);
                                        }
                                    }
                                }
                                
                                // Merge reflections
                                if (localData.reflections && typeof localData.reflections === 'object') {
                                    mergedData.reflections = mergedData.reflections || {};
                                    for (const day of Object.keys(localData.reflections)) {
                                        if (!mergedData.reflections[day]) {
                                            mergedData.reflections[day] = localData.reflections[day];
                                        }
                                    }
                                }
                                
                                // Merge currentDay
                                if (localData.currentDay > (mergedData.currentDay || 1)) {
                                    mergedData.currentDay = localData.currentDay;
                                }
                            }
                            
                            mergedData.lastActiveAt = firebase.firestore.FieldValue.serverTimestamp();
                            
                            console.log(`[minside.js] Migrating/Merging plan ${planId} progress to Firestore:`, mergedData);
                            await docRef.set(mergedData, { merge: true });
                            localStorage.removeItem(key);
                            // Adjust index because we removed an item
                            i--;
                        }
                    } catch (err) {
                        console.warn(`[minside.js] Failed to migrate guest progress for ${planId}:`, err);
                    }
                }
            }
        } catch (storageError) {
            console.warn('[minside.js] localStorage guest progress migration failed:', storageError);
        }

        // Check if there is a start parameter in hash
        const hash = window.location.hash;
        let startPlanId = null;
        if (hash.includes('?')) {
            const queryPart = hash.split('?')[1];
            const params = new URLSearchParams(queryPart);
            startPlanId = params.get('start');
        }

        if (startPlanId) {
            try {
                // Auto enroll user
                const ref = firebase.firestore()
                    .collection('users')
                    .doc(uid)
                    .collection('reading_plans')
                    .doc(startPlanId);
                
                await ref.set({
                    planId: startPlanId,
                    currentDay: 1,
                    completedDays: [],
                    startedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    lastActiveAt: firebase.firestore.FieldValue.serverTimestamp(),
                    completed: false,
                    reflections: {}
                }, { merge: true });
                
                // Clear query params from hash
                window.location.hash = 'reading-plans';
            } catch (err) {
                console.error("Auto enrollment failed:", err);
            }
        }

        // Fetch user active reading plan
        let activeUserPlan = null;
        let activeGlobalPlan = null;
        
        try {
            const snap = await firebase.firestore()
                .collection('users')
                .doc(uid)
                .collection('reading_plans')
                .where('completed', '==', false)
                .orderBy('lastActiveAt', 'desc')
                .limit(1)
                .get();

            if (!snap.empty) {
                activeUserPlan = snap.docs[0].data();
                
                const globalSnap = await firebase.firestore()
                    .collection('reading_plans')
                    .doc(activeUserPlan.planId)
                    .get();
                
                if (globalSnap.exists) {
                    activeGlobalPlan = globalSnap.data();
                }
            }
        } catch (e) {
            console.error("Error fetching user active plan:", e);
        }

        // If user has an active plan, render progress view
        if (activeUserPlan && activeGlobalPlan) {
            this.renderActivePlanProgress(container, activeUserPlan, activeGlobalPlan);
            return;
        }

        // Otherwise render list of available plans
        this.renderAllAvailablePlans(container);
    }

    renderActivePlanProgress(container, userPlan, globalPlan) {
        const currentDayNum = userPlan.currentDay || 1;
        const totalDays = globalPlan.durationDays || globalPlan.days.length;
        const completedDays = userPlan.completedDays || [];
        const progressPct = Math.round((completedDays.length / totalDays) * 100);

        const currentDayConfig = globalPlan.days.find(d => d.dayNumber === currentDayNum) || globalPlan.days[0];

        const readingStreak = this.profileData?.readingStreak || 0;
        const streakHtml = readingStreak > 0 ? `
            <div style="display: inline-flex; align-items: center; gap: 6px; background: rgba(209, 125, 57, 0.08); border: 1px solid rgba(209, 125, 57, 0.2); padding: 6px 12px; border-radius: 12px; font-size: 13px; font-weight: 700; color: #bd4f2a;">
                <span class="material-symbols-outlined" style="font-size: 18px; color: #d17d39;">local_fire_department</span>
                <span>${readingStreak} dagers streak! 🔥</span>
            </div>
        ` : '';

        const certificateHtml = userPlan.completed ? `
            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #f1f5f9; display: flex; justify-content: flex-start;">
                <button class="btn btn-outline" id="btn-download-cert" style="display: inline-flex; align-items: center; gap: 8px; font-size: 13px; border-color: #10b981; color: #10b981; border-radius: 10px; font-weight: 700; padding: 8px 16px;">
                    <span class="material-symbols-outlined" style="font-size: 18px;">workspace_premium</span>
                    Vis / Skriv ut fullføringsbevis
                </button>
            </div>
        ` : '';

        let syncBannerHtml = '';
        if (!userPlan.isPreview) {
            // Auto-repair missing startedAt field
            if (!userPlan.startedAt) {
                const fallbackDate = userPlan.lastActiveAt ? (userPlan.lastActiveAt.toDate ? userPlan.lastActiveAt.toDate() : new Date(userPlan.lastActiveAt)) : new Date();
                userPlan.startedAt = fallbackDate;
                
                const uid = this.currentUser?.uid;
                if (uid) {
                    firebase.firestore()
                        .collection('users')
                        .doc(uid)
                        .collection('reading_plans')
                        .doc(userPlan.planId || globalPlan.id)
                        .set({
                            startedAt: firebase.firestore.Timestamp.fromDate(fallbackDate)
                        }, { merge: true }).catch(err => console.warn("Failed to set fallback startedAt:", err));
                }
            }

            const startedAtDate = userPlan.startedAt.toDate ? userPlan.startedAt.toDate() : new Date(userPlan.startedAt);
            const today = new Date();
            const date1 = new Date(startedAtDate.getFullYear(), startedAtDate.getMonth(), startedAtDate.getDate());
            const date2 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const diffTime = date2 - date1;
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            const expectedDay = Math.min(diffDays + 1, totalDays);

            if (currentDayNum < expectedDay) {
                const daysBehind = expectedDay - currentDayNum;
                syncBannerHtml = `
                    <div class="ms-rp-sync-banner" style="background: #fffbeb; border: 1.5px solid #fef3c7; border-radius: 20px; padding: 20px; margin-bottom: 24px; display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; box-shadow: 0 2px 10px rgba(245, 158, 11, 0.05);">
                        <div style="display: flex; align-items: flex-start; gap: 12px; max-width: 550px;">
                            <span class="material-symbols-outlined" style="color: #d97706; font-size: 24px; margin-top: 2px;">info</span>
                            <div style="text-align: left;">
                                <h4 style="font-size: 15px; font-weight: 700; color: #92400e; margin: 0 0 4px 0;">Du ligger bak tidsplanen</h4>
                                <p style="font-size: 13.5px; color: #b45309; margin: 0; line-height: 1.5;">
                                    Du er på <strong>Dag ${currentDayNum}</strong>, men kalenderen din tilsier <strong>Dag ${expectedDay}</strong> (${daysBehind} dager bak).
                                </p>
                            </div>
                        </div>
                        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                            <button class="btn btn-outline btn-sm" onclick="window.minSideManager.shiftPlanDates('${globalPlan.id}', ${currentDayNum})" style="border-color: #d97706; color: #d97706; font-size: 12.5px; font-weight: 600; background: #ffffff; display: inline-flex; align-items: center; gap: 4px;">
                                <span class="material-symbols-outlined" style="font-size: 16px;">restore</span>
                                Skyv datoer (YouVersion-stil)
                            </button>
                            <button class="btn btn-primary btn-sm" onclick="window.minSideManager.jumpToToday('${globalPlan.id}', ${expectedDay})" style="background: #d97706; border-color: #d97706; color: #ffffff; font-size: 12.5px; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;">
                                <span class="material-symbols-outlined" style="font-size: 16px;">fast_forward</span>
                                Hopp til i dag
                            </button>
                        </div>
                    </div>
                `;
            }
        }

        const previewBannerHtml = userPlan.isPreview ? `
            <div class="preview-banner" style="background: rgba(209, 125, 57, 0.08); border: 1px solid rgba(209, 125, 57, 0.2); padding: 12px 24px; border-radius: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; width: 100%;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span class="material-symbols-outlined" style="color: #d17d39;">visibility</span>
                    <span style="font-weight: 700; color: #bd4f2a; font-size: 14px;">Du forhåndsviser denne leseplanen</span>
                </div>
                <button class="btn btn-primary btn-sm" onclick="window.minSideManager.switchToPlan('${globalPlan.id}')" style="background: #d17d39; border-color: #d17d39; font-size: 13px; height: 32px; display: inline-flex; align-items: center; justify-content: center; font-weight: 600; padding: 0 16px; margin: 0 !important;">Velg plan</button>
            </div>
        ` : '';

        container.innerHTML = `
            <div class="ms-reading-plan-dashboard">
                ${previewBannerHtml}
                ${syncBannerHtml}
                <!-- Plan Header & Progress Card -->
                <div class="ms-rp-card-header" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 20px; padding: 24px; margin-bottom: 24px; box-shadow: 0 4px 20px rgba(15, 23, 42, 0.02);">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px; margin-bottom: 16px;">
                        <div>
                            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px; flex-wrap: wrap;">
                                <h2 style="font-size: 22px; font-weight: 700; color: #d17d39; margin: 0;">${globalPlan.title}</h2>
                                ${streakHtml}
                            </div>
                            <p style="font-size: 14px; color: #64748b; margin: 0; line-height: 1.5; max-width: 600px;">${globalPlan.description || ''}</p>
                        </div>
                        <button class="btn btn-secondary btn-sm" id="btn-change-plan">${userPlan.isPreview ? 'Gå tilbake' : 'Bytt leseplan'}</button>
                    </div>

                    <!-- Progress Bar -->
                    <div style="margin-top: 24px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 13px; font-weight: 600; color: #475569; margin-bottom: 8px; flex-wrap: wrap; gap: 8px;">
                            <span>Din Fremdrift</span>
                            <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                                <button onclick="window.minSideManager.openAdjustPlanDatesModal('${globalPlan.id}', ${currentDayNum})" style="background: none; border: none; color: #d17d39; font-size: 12px; font-weight: 700; display: inline-flex; align-items: center; padding: 0; cursor: pointer; text-decoration: underline;">
                                    Tilpass datoer
                                </button>
                                <span>${progressPct}% fullført (${completedDays.length}/${totalDays} dager)</span>
                            </div>
                        </div>
                        <div style="height: 8px; background: #e2e8f0; border-radius: 99px; overflow: hidden;">
                            <div style="height: 100%; background: linear-gradient(135deg, #d17d39 0%, #bd4f2a 100%); border-radius: 99px; width: ${progressPct}%; transition: width 0.4s ease;"></div>
                        </div>
                    </div>

                    ${certificateHtml}
                </div>

                <!-- Main Layout Grid: Left Panel (Active Day), Right Panel (Days Checklist) -->
                <div class="ms-rp-grid">
                    <!-- Left Column: Dagens Andakt / Active Day details -->
                    <div style="display: flex; flex-direction: column; gap: 24px;">
                        <div style="background: var(--card-bg, #ffffff); border: 1px solid var(--border-solid, #e2e8f0); border-radius: 20px; padding: 24px; box-shadow: 0 4px 20px rgba(15, 23, 42, 0.02);">
                            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px;">
                                <span class="material-symbols-outlined" style="color: #bd4f2a; font-size: 20px;">event</span>
                                <span style="font-size: 12px; font-weight: 700; color: #bd4f2a; text-transform: uppercase; letter-spacing: 0.05em;">Dagens Andakt</span>
                            </div>
                            
                            <h3 style="font-size: 18px; font-weight: 700; color: var(--text-main, #0f172a); margin: 0 0 12px 0;">Dag ${currentDayNum}: ${currentDayConfig?.verses}</h3>
                            
                            <!-- Action Row -->
                            <div style="display: flex; gap: 12px; margin-top: 20px; flex-wrap: wrap;">
                                <a href="/bibel?ref=${encodeURIComponent(currentDayConfig?.verses)}" class="btn btn-outline" style="display: inline-flex; align-items: center; gap: 8px; font-size: 13px;">
                                    <span class="material-symbols-outlined">menu_book</span>
                                    Les i Bibelen
                                </a>
                                <button class="btn btn-primary" id="btn-start-devotional" style="display: inline-flex; align-items: center; gap: 8px; font-size: 13px; background: #d17d39; border-color: #d17d39; color: #ffffff;">
                                    <span class="material-symbols-outlined">auto_stories</span>
                                    Start Dagens Andakt
                                </button>
                            </div>
                        </div>

                        <!-- Prayer & Resources Preview -->
                        <div style="background: var(--card-bg, #ffffff); border: 1px solid var(--border-solid, #e2e8f0); border-radius: 20px; padding: 24px; box-shadow: 0 4px 20px rgba(15, 23, 42, 0.02);">
                            <h3 style="font-size: 15px; font-weight: 700; color: #d17d39; margin: 0 0 16px 0;">Bønnefokus & Fordypning</h3>
                            
                            <div class="ms-rp-prayer-focus-box" style="background: var(--main-bg, #f8fafc); border-left: 4px solid #d17d39; padding: 16px; border-radius: 0 12px 12px 0; margin-bottom: 20px; font-style: italic; font-size: 14px; line-height: 1.6; color: var(--text-muted, #475569);">
                                "${currentDayConfig?.prayerFocus || 'Be over ordene du har lest i dag.'}"
                            </div>
                            
                            <h4 style="font-size: 13px; font-weight: 700; color: var(--text-muted, #475569); margin: 0 0 12px 0;">Ressurser for dagen:</h4>
                            <div style="display: flex; flex-direction: column; gap: 8px;">
                                ${currentDayConfig?.resources && currentDayConfig.resources.length > 0 ? 
                                    currentDayConfig.resources.map(res => `
                                    <a href="${res.url || '#'}" target="_blank" style="display: flex; align-items: center; gap: 12px; padding: 12px; border: 1px solid var(--border-solid, #f1f5f9); border-radius: 10px; text-decoration: none; color: inherit; transition: all 0.2s;" onmouseover="this.style.borderColor='var(--border-color, #cbd5e1)'" onmouseout="this.style.borderColor='var(--border-solid, #f1f5f9)'">
                                        <span class="material-symbols-outlined" style="color: var(--text-muted, #cbd5e1); font-size: 20px;">
                                            ${res.type === 'video' ? 'play_circle' : res.type === 'podcast' ? 'podcasts' : 'article'}
                                        </span>
                                        <div>
                                            <div style="font-size: 13px; font-weight: 600; color: var(--text-main, #0f172a);">${res.title}</div>
                                            <div style="font-size: 10px; color: var(--text-muted, #94a3b8); text-transform: uppercase; font-weight: 700; margin-top: 1px;">${res.type}</div>
                                        </div>
                                    </a>
                                    `).join('') : `
                                    <p style="font-size: 13px; color: var(--text-muted, #94a3b8); font-style: italic; margin: 0;">Ingen tilknyttede ressurser.</p>
                                    `
                                }
                            </div>
                        </div>
                    </div>

                    <!-- Right Column: Checklist of days -->
                    <div class="ms-rp-checklist-card">
                        <h3 style="font-size: 15px; font-weight: 700; color: #d17d39; margin: 0 0 16px 0;">Alle dager</h3>
                        
                        <div style="display: flex; flex-direction: column; gap: 8px;">
                            ${globalPlan.days.map(d => {
                                const isCompleted = completedDays.includes(d.dayNumber);
                                const isActive = d.dayNumber === currentDayNum;
                                return `
                                <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px; border-radius: 12px; border: 1px solid ${isActive ? '#d17d39' : 'var(--border-solid, #f1f5f9)'}; background: ${isActive ? 'rgba(209, 125, 57, 0.05)' : 'var(--card-bg, #ffffff)'}; cursor: pointer; transition: all 0.2s;" class="ms-rp-day-row" onclick="window.minSideManager.selectDayPreview('${globalPlan.id}', ${d.dayNumber})">
                                    <div style="display: flex; align-items: center; gap: 12px;">
                                        <div style="width: 28px; height: 28px; border-radius: 50%; border: 2px solid ${isCompleted ? '#10b981' : isActive ? '#d17d39' : 'var(--border-solid, #cbd5e1)'}; background: ${isCompleted ? '#10b981' : 'transparent'}; display: flex !important; align-items: center !important; justify-content: center !important; color: ${isCompleted ? '#ffffff' : 'var(--text-muted, #cbd5e1)'}; flex-shrink: 0; box-sizing: border-box !important;">
                                            ${isCompleted ? '<span class="material-symbols-outlined" style="font-size: 16px; font-weight: bold; display: flex !important; align-items: center !important; justify-content: center !important; line-height: 1 !important; width: 100% !important; height: 100% !important; margin: 0 !important; padding: 0 !important;">check</span>' : `<span style="font-size: 11px; font-weight: 700; color: ${isActive ? '#d17d39' : 'var(--text-main, #475569)'}; display: flex !important; align-items: center !important; justify-content: center !important; line-height: 1 !important; width: 100% !important; height: 100% !important; margin: 0 !important; padding: 0 !important;">${d.dayNumber}</span>`}
                                        </div>
                                        <div>
                                            <div style="font-size: 13px; font-weight: 600; color: var(--text-main, #0f172a);">${d.verses}</div>
                                        </div>
                                    </div>
                                    <span class="material-symbols-outlined" style="color: var(--text-muted, #94a3b8); font-size: 18px;">chevron_right</span>
                                </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Bind events
        container.querySelector('#btn-change-plan').onclick = () => {
            this.renderAllAvailablePlans(container);
        };

        container.querySelector('#btn-start-devotional').onclick = async () => {
            const lang = document.documentElement.lang || 'no';
            let bibleUrl = `/bibel.html?plan=${globalPlan.id}&day=${currentDayNum}`;
            if (lang === 'en') {
                bibleUrl = `/en/bibel.html?plan=${globalPlan.id}&day=${currentDayNum}`;
            } else if (lang === 'es') {
                bibleUrl = `/es/bibel.html?plan=${globalPlan.id}&day=${currentDayNum}`;
            }

            if (userPlan.isPreview) {
                const uid = this.currentUser?.uid;
                if (uid) {
                    try {
                        const ref = firebase.firestore()
                            .collection('users')
                            .doc(uid)
                            .collection('reading_plans')
                            .doc(globalPlan.id);
                            
                        await ref.set({
                            lastActiveAt: firebase.firestore.FieldValue.serverTimestamp()
                        }, { merge: true });
                    } catch (e) {
                        console.error("Failed to enroll in preview before redirect:", e);
                    }
                }
            }
            window.location.href = bibleUrl;
        };

        if (container.querySelector('#btn-download-cert')) {
            container.querySelector('#btn-download-cert').onclick = () => {
                this.showCompletionCertificate(globalPlan.title);
            };
        }
    }

    async renderAllAvailablePlans(container) {
        container.innerHTML = `<div class="ms-full-width"><div class="loading-state"><div class="spinner"></div></div></div>`;
        
        const uid = this.currentUser?.uid;
        if (!uid) {
            container.innerHTML = `
                <div class="empty-state">
                    <span class="material-symbols-outlined">lock</span>
                    <h3>Logg inn</h3>
                    <p>Du må være logget inn for å se dine leseplaner.</p>
                </div>
            `;
            return;
        }

        let startedPlans = [];
        try {
            // Get started plans for this user
            const snap = await firebase.firestore()
                .collection('users')
                .doc(uid)
                .collection('reading_plans')
                .get();

            for (const doc of snap.docs) {
                const userPlanData = doc.data();
                const globalDoc = await firebase.firestore()
                    .collection('reading_plans')
                    .doc(userPlanData.planId)
                    .get();
                
                if (globalDoc.exists) {
                    startedPlans.push({
                        id: globalDoc.id,
                        ...globalDoc.data(),
                        userPlan: userPlanData
                    });
                }
            }
        } catch (e) {
            console.error("Error loading started plans:", e);
        }

        if (startedPlans.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="padding: 40px 20px; text-align: center;">
                    <span class="material-symbols-outlined" style="font-size: 48px; color: #cbd5e1; margin-bottom: 16px;">auto_stories</span>
                    <h3 style="font-size: 16px; font-weight: 700; color: #d17d39; margin: 0 0 8px 0;">Ingen påbegynte leseplaner</h3>
                    <p style="font-size: 14px; color: #64748b; margin: 0 0 20px 0;">Du har ikke startet noen leseplaner ennå.</p>
                    <a href="/leseplaner.html" class="btn btn-primary" style="background: #d17d39; border-color: #d17d39; display: inline-flex; align-items: center; gap: 8px;">
                        <span class="material-symbols-outlined">explore</span> Finn en leseplan
                    </a>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div style="padding: 8px;">
                <h3 style="font-size: 18px; font-weight: 700; color: #d17d39; margin-bottom: 20px;">Dine påbegynte leseplaner</h3>
                <div class="courses-grid">
                    ${startedPlans.map(p => {
                        const totalDays = p.durationDays || p.days.length;
                        const completedDays = p.userPlan.completedDays || [];
                        const progressPct = Math.round((completedDays.length / totalDays) * 100);
                        
                        return `
                        <div class="reading-plan-card-started">
                            <div class="course-body">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                                    <span class="course-badge" style="position: relative !important; top: auto !important; left: auto !important; margin: 0 !important; box-shadow: none !important; background: rgba(209, 125, 57, 0.1); color: #d17d39; font-weight: 700;">${totalDays} dager</span>
                                    <span style="font-size: 12px; font-weight: 600; color: #d17d39;">${progressPct}% fullført</span>
                                </div>
                                <div class="course-title">${p.title}</div>
                                <div class="course-desc" style="height: 60px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;">${p.description || ''}</div>
                                
                                <div class="progress-track">
                                    <div class="progress-bar" style="width: ${progressPct}%;"></div>
                                </div>
                            </div>
                            <div class="card-actions">
                                <button class="btn btn-outline btn-sm" onclick="window.minSideManager.previewPlanDetails('${p.id}')" style="flex: 1;">Se dager</button>
                                <button class="btn btn-primary btn-sm" onclick="window.minSideManager.switchToPlan('${p.id}')" style="flex: 1; background: #d17d39; border-color: #d17d39;">Velg plan</button>
                            </div>
                        </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    async switchToPlan(planId) {
        const uid = this.currentUser?.uid;
        if (!uid) return;
        
        try {
            const ref = firebase.firestore()
                .collection('users')
                .doc(uid)
                .collection('reading_plans')
                .doc(planId);
                
            await ref.set({
                lastActiveAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            
            this.loadView('reading-plans');
        } catch (e) {
            console.error("Failed to switch plan:", e);
        }
    }

    async previewPlanDetails(planId) {
        const container = document.getElementById('view-container') || document.getElementById('content-area');
        if (!container) return;

        container.innerHTML = `<div class="ms-full-width"><div class="loading-state"><div class="spinner"></div></div></div>`;

        try {
            const snap = await firebase.firestore().collection('reading_plans').doc(planId).get();
            if (!snap.exists) {
                this.renderAllAvailablePlans(container);
                return;
            }
            const plan = snap.data();

            let userPlanData = {
                planId: planId,
                currentDay: 1,
                completedDays: [],
                completed: false,
                isPreview: true
            };

            const uid = this.currentUser?.uid;
            if (uid) {
                const userPlanSnap = await firebase.firestore()
                    .collection('users')
                    .doc(uid)
                    .collection('reading_plans')
                    .doc(planId)
                    .get();
                if (userPlanSnap.exists) {
                    userPlanData = { ...userPlanSnap.data(), isPreview: true };
                }
            }

            this.renderActivePlanProgress(container, userPlanData, { id: planId, ...plan });
        } catch (err) {
            console.error("Error loading preview:", err);
            this.renderAllAvailablePlans(container);
        }
    }

    async switchToPlanAndStart(globalPlan, dayNum) {
        const uid = this.currentUser?.uid;
        if (!uid) return;
        try {
            const ref = firebase.firestore()
                .collection('users')
                .doc(uid)
                .collection('reading_plans')
                .doc(globalPlan.id);
                
            await ref.set({
                lastActiveAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            
            this.openDevotionalWizard(globalPlan, dayNum);
        } catch (e) {
            console.error("Failed to switch plan and start:", e);
        }
    }

    async shiftPlanDates(planId, currentDay) {
        const uid = this.currentUser?.uid;
        if (!uid) return;
        
        try {
            const today = new Date();
            const daysToSubtract = currentDay - 1;
            const newStartedAt = new Date(today.getFullYear(), today.getMonth(), today.getDate() - daysToSubtract, 12, 0, 0);
            
            const ref = firebase.firestore()
                .collection('users')
                .doc(uid)
                .collection('reading_plans')
                .doc(planId);
                
            await ref.set({
                currentDay: currentDay,
                startedAt: firebase.firestore.Timestamp.fromDate(newStartedAt),
                lastActiveAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            
            this.loadView('reading-plans');
        } catch (e) {
            console.error("Failed to shift plan dates:", e);
        }
    }

    async jumpToToday(planId, expectedDay) {
        const uid = this.currentUser?.uid;
        if (!uid) return;
        
        try {
            const ref = firebase.firestore()
                .collection('users')
                .doc(uid)
                .collection('reading_plans')
                .doc(planId);
                
            await ref.set({
                currentDay: expectedDay,
                lastActiveAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            
            this.loadView('reading-plans');
        } catch (e) {
            console.error("Failed to jump to expected day:", e);
        }
    }

    openAdjustPlanDatesModal(planId, currentDay) {
        const modal = document.createElement('div');
        modal.className = 'modal modal-open';
        modal.style.cssText = 'position:fixed; inset:0; background:rgba(15,23,42,0.3); backdrop-filter:blur(4px); display:flex; align-items:center; justify-content:center; z-index:9999; padding:16px;';
        
        modal.innerHTML = `
            <div style="background:#ffffff; border-radius:20px; max-width:450px; width:100%; padding:24px; box-shadow:0 10px 25px rgba(0,0,0,0.1); border:1px solid #e2e8f0; text-align:left;">
                <div style="display:flex; align-items:center; gap:12px; margin-bottom:16px;">
                    <div style="background:#fffbeb; border-radius:50%; width:40px; height:40px; display:flex; align-items:center; justify-content:center;">
                        <span class="material-symbols-outlined" style="color:#d97706; font-size:24px;">restore</span>
                    </div>
                    <h3 style="font-size:18px; font-weight:700; color:#d17d39; margin:0;">Tilpass leseplanen</h3>
                </div>
                <p style="font-size:14px; color:#475569; line-height:1.5; margin:0 0 20px 0;">
                    Vil du forskyve leseplanens kalender? Dette setter <strong>Dag ${currentDay}</strong> til å være i dag. Planens tidsplan justeres fremover slik at du blir "i rute", uten at du mister fremdriften din.
                </p>
                <div style="display:flex; justify-content:flex-end; gap:12px;">
                    <button class="btn btn-outline" onclick="this.closest('.modal').remove()" style="font-size:13px; height:36px; padding:0 16px;">Avbryt</button>
                    <button class="btn btn-primary" onclick="window.minSideManager.shiftPlanDates('${planId}', ${currentDay}); this.closest('.modal').remove()" style="background:#d97706; border-color:#d97706; color:#ffffff; font-size:13px; height:36px; padding:0 16px;">Juster datoer</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    async selectDayPreview(planId, dayNumber) {
        const snap = await firebase.firestore().collection('reading_plans').doc(planId).get();
        if (!snap.exists) return;
        const plan = snap.data();
        const dayConfig = plan.days.find(d => d.dayNumber === dayNumber);
        if (!dayConfig) return;

        let modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 500px; border-radius: 24px; padding: 24px;">
                <div class="modal-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 16px;">
                    <h3 style="font-size: 16px; font-weight: 700; color: #d17d39; margin:0;">Dag ${dayNumber}: Detaljer</h3>
                    <span class="material-symbols-outlined close" style="cursor:pointer;" onclick="this.closest('.modal').remove()">close</span>
                </div>
                
                <div style="margin-bottom: 16px;">
                    <div style="font-size: 11px; font-weight: 700; color: #cbd5e1; text-transform: uppercase; margin-bottom: 4px;">Skriftsted</div>
                    <div style="font-size: 14px; font-weight: 600; color: #0f172a;">${dayConfig.verses}</div>
                </div>

                <div style="margin-bottom: 16px;">
                    <div style="font-size: 11px; font-weight: 700; color: #cbd5e1; text-transform: uppercase; margin-bottom: 4px;">Bønnefokus</div>
                    <div style="font-size: 13px; font-style: italic; color: #475569; background:#f8fafc; padding: 12px; border-radius: 8px; line-height: 1.5;">
                        "${dayConfig.prayerFocus || 'Ingen spesifikt bønnefokus konfigurert.'}"
                    </div>
                </div>

                <div style="margin-bottom: 20px;">
                    <div style="font-size: 11px; font-weight: 700; color: #cbd5e1; text-transform: uppercase; margin-bottom: 6px;">Ressurser</div>
                    <div style="display:flex; flex-direction:column; gap:8px;">
                        ${dayConfig.resources && dayConfig.resources.length > 0 ? 
                            dayConfig.resources.map(res => `
                            <a href="${res.url || '#'}" target="_blank" style="display:flex; align-items:center; gap:8px; font-size: 12px; color: #d17d39; text-decoration: underline;">
                                <span class="material-symbols-outlined" style="font-size:16px;">launch</span>
                                ${res.title} (${res.type})
                            </a>
                            `).join('') : '<span style="font-size:12px; color:#cbd5e1; font-style:italic;">Ingen ressurser</span>'
                        }
                    </div>
                </div>

                <div style="display:flex; gap:12px; justify-content:flex-end;">
                    <button class="btn btn-outline" onclick="this.closest('.modal').remove()">Lukk</button>
                    <button class="btn btn-primary" onclick="window.minSideManager.openDevotionalWizardDirect('${planId}', ${dayNumber}); this.closest('.modal').remove()" style="background: #d17d39; border-color: #d17d39;">Åpne andakt</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    async openDevotionalWizardDirect(planId, dayNumber) {
        const lang = document.documentElement.lang || 'no';
        let bibleUrl = `/bibel.html?plan=${planId}&day=${dayNumber}`;
        if (lang === 'en') {
            bibleUrl = `/en/bibel.html?plan=${planId}&day=${dayNumber}`;
        } else if (lang === 'es') {
            bibleUrl = `/es/bibel.html?plan=${planId}&day=${dayNumber}`;
        }
        window.location.href = bibleUrl;
    }

    async openDevotionalWizard(plan, dayNumber) {
        const dayConfig = plan.days.find(d => d.dayNumber === dayNumber);
        if (!dayConfig) return;

        let modal = document.getElementById('hkm-devotional-modal');
        if (modal) modal.remove();

        modal = document.createElement('div');
        modal.id = 'hkm-devotional-modal';
        modal.className = 'hkm-devotional-overlay';

        document.body.appendChild(modal);

        let scriptureHtml = '<p style="text-align: center; color: #64748b;">Henter bibeltekst...</p>';
        try {
            scriptureHtml = await this.fetchAndFilterVersesText(dayConfig.verses);
        } catch (e) {
            console.error("Failed to fetch scripture text for devotional:", e);
            scriptureHtml = `<p style="text-align: center; color: #ef4444;">Kunne ikke hente bibelteksten for: <strong>${dayConfig.verses}</strong></p>`;
        }

        this.renderDevotionalStep(modal, plan, dayNumber, dayConfig, 1, scriptureHtml);
    }

    async fetchAndFilterVersesText(versesText) {
        const input = versesText.trim().toLowerCase();
        const regex = /^(\d+)?\s*\.?\s*([a-zæøå\s]+)\s*(\d+)(?:\s*[\:\.\s]\s*(\d+)(?:\-(\d+))?)?$/i;
        const match = input.match(regex);

        if (!match) {
            throw new Error("Invalid reference format");
        }

        const prefixNum = match[1] || '';
        const bookNameQuery = match[2].trim();
        const chapterNum = match[3];
        const startVerse = match[4] ? parseInt(match[4], 10) : null;
        const endVerse = match[5] ? parseInt(match[5], 10) : (startVerse || null);

        let fullBookSearchName = prefixNum ? `${prefixNum} ${bookNameQuery}` : bookNameQuery;
        if (fullBookSearchName === 'apg') {
            fullBookSearchName = 'apostlenes';
        }

        // Available Bibles based on language
        const activeLang = document.documentElement.lang || 'no';
        let selectedBibleId = 'OPENBIBLE_NB';
        if (activeLang === 'en') selectedBibleId = 'WEB';
        else if (activeLang === 'es') selectedBibleId = 'RVR1960';

        // Load books to match local name
        const resBooks = await fetch(`/api/bible/bibles/${selectedBibleId}/books`);
        const payloadBooks = await resBooks.json();
        const books = payloadBooks.data || [];

        const matchedBook = books.find(b => {
            const bName = b.name.toLowerCase();
            return bName === fullBookSearchName || bName.startsWith(fullBookSearchName) || bName.includes(fullBookSearchName);
        });

        if (!matchedBook) {
            throw new Error(`Book not found: ${fullBookSearchName}`);
        }

        const chapterId = `${matchedBook.id}_${chapterNum}`;
        const res = await fetch(`/api/bible/bibles/${selectedBibleId}/chapters/${chapterId}`);
        const payload = await res.json();
        
        if (!payload.data || !payload.data.content) {
            throw new Error("Failed to load chapter content");
        }

        const parser = new DOMParser();
        const doc = parser.parseFromString(payload.data.content, 'text/html');
        const paragraphs = doc.querySelectorAll('p');

        let filteredHtml = '';
        let foundAny = false;

        for (const p of paragraphs) {
            const sups = p.querySelectorAll('sup.v');
            if (sups.length > 0) {
                let keepParagraph = false;
                for (const sup of sups) {
                    const vNum = parseInt(sup.innerText.trim(), 10);
                    if (!startVerse || (vNum >= startVerse && vNum <= endVerse)) {
                        keepParagraph = true;
                        foundAny = true;
                    }
                }
                if (keepParagraph) {
                    filteredHtml += p.outerHTML;
                }
            } else if (!startVerse) {
                filteredHtml += p.outerHTML;
            }
        }

        if (!foundAny && startVerse) {
            return payload.data.content;
        }

        return filteredHtml;
    }

    renderDevotionalStep(modal, plan, dayNumber, dayConfig, step, scriptureHtml) {
        modal.innerHTML = '';
        
        const stepContainer = document.createElement('div');
        stepContainer.className = 'hkm-devotional-content';
        modal.appendChild(stepContainer);

        const hasResources = dayConfig.resources && dayConfig.resources.length > 0;
        const totalSteps = hasResources ? 5 : 4;
        let stepDisplay = step;
        if (!hasResources && step > 3) {
            stepDisplay = step - 1;
        }

        const header = document.createElement('div');
        header.style.display = 'flex';
        header.style.justify = 'space-between';
        header.style.alignItems = 'center';
        header.style.marginBottom = '20px';
        header.innerHTML = `
            <div style="font-size: 11px; font-weight: 700; color: #bd4f2a; text-transform: uppercase; letter-spacing: 0.05em;">
                ${plan.title} &bull; Steg ${stepDisplay} av ${totalSteps}
            </div>
            <button style="background: none; border: none; cursor: pointer; color: #64748b; display: flex; align-items: center;" onclick="document.getElementById('hkm-devotional-modal').remove()">
                <span class="material-symbols-outlined">close</span>
            </button>
        `;
        stepContainer.appendChild(header);

        if (step === 1) {
            const title = document.createElement('h3');
            title.className = 'hkm-devotional-step-title';
            title.innerText = `1. Les skriftstedet (${dayConfig.verses})`;
            stepContainer.appendChild(title);

            const scriptureBox = document.createElement('div');
            scriptureBox.className = 'hkm-devotional-text-serif';
            scriptureBox.innerHTML = scriptureHtml;
            stepContainer.appendChild(scriptureBox);

            const actions = document.createElement('div');
            actions.style.display = 'flex';
            actions.style.justify = 'flex-end';
            actions.innerHTML = `
                <button class="hkm-btn-primary" id="btn-devotional-next">
                    Neste: Bønn
                    <span class="material-symbols-outlined">arrow_forward</span>
                </button>
            `;
            stepContainer.appendChild(actions);

            actions.querySelector('#btn-devotional-next').onclick = () => {
                this.renderDevotionalStep(modal, plan, dayNumber, dayConfig, 2, scriptureHtml);
            };

        } else if (step === 2) {
            const title = document.createElement('h3');
            title.className = 'hkm-devotional-step-title';
            title.innerText = '2. Dagens Bønnefokus';
            stepContainer.appendChild(title);

            const prayerBox = document.createElement('div');
            prayerBox.className = 'hkm-devotional-prayer-box';
            prayerBox.innerText = dayConfig.prayerFocus || 'Be i dag over ordene du har lest, og be om visdom og veiledning for dagen.';
            stepContainer.appendChild(prayerBox);

            const actions = document.createElement('div');
            actions.style.display = 'flex';
            actions.style.justify = 'space-between';
            actions.innerHTML = `
                <button class="hkm-btn-secondary" id="btn-devotional-back">
                    Tilbake
                </button>
                <button class="hkm-btn-primary" id="btn-devotional-next">
                    Neste: ${hasResources ? 'Ressurser' : 'Refleksjon'}
                    <span class="material-symbols-outlined">arrow_forward</span>
                </button>
            `;
            stepContainer.appendChild(actions);

            actions.querySelector('#btn-devotional-back').onclick = () => {
                this.renderDevotionalStep(modal, plan, dayNumber, dayConfig, 1, scriptureHtml);
            };
            actions.querySelector('#btn-devotional-next').onclick = () => {
                const targetStep = hasResources ? 3 : 4;
                this.renderDevotionalStep(modal, plan, dayNumber, dayConfig, targetStep, scriptureHtml);
            };

        } else if (step === 3) {
            const title = document.createElement('h3');
            title.className = 'hkm-devotional-step-title';
            title.innerText = '3. Dypere Dykk & Ressurser';
            stepContainer.appendChild(title);

            const desc = document.createElement('p');
            desc.style.fontSize = '14px';
            desc.style.color = '#64748b';
            desc.style.marginBottom = '20px';
            desc.style.lineHeight = '1.5';
            desc.innerText = 'Bruk disse ressursene til å gå dypere i dagens tema:';
            stepContainer.appendChild(desc);

            const resourcesList = document.createElement('div');
            resourcesList.style.display = 'flex';
            resourcesList.style.flexDirection = 'column';
            resourcesList.style.gap = '12px';
            resourcesList.style.marginBottom = '24px';
            
            if (dayConfig.resources && dayConfig.resources.length > 0) {
                dayConfig.resources.forEach(res => {
                    const card = document.createElement('a');
                    card.href = res.url || '#';
                    card.target = '_blank';
                    card.className = 'hkm-rp-card';
                    card.style.textDecoration = 'none';
                    card.style.display = 'block';
                    card.style.margin = '0';
                    card.innerHTML = `
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <span class="material-symbols-outlined" style="color: #d17d39; font-size: 24px;">
                                ${res.type === 'video' ? 'play_circle' : res.type === 'podcast' ? 'podcasts' : 'article'}
                            </span>
                            <div>
                                <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 2px;">${res.title}</div>
                                <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #94a3b8;">${res.type}</div>
                            </div>
                        </div>
                    `;
                    resourcesList.appendChild(card);
                });
            } else {
                resourcesList.innerHTML = `
                    <p style="font-size: 13px; color: #94a3b8; font-style: italic; text-align: center; padding: 20px 0;">
                        Ingen ekstra ressurser tilknyttet denne dagen.
                    </p>
                `;
            }
            stepContainer.appendChild(resourcesList);

            const actions = document.createElement('div');
            actions.style.display = 'flex';
            actions.style.justify = 'space-between';
            actions.innerHTML = `
                <button class="hkm-btn-secondary" id="btn-devotional-back">
                    Tilbake
                </button>
                <button class="hkm-btn-primary" id="btn-devotional-next">
                    Neste: Refleksjon
                    <span class="material-symbols-outlined">arrow_forward</span>
                </button>
            `;
            stepContainer.appendChild(actions);

            actions.querySelector('#btn-devotional-back').onclick = () => {
                this.renderDevotionalStep(modal, plan, dayNumber, dayConfig, 2, scriptureHtml);
            };
            actions.querySelector('#btn-devotional-next').onclick = () => {
                this.renderDevotionalStep(modal, plan, dayNumber, dayConfig, 4, scriptureHtml);
            };

        } else if (step === 4) {
            const title = document.createElement('h3');
            title.className = 'hkm-devotional-step-title';
            title.innerText = '4. Skriv dine refleksjoner';
            stepContainer.appendChild(title);

            const desc = document.createElement('p');
            desc.style.fontSize = '14px';
            desc.style.color = '#64748b';
            desc.style.marginBottom = '16px';
            desc.style.lineHeight = '1.5';
            desc.innerText = 'Noter ned hva Gud talte til deg gjennom ordene du leste, eller skriv en bønn.';
            stepContainer.appendChild(desc);

            const textarea = document.createElement('textarea');
            textarea.className = 'hkm-devotional-reflection-textarea';
            textarea.placeholder = 'Skriv dine tanker her... (Dette lagres også i dine notater på Min Side)';
            stepContainer.appendChild(textarea);

            const actions = document.createElement('div');
            actions.style.display = 'flex';
            actions.style.justify = 'space-between';
            actions.innerHTML = `
                <button class="hkm-btn-secondary" id="btn-devotional-back">
                    Tilbake
                </button>
                <button class="hkm-btn-primary" id="btn-devotional-save">
                    Fullfør og Lagre
                    <span class="material-symbols-outlined">check</span>
                </button>
            `;
            stepContainer.appendChild(actions);

            actions.querySelector('#btn-devotional-back').onclick = () => {
                const targetStep = hasResources ? 3 : 2;
                this.renderDevotionalStep(modal, plan, dayNumber, dayConfig, targetStep, scriptureHtml);
            };
            
            actions.querySelector('#btn-devotional-save').onclick = async () => {
                const text = textarea.value.trim();
                const saveBtn = actions.querySelector('#btn-devotional-save');
                saveBtn.disabled = true;
                saveBtn.innerText = 'Lagrer...';

                try {
                    await this.completeDevotionalDay(plan, dayNumber, text);
                    this.renderDevotionalStep(modal, plan, dayNumber, dayConfig, 5, scriptureHtml);
                } catch (e) {
                    console.error("Failed to complete devotional day:", e);
                    alert("Kunne ikke lagre andakt: " + e.message);
                    saveBtn.disabled = false;
                    saveBtn.innerHTML = `Fullfør og Lagre <span class="material-symbols-outlined">check</span>`;
                }
            };

        } else if (step === 5) {
            const confetti = document.createElement('div');
            confetti.style.fontSize = '64px';
            confetti.style.textAlign = 'center';
            confetti.style.marginBottom = '16px';
            confetti.innerHTML = '🎉';
            stepContainer.appendChild(confetti);

            const title = document.createElement('h3');
            title.className = 'hkm-celebration-title';
            title.innerText = 'Andakt fullført!';
            stepContainer.appendChild(title);

            const readingStreak = this.profileData?.readingStreak || 0;
            const streakHtml = readingStreak > 0 ? `
                <div style="display: inline-flex; align-items: center; gap: 6px; background: rgba(209, 125, 57, 0.08); border: 1px solid rgba(209, 125, 57, 0.2); padding: 8px 16px; border-radius: 12px; font-size: 14px; font-weight: 700; color: #bd4f2a; margin-top: 12px; margin-bottom: 8px;">
                    <span class="material-symbols-outlined" style="font-size: 20px; color: #d17d39;">local_fire_department</span>
                    <span>${readingStreak} dagers streak! 🔥</span>
                </div>
            ` : '';

            const desc = document.createElement('p');
            desc.className = 'hkm-celebration-desc';
            desc.innerHTML = `Kjempebra jobbet! Du har fullført dag ${dayNumber} av leseplanen "${plan.title}".<br>${streakHtml}`;
            stepContainer.appendChild(desc);

            const actions = document.createElement('div');
            actions.style.display = 'flex';
            actions.style.justify = 'center';
            actions.innerHTML = `
                <button class="hkm-btn-primary" id="btn-devotional-close" style="min-width: 150px;">
                    Lukk
                </button>
            `;
            stepContainer.appendChild(actions);

            actions.querySelector('#btn-devotional-close').onclick = () => {
                modal.remove();
                this.loadView('reading-plans');
            };
        }
    }

    async completeDevotionalDay(plan, dayNumber, reflectionText) {
        const uid = this.currentUser?.uid;
        if (!uid) return;
        
        const planId = plan.id;
        const ref = firebase.firestore()
            .collection('users')
            .doc(uid)
            .collection('reading_plans')
            .doc(planId);
            
        const snap = await ref.get();
        let userPlan = snap.exists ? snap.data() : {
            planId: planId,
            currentDay: 1,
            completedDays: [],
            reflections: {}
        };
        
        userPlan.reflections = userPlan.reflections || {};
        if (reflectionText) {
            userPlan.reflections[dayNumber] = reflectionText;
        }
        
        userPlan.completedDays = userPlan.completedDays || [];
        if (!userPlan.completedDays.includes(dayNumber)) {
            userPlan.completedDays.push(dayNumber);
        }
        
        const totalDays = plan.durationDays || plan.days.length;
        if (userPlan.completedDays.length >= totalDays) {
            userPlan.completed = true;
        } else {
            let nextDay = dayNumber + 1;
            while (nextDay <= totalDays && userPlan.completedDays.includes(nextDay)) {
                nextDay++;
            }
            if (nextDay <= totalDays) {
                userPlan.currentDay = nextDay;
            } else {
                userPlan.completed = true;
            }
        }
        
        userPlan.lastActiveAt = firebase.firestore.FieldValue.serverTimestamp();
        await ref.set(userPlan, { merge: true });

        // Calculate and update streaks in users/{uid}
        try {
            const userRef = firebase.firestore().collection('users').doc(uid);
            const userDocSnap = await userRef.get();
            if (userDocSnap.exists) {
                const userData = userDocSnap.data();
                
                // Get today's local date string YYYY-MM-DD
                const tzOffset = new Date().getTimezoneOffset() * 60000;
                const localISODate = new Date(Date.now() - tzOffset).toISOString().slice(0, 10); // YYYY-MM-DD
                
                let currentStreak = userData.readingStreak || 0;
                let longestStreak = userData.longestStreak || 0;
                const lastReadDate = userData.lastReadDate || "";

                if (lastReadDate !== localISODate) {
                    const yesterday = new Date(Date.now() - tzOffset - 86400000);
                    const yesterdayStr = yesterday.toISOString().slice(0, 10);
                    
                    if (lastReadDate === yesterdayStr) {
                        currentStreak += 1;
                    } else {
                        currentStreak = 1;
                    }
                    
                    if (currentStreak > longestStreak) {
                        longestStreak = currentStreak;
                    }
                    
                    await userRef.set({
                        readingStreak: currentStreak,
                        longestStreak: longestStreak,
                        lastReadDate: localISODate
                    }, { merge: true });
                    
                    // Update current profileData cache
                    this.profileData.readingStreak = currentStreak;
                    this.profileData.longestStreak = longestStreak;
                    this.profileData.lastReadDate = localISODate;
                }
            }
        } catch (streakErr) {
            console.error("Failed to update user streaks:", streakErr);
        }
        
        if (reflectionText) {
            await firebase.firestore()
                .collection('personal_notes')
                .add({
                    userId: uid,
                    title: `Leseplan: ${plan.title} - Dag ${dayNumber}`,
                    text: reflectionText,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    isReadingPlanNote: true,
                    readingPlanId: planId,
                    dayNumber: dayNumber,
                    category: 'Leseplan'
                });
        }
    }

    showCompletionCertificate(planTitle) {
        const userName = this.profileData?.displayName || "Deltaker";
        const dateStr = new Date().toLocaleDateString('no-NO', { year: 'numeric', month: 'long', day: 'numeric' });
        
        const certWindow = window.open('', '_blank');
        certWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Fullføringsbevis - ${planTitle}</title>
                <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;900&family=Playfair+Display:ital,wght@0,600;0,700;1,400&display=swap">
                <style>
                    body {
                        margin: 0;
                        padding: 0;
                        background: #f1f5f9;
                        font-family: 'Outfit', sans-serif;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        min-height: 100vh;
                        -webkit-print-color-adjust: exact;
                    }
                    .certificate {
                        background: #ffffff;
                        width: 800px;
                        height: 560px;
                        padding: 40px;
                        border: 15px solid #d17d39;
                        box-sizing: border-box;
                        position: relative;
                        box-shadow: 0 10px 30px rgba(0,0,0,0.1);
                        background-image: radial-gradient(circle, #f8fafc 10%, transparent 10.5%);
                        background-size: 15px 15px;
                    }
                    .inner-border {
                        border: 2px solid #d17d39;
                        height: 100%;
                        width: 100%;
                        box-sizing: border-box;
                        padding: 30px;
                        display: flex;
                        flex-direction: column;
                        justify-content: space-between;
                        align-items: center;
                        text-align: center;
                    }
                    .logo {
                        font-weight: 900;
                        font-size: 20px;
                        color: #d17d39;
                        letter-spacing: 0.1em;
                        text-transform: uppercase;
                    }
                    .title {
                        font-family: 'Playfair Display', serif;
                        font-size: 42px;
                        font-weight: 700;
                        color: #d17d39;
                        margin: 10px 0 0 0;
                    }
                    .subtitle {
                        font-size: 14px;
                        color: #64748b;
                        text-transform: uppercase;
                        letter-spacing: 0.15em;
                        margin-top: 5px;
                    }
                    .presented {
                        font-size: 16px;
                        font-style: italic;
                        color: #475569;
                        margin-top: 20px;
                    }
                    .name {
                        font-size: 32px;
                        font-weight: 700;
                        color: #0f172a;
                        border-bottom: 2px solid #e2e8f0;
                        padding-bottom: 8px;
                        min-width: 300px;
                        margin: 10px 0;
                    }
                    .for-completing {
                        font-size: 15px;
                        color: #475569;
                        max-width: 500px;
                        line-height: 1.5;
                    }
                    .plan-name {
                        font-size: 18px;
                        font-weight: 700;
                        color: #bd4f2a;
                    }
                    .footer-info {
                        display: flex;
                        justify-content: space-between;
                        width: 100%;
                        margin-top: 30px;
                        padding: 0 40px;
                        box-sizing: border-box;
                    }
                    .sign-block {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                    }
                    .sign-line {
                        width: 150px;
                        border-top: 1px solid #cbd5e1;
                        margin-top: 40px;
                        padding-top: 5px;
                        font-size: 11px;
                        color: #64748b;
                        font-weight: 600;
                    }
                    .badge {
                        width: 70px;
                        height: 70px;
                        border-radius: 50%;
                        background: linear-gradient(135deg, #d17d39 0%, #bd4f2a 100%);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: #ffffff;
                        font-weight: 700;
                        font-size: 12px;
                        border: 3px solid #ffffff;
                        box-shadow: 0 4px 10px rgba(0,0,0,0.15);
                        transform: rotate(-10deg);
                    }
                    .print-btn {
                        position: absolute;
                        top: -50px;
                        right: 0;
                        background: #d17d39;
                        color: #ffffff;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 8px;
                        cursor: pointer;
                        font-weight: 700;
                        font-size: 14px;
                        box-shadow: 0 4px 10px rgba(0,0,0,0.15);
                    }
                    @media print {
                        body {
                            background: #ffffff;
                        }
                        .print-btn {
                            display: none;
                        }
                    }
                </style>
            </head>
            <body>
                <div style="position: relative;">
                    <button class="print-btn" onclick="window.print()">Skriv ut / Lagre som PDF</button>
                    <div class="certificate">
                        <div class="inner-border">
                            <div class="logo">His Kingdom Ministry</div>
                            <div>
                                <div class="title">FULLFØRINGSBEVIS</div>
                                <div class="subtitle">Leseplan Fullført</div>
                            </div>
                            <div class="presented">Tildeles stolt til</div>
                            <div class="name">${userName}</div>
                            <div class="for-completing">
                                for å ha fullført leseplanen og andakten:<br>
                                <span class="plan-name">"${planTitle}"</span>
                            </div>
                            <div class="footer-info">
                                <div class="sign-block">
                                    <div style="font-family: 'Playfair Display', serif; font-size: 18px; color: #bd4f2a; font-style: italic;">His Kingdom Ministry</div>
                                    <div class="sign-line">Utsteder</div>
                                </div>
                                <div class="badge">
                                    <span>FULLFØRT</span>
                                </div>
                                <div class="sign-block">
                                    <div style="font-size: 14px; font-weight: 600; color: #334155; margin-top: 10px;">${dateStr}</div>
                                    <div class="sign-line">Dato</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </body>
            </html>
        `);
        certWindow.document.close();
    }

    // ══════════════════════════════════════════════════════════
    // VIEW: NOTATER (med bruker-CRUD)
    // ══════════════════════════════════════════════════════════
    async renderNotes(container) {
        const uid = this.currentUser?.uid;
        container.innerHTML = `<div class="loading-state"><div class="spinner"></div></div>`;

        // Fetch both personal notes and HKM notes in parallel
        let personalNotes = [], hkmNotes = [], categories = [];
        try {
            const [personalSnap, hkmSnap] = await Promise.all([
                firebase.firestore()
                    .collection('personal_notes')
                    .where('userId', '==', uid)
                    .get(),
                firebase.firestore()
                    .collection('user_notes')
                    .where('userId', '==', uid)
                    .get()
            ]);
            personalSnap.forEach(d => personalNotes.push(this._normalizeNoteDoc(d, 'personal')));
            hkmSnap.forEach(d => hkmNotes.push(this._normalizeNoteDoc(d, 'shared')));
            
            // Sort notes
            const sortByDate = (a, b) => {
                const ta = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
                const tb = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
                return tb - ta;
            };
            personalNotes.sort(sortByDate);
            hkmNotes.sort(sortByDate);
        } catch (e) {
            console.warn('renderNotes main fetch:', e);
            this._notify(t('notifications.loadErrorNotice'), 'warning');
        }

        // Fetch categories separately so any rules/permissions issue doesn't crash the whole notes view
        try {
            const catSnap = await firebase.firestore()
                .collection('personal_note_categories')
                .where('userId', '==', uid)
                .get();
            catSnap.forEach(d => categories.push({ id: d.id, ...d.data() }));
        } catch (e) {
            console.warn('renderNotes categories fetch error (normal if rules not deployed yet):', e);
        }

        // Seed default categories if none found/accessible
        if (categories.length === 0) {
            const defaultNames = ['Leseplan', 'Kurs', 'Bønn', 'Personlig', 'Refleksjon'];
            categories = defaultNames.map((name, i) => ({ id: `default-${i}`, name }));
        } else {
            categories.sort((a, b) => a.name.localeCompare(b.name));
        }

        this._renderNotesUI(container, personalNotes, hkmNotes, categories);
    }

    _renderNotesUI(container, personalNotes, hkmNotes, categories = []) {
        const currentView = localStorage.getItem('hkm_notes_view') || 'grid';
        const selectedCategory = localStorage.getItem('hkm_notes_selected_category') || 'all';

        const stripHtml = (html) => {
            const tmp = document.createElement('DIV');
            tmp.innerHTML = html;
            return tmp.textContent || tmp.innerText || '';
        };

        const makePNote = (n) => `
        <div class="personal-note-card" data-id="${n.id}">
            <div class="personal-note-card-top">
                <div class="personal-note-title" style="margin-bottom:4px;">${n.title || t('notes.untitled')}</div>
                ${n.category ? `<span class="category-badge" style="display:inline-block; font-size: 10px; font-weight: 700; background: rgba(209, 125, 57, 0.1); color: var(--accent-color, #d17d39); padding: 2px 6px; border-radius: 6px; margin-bottom: 8px; align-self: flex-start; text-transform: uppercase; letter-spacing: 0.05em;">${n.category}</span>` : ''}
                <div class="personal-note-body rte-content">${n.text || ''}</div>
            </div>
            <div class="personal-note-card-bottom">
                <span class="personal-note-meta">${n.createdAt?.toDate ? this._timeAgo(n.createdAt.toDate()) : ''}</span>
                <div class="personal-note-actions">
                    <button class="note-btn-edit" data-id="${n.id}" title="${t('common.edit')}">
                        <span class="material-symbols-outlined">edit</span>
                    </button>
                    <button class="note-btn-delete" data-id="${n.id}" title="${t('profile.remove')}">
                        <span class="material-symbols-outlined">delete</span>
                    </button>
                </div>
            </div>
        </div>`;

        const makePNoteRow = (n) => `
        <div class="personal-note-row" data-id="${n.id}">
            <div class="personal-note-row-left">
                <div class="personal-note-row-title" style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                    ${n.title || t('notes.untitled')}
                    ${n.category ? `<span class="category-badge" style="font-size: 9px; font-weight: 700; background: rgba(209, 125, 57, 0.1); color: var(--accent-color, #d17d39); padding: 1.5px 5px; border-radius: 5px; text-transform: uppercase; letter-spacing: 0.05em;">${n.category}</span>` : ''}
                </div>
                <div class="personal-note-row-body">${stripHtml(n.text || '')}</div>
                <div class="personal-note-row-meta">${n.createdAt?.toDate ? this._timeAgo(n.createdAt.toDate()) : ''}</div>
            </div>
            <div class="personal-note-row-actions">
                <button class="note-btn-edit actions-btn" data-id="${n.id}" title="${t('common.edit')}" style="padding: 6px; border-radius: 8px; background: transparent; border: 1.5px solid var(--border-solid); color: var(--text-muted); display: flex; cursor: pointer; transition: all 0.2s;">
                    <span class="material-symbols-outlined" style="font-size: 18px;">edit</span>
                </button>
                <button class="note-btn-delete actions-btn" data-id="${n.id}" title="${t('profile.remove')}" style="padding: 6px; border-radius: 8px; background: transparent; border: 1.5px solid var(--border-solid); color: var(--text-muted); display: flex; cursor: pointer; transition: all 0.2s;">
                    <span class="material-symbols-outlined" style="font-size: 18px;">delete</span>
                </button>
            </div>
        </div>`;

        // Filter personal notes by selected category
        const filteredPersonalNotes = selectedCategory === 'all'
            ? personalNotes
            : personalNotes.filter(n => n.category === selectedCategory);

        container.innerHTML = `
        <div class="notes-container">

            <!-- Header row -->
            <div class="ms-section-header-row ms-section-header-lg">
                <div>
                    <h2 class="ms-section-title ms-section-title-lg">${t('notes.myNotes')}</h2>
                    <p class="ms-section-subtitle">
                        ${t('notes.personalNotesSub')}
                    </p>
                </div>
                <div style="display:flex; align-items:center; gap:12px;">
                    <div class="notes-view-toggle-container" style="display:inline-flex; border: 1.5px solid var(--border-solid); border-radius: 12px; overflow:hidden; padding: 2px; background: var(--card-bg); height: 38px; box-sizing: border-box; align-items: center;">
                        <button class="notes-view-btn" id="view-grid-btn" style="width: 34px !important; height: 34px !important; border:none !important; background: ${currentView === 'grid' ? 'var(--main-bg)' : 'transparent'} !important; border-radius: 8px !important; color: ${currentView === 'grid' ? 'var(--accent-color)' : 'var(--text-muted)'} !important; display:flex !important; align-items:center !important; justify-content:center !important; cursor:pointer !important; transition: all 0.2s !important; padding: 0 !important; margin: 0 !important; box-shadow: none !important; min-width: 0 !important;" title="Rutenett">
                            <span class="material-symbols-outlined" style="font-size:20px;">grid_view</span>
                        </button>
                        <button class="notes-view-btn" id="view-list-btn" style="width: 34px !important; height: 34px !important; border:none !important; background: ${currentView === 'list' ? 'var(--main-bg)' : 'transparent'} !important; border-radius: 8px !important; color: ${currentView === 'list' ? 'var(--accent-color)' : 'var(--text-muted)'} !important; display:flex !important; align-items:center !important; justify-content:center !important; cursor:pointer !important; transition: all 0.2s !important; padding: 0 !important; margin: 0 !important; box-shadow: none !important; min-width: 0 !important;" title="Liste">
                            <span class="material-symbols-outlined" style="font-size:20px;">format_list_bulleted</span>
                        </button>
                    </div>
                    <button class="btn btn-primary" id="new-note-btn" style="height: 38px !important; padding: 0 16px !important; font-size: 13.5px !important; font-weight: 700 !important; border-radius: 10px !important; display: inline-flex !important; align-items: center !important; justify-content: center !important; gap: 6px !important; margin: 0 !important; width: auto !important; background: linear-gradient(135deg, #d17d39 0%, #bd4f2a 100%) !important; border: none !important; color: #ffffff !important; cursor: pointer !important; box-sizing: border-box !important;">
                        <span class="material-symbols-outlined" style="font-size: 18px !important;">add</span>
                        ${t('notes.newNote')}
                    </button>
                </div>
            </div>

            <!-- Category Filtering Bar -->
            <div class="category-filter-container" style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 24px; padding: 12px 0; border-bottom: 1px solid var(--border-solid); gap: 16px; flex-wrap: wrap;">
                <div class="category-pills" style="display:flex; gap:8px; overflow-x:auto; padding-bottom: 4px; max-width: 100%; -webkit-overflow-scrolling: touch;">
                    <button class="category-pill-btn ${selectedCategory === 'all' ? 'active' : ''}" data-category="all" style="padding: 8px 16px; border: 1.5px solid ${selectedCategory === 'all' ? 'var(--accent-color, #d17d39)' : 'var(--border-solid)'}; background: ${selectedCategory === 'all' ? 'rgba(209, 125, 57, 0.1)' : 'transparent'}; border-radius: 20px; color: ${selectedCategory === 'all' ? 'var(--accent-color, #d17d39)' : 'var(--text-muted)'}; font-size: 13px; font-weight: 600; cursor:pointer; transition: all 0.2s; white-space: nowrap;">
                        Alle
                    </button>
                    ${categories.map(cat => `
                    <button class="category-pill-btn ${selectedCategory === cat.name ? 'active' : ''}" data-category="${cat.name}" style="padding: 8px 16px; border: 1.5px solid ${selectedCategory === cat.name ? 'var(--accent-color, #d17d39)' : 'var(--border-solid)'}; background: ${selectedCategory === cat.name ? 'rgba(209, 125, 57, 0.1)' : 'transparent'}; border-radius: 20px; color: ${selectedCategory === cat.name ? 'var(--accent-color, #d17d39)' : 'var(--text-muted)'}; font-size: 13px; font-weight: 600; cursor:pointer; transition: all 0.2s; white-space: nowrap;">
                        ${cat.name}
                    </button>
                    `).join('')}
                </div>
                
                <button class="btn btn-ghost btn-sm" id="btn-add-category" style="padding: 6px 12px; border-radius: 10px; font-size:12.5px; height: auto; display: flex; align-items: center; gap: 4px;">
                    <span class="material-symbols-outlined" style="font-size: 18px;">add_box</span>
                    Ny kategori
                </button>
            </div>



            <!-- Personal notes list -->
            <div id="personal-notes-list" class="${currentView === 'list' ? 'personal-notes-list' : 'personal-notes-grid'}">
                ${filteredPersonalNotes.length === 0
                ? `<div class="note-empty-personal">
                        <span class="material-symbols-outlined">edit_note</span>
                        <p>${t('notes.emptyPersonalNotes')}</p>
                       </div>`
                : filteredPersonalNotes.map(currentView === 'list' ? makePNoteRow : makePNote).join('')}
            </div>

            <!-- HKM Notes (read-only) -->
            ${hkmNotes.length > 0 ? `
            <div class="ms-section-top-gap">
                <div class="ms-divider-row">
                    <div class="ms-divider-line"></div>
                    <span class="ms-divider-label">
                        ${t('notes.hkmNotes')}
                    </span>
                    <div class="ms-divider-line"></div>
                </div>
                <div class="notes-list">
                    ${hkmNotes.map(n => `
                    <div class="note-card">
                        <div class="note-author">
                            <span class="material-symbols-outlined ms-note-author-icon">shield_person</span>
                            ${n.authorName || t('notes.hkmTeam')} · ${n.createdAt?.toDate ? this._timeAgo(n.createdAt.toDate()) : ''}
                        </div>
                        ${n.title ? `<div class="ms-note-title">${n.title}</div>` : ''}
                        <div class="note-text">${n.text || ''}</div>
                    </div>`).join('')}
                </div>
            </div>` : ''}

        </div>`;

        // ── Wire up events ──
        const uid = this.currentUser?.uid;

        // View toggles
        document.getElementById('view-grid-btn')?.addEventListener('click', () => {
            localStorage.setItem('hkm_notes_view', 'grid');
            this._renderNotesUI(container, personalNotes, hkmNotes, categories);
        });

        document.getElementById('view-list-btn')?.addEventListener('click', () => {
            localStorage.setItem('hkm_notes_view', 'list');
            this._renderNotesUI(container, personalNotes, hkmNotes, categories);
        });

        // Category pills click events
        container.querySelectorAll('.category-pill-btn').forEach(btn => {
            btn?.addEventListener('click', () => {
                const cat = btn.dataset.category;
                localStorage.setItem('hkm_notes_selected_category', cat);
                this._renderNotesUI(container, personalNotes, hkmNotes, categories);
            });
        });

        // Create new category click event
        document.getElementById('btn-add-category')?.addEventListener('click', async () => {
            const name = prompt("Skriv inn navn på den nye kategorien:");
            if (!name || !name.trim()) return;
            const cleanName = name.trim();

            if (categories.some(c => c.name.toLowerCase() === cleanName.toLowerCase())) {
                alert("Denne kategorien finnes allerede!");
                return;
            }

            try {
                const ref = await firebase.firestore().collection('personal_note_categories').add({
                    userId: uid,
                    name: cleanName,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                categories.push({ id: ref.id, name: cleanName });
                categories.sort((a, b) => a.name.localeCompare(b.name));
                this._renderNotesUI(container, personalNotes, hkmNotes, categories);
            } catch (e) {
                alert("Kunne ikke opprette kategori: " + e.message);
            }
        });

        // New note click event (opens full screen editor)
        document.getElementById('new-note-btn')?.addEventListener('click', () => {
            container.innerHTML = `
            <div class="full-screen-note-editor" style="width: 100%; display: flex; flex-direction: column; min-height: calc(100vh - 200px); box-sizing: border-box;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 24px; gap: 12px; flex-wrap: nowrap; width: 100%;">
                    <h2 style="font-size: clamp(18px, 4vw, 24px); font-weight: 700; color: var(--accent-color, #d17d39); margin:0; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex-grow: 1; min-width: 0;">${t('notes.newNote') || 'Nytt notat'}</h2>
                    <button type="button" class="btn btn-ghost close-editor-btn" style="padding: 8px 16px !important; height: 38px !important; width: auto !important; min-width: 0 !important; display: inline-flex !important; align-items: center !important; justify-content: center !important; gap: 6px !important; margin: 0 !important; font-size: 13.5px !important; font-weight: 600 !important; box-sizing: border-box !important; flex-shrink: 0 !important;">
                        <span class="material-symbols-outlined" style="font-size: 18px !important;">arrow_back</span> ${t('common.back')}
                    </button>
                </div>
                
                <div class="new-note-form" id="new-note-form" style="display: flex; flex-direction: column; flex-grow: 1; box-shadow: none; border: none; padding: 0; background: transparent; gap: 20px;">
                    <div class="form-group" style="display: flex; flex-direction: column; margin: 0;">
                        <label style="font-size: 12px; font-weight: 700; color: var(--text-muted, #475569); display: block; margin-bottom: 8px; text-transform: uppercase;">${t('notes.title')}</label>
                        <input id="note-title-input" placeholder="${t('notes.titlePlaceholder')}" autocomplete="off" style="width: 100%; padding: 14px 16px; font-size: 16px; border-radius: 12px; border: 1px solid var(--border-solid); background: var(--main-bg); color: var(--text-main);">
                    </div>
                    <div class="form-group" style="display: flex; flex-direction: column; margin: 0;">
                        <label style="font-size: 12px; font-weight: 700; color: var(--text-muted, #475569); display: block; margin-bottom: 8px; text-transform: uppercase;">Kategori</label>
                        <select id="note-category-select" style="width: 100%; padding: 12px; border-radius: 12px; border: 1.5px solid var(--border-solid); background: var(--main-bg); color: var(--text-main); font-size: 14px; outline: none; font-weight: 500;">
                            <option value="">Ingen kategori</option>
                            ${categories.map(cat => `<option value="${cat.name}">${cat.name}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group ms-form-group-gap-12" style="margin: 0; flex-grow: 1; display: flex; flex-direction: column;">
                        <label style="font-size: 12px; font-weight: 700; color: var(--text-muted, #475569); display: block; margin-bottom: 8px; text-transform: uppercase;">${t('notes.content')}</label>
                        <div class="rte-wrapper" style="border: 1px solid var(--border-solid); border-radius: 12px; overflow: hidden; background: var(--main-bg); flex-grow: 1; display: flex; flex-direction: column;">
                            <div class="rte-toolbar" id="rte-toolbar-new" style="border-bottom: 1px solid var(--border-solid); background: var(--card-bg); padding: 8px 12px; flex-shrink: 0; display: flex; flex-wrap: wrap; gap: 4px;">
                                <button type="button" class="rte-btn" data-cmd="bold" title="${t('notes.toolBold')}"><span class="material-symbols-outlined">format_bold</span></button>
                                <button type="button" class="rte-btn" data-cmd="italic" title="${t('notes.toolItalic')}"><span class="material-symbols-outlined">format_italic</span></button>
                                <button type="button" class="rte-btn" data-cmd="underline" title="${t('notes.toolUnderline')}"><span class="material-symbols-outlined">format_underlined</span></button>
                                <div class="rte-divider"></div>
                                <button type="button" class="rte-btn" data-cmd="formatBlock" data-val="H2" title="${t('notes.toolHeader')}"><span class="material-symbols-outlined">title</span></button>
                                <button type="button" class="rte-btn" data-cmd="formatBlock" data-val="P" title="${t('notes.toolParagraph')}"><span class="material-symbols-outlined">format_paragraph</span></button>
                                <div class="rte-divider"></div>
                                <button type="button" class="rte-btn" data-cmd="insertUnorderedList" title="${t('notes.toolBulletList')}"><span class="material-symbols-outlined">format_list_bulleted</span></button>
                                <button type="button" class="rte-btn" data-cmd="insertOrderedList" title="${t('notes.toolOrderedList')}"><span class="material-symbols-outlined">format_list_numbered</span></button>
                                <div class="rte-divider"></div>
                                <button type="button" class="rte-btn" data-cmd="removeFormat" title="${t('notes.toolClear')}"><span class="material-symbols-outlined">format_clear</span></button>
                            </div>
                            <div class="rte-editor" id="note-body-editor" contenteditable="true" style="flex-grow: 1; min-height: 400px; padding: 20px; outline: none; color: var(--text-main); font-size: 15px; line-height: 1.6; overflow-y: auto;" data-placeholder="${t('notes.contentPlaceholder')}"></div>
                        </div>
                    </div>
                    <div class="ms-actions-row-end" style="margin-top: 8px; display: flex; justify-content: flex-end; gap: 12px; flex-shrink: 0;">
                        <button class="btn btn-ghost" id="cancel-note-btn" style="padding: 10px 24px; font-weight: 600;">${t('common.cancel')}</button>
                        <button class="btn btn-primary" id="save-note-btn" style="padding: 10px 28px; background: linear-gradient(135deg, #d17d39 0%, #bd4f2a 100%); border: none; font-weight: 600;">
                            <span class="material-symbols-outlined">save</span>
                            ${t('notes.saveNote')}
                        </button>
                    </div>
                </div>
            </div>`;

            // Wire RTE toolbar
            this._wireRteToolbar('rte-toolbar-new', 'note-body-editor');
            document.getElementById('note-title-input')?.focus();

            const closeNewEditor = () => {
                this._renderNotesUI(container, personalNotes, hkmNotes, categories);
            };

            // Wire cancel / close buttons
            container.querySelector('.close-editor-btn')?.addEventListener('click', closeNewEditor);
            document.getElementById('cancel-note-btn')?.addEventListener('click', closeNewEditor);

            // Save handler
            document.getElementById('save-note-btn')?.addEventListener('click', async () => {
                const title = document.getElementById('note-title-input').value.trim();
                const category = document.getElementById('note-category-select').value;
                const editor = document.getElementById('note-body-editor');
                const text = editor?.innerHTML?.trim() || '';
                const plain = editor?.innerText?.trim() || '';
                if (!plain) { editor?.focus(); return; }

                const btn = document.getElementById('save-note-btn');
                btn.disabled = true; btn.textContent = t('common.saving');

                try {
                    const ref = await firebase.firestore().collection('personal_notes').add({
                        userId: uid,
                        title: title || t('notes.untitled'),
                        text,
                        category: category || '',
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    });
                    
                    personalNotes.unshift(this._normalizeNoteDoc({
                        id: ref.id,
                        title: title || t('notes.untitled'),
                        text,
                        category: category || '',
                        userId: uid,
                        createdAt: { toDate: () => new Date() }
                    }, 'personal'));
                    closeNewEditor();
                } catch (e) {
                    console.error('Save note error:', e);
                    alert(t('notes.saveError') + ': ' + e.message);
                    btn.disabled = false;
                    btn.innerHTML = `<span class="material-symbols-outlined">save</span> ${t('notes.saveNote')}`;
                }
            });
        });

        // Edit buttons
        container.querySelectorAll('.note-btn-edit').forEach(btn => {
            btn?.addEventListener('click', () => {
                const id = btn.dataset.id;
                const note = personalNotes.find(n => n.id === id);
                if (!note) return;

                // Replace container innerHTML with a full screen note editor workspace
                container.innerHTML = `
                <div class="full-screen-note-editor" style="width: 100%; display: flex; flex-direction: column; min-height: calc(100vh - 200px); box-sizing: border-box;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 24px; gap: 12px; flex-wrap: nowrap; width: 100%;">
                        <h2 style="font-size: clamp(18px, 4vw, 24px); font-weight: 700; color: var(--accent-color, #d17d39); margin:0; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex-grow: 1; min-width: 0;">${t('notes.editNote') || 'Rediger notat'}</h2>
                        <button type="button" class="btn btn-ghost close-editor-btn" style="padding: 8px 16px !important; height: 38px !important; width: auto !important; min-width: 0 !important; display: inline-flex !important; align-items: center !important; justify-content: center !important; gap: 6px !important; margin: 0 !important; font-size: 13.5px !important; font-weight: 600 !important; box-sizing: border-box !important; flex-shrink: 0 !important;">
                            <span class="material-symbols-outlined" style="font-size: 18px !important;">arrow_back</span> ${t('common.back')}
                        </button>
                    </div>
                    
                    <div class="new-note-form" id="edit-note-form-${note.id}" style="display: flex; flex-direction: column; flex-grow: 1; box-shadow: none; border: none; padding: 0; background: transparent; gap: 20px;">
                        <div class="form-group" style="display: flex; flex-direction: column; margin: 0;">
                            <label style="font-size: 12px; font-weight: 700; color: var(--text-muted, #475569); display: block; margin-bottom: 8px; text-transform: uppercase;">${t('notes.title')}</label>
                            <input id="edit-note-title-${note.id}" value="${(note.title || '').replace(/"/g, '&quot;')}" autocomplete="off" style="width: 100%; padding: 14px 16px; font-size: 16px; border-radius: 12px; border: 1px solid var(--border-solid); background: var(--main-bg); color: var(--text-main);">
                        </div>
                        <div class="form-group" style="display: flex; flex-direction: column; margin: 0;">
                            <label style="font-size: 12px; font-weight: 700; color: var(--text-muted, #475569); display: block; margin-bottom: 8px; text-transform: uppercase;">Kategori</label>
                            <select id="edit-note-category-${note.id}" style="width: 100%; padding: 12px; border-radius: 12px; border: 1px solid var(--border-solid); background: var(--main-bg); color: var(--text-main); font-size: 14px; outline: none; font-weight: 500;">
                                <option value="">Ingen kategori</option>
                                ${categories.map(cat => `<option value="${cat.name}" ${note.category === cat.name ? 'selected' : ''}>${cat.name}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group ms-form-group-gap-12" style="margin: 0; flex-grow: 1; display: flex; flex-direction: column;">
                            <label style="font-size: 12px; font-weight: 700; color: var(--text-muted, #475569); display: block; margin-bottom: 8px; text-transform: uppercase;">${t('notes.content')}</label>
                            <div class="rte-wrapper" style="border: 1px solid var(--border-solid); border-radius: 12px; overflow: hidden; background: var(--main-bg); flex-grow: 1; display: flex; flex-direction: column;">
                                <div class="rte-toolbar" id="rte-toolbar-edit-${note.id}" style="border-bottom: 1px solid var(--border-solid); background: var(--card-bg); padding: 8px 12px; flex-shrink: 0; display: flex; flex-wrap: wrap; gap: 4px;">
                                    <button type="button" class="rte-btn" data-cmd="bold" title="${t('notes.toolBold')}"><span class="material-symbols-outlined">format_bold</span></button>
                                    <button type="button" class="rte-btn" data-cmd="italic" title="${t('notes.toolItalic')}"><span class="material-symbols-outlined">format_italic</span></button>
                                    <button type="button" class="rte-btn" data-cmd="underline" title="${t('notes.toolUnderline')}"><span class="material-symbols-outlined">format_underlined</span></button>
                                    <div class="rte-divider"></div>
                                    <button type="button" class="rte-btn" data-cmd="formatBlock" data-val="H2" title="${t('notes.toolHeader')}"><span class="material-symbols-outlined">title</span></button>
                                    <button type="button" class="rte-btn" data-cmd="formatBlock" data-val="P" title="${t('notes.toolParagraph')}"><span class="material-symbols-outlined">format_paragraph</span></button>
                                    <div class="rte-divider"></div>
                                    <button type="button" class="rte-btn" data-cmd="insertUnorderedList" title="${t('notes.toolBulletList')}"><span class="material-symbols-outlined">format_list_bulleted</span></button>
                                    <button type="button" class="rte-btn" data-cmd="insertOrderedList" title="${t('notes.toolOrderedList')}"><span class="material-symbols-outlined">format_list_numbered</span></button>
                                    <div class="rte-divider"></div>
                                    <button type="button" class="rte-btn" data-cmd="removeFormat" title="${t('notes.toolClear')}"><span class="material-symbols-outlined">format_clear</span></button>
                                </div>
                                <div class="rte-editor" id="edit-note-body-${note.id}" contenteditable="true" style="flex-grow: 1; min-height: 400px; padding: 20px; outline: none; color: var(--text-main); font-size: 15px; line-height: 1.6; overflow-y: auto;"></div>
                            </div>
                        </div>
                        <div class="ms-actions-row-end" style="margin-top: 8px; display: flex; justify-content: flex-end; gap: 12px; flex-shrink: 0;">
                            <button class="btn btn-ghost" id="cancel-edit-btn-${note.id}" style="padding: 10px 24px; font-weight: 600;">${t('common.cancel')}</button>
                            <button class="btn btn-primary" id="save-edit-btn-${note.id}" style="padding: 10px 28px; background: linear-gradient(135deg, #d17d39 0%, #bd4f2a 100%); border: none; font-weight: 600;">
                                <span class="material-symbols-outlined">save</span>
                                ${t('notes.save')}
                            </button>
                        </div>
                    </div>
                </div>`;

                // Set initial content in editor
                const editor = container.querySelector(`#edit-note-body-${note.id}`);
                if (editor) editor.innerHTML = note.text || '';

                // Wire up RTE toolbar
                this._wireRteToolbar(`rte-toolbar-edit-${note.id}`, `edit-note-body-${note.id}`);
                container.querySelector(`#edit-note-title-${note.id}`)?.focus();

                const closeEditor = () => {
                    this._renderNotesUI(container, personalNotes, hkmNotes, categories);
                };

                // Close and Cancel buttons listener
                container.querySelector('.close-editor-btn')?.addEventListener('click', closeEditor);
                container.querySelector(`#cancel-edit-btn-${note.id}`)?.addEventListener('click', closeEditor);

                // Save button listener
                container.querySelector(`#save-edit-btn-${note.id}`)?.addEventListener('click', async () => {
                    const newTitle = container.querySelector(`#edit-note-title-${note.id}`).value.trim() || t('notes.untitled');
                    const newCategory = container.querySelector(`#edit-note-category-${note.id}`).value;
                    const newText = editor?.innerHTML?.trim() || '';
                    const plain = editor?.innerText?.trim() || '';
                    if (!plain) { editor?.focus(); return; }

                    const saveBtn = container.querySelector(`#save-edit-btn-${note.id}`);
                    saveBtn.disabled = true;
                    saveBtn.textContent = t('notes.saving');

                    try {
                        await firebase.firestore().collection('personal_notes').doc(id).update({
                            title: newTitle,
                            text: newText,
                            category: newCategory || '',
                            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                        });
                        note.title = newTitle;
                        note.text = newText;
                        note.category = newCategory || '';
                        closeEditor();
                    } catch (e) {
                        alert(t('notes.updateError') + ': ' + e.message);
                        saveBtn.disabled = false;
                        saveBtn.innerHTML = `<span class="material-symbols-outlined">save</span> ${t('notes.save')}`;
                    }
                });
            });
        });

        // Delete buttons
        container.querySelectorAll('.note-btn-delete').forEach(btn => {
            btn?.addEventListener('click', () => {
                const id = btn.dataset.id;
                if (!confirm(t('notes.deleteConfirm'))) return;
                firebase.firestore().collection('personal_notes').doc(id).delete()
                    .then(() => {
                        personalNotes = personalNotes.filter(n => n.id !== id);
                        this._renderNotesUI(container, personalNotes, hkmNotes);
                    })
                    .catch(e => alert(t('notes.error') + ': ' + e.message));
            });
        });
    }

    // ── Rich Text Editor helper ──────────────────────────────────
    _wireRteToolbar(toolbarId, editorId) {
        const toolbar = document.getElementById(toolbarId);
        const editor = document.getElementById(editorId);
        if (!toolbar || !editor) return;

        // Execute formatting commands
        toolbar.querySelectorAll('.rte-btn').forEach(btn => {
            btn?.addEventListener('mousedown', e => {
                e.preventDefault(); // keep focus in editor
                const cmd = btn.dataset.cmd;
                const val = btn.dataset.val || null;
                document.execCommand(cmd, false, val);
                editor.focus();
                this._updateRteActiveStates(toolbar);
            });
        });

        // Update active states on selection change
        editor?.addEventListener('keyup', () => this._updateRteActiveStates(toolbar));
        editor?.addEventListener('mouseup', () => this._updateRteActiveStates(toolbar));
        editor?.addEventListener('focus', () => toolbar.classList.add('rte-focused'));
        editor?.addEventListener('blur', () => toolbar.classList.remove('rte-focused'));
    }

    _updateRteActiveStates(toolbar) {
        const cmds = ['bold', 'italic', 'underline', 'insertUnorderedList', 'insertOrderedList'];
        cmds.forEach(cmd => {
            const btn = toolbar.querySelector(`[data-cmd="${cmd}"]`);
            if (btn) btn.classList.toggle('active', document.queryCommandState(cmd));
        });
    }


    // ══════════════════════════════════════════════════════════
    // NOTIFICATION MODAL
    // ══════════════════════════════════════════════════════════
    showNotificationModal(notif) {
        const existing = document.getElementById('notif-modal');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.id = 'notif-modal';
        modal.className = 'hkm-modal-overlay';
        modal.innerHTML = `
        <div class="hkm-modal-container">
            <div class="ms-note-modal-header" style="margin-bottom: 16px;">
                <div class="hkm-modal-title" style="margin-bottom:0; padding-right: 32px;">${notif.title || t('notifications.alert')}</div>
                <button id="close-notif-modal" class="ms-icon-button">
                    <span class="material-symbols-outlined ms-icon-button-icon">close</span>
                </button>
            </div>
            ${notif.body ? `<div class="hkm-modal-message" style="text-align:left; white-space:pre-wrap; line-height:1.6; color: var(--text-main, #0f172a);">${notif.body}</div>` : ''}
            ${notif.link ? `<div style="margin-top: 24px;">
                <a href="${notif.link}" target="_blank" class="btn btn-primary" style="display:inline-flex; align-items:center; justify-content:center; gap:8px; width:100%;">
                    ${t('notifications.openLink')} <span class="material-symbols-outlined" style="font-size:20px;">open_in_new</span>
                </a>
            </div>` : ''}
            <div class="hkm-modal-actions ms-modal-actions-top" style="margin-top: 32px; border-top: 1px solid var(--border-solid, #e2e8f0); padding-top: 16px;">
                <button class="btn btn-ghost hkm-modal-btn" id="delete-notif-modal" style="color: #ef4444; justify-content: center;">
                    <span class="material-symbols-outlined">delete</span> ${t('notifications.deleteAlert')}
                </button>
            </div>
        </div>`;

        document.body.appendChild(modal);
        requestAnimationFrame(() => modal.classList.add('active'));

        const close = () => { modal.classList.remove('active'); setTimeout(() => modal.remove(), 300); };
        modal.querySelector('#close-notif-modal')?.addEventListener('click', close);
        modal?.addEventListener('click', e => { if (e.target === modal) close(); });

        // Delete action
        modal.querySelector('#delete-notif-modal')?.addEventListener('click', async () => {
            if (!confirm(t('notifications.deleteConfirm'))) return;
            const btn = modal.querySelector('#delete-notif-modal');
            btn.disabled = true;
            btn.textContent = t('notifications.deleting');

            try {
                if (notif.id) {
                    await firebase.firestore().collection('user_notifications').doc(notif.id).delete();
                }
                // Remove from DOM
                document.querySelectorAll(`.activity-item[data-id="${notif.id}"]`).forEach(el => el.remove());
                close();
            } catch (err) {
                console.error('Error deleting notification:', err);
                alert(t('notifications.deleteError') + ': ' + err.message);
                btn.disabled = false;
                btn.innerHTML = `<span class="material-symbols-outlined">delete</span> ${t('notifications.deleteAlert')}`;
            }
        });

        // Mark as read in Firestore
        if (!notif.read && notif.id) {
            firebase.firestore().collection('user_notifications').doc(notif.id).set({ read: true }, { merge: true })
                .catch(e => console.warn('Could not mark notification as read.', e));
            notif.read = true;
            this._setBadge(0);
        }
    }

    // ══════════════════════════════════════════════════════════
    // DELETE ACCOUNT MODAL
    // ══════════════════════════════════════════════════════════
    showDeleteConfirmModal() {
        const existing = document.getElementById('confirm-delete-modal');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.id = 'confirm-delete-modal';
        modal.className = 'hkm-modal-overlay';
        modal.innerHTML = `
        <div class="hkm-modal-container">
            <div class="hkm-modal-icon">
                <span class="material-symbols-outlined">warning</span>
            </div>
            <div class="hkm-modal-title">${t('deleteAccount.modalTitle')}</div>
            <p class="hkm-modal-message">
                ${t('deleteAccount.modalMessage')}
            </p>
            <div class="hkm-modal-actions">
                <button class="btn btn-ghost hkm-modal-btn" id="cancel-delete-btn">${t('deleteAccount.cancelBtn')}</button>
                <button class="btn btn-danger hkm-modal-btn" id="confirm-delete-btn">${t('deleteAccount.deleteBtn')}</button>
            </div>
        </div>`;

        document.body.appendChild(modal);
        requestAnimationFrame(() => modal.classList.add('active'));

        modal.querySelector('#cancel-delete-btn')?.addEventListener('click', () => {
            modal.classList.remove('active');
            setTimeout(() => modal.remove(), 300);
        });

        modal.querySelector('#confirm-delete-btn')?.addEventListener('click', async () => {
            if (!confirm(t('deleteAccount.doubleConfirm'))) return;
            await this.performAccountDeletion();
            modal.remove();
        });

        modal?.addEventListener('click', e => {
            if (e.target === modal) {
                modal.classList.remove('active');
                setTimeout(() => modal.remove(), 300);
            }
        });
    }

    async performAccountDeletion() {
        const user = firebase.auth().currentUser;
        if (!user) return;
        try {
            await firebase.firestore().collection('users').doc(user.uid).delete();
            await user.delete();
            window.location.href = '/';
        } catch (error) {
            if (error.code === 'auth/requires-recent-login') {
                alert(t('deleteAccount.reauthRequest'));
                await firebase.auth().signOut();
                window.location.href = '/minside/login.html';
            } else {
                alert('Feil: ' + error.message);
            }
        }
    }

    async renderPrayerWall(container) {
        if (!this.prayerWallEnabled) {
            container.innerHTML = `
                <div class="empty-state">
                    <span class="material-symbols-outlined">block</span>
                    <h3>${t('prayer.disabledTitle')}</h3>
                    <p>${t('prayer.disabledMsg')}</p>
                </div>
            `;
            setTimeout(() => {
                if (window.location.hash === '#prayer-wall') {
                    this.loadView('overview');
                }
            }, 2500);
            return;
        }

        const uid = this.currentUser?.uid;
        if (!uid) {
            container.innerHTML = `
                <div class="empty-state">
                    <span class="material-symbols-outlined">lock</span>
                    <h3>Logg inn</h3>
                    <p>Du må være logget inn for å se bønneveggen.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="ms-full-width">
                <div class="loading-state">
                    <div class="spinner"></div>
                </div>
            </div>
        `;

        this.loadPrayerWallFeed(container);
    }

    async loadPrayerWallFeed(container) {
        const uid = this.currentUser?.uid;
        try {
            const snap = await firebase.firestore().collection('prayers').get();
            const prayers = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            prayers.sort((a, b) => {
                const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);
                const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);
                return bTime - aTime;
            });

            const feedHtml = prayers.map(p => {
                const isOwner = p.userId === uid;
                const completedDays = p.prayedUserIds || [];
                const hasPrayed = completedDays.includes(uid);
                const count = p.prayedCount || completedDays.length || 0;
                
                const timeStr = p.createdAt ? this.formatTimeAgo(p.createdAt) : t('time.justNow');
                
                const avatarHtml = p.isAnonymous 
                    ? `<div class="member-avatar" style="background: #cbd5e1; color: #ffffff;"><span class="material-symbols-outlined" style="font-size: 18px;">visibility_off</span></div>`
                    : (p.userPhotoURL 
                        ? `<div class="member-avatar"><img src="${p.userPhotoURL}" alt=""></div>`
                        : `<div class="member-avatar" style="background: #d17d39; color: #ffffff;">${(p.userName || '?').charAt(0).toUpperCase()}</div>`);

                const nameHtml = p.isAnonymous ? t('prayer.anonymous') : (p.userName || t('prayer.member'));
                
                return `
                    <div class="info-card" style="border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 4px 15px rgba(15,23,42,0.01); background: #ffffff; margin-bottom: 0px; overflow: hidden; display: flex; flex-direction: column; justify-content: space-between;" id="prayer-card-${p.id}">
                        <div style="padding: 16px 20px; display: flex; flex-direction: column; height: 100%; justify-content: space-between; flex-grow: 1;">
                            <div>
                                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                                    <div style="display: flex; align-items: center; gap: 12px;">
                                        ${avatarHtml}
                                        <div>
                                            <div style="font-size: 14px; font-weight: 700; color: #0f172a;">${nameHtml}</div>
                                            <div style="font-size: 11px; color: #94a3b8; font-weight: 600;">${timeStr}</div>
                                        </div>
                                    </div>
                                    ${isOwner ? `
                                        <div style="display: flex; gap: 8px;">
                                            <button class="btn btn-icon-only" style="background:none; border:none; color: #d17d39; padding: 4px; cursor:pointer;" onclick="window.minSideManager.editPrayer('${p.id}')" title="${t('common.edit')}">
                                                <span class="material-symbols-outlined" style="font-size: 18px;">edit</span>
                                            </button>
                                            <button class="btn btn-icon-only" style="background:none; border:none; color: #ef4444; padding: 4px; cursor:pointer;" onclick="window.minSideManager.deletePrayer('${p.id}')" title="Slett">
                                                <span class="material-symbols-outlined" style="font-size: 18px;">delete</span>
                                            </button>
                                        </div>
                                    ` : ''}
                                </div>
                                
                                <p style="font-size: 14.5px; color: #334155; line-height: 1.6; margin: 0 0 16px 0; white-space: pre-wrap; font-family: inherit;">${p.text}</p>
                            </div>
                            <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #f1f5f9; padding-top: 12px; margin-top: auto;">
                                <div style="display: flex !important; align-items: center !important; gap: 6px !important; font-size: 13px; font-weight: 700; color: #64748b; line-height: 1 !important;"><span class="material-symbols-outlined" style="font-size: 18px; color: #bd4f2a; position: relative; top: 1.5px !important; display: inline-block; line-height: 1;">volunteer_activism</span><span style="display: inline-block; line-height: 1;">${t('prayer.praysForThis', { n: count })}</span></div>
                                
                                <button class="${hasPrayed ? 'btn-pray-disabled' : 'btn-pray'}" ${hasPrayed ? 'disabled style="background: #f1f5f9 !important; border-color: #f1f5f9 !important; color: #94a3b8 !important; display: inline-flex !important; align-items: center !important; justify-content: center !important; gap: 6px !important; padding: 8px 16px !important; font-size: 13.5px !important; font-weight: 600 !important; border: none !important; border-radius: 8px !important; cursor: not-allowed !important; line-height: 1 !important; width: auto !important; height: auto !important; box-sizing: border-box !important;"' : 'style="background: #d17d39 !important; border-color: #d17d39 !important; color: #ffffff !important; display: inline-flex !important; align-items: center !important; justify-content: center !important; gap: 6px !important; padding: 8px 16px !important; font-size: 13.5px !important; font-weight: 600 !important; border: none !important; border-radius: 8px !important; cursor: pointer !important; line-height: 1 !important; width: auto !important; height: auto !important; box-sizing: border-box !important;"'} onclick="window.minSideManager.supportPrayer('${p.id}', '${p.userId}')"><span class="material-symbols-outlined" style="font-size: 18px !important; position: relative !important; top: 1px !important; line-height: 1 !important; display: inline-block !important; margin: 0 !important; padding: 0 !important; width: auto !important; height: auto !important;">favorite</span><span style="line-height: 1 !important; display: inline-block !important; margin: 0 !important; padding: 0 !important; width: auto !important; height: auto !important;">${hasPrayed ? t('prayer.hasPrayed') : t('prayer.pray')}</span></button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

            container.innerHTML = `
                <div style="padding: 16px; max-width: 1200px; margin: 0 auto; width: 100%; box-sizing: border-box;">
                    <div class="prayer-wall-header">
                        <div>
                            <h3>${t('prayer.title')}</h3>
                            <p>${t('prayer.subtitle')}</p>
                        </div>
                        <button class="btn-write-prayer-style" id="btn-write-prayer">
                            <span class="material-symbols-outlined" style="font-size: 18px !important;">edit_note</span> ${t('prayer.btnWrite')}
                        </button>
                    </div>

                    <div id="prayer-feed-list" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; width: 100%;">
                        ${prayers.length > 0 ? feedHtml : `
                            <div class="empty-state" style="padding: 60px 20px; text-align: center; grid-column: 1 / -1; width: 100%;">
                                <span class="material-symbols-outlined" style="font-size: 48px; color: #cbd5e1; margin-bottom: 16px;">favorite</span>
                                <h3 style="font-size: 16px; font-weight: 700; color: #d17d39; margin: 0 0 8px 0;">${t('prayer.emptyTitle')}</h3>
                                <p style="font-size: 14px; color: #64748b; margin: 0;">${t('prayer.emptyDesc')}</p>
                            </div>
                        `}
                    </div>
                </div>
            `;

            // Bind create button
            container.querySelector('#btn-write-prayer').onclick = () => {
                this.openCreatePrayerModal(container);
            };

        } catch (err) {
            console.error("Load prayer feed error:", err);
            container.innerHTML = `<div class="empty-state"><span class="material-symbols-outlined">error</span><h3>Feil</h3><p>Kunne ikke laste bønneveggen: ${err.message}</p></div>`;
        }
    }

    formatTimeAgo(timestamp) {
        if (!timestamp) return '';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds ? timestamp.seconds * 1000 : timestamp);
        const diffMs = Date.now() - date.getTime();
        const diffMins = Math.round(diffMs / 60000);
        const diffHours = Math.round(diffMs / 3600000);
        const diffDays = Math.round(diffMs / 86400000);

        if (diffMins < 60) return t('time.minutesAgo', { n: diffMins });
        if (diffHours < 24) return t('time.hoursAgo', { n: diffHours });
        return t('time.daysAgo', { n: diffDays });
    }

    async supportPrayer(prayerId, authorUid) {
        const uid = this.currentUser?.uid;
        if (!uid) return;

        try {
            const ref = firebase.firestore().collection('prayers').doc(prayerId);
            await firebase.firestore().runTransaction(async (transaction) => {
                const doc = await transaction.get(ref);
                if (!doc.exists) throw new Error("Document does not exist!");
                
                const data = doc.data();
                const prayedUserIds = data.prayedUserIds || [];
                if (!prayedUserIds.includes(uid)) {
                    prayedUserIds.push(uid);
                    const newCount = (data.prayedCount || 0) + 1;
                    transaction.update(ref, {
                        prayedUserIds,
                        prayedCount: newCount
                    });
                }
            });

            // Write notification to the owner
            if (authorUid && authorUid !== uid) {
                const name = this.profileData?.displayName || 'En søster/bror';
                await firebase.firestore().collection('user_notifications').add({
                    userId: authorUid,
                    title: 'Bønnefellesskap',
                    message: `${name} ber for ditt bønneemne! 🙏`,
                    read: false,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    type: 'prayer'
                });
            }

            // Reload prayer wall view
            const viewContainer = document.getElementById('view-container') || document.getElementById('content-area');
            if (viewContainer) this.loadPrayerWallFeed(viewContainer);

        } catch (err) {
            console.error("Support prayer failed:", err);
            alert("Kunne ikke fullføre handlingen: " + err.message);
        }
    }

    async deletePrayer(prayerId) {
        if (!confirm(t('prayer.confirmDelete'))) return;
        try {
            await firebase.firestore().collection('prayers').doc(prayerId).delete();
            const viewContainer = document.getElementById('view-container') || document.getElementById('content-area');
            if (viewContainer) this.loadPrayerWallFeed(viewContainer);
        } catch (err) {
            console.error("Delete prayer error:", err);
            alert(t('prayer.errDelete') + err.message);
        }
    }

    async editPrayer(prayerId) {
        try {
            const doc = await firebase.firestore().collection('prayers').doc(prayerId).get();
            if (!doc.exists) {
                alert(t('prayer.errNotFound'));
                return;
            }
            const data = doc.data();
            const viewContainer = document.getElementById('view-container') || document.getElementById('content-area');
            this.openEditPrayerModal(prayerId, data, viewContainer);
        } catch (err) {
            console.error("Fetch prayer error:", err);
            alert(t('prayer.errFetchEdit') + err.message);
        }
    }

    openEditPrayerModal(prayerId, data, container) {
        let modal = document.getElementById('hkm-prayer-modal');
        if (modal) modal.remove();

        modal = document.createElement('div');
        modal.id = 'hkm-prayer-modal';
        modal.className = 'hkm-modal-overlay';
        modal.innerHTML = `
            <div class="hkm-modal-container" style="max-width: 500px; border-radius: 24px; padding: 24px;">
                <div class="modal-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 16px;">
                    <h3 style="font-size: 18px; font-weight: 700; color: #d17d39; margin:0;">${t('prayer.editModalTitle')}</h3>
                    <span class="material-symbols-outlined close" style="cursor:pointer;">close</span>
                </div>
                
                <div style="margin-bottom: 16px;">
                    <label style="font-size: 12px; font-weight: 700; color: #475569; display:block; margin-bottom: 6px;">${t('prayer.modalLabel')}</label>
                    <textarea id="prayer-input-text" style="width:100%; height: 120px; border: 1px solid #cbd5e1; border-radius: 12px; padding: 12px; font-family: inherit; font-size:14px; outline:none; box-sizing:border-box;" placeholder="${t('prayer.modalPlaceholder')}">${data.text || ''}</textarea>
                </div>

                <div style="margin-bottom: 24px;">
                    <label style="display:flex; align-items:center; justify-content:space-between; padding: 10px 12px; border-radius: 10px; background: #f8fafc; border: 1px solid #e2e8f0; cursor:pointer; user-select:none; margin: 0;">
                        <div style="display:flex; align-items:center; gap:8px;">
                            <span class="material-symbols-outlined" style="color: #64748b; font-size: 20px;">visibility_off</span>
                            <span style="font-size:13.5px; font-weight:600; color:#334155;">${t('prayer.modalAnon')}</span>
                        </div>
                        <label class="toggle toggle-sm" style="margin: 0;">
                            <input type="checkbox" id="prayer-anon-check" ${data.isAnonymous ? 'checked' : ''}>
                            <span class="toggle-slider"></span>
                        </label>
                    </label>
                </div>

                <div style="display:flex; gap:12px; justify-content:flex-end;">
                    <button class="btn btn-outline" id="btn-cancel-prayer">${t('common.cancel')}</button>
                    <button class="btn btn-primary" id="btn-save-prayer" style="background: linear-gradient(135deg, #d17d39 0%, #bd4f2a 100%); border:none;">
                        ${t('prayer.editModalSave')}
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Force reflow and add active class for fade-in animation
        modal.offsetHeight;
        modal.classList.add('active');

        const closeFn = () => {
            modal.classList.remove('active');
            setTimeout(() => modal.remove(), 250);
        };

        const closeBtn = modal.querySelector('.close');
        const cancelBtn = modal.querySelector('#btn-cancel-prayer');
        if (closeBtn) closeBtn.onclick = closeFn;
        if (cancelBtn) cancelBtn.onclick = closeFn;

        modal.querySelector('#btn-save-prayer').onclick = async () => {
            const text = modal.querySelector('#prayer-input-text').value.trim();
            const isAnonymous = modal.querySelector('#prayer-anon-check').checked;
            
            if (!text) {
                alert(t('prayer.errEmpty'));
                return;
            }

            const saveBtn = modal.querySelector('#btn-save-prayer');
            saveBtn.disabled = true;
            saveBtn.innerText = t('prayer.editModalSaving');

            try {
                await firebase.firestore().collection('prayers').doc(prayerId).update({
                    text,
                    isAnonymous,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                closeFn();
                this.loadPrayerWallFeed(container);
            } catch (err) {
                console.error("Update prayer request failed:", err);
                alert(t('prayer.errUpdate') + err.message);
                saveBtn.disabled = false;
                saveBtn.innerText = t('prayer.editModalSave');
            }
        };
    }

    openCreatePrayerModal(container) {
        let modal = document.getElementById('hkm-prayer-modal');
        if (modal) modal.remove();

        modal = document.createElement('div');
        modal.id = 'hkm-prayer-modal';
        modal.className = 'hkm-modal-overlay';
        modal.innerHTML = `
            <div class="hkm-modal-container" style="max-width: 500px; border-radius: 24px; padding: 24px;">
                <div class="modal-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 16px;">
                    <h3 style="font-size: 18px; font-weight: 700; color: #d17d39; margin:0;">${t('prayer.modalTitle')}</h3>
                    <span class="material-symbols-outlined close" style="cursor:pointer;">close</span>
                </div>
                
                <div style="margin-bottom: 16px;">
                    <label style="font-size: 12px; font-weight: 700; color: #475569; display:block; margin-bottom: 6px;">${t('prayer.modalLabel')}</label>
                    <textarea id="prayer-input-text" style="width:100%; height: 120px; border: 1px solid #cbd5e1; border-radius: 12px; padding: 12px; font-family: inherit; font-size:14px; outline:none; box-sizing:border-box;" placeholder="${t('prayer.modalPlaceholder')}"></textarea>
                </div>

                <div style="margin-bottom: 24px;">
                    <label style="display:flex; align-items:center; justify-content:space-between; padding: 10px 12px; border-radius: 10px; background: #f8fafc; border: 1px solid #e2e8f0; cursor:pointer; user-select:none; margin: 0;">
                        <div style="display:flex; align-items:center; gap:8px;">
                            <span class="material-symbols-outlined" style="color: #64748b; font-size: 20px;">visibility_off</span>
                            <span style="font-size:13.5px; font-weight:600; color:#334155;">${t('prayer.modalAnon')}</span>
                        </div>
                        <label class="toggle toggle-sm" style="margin: 0;">
                            <input type="checkbox" id="prayer-anon-check">
                            <span class="toggle-slider"></span>
                        </label>
                    </label>
                </div>

                <div style="display:flex; gap:12px; justify-content:flex-end;">
                    <button class="btn btn-outline" id="btn-cancel-prayer">${t('common.cancel')}</button>
                    <button class="btn btn-primary" id="btn-save-prayer" style="background: linear-gradient(135deg, #d17d39 0%, #bd4f2a 100%); border:none;">
                        ${t('prayer.modalPost')}
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Force reflow and add active class for fade-in animation
        modal.offsetHeight;
        modal.classList.add('active');

        const closeFn = () => {
            modal.classList.remove('active');
            setTimeout(() => modal.remove(), 250);
        };

        const closeBtn = modal.querySelector('.close');
        const cancelBtn = modal.querySelector('#btn-cancel-prayer');
        if (closeBtn) closeBtn.onclick = closeFn;
        if (cancelBtn) cancelBtn.onclick = closeFn;

        modal.querySelector('#btn-save-prayer').onclick = async () => {
            const text = modal.querySelector('#prayer-input-text').value.trim();
            const isAnonymous = modal.querySelector('#prayer-anon-check').checked;
            
            if (!text) {
                alert(t('prayer.errEmpty'));
                return;
            }

            const saveBtn = modal.querySelector('#btn-save-prayer');
            saveBtn.disabled = true;
            saveBtn.innerText = t('prayer.posting');

            try {
                await firebase.firestore().collection('prayers').add({
                    userId: this.currentUser.uid,
                    userName: this.profileData?.displayName || 'Medlem',
                    userPhotoURL: this.profileData?.photoURL || '',
                    text,
                    isAnonymous,
                    prayedCount: 0,
                    prayedUserIds: [],
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                closeFn();
                this.loadPrayerWallFeed(container);
            } catch (err) {
                console.error("Save prayer request failed:", err);
                alert(t('prayer.errSave') + err.message);
                saveBtn.disabled = false;
                saveBtn.innerText = t('prayer.modalPost');
            }
        };
    }

    async performAccountDeletion() {
        const user = firebase.auth().currentUser;
        if (!user) return;
        try {
            await firebase.firestore().collection('users').doc(user.uid).delete();
            await user.delete();
            window.location.href = '/';
        } catch (error) {
            if (error.code === 'auth/requires-recent-login') {
                alert(t('deleteAccount.reauthRequest'));
                await firebase.auth().signOut();
                window.location.href = '/minside/login.html';
            } else {
                alert('Feil: ' + error.message);
            }
        }
    }

    initGlobalSearch() {
        const overlay = document.getElementById('global-search-overlay');
        const btn = document.getElementById('global-search-btn');
        const closeBtn = document.getElementById('close-search-btn');
        const input = document.getElementById('global-search-input');
        const resultsContainer = document.getElementById('global-search-results');
        
        if (!overlay || !input) return;

        let searchCache = {
            courses: [],
            readingPlans: [],
            notes: [],
            prayers: []
        };
        let selectedIndex = -1;

        const openSearch = async () => {
            overlay.style.display = 'flex';
            input.value = '';
            selectedIndex = -1;
            input.focus();
            
            const searchIcon = document.querySelector('#global-search-overlay span.material-symbols-outlined');
            if (searchIcon) {
                searchIcon.textContent = 'search';
                searchIcon.classList.remove('animate-spin');
            }
            
            // Show initial prompt
            resultsContainer.innerHTML = `
                <div class="empty-state" style="padding: 40px 20px; text-align: center;">
                    <span class="material-symbols-outlined" style="font-size: 36px; color: #cbd5e1; margin-bottom: 12px;">search</span>
                    <p style="font-size: 14px; color: #64748b; margin: 0;">Skriv noe for å søke på tvers av Min Side...</p>
                </div>
            `;

            // Prefetch search content
            try {
                const uid = this.currentUser?.uid;
                const db = firebase.firestore();
                const promises = [
                    db.collection('siteContent').doc('collection_courses').get(),
                    db.collection('reading_plans').get(),
                    uid ? db.collection('personal_notes').where('userId', '==', uid).get() : Promise.resolve({ empty: true })
                ];
                if (this.prayerWallEnabled) {
                    promises.push(db.collection('prayers').get());
                } else {
                    promises.push(Promise.resolve({ empty: true, docs: [] }));
                }

                const [coursesSnap, plansSnap, notesSnap, prayersSnap] = await Promise.all(promises);

                const coursesItems = (coursesSnap.exists ? coursesSnap.data()?.items : null) || [];
                searchCache.courses = coursesItems.map(d => ({ id: d.id, type: 'course', title: d.title || '', desc: d.description || '' }));
                searchCache.readingPlans = plansSnap.empty ? [] : plansSnap.docs.map(d => ({ id: d.id, type: 'reading-plan', title: d.data().title || '', desc: d.data().description || '' }));
                searchCache.notes = (!notesSnap || notesSnap.empty) ? [] : notesSnap.docs.map(d => ({ id: d.id, type: 'note', title: d.data().title || '', desc: d.data().text || d.data().content || '' }));
                searchCache.prayers = prayersSnap.empty ? [] : prayersSnap.docs.map(d => {
                    const data = d.data();
                    const name = data.isAnonymous ? 'Anonym' : (data.userName || 'Medlem');
                    return { id: d.id, type: 'prayer-wall', title: `Bønneemne fra ${name}`, desc: data.text || '' };
                });
            } catch (err) {
                console.warn("[search] Failed to prefetch search data:", err);
            }
        };

        const closeSearch = () => {
            overlay.style.display = 'none';
        };

        btn?.addEventListener('click', openSearch);
        closeBtn?.addEventListener('click', closeSearch);
        overlay?.addEventListener('click', (e) => {
            if (e.target === overlay) closeSearch();
        });

        // Global hotkeys (CMD+K / ESC)
        window?.addEventListener('keydown', (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                if (overlay.style.display === 'none' || !overlay.style.display) {
                    openSearch();
                } else {
                    closeSearch();
                }
            } else if (e.key === 'Escape') {
                closeSearch();
            } else if (overlay.style.display === 'flex') {
                // Keyboard navigation in search results
                const items = resultsContainer.querySelectorAll('.search-result-item');
                if (items.length > 0) {
                    if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        selectedIndex = (selectedIndex + 1) % items.length;
                        highlightItem(items);
                    } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        selectedIndex = (selectedIndex - 1 + items.length) % items.length;
                        highlightItem(items);
                    } else if (e.key === 'Enter') {
                        e.preventDefault();
                        if (selectedIndex >= 0 && selectedIndex < items.length) {
                            items[selectedIndex].click();
                        }
                    }
                }
            }
        });

        const highlightItem = (items) => {
            items.forEach((item, idx) => {
                if (idx === selectedIndex) {
                    item.classList.add('selected');
                    item.style.background = 'var(--admin-bg, #f8f9fa)';
                    item.style.borderColor = '#d17d39';
                    item.scrollIntoView({ block: 'nearest' });
                } else {
                    item.classList.remove('selected');
                    item.style.background = '#ffffff';
                    item.style.borderColor = '#e2e8f0';
                }
            });
        };

        // Real-time search query matching
        let minSideSearchDebounce;
        let latestMinSideQuery = '';

        const renderSearchResults = (queryStr, bibleData, isLoadingBible = false) => {
            const query = queryStr.trim().toLowerCase();
            
            // Verify query is still active to avoid race condition/jumping
            if (latestMinSideQuery !== query) return;

            const results = [];
            const searchCollection = (list) => {
                list.forEach(item => {
                    if (item.title.toLowerCase().includes(query) || item.desc.toLowerCase().includes(query)) {
                        results.push(item);
                    }
                });
            };

            // Autocomplete/suggest Bible books based on query prefix
            const lang = document.documentElement.lang || 'no';
            const books = BIBLE_BOOKS[lang] || BIBLE_BOOKS['no'];
            const lowerQ = query.toLowerCase();
            
            if (!isBibleReference(queryStr)) {
                const matchedBooks = books.filter(book => {
                    const lowerBook = book.toLowerCase();
                    return lowerBook.startsWith(lowerQ) || (lowerQ.length >= 3 && lowerBook.includes(lowerQ));
                });

                matchedBooks.slice(0, 3).forEach(book => {
                    results.push({
                        id: `${book} 1`,
                        type: 'bible-ref',
                        title: `${book} 1`,
                        desc: lang === 'en' ? `Open ${book} chapter 1 in the online Bible` : (lang === 'es' ? `Abrir ${book} capítulo 1 en la Biblia en línea` : `Åpne ${book} kapittel 1 i nettbibelen`)
                    });
                });
            }

            // Sjekk om det er en direkte bibelreferanse og legg til direktelenke
            if (isBibleReference(queryStr)) {
                results.push({
                    id: queryStr,
                    type: 'bible-ref',
                    title: queryStr.charAt(0).toUpperCase() + queryStr.slice(1),
                    desc: lang === 'en' ? 'Open this chapter/passage in the online Bible' : (lang === 'es' ? 'Abrir este capítulo/pasaje en la Biblia en línea' : 'Åpne dette kapittelet/skriftstedet i nettbibelen')
                });
            }

            searchCollection(searchCache.courses);
            searchCollection(searchCache.readingPlans);
            searchCollection(searchCache.notes);
            searchCollection(searchCache.prayers);

            // Match biblical characters
            if (Array.isArray(biblicalCharacters) && biblicalCharacters.length) {
                biblicalCharacters.forEach(person => {
                    const nameText = person.name[lang] || person.name['no'] || '';
                    const roleText = person.role[lang] || person.role['no'] || '';
                    const eraText = person.era[lang] || person.era['no'] || '';
                    const summaryText = person.summary[lang] || person.summary['no'] || '';
                    const storyText = person.story[lang] || person.story['no'] || '';
                    const significanceText = person.theologicalSignificance[lang] || person.theologicalSignificance['no'] || '';
                    
                    const combined = [
                        lang === 'en' ? 'biblical character person' : (lang === 'es' ? 'personaje bíblico persona' : 'bibelsk person personer bibelen'),
                        nameText,
                        roleText,
                        eraText,
                        summaryText,
                        storyText,
                        significanceText
                    ].filter(Boolean).join(' ').toLowerCase();

                    if (combined.includes(query)) {
                        results.push({
                            id: person.id,
                            type: 'biblical-character',
                            title: nameText,
                            desc: roleText || summaryText || ''
                        });
                    }
                });
            }

            // Match timelines
            try {
                const timelines = [
                    {
                        id: 'bibelsk-tidslinje',
                        title: {
                            no: 'Bibelens tidslinje',
                            en: 'Biblical Timeline',
                            es: 'Línea de Tiempo Bíblica'
                        },
                        keywords: {
                            no: 'bibel tidslinje historie skapelsen syndefallet noa abraham moses david jesus kirke',
                            en: 'bible timeline history creation fall noah abraham moses david jesus church',
                            es: 'biblia línea de tiempo historia creación caída noé abrahán moisés david jesús iglesia'
                        }
                    },
                    {
                        id: 'tidslinje-imperier',
                        title: {
                            no: 'Imperienes tidslinje',
                            en: 'Timeline of Empires',
                            es: 'Línea de Tiempo de Imperios'
                        },
                        keywords: {
                            no: 'imperie tidslinje historie riker babylon persia hellas roma',
                            en: 'empire timeline history kingdoms babylon persia greece rome',
                            es: 'imperio línea de tiempo historia reinos babilonia persia grecia roma'
                        }
                    }
                ];

                timelines.forEach(tl => {
                    const titleText = tl.title[lang] || tl.title.no || '';
                    const keywordsText = tl.keywords[lang] || tl.keywords.no || '';
                    const combined = [titleText, keywordsText].join(' ').toLowerCase();

                    if (combined.includes(query)) {
                        results.push({
                            id: tl.id,
                            type: 'timeline-ref',
                            title: titleText,
                            desc: lang === 'en' ? 'Historical Timeline' : (lang === 'es' ? 'Línea de Tiempo Histórica' : 'Historisk tidslinje')
                        });
                    }
                });
            } catch (e) {
                console.error("Error matching timelines in minside search:", e);
            }

            // Add Bible search result if available and relevant
            if (bibleData && bibleData.category && !['ikke bibelrelatert', 'not bible-related', 'no relacionado con la biblia'].includes(bibleData.category.toLowerCase())) {
                let versesHtml = '';
                if (Array.isArray(bibleData.crossReferences) && bibleData.crossReferences.length > 0) {
                    let bibleUrlBase = '../bibel.html';
                    if (lang === 'en') bibleUrlBase = '../en/bibel.html';
                    else if (lang === 'es') bibleUrlBase = '../es/bibel.html';

                    versesHtml = bibleData.crossReferences.map(refObj => {
                        const cleanRef = refObj.ref.trim();
                        const href = `${bibleUrlBase}?ref=${encodeURIComponent(cleanRef)}`;
                        return `<a href="${href}" onclick="event.stopPropagation();" style="display: inline-block; font-size: 11px; margin: 4px 4px 0 0; padding: 4px 8px; border-radius: 6px; background: #d17d3915; color: #d17d39; font-weight: 600; text-decoration: none; transition: background 0.2s;" onmouseover="this.style.background='#d17d3930'" onmouseout="this.style.background='#d17d3915'">${cleanRef}</a>`;
                    }).join('');
                }

                results.push({
                    id: bibleData.word || queryStr,
                    type: 'bible-search',
                    title: bibleData.word || queryStr,
                    desc: bibleData.definition || bibleData.contextualNote || '',
                    versesHtml: versesHtml
                });
            }

            if (results.length === 0) {
                if (isLoadingBible) {
                    resultsContainer.innerHTML = `
                        <div style="padding: 40px 20px; display: flex; align-items: center; justify-content: center; gap: 12px;">
                            <div class="spinner" style="width: 20px; height: 20px; border-width: 2.5px; border-color: #cbd5e1; border-top-color: #d17d39; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
                            <span style="font-size: 14px; color: #64748b; font-weight: 500;">Søker...</span>
                        </div>
                    `;
                } else {
                    resultsContainer.innerHTML = `
                        <div class="empty-state" style="padding: 40px 20px; text-align: center;">
                            <span class="material-symbols-outlined" style="font-size: 36px; color: #cbd5e1; margin-bottom: 12px;">sentiment_dissatisfied</span>
                            <p style="font-size: 14px; color: #64748b; margin: 0;">Ingen resultater samsvarte med "${queryStr}"</p>
                        </div>
                    `;
                }
                return;
            }

            selectedIndex = -1;
            const typeLabels = {
                'course': { name: 'Kurs & Undervisning', icon: 'school', color: '#d17d39' },
                'reading-plan': { name: 'Leseplaner & Andakt', icon: 'auto_stories', color: '#bd4f2a' },
                'note': { name: 'Dine Notater', icon: 'notes', color: '#d17d39' },
                'prayer-wall': { name: 'Bønneveggen', icon: 'favorite', color: '#bd4f2a' },
                'bible-search': { name: 'Bibel & Ordbok', icon: 'menu_book', color: '#d17d39' },
                'bible-ref': { name: 'Nettbibel', icon: 'menu_book', color: '#d17d39' },
                'biblical-character': { name: lang === 'en' ? 'Biblical Character' : (lang === 'es' ? 'Personaje Bíblico' : 'Bibelsk person'), icon: 'person', color: '#d17d39' },
                'timeline-ref': { name: lang === 'en' ? 'Timeline' : (lang === 'es' ? 'Línea de Tiempo' : 'Tidslinje'), icon: 'timeline', color: '#bd4f2a' }
            };

            let html = results.map((r, idx) => {
                const label = typeLabels[r.type];
                return `
                    <div class="search-result-item" data-index="${idx}" style="padding: 12px 16px; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 8px; cursor: pointer; transition: all 0.2s; background: #ffffff; display: flex; align-items: center; justify-content: space-between; gap: 12px;" onclick="window.minSideManager.selectSearchResult('${r.type}', '${r.id}')">
                        <div style="display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0;">
                            <div style="width: 36px; height: 36px; border-radius: 50%; background: ${label.color}15; display: flex; align-items: center; justify-content: center; color: ${label.color}; flex-shrink: 0;">
                                <span class="material-symbols-outlined" style="font-size: 20px;">${label.icon}</span>
                            </div>
                            <div style="flex: 1; min-width: 0;">
                                <div style="font-size: 13.5px; font-weight: 700; color: #0f172a; ${r.type === 'bible-search' ? '' : 'white-space: nowrap; overflow: hidden; text-overflow: ellipsis;'}">${r.title}</div>
                                <div style="font-size: 12px; color: #64748b; ${r.type === 'bible-search' ? 'line-height: 1.4;' : 'white-space: nowrap; overflow: hidden; text-overflow: ellipsis;'}">${r.desc}</div>
                                ${r.versesHtml ? `<div style="margin-top: 8px; display: flex; flex-wrap: wrap; gap: 4px;">${r.versesHtml}</div>` : ''}
                            </div>
                        </div>
                        <div style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; background: #f1f5f9; padding: 4px 8px; border-radius: 6px; flex-shrink: 0;">
                            ${label.name}
                        </div>
                    </div>
                `;
            }).join('');

            if (isLoadingBible) {
                html += `
                    <div class="bible-search-loading-placeholder" style="padding: 16px; display: flex; align-items: center; justify-content: center; gap: 10px; border: 1px dashed #e2e8f0; border-radius: 12px; background: #f8fafc; margin-top: 8px;">
                        <div class="spinner" style="width: 16px; height: 16px; border-width: 2px; border-color: #cbd5e1; border-top-color: #d17d39; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
                        <span style="font-size: 12.5px; color: #64748b; font-weight: 500;">Søker i Bibel & Ordbok...</span>
                    </div>
                `;
            }

            resultsContainer.innerHTML = html;
        };

        input?.addEventListener('input', () => {
            const query = input.value.trim();
            latestMinSideQuery = query.toLowerCase();

            if (query.length < 2) {
                const searchIcon = document.querySelector('#global-search-overlay span.material-symbols-outlined');
                if (searchIcon) {
                    searchIcon.textContent = 'search';
                    searchIcon.classList.remove('animate-spin');
                }
                resultsContainer.innerHTML = `
                    <div class="empty-state" style="padding: 40px 20px; text-align: center;">
                        <span class="material-symbols-outlined" style="font-size: 36px; color: #cbd5e1; margin-bottom: 12px;">search</span>
                        <p style="font-size: 14px; color: #64748b; margin: 0;">Skriv minst 2 tegn for å søke...</p>
                    </div>
                `;
                return;
            }

            // Sync render local search instantly, but flag that Bible is loading
            renderSearchResults(query, null, true);

            // Debounced fetch for Bible database
            clearTimeout(minSideSearchDebounce);

            const searchIcon = document.querySelector('#global-search-overlay span.material-symbols-outlined');
            if (searchIcon) {
                searchIcon.textContent = 'sync';
                searchIcon.classList.add('animate-spin');
            }

            minSideSearchDebounce = setTimeout(async () => {
                try {
                    const lang = document.documentElement.lang || 'no';
                    const res = await fetch(`/api/bible/dictionary?word=${encodeURIComponent(query)}&lang=${lang}`);
                    if (res.ok) {
                        const bibleData = await res.json();
                        if (latestMinSideQuery === query.toLowerCase()) {
                            renderSearchResults(query, bibleData, false);
                        }
                    }
                } catch (e) {
                    console.warn("[Search] Bible search on minside failed:", e);
                } finally {
                    if (latestMinSideQuery === query.toLowerCase() && searchIcon) {
                        searchIcon.textContent = 'search';
                        searchIcon.classList.remove('animate-spin');
                    }
                }
            }, 400);
        });
    }

    selectSearchResult(type, id) {
        const overlay = document.getElementById('global-search-overlay');
        if (overlay) overlay.style.display = 'none';
        const lang = document.documentElement.lang || 'no';
        if (type === 'bible-search' || type === 'bible-ref') {
            const paramName = type === 'bible-search' ? 'dict' : 'ref';
            let url = '../bibel.html?' + paramName + '=' + encodeURIComponent(id);
            if (lang === 'en') {
                url = '../en/bibel.html?' + paramName + '=' + encodeURIComponent(id);
            } else if (lang === 'es') {
                url = '../es/bibel.html?' + paramName + '=' + encodeURIComponent(id);
            }
            window.location.href = url;
            return;
        }
        if (type === 'biblical-character') {
            let url = '../ressurser/bibelsk-person-detaljer.html?id=' + encodeURIComponent(id);
            if (lang === 'en') {
                url = '../en/ressurser/bibelsk-person-detaljer.html?id=' + encodeURIComponent(id);
            } else if (lang === 'es') {
                url = '../es/ressurser/bibelsk-person-detaljer.html?id=' + encodeURIComponent(id);
            }
            window.location.href = url;
            return;
        }
        if (type === 'timeline-ref') {
            let url = '../ressurser/' + id + '.html';
            if (lang === 'en') {
                url = '../en/ressurser/' + id + '.html';
            } else if (lang === 'es') {
                url = '../es/ressurser/' + id + '.html';
            }
            window.location.href = url;
            return;
        }
        this.loadView(type);
    }
}

// Boot
window.minSideManager = new MinSideManager();
