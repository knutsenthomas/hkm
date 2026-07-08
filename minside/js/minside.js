import { biblicalCharacters } from '../../js/bibelske-personer-data.js';

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
        'sidebar.kurs': 'Kurs & Undervisning',
        'sidebar.readingPlans': 'Leseplaner & Andakt',
        'sidebar.gaver': 'Gaver & Betalinger',
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
        'view.giving': 'Gaver & Betalinger',
        'view.courses': 'Kurs & Undervisning',
        'view.readingPlans': 'Leseplaner & Andakt',
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
        'sidebar.kurs': 'Courses & Teaching',
        'sidebar.readingPlans': 'Reading Plans',
        'sidebar.gaver': 'Giving & Payments',
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
        'view.giving': 'Giving & Payments',
        'view.courses': 'Courses & Teaching',
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
        'sidebar.kurs': 'Cursos y Enseñanza',
        'sidebar.readingPlans': 'Planes de Lectura',
        'sidebar.gaver': 'Ofrendas y Pagos',
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
        'view.giving': 'Ofrendas y Pagos',
        'view.courses': 'Cursos y Enseñanza',
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
        };


        // Run initial translation on static elements (sidebar, headers)
        translateStaticHTML();
        this.init();
    }

    // ──────────────────────────────────────────────────────────
    // INIT
    // ──────────────────────────────────────────────────────────
    async init() {
        this.setupNavigation();

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
                        const featuresDoc = await firebase.firestore().collection('content').doc('settings_features').get();
                        if (featuresDoc.exists) {
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
                    this.updateHeader();
                    this.initNotificationBadge();
                    this.showPendingFlashNotice();

                    // Translate immediately on auth state change
                    translateStaticHTML();

                    // Initialize Global Search Overlay
                    this.initGlobalSearch();

                    // Apply bottom navigation settings (user custom first, then admin default)
                    try {
                        if (this.profileData && Array.isArray(this.profileData.customBottomNav) && this.profileData.customBottomNav.length > 0) {
                            localStorage.setItem('hkm_user_custom_nav', JSON.stringify(this.profileData.customBottomNav));
                            this.applyBottomNavSettings(this.profileData.customBottomNav);
                        } else {
                            localStorage.removeItem('hkm_user_custom_nav');
                            const designSettings = await window.firebaseService.getPageContent('settings_design');
                            if (designSettings && Array.isArray(designSettings.minsideBottomNav)) {
                                const cached = localStorage.getItem('hkm_cache_settings_design');
                                let designObj = cached ? JSON.parse(cached) : {};
                                designObj.minsideBottomNav = designSettings.minsideBottomNav;
                                localStorage.setItem('hkm_cache_settings_design', JSON.stringify(designObj));

                                this.applyBottomNavSettings(designSettings.minsideBottomNav);
                            }
                        }
                    } catch (e) {
                        console.warn("Failed to load design settings for bottom nav:", e);
                    }

                    const startView = window.location.hash.replace('#', '') || 'overview';
                    this.loadView(startView);
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
            link.addEventListener('click', e => {
                e.preventDefault();
                this.loadView(link.dataset.view);
                if (window.innerWidth <= 768) this.toggleSidebar(false);
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
        document.addEventListener('click', () => actionsMenu?.classList.remove('open'));

        // Profile photo upload
        document.getElementById('ph-upload')?.addEventListener('change', e => this.handlePhotoUpload(e));
    }

    toggleSidebar(show) {
        document.getElementById('sidebar')?.classList.toggle('active', show);
        document.getElementById('sidebar-overlay')?.classList.toggle('active', show);
    }

    // Dynamic Language Switching Routine
    handleLanguageChange(lang) {
        document.documentElement.lang = lang;
        translateStaticHTML();
        this.updateHeader();
        
        // Reload current view with translated strings
        const currentView = window.location.hash.replace('#', '') || 'overview';
        this.loadView(currentView);
    }

    loadView(viewId) {
        if (viewId === 'prayer-wall' && !this.prayerWallEnabled) {
            viewId = 'overview';
        }
        if (!this.views[viewId]) viewId = 'overview';
        window.location.hash = viewId;

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
        };

        // Update Header Title and Icon (Admin Style)
        const info = viewInfo[viewId] || { title: t('sidebar.title'), icon: 'person' };
        const titleEl = document.getElementById('dashboard-main-header-title');
        const iconEl = document.getElementById('dashboard-main-header-icon');
        
        if (titleEl) titleEl.textContent = info.title;
        if (iconEl) iconEl.textContent = info.icon;

        document.querySelectorAll('.nav-link, .mobile-nav-item').forEach(l => l.classList.remove('active'));
        document.querySelector(`.nav-link[data-view="${viewId}"]`)?.classList.add('active');
        document.querySelector(`.mobile-nav-item[data-view="${viewId}"]`)?.classList.add('active');

        const container = document.getElementById('view-container') || document.getElementById('content-area');
        container.innerHTML = `<div class="loading-state"><div class="spinner"></div><p>${t('common.loading')}...</p></div>`;

        setTimeout(async () => {
            try {
                await this.views[viewId].call(this, container);
            } catch (err) {
                console.error(`View "${viewId}" error:`, err);
                container.innerHTML = `<div class="empty-state"><span class="material-symbols-outlined">error</span><h3>${t('common.errorOccurred')}</h3><p>${err.message}</p></div>`;
            }
        }, 80);
    }

    _notify(message, type = 'warning', duration = 4500) {
        if (!message) return;
        if (typeof window.showToast === 'function') {
            window.showToast(message, type, duration);
            return;
        }

        let host = document.getElementById('minside-inline-notice');
        if (!host) {
            host = document.createElement('div');
            host.id = 'minside-inline-notice';
            host.style.cssText = 'position:fixed;top:16px;right:16px;z-index:9999;max-width:360px;padding:12px 14px;border-radius:12px;font:500 14px/1.35 Inter,system-ui,sans-serif;box-shadow:0 8px 24px rgba(15,23,42,.1);';
            document.body.appendChild(host);
        }
        const palette = type === 'success'
            ? { bg: '#ecfdf5', fg: '#166534' }
            : type === 'error'
                ? { bg: '#fef2f2', fg: '#991b1b' }
                : { bg: '#fffbeb', fg: '#92400e' };
        host.style.background = palette.bg;
        host.style.color = palette.fg;
        host.style.border = '1px solid rgba(15,23,42,.08)';
        host.textContent = String(message);
        clearTimeout(this._inlineNoticeTimer);
        this._inlineNoticeTimer = setTimeout(() => {
            if (host && host.parentNode) host.parentNode.removeChild(host);
        }, Math.max(1500, duration));
    }

    showPendingFlashNotice() {
        try {
            const raw = sessionStorage.getItem('hkm_flash_notice');
            if (!raw) return;
            sessionStorage.removeItem('hkm_flash_notice');
            const notice = JSON.parse(raw);
            if (!notice || !notice.message) return;
            if (notice.createdAt && (Date.now() - notice.createdAt > 30000)) return;
            this._notify(notice.message, notice.type || 'warning', notice.duration || 5000);
        } catch (e) {
            // noop
        }
    }

    // ──────────────────────────────────────────────────────────
    // HEADER
    // ──────────────────────────────────────────────────────────
    updateHeader() {
        const p = this.profileData;
        const name = p.displayName || this.currentUser?.email || t('role.fallbackUser');

        // Name
        const nameEl = document.getElementById('ph-name');
        if (nameEl) nameEl.textContent = name;

        // Avatar
        this._setAvatarEl(document.getElementById('ph-avatar'), p.photoURL, name);

        // Role
        const roleEl = document.getElementById('ph-role');
        if (roleEl) roleEl.textContent = this._roleLabel(p.role);

        // Admin link visibility
        const normalizedRole = String(p.role || '').trim().toLowerCase();
        const canAccessAdmin = normalizedRole === 'admin' || normalizedRole === 'superadmin';

        document.getElementById('ph-admin-link')?.classList.toggle('is-hidden', !canAccessAdmin);
        document.getElementById('sidebar-admin-link')?.classList.toggle('is-hidden', !canAccessAdmin);
    }

    _setAvatarEl(el, photoURL, name) {
        if (!el) return;
        
        if (photoURL) {
            el.classList.remove('has-initials');
            el.innerHTML = `<img src="${photoURL}" alt="${name}" style="width: 100%; height: 100%; border-radius: inherit; object-fit: cover;">`;
        } else {
            el.classList.add('has-initials');
            const initials = (name || '?')
                .split(' ')
                .filter(n => n.length > 0)
                .map(n => n[0].toUpperCase())
                .slice(0, 2)
                .join('');
            
            el.innerHTML = `<span style="color: white !important; font-weight: 900 !important; visibility: visible !important; opacity: 1 !important; display: block !important;">${initials || '?'}</span>`;
        }
        
        if (photoURL) el.dataset.photoUrl = photoURL;
    }

    applyBottomNavSettings(activeIds) {
        if (!Array.isArray(activeIds)) return;
        document.querySelectorAll('.mobile-bottom-nav .mobile-nav-item').forEach(el => {
            const view = el.getAttribute('data-view');
            if (view) {
                if (activeIds.includes(view)) {
                    el.style.display = 'flex';
                } else {
                    el.style.display = 'none';
                }
            }
        });
    }

    _roleLabel(role) {
        const map = {
            superadmin: t('role.superadmin'),
            admin: t('role.admin'),
            pastor: t('role.pastor'),
            leder: t('role.leader'),
            frivillig: t('role.volunteer'),
            giver: t('role.donor')
        };
        return map[role] || t('role.member');
    }

    // ──────────────────────────────────────────────────────────
    // FIREBASE SYNC
    // ──────────────────────────────────────────────────────────
    _emptyProfileSubCollections() {
        return {
            communication: { items: [], count: 0 },
            activity: { items: [], count: 0 },
            notes: { personal: [], shared: [], count: 0 }
        };
    }

    _normalizeNotificationDoc(docLike) {
        const raw = typeof docLike?.data === 'function' ? (docLike.data() || {}) : (docLike || {});
        return {
            id: docLike?.id || raw.id || '',
            title: typeof raw.title === 'string' && raw.title.trim() ? raw.title.trim() : t('notifications.alert'),
            body: typeof raw.body === 'string' ? raw.body : '',
            type: typeof raw.type === 'string' && raw.type.trim() ? raw.type.trim().toLowerCase() : 'default',
            link: typeof raw.link === 'string' ? raw.link : '',
            read: raw.read === true,
            archived: raw.archived === true,
            createdAt: raw.createdAt || null,
        };
    }

    _normalizeNoteDoc(docLike, fallbackSource = 'personal') {
        const raw = typeof docLike?.data === 'function' ? (docLike.data() || {}) : (docLike || {});
        return {
            id: docLike?.id || raw.id || '',
            title: typeof raw.title === 'string' && raw.title.trim() ? raw.title.trim() : t('notes.untitled'),
            text: typeof raw.text === 'string' ? raw.text : '',
            authorName: typeof raw.authorName === 'string' && raw.authorName.trim() ? raw.authorName.trim() : t('notes.hkmTeam'),
            createdAt: raw.createdAt || null,
            updatedAt: raw.updatedAt || null,
            source: raw.source || fallbackSource,
            userId: raw.userId || this.currentUser?.uid || '',
        };
    }

    _normalizeDonationAmountNok(donation) {
        const raw = donation || {};
        const explicitNok = raw.amountNok ?? raw.amountNOK ?? raw.totalNok;
        if (explicitNok != null) return this._parseAmountNumber(explicitNok);

        const explicitOre = raw.amountOre ?? raw.amountCents;
        if (explicitOre != null) return this._parseAmountNumber(explicitOre) / 100;

        const amount = this._parseAmountNumber(raw.amount);
        if (!amount) return 0;

        // Older Stripe client records stored amount in ore, while server-created
        // Stripe/Vipps donation records store amount in NOK.
        if (raw.paymentIntentId && !raw.transactionId) return amount / 100;
        return amount;
    }

    _parseAmountNumber(value) {
        if (typeof value === 'number' && Number.isFinite(value)) return value;
        if (typeof value === 'string') {
            const parsed = Number(value.replace(',', '.').replace(/[^\d.-]/g, ''));
            return Number.isFinite(parsed) ? parsed : 0;
        }
        return 0;
    }

    _escapeHtml(value) {
        return String(value ?? '').replace(/[&<>"']/g, (char) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        }[char]));
    }

    _getDonationDate(donation) {
        const raw = donation || {};
        return raw.completedAt?.toDate?.()
            || raw.timestamp?.toDate?.()
            || raw.createdAt?.toDate?.()
            || (raw.completedAt ? new Date(raw.completedAt) : null)
            || (raw.timestamp ? new Date(raw.timestamp) : null)
            || (raw.createdAt ? new Date(raw.createdAt) : null);
    }

    _donationStatusIsVisible(donation) {
        const status = String(donation?.status || '').trim().toLowerCase();
        return !status || ['completed', 'succeeded', 'captured', 'pending', 'processing'].includes(status);
    }

    _getDonationStatusLabel(status) {
        const normalized = String(status || '').trim().toLowerCase();
        const labels = {
            completed: t('giving.statusCompleted'),
            succeeded: t('giving.statusCompleted'),
            captured: t('giving.statusCompleted'),
            pending: t('giving.statusPending'),
            processing: t('giving.statusProcessing'),
            failed: t('giving.statusFailed'),
            canceled: t('giving.statusCanceled'),
            cancelled: t('giving.statusCanceled')
        };
        return labels[normalized] || (status || t('giving.statusUnknown'));
    }

    _getDonationMethodLabel(method) {
        const normalized = String(method || '').trim().toLowerCase();
        const labels = {
            card: t('giving.methodCard'),
            stripe: t('giving.methodStripe'),
            vipps: t('giving.methodVipps'),
            bank: t('giving.methodBank'),
            manual: t('giving.methodManual'),
            cash: t('giving.methodCash')
        };
        return labels[normalized] || (method || t('giving.methodUnknown'));
    }

    _getDonationReference(donation) {
        const raw = donation || {};
        return raw.reference
            || raw.transactionId
            || raw.paymentIntentId
            || raw.manualDonationId
            || raw.id
            || '';
    }

    _getPhoneCountries() {
        return [
            ['NO', '+47', 'Norge'], ['SE', '+46', 'Sverige'], ['DK', '+45', 'Danmark'], ['FI', '+358', 'Finland'],
            ['IS', '+354', 'Island'], ['GB', '+44', 'Storbritannia'], ['US', '+1', 'USA'], ['CA', '+1', 'Canada'],
            ['AF', '+93', 'Afghanistan'], ['AL', '+355', 'Albania'], ['DZ', '+213', 'Algerie'], ['AS', '+1684', 'Amerikansk Samoa'],
            ['AD', '+376', 'Andorra'], ['AO', '+244', 'Angola'], ['AI', '+1264', 'Anguilla'], ['AG', '+1268', 'Antigua og Barbuda'],
            ['AR', '+54', 'Argentina'], ['AM', '+374', 'Armenia'], ['AW', '+297', 'Aruba'], ['AU', '+61', 'Australia'],
            ['AT', '+43', 'Østerrike'], ['AZ', '+994', 'Aserbajdsjan'], ['BS', '+1242', 'Bahamas'], ['BH', '+973', 'Bahrain'],
            ['BD', '+880', 'Bangladesh'], ['BB', '+1246', 'Barbados'], ['BY', '+375', 'Belarus'], ['BE', '+32', 'Belgia'],
            ['BZ', '+501', 'Belize'], ['BJ', '+229', 'Benin'], ['BM', '+1441', 'Bermuda'], ['BT', '+975', 'Bhutan'],
            ['BO', '+591', 'Bolivia'], ['BA', '+387', 'Bosnia-Hercegovina'], ['BW', '+267', 'Botswana'], ['BR', '+55', 'Brasil'],
            ['IO', '+246', 'Britisk territorium i Indiahavet'], ['VG', '+1284', 'De britiske jomfruøyene'], ['BN', '+673', 'Brunei'],
            ['BG', '+359', 'Bulgaria'], ['BF', '+226', 'Burkina Faso'], ['BI', '+257', 'Burundi'], ['KH', '+855', 'Kambodsja'],
            ['CM', '+237', 'Kamerun'], ['CV', '+238', 'Kapp Verde'], ['KY', '+1345', 'Caymanøyene'], ['CF', '+236', 'Den sentralafrikanske republikk'],
            ['TD', '+235', 'Tsjad'], ['CL', '+56', 'Chile'], ['CN', '+86', 'Kina'], ['CX', '+61', 'Christmasøya'],
            ['CC', '+61', 'Kokosøyene'], ['CO', '+57', 'Colombia'], ['KM', '+269', 'Komorene'], ['CG', '+242', 'Kongo-Brazzaville'],
            ['CD', '+243', 'Kongo-Kinshasa'], ['CK', '+682', 'Cookøyene'], ['CR', '+506', 'Costa Rica'], ['CI', '+225', 'Elfenbenskysten'],
            ['HR', '+385', 'Kroatia'], ['CU', '+53', 'Cuba'], ['CW', '+599', 'Curaçao'], ['CY', '+357', 'Kypros'],
            ['CZ', '+420', 'Tsjekkia'], ['DJ', '+253', 'Djibouti'], ['DM', '+1767', 'Dominica'], ['DO', '+1809', 'Den dominikanske republikk'],
            ['EC', '+593', 'Ecuador'], ['EG', '+20', 'Egypt'], ['SV', '+503', 'El Salvador'], ['GQ', '+240', 'Ekvatorial-Guinea'],
            ['ER', '+291', 'Eritrea'], ['EE', '+372', 'Estland'], ['SZ', '+268', 'Eswatini'], ['ET', '+251', 'Etiopia'],
            ['FK', '+500', 'Falklandsøyene'], ['FO', '+298', 'Færøyene'], ['FJ', '+679', 'Fiji'], ['FR', '+33', 'Frankrike'],
            ['GF', '+594', 'Fransk Guyana'], ['PF', '+689', 'Fransk Polynesia'], ['GA', '+241', 'Gabon'], ['GM', '+220', 'Gambia'],
            ['GE', '+995', 'Georgia'], ['DE', '+49', 'Tyskland'], ['GH', '+233', 'Ghana'], ['GI', '+350', 'Gibraltar'],
            ['GR', '+30', 'Hellas'], ['GL', '+299', 'Grønland'], ['GD', '+1473', 'Grenada'], ['GP', '+590', 'Guadeloupe'],
            ['GU', '+1671', 'Guam'], ['GT', '+502', 'Guatemala'], ['GG', '+44', 'Guernsey'], ['GN', '+224', 'Guinea'],
            ['GW', '+245', 'Guinea-Bissau'], ['GY', '+592', 'Guyana'], ['HT', '+509', 'Haiti'], ['HN', '+504', 'Honduras'],
            ['HK', '+852', 'Hongkong'], ['HU', '+36', 'Ungarn'], ['IN', '+91', 'India'], ['ID', '+62', 'Indonesia'],
            ['IR', '+98', 'Iran'], ['IQ', '+964', 'Irak'], ['IE', '+353', 'Irland'], ['IM', '+44', 'Man'],
            ['IL', '+972', 'Israel'], ['IT', '+39', 'Italia'], ['JM', '+1876', 'Jamaica'], ['JP', '+81', 'Japan'],
            ['JE', '+44', 'Jersey'], ['JO', '+962', 'Jordan'], ['KZ', '+7', 'Kasakhstan'], ['KE', '+254', 'Kenya'],
            ['KI', '+686', 'Kiribati'], ['XK', '+383', 'Kosovo'], ['KW', '+965', 'Kuwait'], ['KG', '+996', 'Kirgisistan'],
            ['LA', '+856', 'Laos'], ['LV', '+371', 'Latvia'], ['LB', '+961', 'Libanon'], ['LS', '+266', 'Lesotho'],
            ['LR', '+231', 'Liberia'], ['LY', '+218', 'Libya'], ['LI', '+423', 'Liechtenstein'], ['LT', '+370', 'Litauen'],
            ['LU', '+352', 'Luxembourg'], ['MO', '+853', 'Macao'], ['MG', '+261', 'Madagaskar'], ['MW', '+265', 'Malawi'],
            ['MY', '+60', 'Malaysia'], ['MV', '+960', 'Maldivene'], ['ML', '+223', 'Mali'], ['MT', '+356', 'Malta'],
            ['MH', '+692', 'Marshalløyene'], ['MQ', '+596', 'Martinique'], ['MR', '+222', 'Mauritania'], ['MU', '+230', 'Mauritius'],
            ['YT', '+262', 'Mayotte'], ['MX', '+52', 'Mexico'], ['FM', '+691', 'Mikronesia'], ['MD', '+373', 'Moldova'],
            ['MC', '+377', 'Monaco'], ['MN', '+976', 'Mongolia'], ['ME', '+382', 'Montenegro'], ['MS', '+1664', 'Montserrat'],
            ['MA', '+212', 'Marokko'], ['MZ', '+258', 'Mosambik'], ['MM', '+95', 'Myanmar'], ['NA', '+264', 'Namibia'],
            ['NR', '+674', 'Nauru'], ['NP', '+977', 'Nepal'], ['NL', '+31', 'Nederland'], ['NC', '+687', 'Ny-Caledonia'],
            ['NZ', '+64', 'New Zealand'], ['NI', '+505', 'Nicaragua'], ['NE', '+227', 'Niger'], ['NG', '+234', 'Nigeria'],
            ['NU', '+683', 'Niue'], ['NF', '+672', 'Norfolkøya'], ['KP', '+850', 'Nord-Korea'], ['MK', '+389', 'Nord-Makedonia'],
            ['MP', '+1670', 'Nord-Marianene'], ['OM', '+968', 'Oman'], ['PK', '+92', 'Pakistan'], ['PW', '+680', 'Palau'],
            ['PS', '+970', 'Palestina'], ['PA', '+507', 'Panama'], ['PG', '+675', 'Papua Ny-Guinea'], ['PY', '+595', 'Paraguay'],
            ['PE', '+51', 'Peru'], ['PH', '+63', 'Filippinene'], ['PL', '+48', 'Polen'], ['PT', '+351', 'Portugal'],
            ['PR', '+1787', 'Puerto Rico'], ['QA', '+974', 'Qatar'], ['RE', '+262', 'Réunion'], ['RO', '+40', 'Romania'],
            ['RU', '+7', 'Russland'], ['RW', '+250', 'Rwanda'], ['WS', '+685', 'Samoa'], ['SM', '+378', 'San Marino'],
            ['ST', '+239', 'São Tomé og Príncipe'], ['SA', '+966', 'Saudi-Arabia'], ['SN', '+221', 'Senegal'], ['RS', '+381', 'Serbia'],
            ['SC', '+248', 'Seychellene'], ['SL', '+232', 'Sierra Leone'], ['SG', '+65', 'Singapore'], ['SX', '+1721', 'Sint Maarten'],
            ['SK', '+421', 'Slovakia'], ['SI', '+386', 'Slovenia'], ['SB', '+677', 'Salomonøyene'], ['SO', '+252', 'Somalia'],
            ['ZA', '+27', 'Sør-Afrika'], ['KR', '+82', 'Sør-Korea'], ['SS', '+211', 'Sør-Sudan'], ['ES', '+34', 'Spania'],
            ['LK', '+94', 'Sri Lanka'], ['BL', '+590', 'Saint-Barthélemy'], ['SH', '+290', 'St. Helena'], ['KN', '+1869', 'Saint Kitts og Nevis'],
            ['LC', '+1758', 'Saint Lucia'], ['MF', '+590', 'Saint-Martin'], ['PM', '+508', 'Saint-Pierre og Miquelon'], ['VC', '+1784', 'Saint Vincent og Grenadinene'],
            ['SD', '+249', 'Sudan'], ['SR', '+597', 'Surinam'], ['CH', '+41', 'Sveits'], ['SY', '+963', 'Syria'],
            ['TW', '+886', 'Taiwan'], ['TJ', '+992', 'Tadsjikistan'], ['TZ', '+255', 'Tanzania'], ['TH', '+66', 'Thailand'],
            ['TL', '+670', 'Timor-Leste'], ['TG', '+228', 'Togo'], ['TK', '+690', 'Tokelau'], ['TO', '+676', 'Tonga'],
            ['TT', '+1868', 'Trinidad og Tobago'], ['TN', '+216', 'Tunisia'], ['TR', '+90', 'Tyrkia'], ['TM', '+993', 'Turkmenistan'],
            ['TC', '+1649', 'Turks- og Caicosøyene'], ['TV', '+688', 'Tuvalu'], ['UG', '+256', 'Uganda'], ['UA', '+380', 'Ukraina'],
            ['AE', '+971', 'De forente arabiske emirater'], ['UY', '+598', 'Uruguay'], ['UZ', '+998', 'Usbekistan'], ['VU', '+678', 'Vanuatu'],
            ['VA', '+379', 'Vatikanstaten'], ['VE', '+58', 'Venezuela'], ['VN', '+84', 'Vietnam'], ['VI', '+1340', 'De amerikanske jomfruøyene'],
            ['WF', '+681', 'Wallis og Futuna'], ['EH', '+212', 'Vest-Sahara'], ['YE', '+967', 'Jemen'], ['ZM', '+260', 'Zambia'],
            ['ZW', '+263', 'Zimbabwe']
        ];
    }

    async _fetchCurrentUserDonations({ order = false } = {}) {
        const uid = this.currentUser?.uid;
        const email = (this.currentUser?.email || '').trim().toLowerCase();
        const authEmail = (firebase.auth().currentUser?.email || '').trim();
        if (!uid && !email) return [];

        const db = firebase.firestore();
        const byId = new Map();
        const addSnap = (snap) => {
            snap.forEach(doc => byId.set(doc.id, { id: doc.id, ...doc.data() }));
        };

        const queries = [];
        if (uid) {
            queries.push(db.collection('donations').where('userId', '==', uid).get());
            queries.push(db.collection('donations').where('uid', '==', uid).get());
        }
        if (email) {
            queries.push(db.collection('donations').where('donorEmail', '==', email).get());
            queries.push(db.collection('donations').where('email', '==', email).get());
        }
        if (authEmail && authEmail !== email) {
            queries.push(db.collection('donations').where('donorEmail', '==', authEmail).get());
            queries.push(db.collection('donations').where('email', '==', authEmail).get());
        }

        const results = await Promise.allSettled(queries);
        results.forEach(result => {
            if (result.status === 'fulfilled') addSnap(result.value);
            if (result.status === 'rejected') console.warn('Kunne ikke hente gave-spørring:', result.reason);
        });

        const donations = Array.from(byId.values()).filter(donation => this._donationStatusIsVisible(donation));
        donations.sort((a, b) => {
            const at = this._getDonationDate(a)?.getTime?.() || 0;
            const bt = this._getDonationDate(b)?.getTime?.() || 0;
            return bt - at;
        });
        return donations;
    }

    async refreshProfileSubCollections(uid) {
        if (!uid) {
            this.profileData.subCollections = this._emptyProfileSubCollections();
            return this.profileData.subCollections;
        }

        const empty = this._emptyProfileSubCollections();

        try {
            const [notifications, personalNotes, sharedNotes] = await Promise.all([
                window.firebaseService.getCachedCollection('user_notifications', `notifs:${uid}`,
                    ref => ref.where('userId', '==', uid).orderBy('createdAt', 'desc').limit(30)),
                window.firebaseService.getCachedCollection('personal_notes', `personal_notes:${uid}`,
                    ref => ref.where('userId', '==', uid).orderBy('createdAt', 'desc').limit(30)),
                window.firebaseService.getCachedCollection('user_notes', `shared_notes:${uid}`,
                    ref => ref.where('userId', '==', uid).orderBy('createdAt', 'desc').limit(30)),
            ]);

            const normalizedNotifs = (notifications || []).map(d => this._normalizeNotificationDoc(d));
            const communicationItems = normalizedNotifs.filter(item =>
                ['push', 'message', 'email', 'announcement'].includes(item.type) || !!item.body
            );

            const normalizedPersonal = (personalNotes || []).map(d => this._normalizeNoteDoc(d, 'personal'));
            const normalizedShared = (sharedNotes || []).map(d => this._normalizeNoteDoc(d, 'shared'));

            const mapped = {
                communication: {
                    items: communicationItems,
                    count: communicationItems.length
                },
                activity: {
                    items: normalizedNotifs,
                    count: normalizedNotifs.length
                },
                notes: {
                    personal: normalizedPersonal,
                    shared: normalizedShared,
                    count: normalizedPersonal.length + normalizedShared.length
                }
            };

            this.profileData = {
                ...this.profileData,
                subCollections: mapped
            };

            return mapped;
        } catch (e) {
            console.warn('refreshProfileSubCollections:', e);
            this.profileData = {
                ...this.profileData,
                subCollections: empty
            };
            return empty;
        }
    }

    async getMergedProfile(user) {
        if (!user) return {};
        let data = {};
        try {
            const doc = await firebase.firestore().collection('users').doc(user.uid).get();
            if (doc.exists) data = doc.data() || {};
        } catch (e) { console.warn('getMergedProfile:', e); }

        const google = (user.providerData || []).find(p => p.providerId === 'google.com') || {};
        const role = await window.firebaseService.getUserRole(user.uid);

        return {
            ...data,
            displayName: data.displayName || user.displayName || google.displayName || user.email || '',
            photoURL: data.photoURL || user.photoURL || google.photoURL || '',
            role: role || data.role || 'medlem',
            subCollections: this.profileData?.subCollections || data.subCollections || this._emptyProfileSubCollections(),
        };
    }

    async syncUserProfile(user) {
        if (!user) return;
        try {
            const ref = firebase.firestore().collection('users').doc(user.uid);
            const doc = await ref.get();
            if (!doc.exists) {
                await ref.set({
                    email: (user.email || '').toLowerCase().trim(),
                    displayName: user.displayName || '',
                    photoURL: user.photoURL || '',
                    role: 'medlem',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                });
                await this.createAdminNotification({
                    type: 'NEW_USER_REGISTRATION',
                    userId: user.uid,
                    userEmail: user.email,
                    userName: user.displayName || user.email,
                    message: `Ny bruker: ${user.displayName || user.email}`,
                });
            }

            // Auto-register FCM token if notification permission is already granted
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted' && firebase.messaging && firebase.messaging.isSupported()) {
                (async () => {
                    try {
                        const msg = firebase.messaging();
                        
                        // Handle foreground push notifications
                        msg.onMessage((payload) => {
                            console.log('[MinSide] Foreground message received:', payload);
                            const title = payload.notification?.title || 'Ny oppdatering';
                            const body = payload.notification?.body || '';
                            if (typeof window.showToast === 'function') {
                                window.showToast(`🔔 ${title}: ${body}`, "success", 10000);
                            }
                        });

                        const registration = await Promise.race([
                            navigator.serviceWorker.ready,
                            new Promise((_, reject) => setTimeout(() => reject(new Error("Service Worker ready-tilstand tidsavbrutt (4s)")), 4000))
                        ]);
                        const token = await msg.getToken({
                            vapidKey: 'BI2k24dp-3eJWtLSPvGWQkD00A_duNRCIMY_2ozLFI0-anJDamFBALaTdtzGYQEkoFz8X0JxTcCX6tn3P_i0YrA',
                            serviceWorkerRegistration: registration
                        });
                        if (token) {
                            await ref.update({
                                fcmTokens: firebase.firestore.FieldValue.arrayUnion(token),
                                pushEnabled: true
                            });
                            console.log('[MinSide] Auto-registered FCM token:', token);
                        }
                    } catch (fcmErr) {
                        console.warn('[MinSide] Auto FCM registration failed:', fcmErr.message);
                        if (window.hkmLogger) {
                            window.hkmLogger.warn(`Auto FCM registration failed: ${fcmErr.message || fcmErr}`);
                        }
                    }
                })();
            }
        } catch (e) { console.warn('syncUserProfile:', e); }
    }

    async syncProfileFromGoogleProvider() {
        const user = this.currentUser;
        if (!user) return;
        const google = (user.providerData || []).find(p => p.providerId === 'google.com');
        if (!google) return;
        try {
            const updates = {};
            if (!user.displayName && google.displayName) updates.displayName = google.displayName;
            if (!user.photoURL && google.photoURL) updates.photoURL = google.photoURL;
            if (Object.keys(updates).length) await user.updateProfile(updates);
            await firebase.firestore().collection('users').doc(user.uid).set({
                displayName: user.displayName || google.displayName || '',
                photoURL: user.photoURL || google.photoURL || '',
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });
        } catch (e) { console.warn('syncGoogleProvider:', e); }
    }

    async createAdminNotification(data) {
        try {
            await firebase.firestore().collection('admin_notifications').add({
                ...data,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                read: false,
            });
        } catch (e) { console.warn('createAdminNotification:', e); }
    }

    // ──────────────────────────────────────────────────────────
    // NOTIFICATION BADGE
    // ──────────────────────────────────────────────────────────
    initNotificationBadge() {
        const uid = this.currentUser?.uid;
        if (!uid) return;
        try {
            this._badgeUnsubscribe = firebase.firestore()
                .collection('user_notifications')
                .where('userId', '==', uid)
                .where('read', '==', false)
                .onSnapshot(
                    snap => this._setBadge(snap.size),
                    err => console.warn('[MinSide] notification badge listener error:', err)
                );
        } catch (e) { console.warn('badge listener:', e); }
    }

    _setBadge(count) {
        const el = document.getElementById('notif-badge');
        const headerDot = document.getElementById('notif-badge-header');
        const bottomDot = document.getElementById('notif-badge-bottom');
        
        if (el) {
            el.textContent = count > 9 ? '9+' : count;
            el.style.setProperty('display', count > 0 ? 'inline-block' : 'none', 'important');
        }
        
        if (headerDot) {
            headerDot.style.setProperty('display', count > 0 ? 'block' : 'none', 'important');
        }

        if (bottomDot) {
            bottomDot.style.setProperty('display', count > 0 ? 'block' : 'none', 'important');
        }
    }

    _getDailyVerse(lang) {
        const verses = [
            {
                no: '"For jeg vet hvilke tanker jeg har med dere, sier Herren..." — Jer 29:11',
                en: '"For I know the plans I have for you," declares the Lord... — Jer 29:11',
                es: '"Porque yo sé los pensamientos que tengo acerca de vosotros, dice Jehová... — Jer 29:11'
            },
            {
                no: '"Alt makter jeg i ham som gjør meg sterk." — Fil 4:13',
                en: '"I can do all things through him who strengthens me." — Phil 4:13',
                es: '"Todo lo puedo en Cristo que me fortalece." — Fil 4:13'
            },
            {
                no: '"Herren er min hyrde, jeg mangler ingenting." — Sal 23:1',
                en: '"The Lord is my shepherd; I shall not want." — Ps 23:1',
                es: '"Jehová es mi pastor; nada me faltará." — Sal 23:1'
            },
            {
                no: '"Men de som venter på Herren, får ny kraft." — Jes 40:31',
                en: '"But those who trust in the Lord will renew their strength." — Isa 40:31',
                es: '"Pero los que esperan a Jehová tendrán nuevas fuerzas." — Is 40:31'
            },
            {
                no: '"Vi vet at alt samvirker til det gode for dem som elsker Gud." — Rom 8:28',
                en: '"And we know that in all things God works for the good of those who love him." — Rom 8:28',
                es: '"Y sabemos que a los que aman a Dios, todas las cosas les ayudan a bien." — Rom 8:28'
            },
            {
                no: '"Stol på Herren av hele ditt hjerte, og stol ikke på din egen forstand." — Ordsp 3:5',
                en: '"Trust in the Lord with all your heart and lean not on your own understanding." — Prov 3:5',
                es: '"Fíate de Jehová de todo tu corazón, y no te apoyes en tu propia prudencia." — Prov 3:5'
            },
            {
                no: '"Vær modig og sterk! Vær ikke redd, for Herren din Gud er med deg." — Jos 1:9',
                en: '"Be strong and courageous. Do not be afraid; the Lord your God will be with you." — Josh 1:9',
                es: '"Mira que te mando que te esfuerces y seas valiente; no temas, porque Jehová tu Dios estará contigo." — Jos 1:9'
            }
        ];

        // Pick verse based on the day of the week (0 = Sunday, 1 = Monday, etc.)
        const dayIndex = new Date().getDay();
        const verse = verses[dayIndex] || verses[0];
        return verse[lang] || verse['no'];
    }

    _timeAgo(dateVal) {
        const date = (dateVal instanceof Date) ? dateVal : (dateVal?.toDate ? dateVal.toDate() : new Date(dateVal));
        if (isNaN(date.getTime())) return '';
        const s = Math.floor((Date.now() - date.getTime()) / 1000);
        const lang = document.documentElement.lang || 'no';
        const localeCode = lang === 'en' ? 'en-US' : lang === 'es' ? 'es-ES' : 'no-NO';
        if (s < 0 || s < 60) return t('time.justNow');
        if (s < 3600) return t('time.minutesAgo', { n: Math.floor(s / 60) });
        if (s < 86400) return t('time.hoursAgo', { n: Math.floor(s / 3600) });
        if (s < 604800) return t('time.daysAgo', { n: Math.floor(s / 86400) });
        return date.toLocaleDateString(localeCode, { day: 'numeric', month: 'short', year: 'numeric' });
    }

    // ══════════════════════════════════════════════════════════
    // VIEW: OVERSIKT (Dashboard forside)
    // ══════════════════════════════════════════════════════════
    async renderOverview(container) {
        const p = this.profileData;
        const user = this.currentUser;
        const name = (p.displayName || user?.displayName || user?.email || t('role.fallbackUser')).split(' ')[0];
        const year = new Date().getFullYear();
        const hour = new Date().getHours();
        const greeting = hour < 12 ? t('overview.goodMorning') : hour < 17 ? t('overview.hello') : t('overview.goodEvening');

        container.innerHTML = `
        <div class="ms-overview-wrap">

            <!-- Welcome banner -->
            <div class="ms-overview-banner">
                <div>
                    <h2 class="ms-overview-banner-title">
                        ${greeting}, ${name}! 👋
                    </h2>
                    <p class="ms-overview-banner-quote">
                        ${this._getDailyVerse(document.documentElement.lang || 'no')}
                    </p>
                </div>
                <div class="ms-overview-banner-chip">
                    <div class="ms-overview-banner-chip-label">${t('overview.memberSince')}</div>
                    <div class="ms-overview-banner-chip-value" id="ov-member-since">—</div>
                </div>
            </div>

            <!-- Stats row -->
            <div class="ms-overview-stats">
                <!-- Uleste Varslinger -->
                <div class="bento-stat-card bento-orange" onclick="window.minSideManager.loadView('notifications')">
                    <div class="bento-card-header">
                        <div class="bento-icon-wrap">
                            <span class="material-symbols-outlined">notifications_active</span>
                        </div>
                        <span class="material-symbols-outlined bento-indicator">trending_flat</span>
                    </div>
                    <div class="bento-card-label">${t('overview.unreadNotifications')}</div>
                    <div class="bento-value-row">
                        <span class="bento-card-value" id="ov-notif-count">—</span>
                    </div>
                    <div class="bento-card-desc">${t('overview.clickToViewAll')}</div>
                </div>

                <!-- Gitt totalt -->
                <div class="bento-stat-card bento-blue" onclick="window.minSideManager.loadView('giving')">
                    <div class="bento-card-header">
                        <div class="bento-icon-wrap">
                            <span class="material-symbols-outlined">volunteer_activism</span>
                        </div>
                        <span class="material-symbols-outlined bento-indicator">trending_up</span>
                    </div>
                    <div class="bento-card-label">${t('overview.totalGiven')} ${year}</div>
                    <div class="bento-value-row">
                        <span class="bento-card-value" id="ov-year-total">—</span>
                    </div>
                    <div class="bento-card-desc" id="ov-year-sub">${t('overview.seeGivingHistory')}</div>
                </div>

                <!-- Available courses -->
                <div class="bento-stat-card bento-purple" onclick="window.minSideManager.loadView('courses')">
                    <div class="bento-card-header">
                        <div class="bento-icon-wrap">
                            <span class="material-symbols-outlined">school</span>
                        </div>
                        <span class="material-symbols-outlined bento-indicator">auto_awesome</span>
                    </div>
                    <div class="bento-card-label">${t('overview.availableCourses')}</div>
                    <div class="bento-value-row">
                        <span class="bento-card-value" id="ov-courses-count">—</span>
                    </div>
                    <div class="bento-card-desc">${t('overview.teachingFromHkm')}</div>
                </div>

                <!-- Min fremdrift -->
                <div class="bento-stat-card bento-teal" onclick="window.minSideManager.loadView('reading-plans')">
                    <div class="bento-card-header">
                        <div class="bento-icon-wrap">
                            <span class="material-symbols-outlined">analytics</span>
                        </div>
                        <span class="material-symbols-outlined bento-indicator">trending_up</span>
                    </div>
                    <div class="bento-card-label">Min fremdrift</div>
                    <div class="bento-value-row">
                        <span class="bento-card-value" id="ov-progress-text">—</span>
                        <div class="bento-progress-track">
                            <div class="bento-progress-bar" id="ov-progress-bar" style="width: 0%;"></div>
                        </div>
                    </div>
                    <div class="bento-card-desc" id="ov-progress-sub">...</div>
                </div>
            </div>

            <!-- Bønneveggen preview -->
            <div class="info-card ms-overview-card-gap" id="ov-prayer-preview-card" style="display: none;">
                <div class="info-card-header" style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <h3>Siste fra Bønneveggen</h3>
                        <p style="font-size: 12px; color: #64748b; margin: 4px 0 0 0;">Bær hverandres byrder i bønnefellesskapet</p>
                    </div>
                    <button class="btn btn-ghost btn-sm" onclick="window.minSideManager.loadView('prayer-wall')" style="font-size: 13px; display: flex !important; align-items: center !important; justify-content: center !important; gap: 4px !important; padding: 6px 12px !important; height: 32px !important; border: none !important; width: auto !important;"><span style="display: inline-block; line-height: 1;">Gå til Bønneveggen</span><span class="material-symbols-outlined" style="font-size: 16px; position: relative; top: 3px !important; display: inline-block; line-height: 1;">arrow_forward</span></button>
                </div>
                <div id="ov-prayer-feed-preview" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; padding: 16px; box-sizing: border-box; width: 100%;">
                    <div class="loading-state ms-loading-min-80"><div class="spinner"></div></div>
                </div>
            </div>



            <!-- Recent notifications -->
            <div class="info-card">
                <div class="info-card-header">
                    <h3>${t('overview.recentNotifications')}</h3>
                    <button class="btn btn-ghost btn-sm" onclick="window.minSideManager.loadView('notifications')">
                        ${t('overview.seeAll')}
                    </button>
                </div>
                <div id="ov-recent-notifs">
                    <div class="loading-state ms-loading-min-80"><div class="spinner"></div></div>
                </div>
            </div>

        </div>`;

        // Quick action clicks
        container.querySelectorAll('.ov-action-btn').forEach(btn => {
            btn.addEventListener('click', () => this.loadView(btn.dataset.view));
        });

        // Stat: member since
        if (p.createdAt?.toDate) {
            document.getElementById('ov-member-since').textContent =
                p.createdAt.toDate().getFullYear();
        } else {
            document.getElementById('ov-member-since').textContent = new Date().getFullYear();
        }

        // Parallel fetches
        const uid = user?.uid;
        try {
            const promises = [
                firebase.firestore().collection('user_notifications')
                    .where('userId', '==', uid).where('read', '==', false).get(),
                this._fetchCurrentUserDonations(),
                firebase.firestore().collection('teaching').get(),
                firebase.firestore().collection('user_notifications')
                    .where('userId', '==', uid).orderBy('createdAt', 'desc').limit(4).get()
            ];
            if (this.prayerWallEnabled) {
                promises.push(firebase.firestore().collection('prayers').get());
            } else {
                promises.push(Promise.resolve({ docs: [] }));
            }
            // Fetch reading plan progress (no orderBy/limit in query to avoid index requirement)
            promises.push(
                firebase.firestore()
                    .collection('users')
                    .doc(uid)
                    .collection('reading_plans')
                    .where('completed', '==', false)
                    .get()
            );

            const [notifSnap, donations, coursesSnap, recentSnap, prayersSnap, plansSnap] = await Promise.all(promises);

            // Prayers preview rendering
            const ovPrayerCard = document.getElementById('ov-prayer-preview-card');
            const ovPrayerFeed = document.getElementById('ov-prayer-feed-preview');
            if (ovPrayerCard && ovPrayerFeed) {
                if (this.prayerWallEnabled) {
                    ovPrayerCard.style.display = 'block';
                
                const prayers = prayersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                prayers.sort((a, b) => {
                    const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);
                    const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);
                    return bTime - aTime;
                });
                
                const topPrayers = prayers.slice(0, 3);
                if (topPrayers.length > 0) {
                    ovPrayerFeed.innerHTML = topPrayers.map(p => {
                        const name = p.isAnonymous ? 'Anonym' : (p.userName || 'Medlem');
                        const count = p.prayedCount || (p.prayedUserIds || []).length || 0;
                        const textSnippet = p.text.length > 80 ? p.text.substring(0, 80) + '...' : p.text;
                        
                        return `
                            <div class="ov-prayer-item" style="border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 16px; background: #f8fafc; display: flex; flex-direction: column; justify-content: space-between; min-height: 110px;">
                                <div>
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                                        <span style="font-size: 12px; font-weight: 700; color: #1B4965;">${name}</span>
                                        <span style="font-size: 11px; color: #94a3b8;">${p.createdAt ? this.formatTimeAgo(p.createdAt) : ''}</span>
                                    </div>
                                    <p style="font-size: 13.5px; color: #334155; margin: 0 0 12px 0; line-height: 1.4; white-space: pre-wrap; font-family: inherit;">${textSnippet}</p>
                                </div>
                                <div style="display: flex !important; align-items: center !important; gap: 4px !important; font-size: 11px; font-weight: 700; color: #bd4f2a; border-top: 1px solid #f1f5f9; padding-top: 8px; margin-top: auto; width: 100%;"><span class="material-symbols-outlined" style="font-size: 14px; position: relative; top: 3.5px !important; display: inline-block; line-height: 1;">volunteer_activism</span><span style="display: inline-block; line-height: 1;">${count} ber</span></div>
                            </div>
                        `;
                    }).join('');
                } else {
                    ovPrayerFeed.innerHTML = `
                        <div style="grid-column: 1 / -1; text-align: center; padding: 20px; color: #64748b; font-size: 13px;">
                            Ingen bønneemner ennå. Bli den første til å legge inn et bønneemne på veggen.
                        </div>
                    `;
                }
                } else {
                    ovPrayerCard.style.display = 'none';
                }
            }

            // Notif count
            const notifEl = document.getElementById('ov-notif-count');
            if (notifEl) notifEl.textContent = notifSnap.size || '0';

            // Year total giving
            let yearTotal = 0;
            donations.forEach(donation => {
                if (this._getDonationDate(donation)?.getFullYear?.() === new Date().getFullYear()) {
                    yearTotal += this._normalizeDonationAmountNok(donation);
                }
            });
            const yearEl = document.getElementById('ov-year-total');
            if (yearEl) yearEl.textContent = yearTotal > 0
                ? `kr ${yearTotal.toLocaleString('no-NO', { minimumFractionDigits: 0 })}`
                : t('overview.givingNone');

            // Courses count
            const coursesEl = document.getElementById('ov-courses-count');
            if (coursesEl) coursesEl.textContent = coursesSnap.size || '0';

            // Progress render
            let progressPct = 0;
            let progressTitle = 'Ingen aktiv plan';
            if (plansSnap && !plansSnap.empty) {
                // Sort active plans in memory by lastActiveAt desc
                const activePlans = plansSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                activePlans.sort((a, b) => {
                    const aTime = a.lastActiveAt?.toMillis ? a.lastActiveAt.toMillis() : (a.lastActiveAt?.seconds ? a.lastActiveAt.seconds * 1000 : 0);
                    const bTime = b.lastActiveAt?.toMillis ? b.lastActiveAt.toMillis() : (b.lastActiveAt?.seconds ? b.lastActiveAt.seconds * 1000 : 0);
                    return bTime - aTime;
                });
                const activeUserPlan = activePlans[0];
                
                const globalSnap = await firebase.firestore()
                    .collection('reading_plans')
                    .doc(activeUserPlan.planId)
                    .get();
                if (globalSnap.exists) {
                    const activeGlobalPlan = globalSnap.data();
                    const completedDays = activeUserPlan.completedDays || [];
                    const totalDays = activeGlobalPlan.daysCount || (activeGlobalPlan.days ? Object.keys(activeGlobalPlan.days).length : 0) || 1;
                    progressPct = Math.round((completedDays.length / totalDays) * 100);
                    const planTitle = activeGlobalPlan.title || '';
                    progressTitle = `Fortsett: ${planTitle}`;
                }
            }
            const progressTextEl = document.getElementById('ov-progress-text');
            const progressBarEl = document.getElementById('ov-progress-bar');
            const progressSubEl = document.getElementById('ov-progress-sub');
            if (progressTextEl) progressTextEl.textContent = `${progressPct}%`;
            if (progressBarEl) progressBarEl.style.width = `${progressPct}%`;
            if (progressSubEl) progressSubEl.textContent = progressTitle;

            // Recent notifications list
            const recentEl = document.getElementById('ov-recent-notifs');
            if (recentEl) {
                if (recentSnap.empty) {
                    recentEl.innerHTML = `<div class="ms-overview-notifs-empty">${t('overview.noNotificationsYet')}</div>`;
                } else {
                    recentEl.innerHTML = recentSnap.docs.map(doc => {
                        const d = this._normalizeNotificationDoc(doc);
                        const date = d.createdAt?.toDate ? d.createdAt.toDate() : new Date(0);
                        return `<div class="ms-overview-notif-row">
                            <div class="ms-overview-notif-dot ${d.read ? 'is-read' : ''}"></div>
                            <div class="ms-overview-notif-main">
                                <div class="ms-overview-notif-title">${d.title}</div>
                                <div class="ms-overview-notif-body">${d.body || ''}</div>
                            </div>
                            <div class="ms-overview-notif-time">${this._timeAgo(date)}</div>
                        </div>`;
                    }).join('') + `<div class="ms-overview-notifs-footer">
                        <button class="btn btn-ghost btn-sm ms-btn-full"
                            onclick="window.minSideManager.loadView('notifications')">
                            ${t('overview.showAllNotifications')}
                        </button></div>`;
                }
            }
        } catch (e) {
            console.warn('Overview fetch error:', e);
        }
    }

    // ══════════════════════════════════════════════════════════
    // VIEW: PROFIL (PCO style)
    // ══════════════════════════════════════════════════════════
    async renderProfile(container) {
        const uid = this.currentUser?.uid;
        if (!uid) return;

        // Fresh fetch
        let data = {};
        try {
            const doc = await firebase.firestore().collection('users').doc(uid).get();
            if (doc.exists) data = doc.data() || {};
        } catch (e) { }

        const p = { ...this.profileData, ...data };
        const esc = value => this._escapeHtml(value);
        const val = v => v ? `<span class="info-row-value">${esc(v)}</span>` : `<span class="info-row-value empty">—</span>`;
        const inputValue = v => esc(v || '');
        const phoneCountryCode = p.phoneCountryCode || (String(p.phone || '').trim().startsWith('+') ? '' : '+47');
        const phoneDisplay = [phoneCountryCode, p.phone].filter(Boolean).join(' ').trim();
        const phoneCountryOptions = this._getPhoneCountries().map(([iso, dial, name]) => {
            const selected = dial === phoneCountryCode ? 'selected' : '';
            return `<option value="${esc(dial)}" data-country="${esc(iso)}" ${selected}>${esc(`${dial} ${name}`)}</option>`;
        }).join('');

        const joinYear = p.createdAt?.toDate
            ? p.createdAt.toDate().getFullYear()
            : new Date().getFullYear();

        const genderKeys = {
            'Mann': 'profile.genderMale',
            'Male': 'profile.genderMale',
            'Kvinne': 'profile.genderFemale',
            'Female': 'profile.genderFemale',
            'Annet': 'profile.genderOther',
            'Other': 'profile.genderOther'
        };
        const maritalKeys = {
            'Ugift': 'profile.maritalSingle',
            'Single': 'profile.maritalSingle',
            'Gift': 'profile.maritalMarried',
            'Married': 'profile.maritalMarried',
            'Samboer': 'profile.maritalPartner',
            'Partner': 'profile.maritalPartner',
            'Skilt': 'profile.maritalDivorced',
            'Divorced': 'profile.maritalDivorced',
            'Enke/Enkemann': 'profile.maritalWidowed',
            'Widowed': 'profile.maritalWidowed'
        };
        const genderVal = p.gender ? (t(genderKeys[p.gender]) || p.gender) : '';
        const maritalVal = p.maritalStatus ? (t(maritalKeys[p.maritalStatus]) || p.maritalStatus) : '';

        // Fetch allowed items (admin default)
        let allowedItems = ['overview', 'profile', 'courses', 'reading-plans', 'giving', 'notifications'];
        try {
            const designSettings = await window.firebaseService.getPageContent('settings_design');
            if (designSettings && Array.isArray(designSettings.minsideBottomNav)) {
                allowedItems = designSettings.minsideBottomNav;
            }
        } catch (e) {}

        const userCustomNav = p.customBottomNav || allowedItems;

        const navLabels = {
            'overview': { label: t('sidebar.oversikt') || 'Oversikt', icon: 'home' },
            'profile': { label: t('sidebar.profil') || 'Profil', icon: 'person' },
            'courses': { label: t('overview.btnCoursesLabel') || 'Kurs', icon: 'school' },
            'reading-plans': { label: t('overview.btnReadingPlansLabel') || 'Leseplaner', icon: 'auto_stories' },
            'giving': { label: t('overview.btnGivingLabel') || 'Gaver', icon: 'volunteer_activism' },
            'notifications': { label: t('sidebar.varslinger') || 'Varslinger', icon: 'notifications' }
        };

        const customNavHtml = allowedItems.map(id => {
            const checked = userCustomNav.includes(id) ? 'checked' : '';
            const item = navLabels[id] || { label: id, icon: 'link' };
            return `
                <label style="display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; border-radius: 10px; background: var(--admin-bg, #f8f9fa); border: 1px solid var(--admin-border, #e2e8f0); cursor: pointer; user-select: none;">
                    <div style="display: flex; align-items: center; gap: 10px; color: var(--text-main, #1e293b);">
                        <span class="material-symbols-outlined" style="color: #64748b; font-size: 20px;">${item.icon}</span>
                        <span style="font-weight: 600; font-size: 13.5px;">${item.label}</span>
                    </div>
                    <label class="toggle toggle-sm" style="margin: 0;">
                        <input type="checkbox" class="custom-nav-cb" value="${id}" ${checked}>
                        <span class="toggle-slider"></span>
                    </label>
                </label>
            `;
        }).join('');

        const activeTab = this._activeProfileTab || 'my-profile';

        container.innerHTML = `
        <div class="profile-tabs-container">
            <button class="profile-tab-btn ${activeTab === 'my-profile' ? 'active' : ''}" data-profile-tab="my-profile">Min profil</button>
            <button class="profile-tab-btn ${activeTab === 'notifications' ? 'active' : ''}" data-profile-tab="notifications">Varsler</button>
        </div>

        <div id="profile-tab-content-my-profile" class="profile-tab-content" style="${activeTab === 'my-profile' ? '' : 'display: none;'}">
            <div class="profile-grid">
                <!-- ── LEFT COLUMN ── -->
                <div class="profile-left">

                <!-- Contact information -->
                <div class="info-card profile-edit-card" id="contact-card">
                    <div class="info-card-header">
                        <h3>${t('profile.contactInfo')}</h3>
                        <button class="edit-icon-btn profile-edit-toggle" id="toggle-contact-edit" title="${t('common.edit')}" type="button">
                            <span class="material-symbols-outlined">edit</span>
                        </button>
                    </div>
                    <div class="info-rows">
                        <div class="info-row editable-info-row">
                            <span class="material-symbols-outlined info-row-icon">badge</span>
                            <div class="info-row-content">
                                <div class="info-row-label">${t('profile.fullName')}</div>
                                <div class="info-row-display">${val(p.displayName || this.currentUser.displayName)}</div>
                                <div class="info-row-edit">
                                    <input name="displayName" value="${inputValue(p.displayName || this.currentUser.displayName)}" autocomplete="name">
                                </div>
                            </div>
                        </div>
                        <div class="info-row">
                            <span class="material-symbols-outlined info-row-icon">mail</span>
                            <div class="info-row-content">
                                <div class="info-row-label">${t('profile.email')}</div>
                                <div class="info-row-display">${val(this.currentUser.email)}</div>
                            </div>
                        </div>
                        <div class="info-row editable-info-row">
                            <span class="material-symbols-outlined info-row-icon">phone</span>
                            <div class="info-row-content">
                                <div class="info-row-label">${t('profile.phone')}</div>
                                <div class="info-row-display">${val(phoneDisplay)}</div>
                                <div class="info-row-edit">
                                    <div class="phone-inline-grid">
                                        <select name="phoneCountryCode" autocomplete="tel-country-code">${phoneCountryOptions}</select>
                                        <input name="phone" type="tel" value="${inputValue(p.phone)}" autocomplete="tel-national" placeholder="${t('profile.phonePlaceholder')}">
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="info-row editable-info-row">
                            <span class="material-symbols-outlined info-row-icon">location_on</span>
                            <div class="info-row-content">
                                <div class="info-row-label">${t('profile.address')}</div>
                                <div class="info-row-display">${p.address || p.zip || p.city || p.country
                ? `<span class="info-row-value">${[esc(p.address), [esc(p.zip), esc(p.city)].filter(Boolean).join(' '), esc(p.country)].filter(Boolean).join('<br>')}</span>`
                : `<span class="info-row-value empty">—</span>`}</div>
                                <div class="info-row-edit">
                                    <input id="profile-address-input" name="address" value="${inputValue(p.address)}" autocomplete="street-address" placeholder="${t('profile.addressSearchPlaceholder')}">
                                    <div id="address-search-status" class="address-search-status"></div>
                                    <div id="address-search-results" class="address-search-results"></div>
                                    <div class="profile-inline-grid">
                                        <input name="zip" value="${inputValue(p.zip)}" autocomplete="postal-code" placeholder="${t('profile.zipPlaceholder')}">
                                        <input name="city" value="${inputValue(p.city)}" autocomplete="address-level2" placeholder="${t('profile.cityPlaceholder')}">
                                    </div>
                                    <input name="country" value="${inputValue(p.country)}" autocomplete="country-name" placeholder="${t('profile.countryPlaceholder')}">
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="profile-edit-actions">
                        <button class="btn btn-ghost btn-sm" id="cancel-contact-edit" type="button">${t('common.cancel')}</button>
                        <button class="btn btn-primary btn-sm" id="save-contact-btn" type="button">
                            <span class="material-symbols-outlined">save</span> ${t('common.save')}
                        </button>
                    </div>
                </div>

                <!-- Personal information -->
                <div class="info-card profile-edit-card" id="personal-card">
                    <div class="info-card-header">
                        <h3>${t('profile.personalInfo')}</h3>
                        <button class="edit-icon-btn profile-edit-toggle" id="toggle-personal-edit" title="${t('common.edit')}" type="button">
                            <span class="material-symbols-outlined">edit</span>
                        </button>
                    </div>
                    <div class="info-rows">
                        <div class="info-row editable-info-row">
                            <span class="material-symbols-outlined info-row-icon">person</span>
                            <div class="info-row-content">
                                <div class="info-row-label">${t('profile.gender')}</div>
                                <div class="info-row-display">${val(genderVal)}</div>
                                <div class="info-row-edit">
                                    <select name="gender">
                                        <option value="">${t('profile.select')}</option>
                                        <option value="Mann" ${p.gender === 'Mann' ? 'selected' : ''}>${t('profile.genderMale')}</option>
                                        <option value="Kvinne" ${p.gender === 'Kvinne' ? 'selected' : ''}>${t('profile.genderFemale')}</option>
                                        <option value="Annet" ${p.gender === 'Annet' ? 'selected' : ''}>${t('profile.genderOther')}</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div class="info-row editable-info-row">
                            <span class="material-symbols-outlined info-row-icon">cake</span>
                            <div class="info-row-content">
                                <div class="info-row-label">${t('profile.birthday')}</div>
                                <div class="info-row-display">${val(p.birthday ? new Date(p.birthday).toLocaleDateString(document.documentElement.lang === 'en' ? 'en-US' : document.documentElement.lang === 'es' ? 'es-ES' : 'no-NO', { day: 'numeric', month: 'long', year: 'numeric' }) : '')}</div>
                                <div class="info-row-edit">
                                    <input type="date" name="birthday" value="${inputValue(p.birthday)}">
                                </div>
                            </div>
                        </div>
                        <div class="info-row editable-info-row">
                            <span class="material-symbols-outlined info-row-icon">favorite</span>
                            <div class="info-row-content">
                                <div class="info-row-label">${t('profile.maritalStatus')}</div>
                                <div class="info-row-display">${val(maritalVal)}</div>
                                <div class="info-row-edit">
                                    <select name="maritalStatus">
                                        <option value="">${t('profile.select')}</option>
                                        <option value="Ugift" ${p.maritalStatus === 'Ugift' ? 'selected' : ''}>${t('profile.maritalSingle')}</option>
                                        <option value="Gift" ${p.maritalStatus === 'Gift' ? 'selected' : ''}>${t('profile.maritalMarried')}</option>
                                        <option value="Samboer" ${p.maritalStatus === 'Samboer' ? 'selected' : ''}>${t('profile.maritalPartner')}</option>
                                        <option value="Skilt" ${p.maritalStatus === 'Skilt' ? 'selected' : ''}>${t('profile.maritalDivorced')}</option>
                                        <option value="Enke/Enkemann" ${p.maritalStatus === 'Enke/Enkemann' ? 'selected' : ''}>${t('profile.maritalWidowed')}</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div class="info-row">
                            <span class="material-symbols-outlined info-row-icon">calendar_today</span>
                            <div class="info-row-content">
                                <div class="info-row-label">${t('profile.memberSince')}</div>
                                <div class="info-row-display"><span class="info-row-value">${joinYear}</span></div>
                            </div>
                        </div>
                    </div>
                    <div class="profile-edit-actions">
                        <button class="btn btn-ghost btn-sm" id="cancel-personal-edit" type="button">${t('common.cancel')}</button>
                        <button class="btn btn-primary btn-sm" id="save-personal-btn" type="button">
                            <span class="material-symbols-outlined">save</span> ${t('common.save')}
                        </button>
                    </div>
                </div>

                <!-- Danger Zone -->
                <div class="info-card">
                    <div class="info-card-header">
                        <h3>${t('profile.accountAdmin')}</h3>
                    </div>
                    <div class="ms-card-body-pad" style="padding: 16px 20px 18px 20px !important; display: block !important;">
                        <p class="ms-danger-copy" style="margin-bottom: 12px !important;">
                            ${t('profile.deleteAccountNotice')}
                        </p>
                        <button class="btn btn-danger" id="delete-account-btn" style="margin: 0 !important;">
                            <span class="material-symbols-outlined">delete_forever</span>
                            ${t('profile.deleteAccountBtn')}
                        </button>
                    </div>
                </div>
            </div>

            <!-- ── RIGHT COLUMN ── -->
            <div class="profile-right">

                <!-- Household -->
                <div class="info-card">
                    <div class="info-card-header">
                        <h3>${t('profile.family')}</h3>
                    </div>
                    <div class="family-search">
                        <div class="family-search-box">
                            <span class="material-symbols-outlined">search</span>
                            <input id="family-search-input" type="search" placeholder="${t('profile.familySearchPlaceholder')}" autocomplete="off">
                        </div>
                        <div id="family-search-status" class="family-search-status"></div>
                        <div id="family-search-results" class="family-search-results"></div>
                    </div>
                    <div id="household-content">
                        ${p.familyMembers?.length ? `
                            <p class="household-name">${esc(p.displayName?.split(' ').pop() || '')} ${t('profile.household')}</p>
                            <div class="household-members">
                                ${p.familyMembers.map(m => `
                                    <div class="member-row">
                                        <div class="member-avatar">${m.photoURL ? `<img src="${esc(m.photoURL)}" alt="">` : esc((m.name || '?').charAt(0).toUpperCase())}</div>
                                        <div class="member-info">
                                            <div class="member-info-name">${esc(m.name || 'Uten navn')}</div>
                                            <div class="member-info-sub">${esc(m.role || m.email || '')}</div>
                                        </div>
                                        <button class="member-remove-btn" data-member-uid="${esc(m.uid || '')}" type="button" title="${t('common.cancel')}">
                                            <span class="material-symbols-outlined">close</span>
                                        </button>
                                    </div>
                                `).join('')}
                            </div>
                        ` : `
                            <div class="empty-state ms-empty-state-compact">
                                <span class="material-symbols-outlined ms-empty-state-icon-compact">group_off</span>
                                <p class="ms-empty-state-copy-compact">${t('profile.noFamilyRegistered')}</p>
                            </div>
                        `}
                    </div>
                </div>

                <!-- Mobile Navigation Menu Preferences -->
                <div class="info-card" style="border: 1px solid var(--border-color); border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); overflow: hidden; background: #fff; margin-bottom: 24px;">
                    <div class="info-card-header" style="background: #f8fafc; padding: 18px 24px; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: flex-start !important; gap: 10px;">
                        <span class="material-symbols-outlined" style="color: #1B4965; font-size: 22px;">phone_android</span>
                        <h3 style="margin: 0; font-size: 16px; font-weight: 800; color: #1b4965; letter-spacing: -0.02em;">Navigasjon på mobil</h3>
                    </div>
                    <div class="ms-card-body-pad" style="padding: 20px 24px !important; display: block !important;">
                        <p class="ms-danger-copy" style="margin-bottom: 16px !important; color: var(--text-muted, #64748b) !important; font-size: 13px; line-height: 1.5; font-weight: 500;">
                            Velg hvilke snarveier og ikoner du ønsker å ha i menylinjen nederst på skjermen på mobil:
                        </p>
                        <div id="minside-custom-nav-list" style="display: grid; grid-template-columns: 1fr; gap: 10px; margin-bottom: 20px;">
                            ${customNavHtml}
                        </div>
                        <button class="btn btn-primary" id="save-custom-nav-btn" style="box-shadow: 0 4px 12px rgba(209, 125, 57, 0.2); border-radius: 10px; padding: 11px 22px; font-weight: 700; font-size: 13.5px; width: 100%; justify-content: center; margin: 0 !important;">
                            <span class="material-symbols-outlined" style="font-size: 18px; margin-right: -2px !important;">save</span> Lagre menyvalg
                        </button>
                    </div>
                </div>

            </div>
        </div>
        </div>

        <div id="profile-tab-content-notifications" class="profile-tab-content" style="${activeTab === 'notifications' ? '' : 'display: none;'}">
            <div class="notif-settings-container">
                
                <!-- Main Header (Mockup Title and Description) -->
                <div style="margin-bottom: 28px;">
                    <h2 style="font-size: 30px; font-weight: 800; color: #1B4965; margin: 0 0 8px 0; letter-spacing: -0.02em;">Varslingsinnstillinger</h2>
                    <p style="font-size: 13.5px; color: #64748b; margin: 0; line-height: 1.5; font-weight: 500;">
                        Administrer hvordan du ønsker å motta oppdateringer og undervisning fra oss. Hold deg tilkoblet fellesskapet på dine egne premisser.
                    </p>
                </div>

                <!-- CARD 1: Push-varslinger -->
                <div class="notif-settings-card push">
                    <div class="notif-card-header">
                        <div class="notif-icon-circle push">
                            <span class="material-symbols-outlined" style="font-size: 24px;">notifications</span>
                        </div>
                        <div class="notif-card-title-container">
                            <h3 class="notif-card-title">Push-varslinger</h3>
                            <p class="notif-card-description">Motta varslinger direkte på din enhet når HKM sender meldinger.</p>
                        </div>
                    </div>
                    
                    <div class="notif-settings-list">
                        <!-- Ny undervisning -->
                        <div class="notif-setting-item">
                            <div class="notif-setting-left">
                                <span class="material-symbols-outlined notif-setting-sub-icon">school</span>
                                <div class="notif-setting-text">
                                    <div class="notif-setting-label">${t('profile.pushTeachings')}</div>
                                    <div class="notif-setting-description">${t('profile.pushTeachingsSub')}</div>
                                </div>
                            </div>
                            <label class="hkm-switch toggle-orange">
                                <input type="checkbox" id="push-teachings-toggle" ${p.pushTeachings !== false ? 'checked' : ''}>
                                <span class="hkm-slider"></span>
                            </label>
                        </div>
                        
                        <!-- Ny podcast -->
                        <div class="notif-setting-item">
                            <div class="notif-setting-left">
                                <span class="material-symbols-outlined notif-setting-sub-icon">podcasts</span>
                                <div class="notif-setting-text">
                                    <div class="notif-setting-label">${t('profile.pushPodcasts')}</div>
                                    <div class="notif-setting-description">${t('profile.pushPodcastsSub')}</div>
                                </div>
                            </div>
                            <label class="hkm-switch toggle-orange">
                                <input type="checkbox" id="push-podcasts-toggle" ${p.pushPodcasts !== false ? 'checked' : ''}>
                                <span class="hkm-slider"></span>
                            </label>
                        </div>
                        
                        <!-- Nytt blogginnlegg -->
                        <div class="notif-setting-item">
                            <div class="notif-setting-left">
                                <span class="material-symbols-outlined notif-setting-sub-icon">rate_review</span>
                                <div class="notif-setting-text">
                                    <div class="notif-setting-label">${t('profile.pushBlogs')}</div>
                                    <div class="notif-setting-description">${t('profile.pushBlogsSub')}</div>
                                </div>
                            </div>
                            <label class="hkm-switch toggle-orange">
                                <input type="checkbox" id="push-blogs-toggle" ${p.pushBlogs !== false ? 'checked' : ''}>
                                <span class="hkm-slider"></span>
                            </label>
                        </div>
                        
                        <!-- Bibel- og leseplaner -->
                        <div class="notif-setting-item">
                            <div class="notif-setting-left">
                                <span class="material-symbols-outlined notif-setting-sub-icon">auto_stories</span>
                                <div class="notif-setting-text">
                                    <div class="notif-setting-label">${t('profile.pushReadingPlans')}</div>
                                    <div class="notif-setting-description">${t('profile.pushReadingPlansSub')}</div>
                                </div>
                            </div>
                            <label class="hkm-switch toggle-orange">
                                <input type="checkbox" id="push-reading-plans-toggle" ${p.pushReadingPlans !== false ? 'checked' : ''}>
                                <span class="hkm-slider"></span>
                            </label>
                        </div>
                    </div>
                </div>
                
                <!-- CARD 2: E-postvarslinger -->
                <div class="notif-settings-card email">
                    <div class="notif-card-header">
                        <div class="notif-icon-circle email">
                            <span class="material-symbols-outlined" style="font-size: 24px;">mail</span>
                        </div>
                        <div class="notif-card-title-container">
                            <h3 class="notif-card-title">E-postvarslinger</h3>
                            <p class="notif-card-description">Velg hvilke oppdateringer vi sender til din innboks.</p>
                        </div>
                    </div>
                    
                    <div class="notif-settings-list">
                        <!-- Nyhetsbrev -->
                        <div class="notif-setting-item">
                            <div class="notif-setting-left">
                                <span class="material-symbols-outlined notif-setting-sub-icon">send</span>
                                <div class="notif-setting-text">
                                    <div class="notif-setting-label">Nyhetsbrev</div>
                                    <div class="notif-setting-description">Motta nyhetsbrev og viktige oppdateringer om vår tjeneste</div>
                                </div>
                            </div>
                            <label class="hkm-switch toggle-slate">
                                <input type="checkbox" id="email-toggle" ${p.emailConsent !== false ? 'checked' : ''}>
                                <span class="hkm-slider"></span>
                            </label>
                        </div>
                        
                        <!-- Daglige leseplanoppdateringer -->
                        <div class="notif-setting-item">
                            <div class="notif-setting-left">
                                <span class="material-symbols-outlined notif-setting-sub-icon">calendar_today</span>
                                <div class="notif-setting-text">
                                    <div class="notif-setting-label">${t('profile.emailReadingPlans')}</div>
                                    <div class="notif-setting-description">${t('profile.emailReadingPlansSub')}</div>
                                </div>
                            </div>
                            <label class="hkm-switch toggle-slate">
                                <input type="checkbox" id="email-reading-plans-toggle" ${p.emailReadingPlans !== false ? 'checked' : ''}>
                                <span class="hkm-slider"></span>
                            </label>
                        </div>
                    </div>
                </div>
                
                <!-- CARD 3: Tidspunkt for daglig oppdatering -->
                <div class="notif-settings-card time">
                    <div class="notif-card-header">
                        <div class="notif-icon-circle time">
                            <span class="material-symbols-outlined" style="font-size: 24px;">schedule</span>
                        </div>
                        <div class="notif-card-title-container">
                            <h3 class="notif-card-title">Tidspunkt for daglig oppdatering</h3>
                            <p class="notif-card-description">Velg hvilken time du vil motta e-post og push-varsel.</p>
                        </div>
                    </div>
                    
                    <div class="notif-settings-list" style="margin-top: -8px;">
                        <div style="position: relative;">
                            <select id="notification-time-select" class="notif-time-select">
                                ${[...Array(24).keys()].map(h => {
                                    const padHour = String(h).padStart(2, '0');
                                    const isSelected = (p.readingPlanNotificationHour !== undefined ? p.readingPlanNotificationHour : 7) === h;
                                    return `<option value="${h}" ${isSelected ? 'selected' : ''}>${padHour}:00</option>`;
                                }).join('')}
                            </select>
                        </div>
                    </div>
                </div>
                
                <!-- FOOTER ACTIONS -->
                <div class="notif-settings-footer">
                    <p class="notif-footer-text">Dine endringer vil tre i kraft umiddelbart.</p>
                    <button class="notif-save-btn" id="save-prefs-btn">
                        <span class="material-symbols-outlined" style="font-size: 18px; transform: translateY(2.5px) !important; display: inline-block !important; line-height: 1 !important; margin: 0 !important;">save</span> Lagre preferanser
                    </button>
                </div>

            </div>
        </div>`;

        // Tab switching events
        const tabBtns = container.querySelectorAll('.profile-tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const target = btn.getAttribute('data-profile-tab');
                this._activeProfileTab = target;

                tabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                container.querySelectorAll('.profile-tab-content').forEach(c => {
                    c.style.display = 'none';
                });
                const activeContent = container.querySelector(`#profile-tab-content-${target}`);
                if (activeContent) {
                    activeContent.style.display = target === 'notifications' ? 'block' : '';
                }
            });
        });

        // ── Wire up events ──
        // Contact edit toggle
        const toggleContact = document.getElementById('toggle-contact-edit');
        const contactCard = document.getElementById('contact-card');
        toggleContact?.addEventListener('click', () => {
            contactCard?.classList.toggle('is-editing');
            contactCard?.querySelector('[name="displayName"]')?.focus();
        });
        document.getElementById('cancel-contact-edit')?.addEventListener('click', () => {
            contactCard?.classList.remove('is-editing');
        });
        document.getElementById('save-contact-btn')?.addEventListener('click', async () => {
            await this._saveProfileFields(contactCard, ['displayName', 'phoneCountryCode', 'phone', 'address', 'zip', 'city', 'country']);
            this.profileData = await this.getMergedProfile(this.currentUser);
            this.updateHeader();
            this.loadView('profile');
        });

        // Personal edit toggle
        const togglePersonal = document.getElementById('toggle-personal-edit');
        const personalCard = document.getElementById('personal-card');
        togglePersonal?.addEventListener('click', () => {
            personalCard?.classList.toggle('is-editing');
            personalCard?.querySelector('[name="gender"]')?.focus();
        });
        document.getElementById('cancel-personal-edit')?.addEventListener('click', () => {
            personalCard?.classList.remove('is-editing');
        });
        document.getElementById('save-personal-btn')?.addEventListener('click', async () => {
            await this._saveProfileFields(personalCard, ['gender', 'maritalStatus', 'birthday']);
            this.loadView('profile');
        });

        document.getElementById('save-custom-nav-btn')?.addEventListener('click', async () => {
            const btn = document.getElementById('save-custom-nav-btn');
            if (btn) btn.disabled = true;
            try {
                const checkedBoxes = Array.from(document.querySelectorAll('.custom-nav-cb:checked'));
                const customBottomNav = checkedBoxes.map(cb => cb.value);

                // Update localStorage immediately to prevent FOUC flash on subsequent reloads
                localStorage.setItem('hkm_user_custom_nav', JSON.stringify(customBottomNav));

                await firebase.firestore().collection('users').doc(this.currentUser.uid).set(
                    { customBottomNav },
                    { merge: true }
                );

                this.profileData.customBottomNav = customBottomNav;
                this.applyBottomNavSettings(customBottomNav);

                // Toast or animation feedback
                if (btn) {
                    const originalHtml = btn.innerHTML;
                    btn.innerHTML = '<span class="material-symbols-outlined">check_circle</span> Meny lagret!';
                    btn.style.background = '#10B981'; // Green
                    btn.style.borderColor = '#10B981';
                    setTimeout(() => {
                        btn.innerHTML = originalHtml;
                        btn.style.background = '';
                        btn.style.borderColor = '';
                        btn.disabled = false;
                    }, 2000);
                }
            } catch (err) {
                console.error("Save custom nav error:", err);
                alert("Kunne ikke lagre menyvalg: " + err.message);
                if (btn) btn.disabled = false;
            }
        });

        this._wireFamilySearch();
        this._wireAddressAutocomplete();

        document.querySelectorAll('.member-remove-btn').forEach(button => {
            button.addEventListener('click', async () => {
                await this.removeFamilyMember(button.dataset.memberUid);
            });
        });

        document.getElementById('save-prefs-btn')?.addEventListener('click', async () => {
            const pushTeachings = document.getElementById('push-teachings-toggle')?.checked ?? true;
            const pushPodcasts = document.getElementById('push-podcasts-toggle')?.checked ?? true;
            const pushBlogs = document.getElementById('push-blogs-toggle')?.checked ?? true;
            const pushReadingPlans = document.getElementById('push-reading-plans-toggle')?.checked ?? true;
            
            // pushEnabled is true if any push sub-toggle is active
            const pushEnabled = pushTeachings || pushPodcasts || pushBlogs || pushReadingPlans;
            
            const emailConsent = document.getElementById('email-toggle')?.checked;
            const emailReadingPlans = document.getElementById('email-reading-plans-toggle')?.checked ?? true;
            const readingPlanNotificationHour = parseInt(document.getElementById('notification-time-select')?.value ?? '7', 10);
            const btn = document.getElementById('save-prefs-btn');
            if (btn) { btn.disabled = true; }
            try {
                if (window.hkmLogger) window.hkmLogger.log("Preferanser: Lagrer innstillinger...");
                await firebase.firestore().collection('users').doc(this.currentUser.uid).set(
                    {
                        pushEnabled,
                        pushTeachings,
                        pushPodcasts,
                        pushBlogs,
                        pushReadingPlans,
                        emailConsent,
                        emailReadingPlans,
                        readingPlanNotificationHour,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    },
                    { merge: true }
                );
                
                // Show immediate visual confirmation on button
                if (btn) {
                    const rect = btn.getBoundingClientRect();
                    btn.style.width = `${rect.width}px`;
                    btn.style.height = `${rect.height}px`;
                    btn.style.display = 'inline-flex';
                    btn.style.alignItems = 'center';
                    btn.style.justifyContent = 'center';
                    btn.innerHTML = `<span class="material-symbols-outlined" style="font-size: 18px; margin-right: 4px !important;">check_circle</span> ${t('common.saved')}`;
                }
                
                const successMsg = "Preferansene dine ble lagret!";
                if (typeof window.showToast === 'function') {
                    window.showToast(successMsg, "success", 4000);
                } else {
                    alert(successMsg);
                }

                // Request push notifications in the background so it doesn't block the UI
                if (pushEnabled) {
                    const showRegToast = !p.pushEnabled;
                    this._requestPushPermission(showRegToast).catch(pushErr => {
                        console.warn('Background push registration failed:', pushErr);
                        if (window.hkmLogger) {
                            window.hkmLogger.warn("Background push registration failed: " + (pushErr.message || pushErr));
                        }
                    });
                }

                setTimeout(() => { 
                    if (btn) { 
                        btn.style.width = '';
                        btn.style.height = '';
                        btn.style.display = '';
                        btn.style.alignItems = '';
                        btn.style.justifyContent = '';
                        btn.disabled = false; 
                        btn.innerHTML = `<span class="material-symbols-outlined" style="font-size: 18px; margin-right: -2px !important;">save</span> ${t('profile.savePreferences')}`; 
                    } 
                }, 2000);
            } catch (e) {
                console.warn('save prefs:', e);
                if (window.hkmLogger) {
                    window.hkmLogger.error(`Save preferences failed: ${e.message || e}. Stack: ${e.stack || ''}`);
                }
                const errorMsg = "Kunne ikke lagre preferanser: " + (e.message || e);
                if (typeof window.showToast === 'function') {
                    window.showToast(errorMsg, "error", 5000);
                } else {
                    alert(errorMsg);
                }
                if (btn) { 
                    btn.disabled = false; 
                    btn.innerHTML = `<span class="material-symbols-outlined" style="font-size: 18px; margin-right: -2px !important;">save</span> ${t('profile.savePreferences')}`; 
                }
            }
        });


        // Delete account
        document.getElementById('delete-account-btn')?.addEventListener('click', () => this.showDeleteConfirmModal());
    }

    async _saveProfileFields(formEl, fields) {
        if (!this.currentUser) return;
        if (!formEl) return;
        const btn = formEl.querySelector('button[id^="save-"]');
        if (btn) { btn.disabled = true; btn.textContent = t('common.saving'); }
        try {
            const updates = { updatedAt: firebase.firestore.FieldValue.serverTimestamp() };
            fields.forEach(f => {
                const input = formEl.querySelector(`[name="${f}"]`);
                if (input) updates[f] = input.value;
            });
            if (updates.displayName && updates.displayName !== this.currentUser.displayName) {
                await this.currentUser.updateProfile({ displayName: updates.displayName });
            }
            await firebase.firestore().collection('users').doc(this.currentUser.uid).set(updates, { merge: true });
        } catch (e) {
            console.error('saveProfileFields:', e);
            alert(t('common.saveError') + ': ' + e.message);
        } finally {
            if (btn) { btn.disabled = false; btn.textContent = t('common.saved'); }
        }
    }

    _wireAddressAutocomplete() {
        const input = document.getElementById('profile-address-input');
        const resultsEl = document.getElementById('address-search-results');
        const statusEl = document.getElementById('address-search-status');
        if (!input || !resultsEl || !statusEl) return;

        input.addEventListener('input', () => {
            clearTimeout(this._addressSearchTimer);
            const query = input.value.trim();

            if (query.length < 3) {
                this._addressSuggestions = [];
                resultsEl.innerHTML = '';
                statusEl.textContent = '';
                return;
            }

            statusEl.textContent = t('profile.searchingAddresses');
            this._addressSearchTimer = setTimeout(() => {
                this.searchGlobalAddresses(query);
            }, 350);
        });
    }

    _formatPhotonAddress(properties = {}) {
        const street = [properties.street, properties.housenumber].filter(Boolean).join(' ').trim();
        const primary = properties.name && !street ? properties.name : street || properties.name || '';
        const locality = properties.city || properties.locality || properties.district || properties.county || properties.state || '';
        const regionLine = [properties.postcode, locality].filter(Boolean).join(' ').trim();
        const country = properties.country || '';
        const label = [primary, regionLine, country].filter(Boolean).join(', ');

        return {
            address: primary || label,
            zip: properties.postcode || '',
            city: locality,
            country,
            countryCode: properties.countrycode || '',
            label
        };
    }

    async searchGlobalAddresses(query) {
        const resultsEl = document.getElementById('address-search-results');
        const statusEl = document.getElementById('address-search-status');
        if (!resultsEl || !statusEl) return;

        try {
            if (this._addressSearchAbort) this._addressSearchAbort.abort();
            this._addressSearchAbort = new AbortController();

            const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=6`;
            const response = await fetch(url, { signal: this._addressSearchAbort.signal });
            if (!response.ok) throw new Error(`Address search failed: ${response.status}`);

            const data = await response.json();
            this._addressSuggestions = (data.features || [])
                .map(feature => this._formatPhotonAddress(feature.properties || {}))
                .filter(item => item.label);

            if (!this._addressSuggestions.length) {
                resultsEl.innerHTML = '';
                statusEl.textContent = t('profile.noAddressSuggestions');
                return;
            }

            statusEl.textContent = '';
            resultsEl.innerHTML = this._addressSuggestions.map((item, index) => `
                <button class="address-result-row" type="button" data-address-index="${index}">
                    <span class="material-symbols-outlined">location_on</span>
                    <span>
                        <strong>${this._escapeHtml(item.address || item.label)}</strong>
                        <small>${this._escapeHtml([item.zip, item.city, item.country].filter(Boolean).join(', '))}</small>
                    </span>
                </button>
            `).join('');

            resultsEl.querySelectorAll('.address-result-row').forEach(row => {
                row.addEventListener('click', () => {
                    this.selectAddressSuggestion(Number(row.dataset.addressIndex));
                });
            });
        } catch (error) {
            if (error.name === 'AbortError') return;
            console.error('searchGlobalAddresses:', error);
            resultsEl.innerHTML = '';
            statusEl.textContent = t('profile.couldNotFetchAddresses');
        }
    }

    selectAddressSuggestion(index) {
        const item = (this._addressSuggestions || [])[index];
        if (!item) return;

        const addressInput = document.querySelector('[name="address"]');
        const zipInput = document.querySelector('[name="zip"]');
        const cityInput = document.querySelector('[name="city"]');
        const countryInput = document.querySelector('[name="country"]');
        const resultsEl = document.getElementById('address-search-results');
        const statusEl = document.getElementById('address-search-status');

        if (addressInput) addressInput.value = item.address || item.label;
        if (zipInput) zipInput.value = item.zip || '';
        if (cityInput) cityInput.value = item.city || '';
        if (countryInput) countryInput.value = item.country || '';
        if (resultsEl) resultsEl.innerHTML = '';
        if (statusEl) statusEl.textContent = item.country ? t('profile.selectedCountry', { country: item.country }) : t('profile.addressSelected');
    }

    _wireFamilySearch() {
        const input = document.getElementById('family-search-input');
        const resultsEl = document.getElementById('family-search-results');
        const statusEl = document.getElementById('family-search-status');
        if (!input || !resultsEl || !statusEl) return;

        input.addEventListener('input', () => {
            clearTimeout(this._familySearchTimer);
            const query = input.value.trim();

            if (query.length < 2) {
                resultsEl.innerHTML = '';
                statusEl.textContent = '';
                return;
            }

            statusEl.textContent = t('profile.searching');
            this._familySearchTimer = setTimeout(() => {
                this.searchFamilyMembers(query);
            }, 300);
        });
    }

    async searchFamilyMembers(query) {
        const resultsEl = document.getElementById('family-search-results');
        const statusEl = document.getElementById('family-search-status');
        if (!resultsEl || !statusEl) return;

        if (!firebase.functions) {
            statusEl.textContent = t('profile.searchUnavailable');
            return;
        }

        try {
            const callable = firebase.functions().httpsCallable('searchFamilyMembers');
            const response = await callable({ query });
            const existingIds = new Set((this.profileData.familyMembers || []).map(member => member.uid).filter(Boolean));
            const members = (response.data?.members || []).filter(member => !existingIds.has(member.uid));

            if (!members.length) {
                resultsEl.innerHTML = '';
                statusEl.textContent = t('profile.noMatches');
                return;
            }

            statusEl.textContent = '';
            resultsEl.innerHTML = members.map(member => `
                <button class="family-result-row" type="button" data-member='${this._escapeHtml(JSON.stringify(member))}'>
                    <span class="member-avatar">${member.photoURL ? `<img src="${this._escapeHtml(member.photoURL)}" alt="">` : this._escapeHtml((member.name || '?').charAt(0).toUpperCase())}</span>
                    <span class="member-info">
                        <span class="member-info-name">${this._escapeHtml(member.name || 'Uten navn')}</span>
                        <span class="member-info-sub">${this._escapeHtml(member.email || '')}</span>
                    </span>
                    <span class="material-symbols-outlined family-result-add">add</span>
                </button>
            `).join('');

            resultsEl.querySelectorAll('.family-result-row').forEach(row => {
                row.addEventListener('click', async () => {
                    try {
                        await this.addFamilyMember(JSON.parse(row.dataset.member || '{}'));
                    } catch (error) {
                        console.warn('family add parse:', error);
                    }
                });
            });
        } catch (error) {
            console.error('searchFamilyMembers:', error);
            resultsEl.innerHTML = '';
            statusEl.textContent = t('profile.couldNotSearch');
        }
    }

    async addFamilyMember(member) {
        if (!this.currentUser || !member?.uid || member.uid === this.currentUser.uid) return;

        const existing = Array.isArray(this.profileData.familyMembers) ? this.profileData.familyMembers : [];
        if (existing.some(item => item.uid === member.uid)) return;

        const nextMembers = [
            ...existing,
            {
                uid: member.uid,
                name: member.name || 'Uten navn',
                email: member.email || '',
                photoURL: member.photoURL || '',
                role: member.role || t('profile.familyMemberRole')
            }
        ];

        await firebase.firestore().collection('users').doc(this.currentUser.uid).set({
            familyMembers: nextMembers,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        this.profileData.familyMembers = nextMembers;
        this.loadView('profile');
    }

    async removeFamilyMember(memberUid) {
        if (!this.currentUser || !memberUid) return;

        const existing = Array.isArray(this.profileData.familyMembers) ? this.profileData.familyMembers : [];
        const nextMembers = existing.filter(member => member.uid !== memberUid);
        if (nextMembers.length === existing.length) return;

        await firebase.firestore().collection('users').doc(this.currentUser.uid).set({
            familyMembers: nextMembers,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        this.profileData.familyMembers = nextMembers;
        this.loadView('profile');
    }

    async _requestPushPermission(showSuccessToast = true) {
        try {
            if (!('Notification' in window)) {
                if (window.hkmLogger) window.hkmLogger.warn("Push not supported: 'Notification' in window is false");
                if (typeof window.showToast === 'function') {
                    window.showToast("Nettleseren din støtter ikke push-varslinger.", "error", 5000);
                } else {
                    alert("Nettleseren din støtter ikke push-varslinger.");
                }
                return;
            }
            if (!firebase.messaging || !firebase.messaging.isSupported()) {
                if (window.hkmLogger) window.hkmLogger.warn("Push not supported: firebase.messaging.isSupported() is false");
                if (typeof window.showToast === 'function') {
                    window.showToast("Push-varslinger er ikke støttet i denne nettleseren.", "error", 5000);
                } else {
                    alert("Push-varslinger er ikke støttet i denne nettleseren.");
                }
                return;
            }

            const currentPermission = Notification.permission;
            if (currentPermission === 'denied') {
                if (window.hkmLogger) window.hkmLogger.warn("Push permission is denied");
                const msg = "Varsler er blokkert for dette nettstedet i nettleseren din. Vennligst tilbakestill tillatelsen i nettleserinnstillingene dine.";
                if (typeof window.showToast === 'function') {
                    window.showToast(msg, "warning", 7000);
                } else {
                    alert(msg);
                }
                return;
            }

            const perm = await Notification.requestPermission();
            if (perm !== 'granted') {
                if (window.hkmLogger) window.hkmLogger.warn("Push permission was not granted by user: " + perm);
                const msg = "Du må tillate varsler for å motta push-meldinger på denne enheten.";
                if (typeof window.showToast === 'function') {
                    window.showToast(msg, "warning", 5000);
                } else {
                    alert(msg);
                }
                return;
            }

            if (window.hkmLogger) window.hkmLogger.log("FCM: Henter service worker registration...");
            const msg = firebase.messaging();
            
            // Handle foreground push notifications
            msg.onMessage((payload) => {
                console.log('[MinSide] Foreground message received:', payload);
                const title = payload.notification?.title || 'Ny oppdatering';
                const body = payload.notification?.body || '';
                if (typeof window.showToast === 'function') {
                    window.showToast(`🔔 ${title}: ${body}`, "success", 10000);
                }
            });

            const registration = await Promise.race([
                navigator.serviceWorker.ready,
                new Promise((_, reject) => setTimeout(() => reject(new Error("Service Worker ready-tilstand tidsavbrutt (4s)")), 4000))
            ]);
            
            if (window.hkmLogger) window.hkmLogger.log(`FCM: SW ready. Aktiv SW: ${registration.active?.scriptURL || 'ingen'}`);
            
            const token = await msg.getToken({
                vapidKey: 'BI2k24dp-3eJWtLSPvGWQkD00A_duNRCIMY_2ozLFI0-anJDamFBALaTdtzGYQEkoFz8X0JxTcCX6tn3P_i0YrA',
                serviceWorkerRegistration: registration
            });
            if (token) {
                await firebase.firestore().collection('users').doc(this.currentUser.uid).update({
                    fcmTokens: firebase.firestore.FieldValue.arrayUnion(token)
                });
                if (window.hkmLogger) window.hkmLogger.log("Push notifications registered successfully on device");
                if (showSuccessToast && typeof window.showToast === 'function') {
                    window.showToast("Push-varslinger ble vellykket registrert på denne enheten!", "success", 5000);
                }
            } else {
                throw new Error("Kunne ikke hente varslingstoken.");
            }
        } catch (e) {
            console.warn('push permission:', e);
            if (window.hkmLogger) {
                window.hkmLogger.error(`FCM Registration failed: ${e.message || e}. Stack: ${e.stack || ''}`);
            }
            const errorMsg = `Kunne ikke registrere push-varsler: ${e.message || e}`;
            if (typeof window.showToast === 'function') {
                window.showToast(errorMsg, "error", 7000);
            } else {
                alert(errorMsg);
            }
        }
    }


    async handlePhotoUpload(e) {
        const file = e.target.files?.[0];
        if (!file || !this.currentUser) return;
        try {
            const ref = firebase.storage().ref(`profilePictures/${this.currentUser.uid}`);
            await ref.put(file);
            const url = await ref.getDownloadURL();
            await this.currentUser.updateProfile({ photoURL: url });
            await firebase.firestore().collection('users').doc(this.currentUser.uid).set({ photoURL: url }, { merge: true });
            this.profileData.photoURL = url;
            this._setAvatarEl(document.getElementById('ph-avatar'), url, this.profileData.displayName);
        } catch (err) {
            console.error('Photo upload failed:', err);
            alert(t('common.saveError') + ': ' + err.message);
        }
    }

    // ══════════════════════════════════════════════════════════
    // VIEW: AKTIVITET
    // ══════════════════════════════════════════════════════════
    async renderActivity(container) {
        const uid = this.currentUser?.uid;
        container.innerHTML = `<div class="ms-full-width" id="activity-inner"><div class="loading-state ms-loading-min-120"><div class="spinner"></div></div></div>`;
        const list = container.querySelector('#activity-inner');

        try {
            const snap = await firebase.firestore()
                .collection('user_notifications')
                .where('userId', '==', uid)
                .orderBy('createdAt', 'desc')
                .limit(50)
                .get();

            if (snap.empty) {
                list.innerHTML = `<div class="empty-state">
                    <span class="material-symbols-outlined">history</span>
                    <h3>${t('activity.noActivityYet')}</h3>
                    <p>${t('activity.noActivitySub')}</p>
                </div>`;
                return;
            }

            const iconMap = {
                push: { icon: 'campaign', toneClass: 'activity-icon-tone-push' },
                message: { icon: 'mail', toneClass: 'activity-icon-tone-message' },
                default: { icon: 'notifications', toneClass: 'activity-icon-tone-default' },
            };

            const items = snap.docs.map(doc => this._normalizeNotificationDoc(doc));

            list.innerHTML = items.map(d => {
                const date = d.createdAt?.toDate ? d.createdAt.toDate() : new Date(0);
                const m = iconMap[d.type] || iconMap.default;
                return `
                <div class="activity-item ${!d.read ? 'unread' : ''}" data-id="${d.id}" style="cursor: pointer;">
                    <div class="activity-icon ${m.toneClass}">
                        <span class="material-symbols-outlined">${m.icon}</span>
                    </div>
                    <div class="activity-content">
                        <div class="activity-title">${d.title}</div>
                        ${d.body ? `<div class="activity-body">${d.body}</div>` : ''}
                        <div class="activity-time">${this._timeAgo(date)}</div>
                    </div>
                </div>`;
            }).join('');

            list.querySelectorAll('.activity-item').forEach(el => {
                el.addEventListener('click', () => {
                    const notif = items.find(n => n.id === el.dataset.id);
                    if (notif) this.showNotificationModal(notif);
                    if (notif && !notif.read) el.classList.remove('unread');
                });
            });

        } catch (err) {
            console.error('renderActivity error:', err);
            this._notify(t('activity.loadErrorNotice'), 'warning');
            list.innerHTML = `<div class="empty-state"><span class="material-symbols-outlined">error</span><p>${t('activity.loadErrorCopy')}</p></div>`;
        }
    }

    // ══════════════════════════════════════════════════════════
    // ══════════════════════════════════════════════════════════
    // VIEW: VARSLINGER & LOGG (combined)
    // ══════════════════════════════════════════════════════════
    async renderNotifications(container) {
        const uid = this.currentUser?.uid;
        const activeFilter = this._notifFilter || 'all';

        const isNo = document.documentElement.lang === 'no' || !document.documentElement.lang;
        const isEs = document.documentElement.lang === 'es';
        const filterArchivedLabel = isNo ? 'Arkivert' : (isEs ? 'Archivado' : 'Archived');

        const iconMap = {
            push:    { icon: 'campaign',      cls: 'activity-icon-tone-push' },
            message: { icon: 'mail',          cls: 'activity-icon-tone-message' },
            default: { icon: 'notifications', cls: 'activity-icon-tone-default' },
        };

        const filters = [
            { id: 'all',     label: t('notifications.filterAll')     || 'Alle' },
            { id: 'unread',  label: t('notifications.filterUnread')  || 'Ulest' },
            { id: 'push',    label: t('notifications.filterPush')    || 'Push' },
            { id: 'message', label: t('notifications.filterMessage') || 'Meldinger' },
            { id: 'archived', label: filterArchivedLabel }
        ];

        container.innerHTML = `
        <div class="ms-full-width ms-notifications-container">
            <div class="ms-section-header-row">
                <h2 class="ms-section-title">${t('notifications.title')}</h2>
                <button class="btn btn-ghost btn-sm" id="mark-all-read-btn" style="display: inline-flex !important; align-items: center !important; justify-content: center !important; gap: 4px !important; padding: 0 12px !important; height: 32px !important; min-height: 32px !important; border-radius: 12px !important;">
                    <span class="material-symbols-outlined" style="font-size: 16px !important; display: inline-flex !important; align-items: center !important; justify-content: center !important; line-height: 1 !important; margin: 0 !important;">done_all</span>
                    <span style="display: inline-flex !important; align-items: center !important; justify-content: center !important; line-height: 1 !important;">${t('notifications.markAllRead')}</span>
                </button>
            </div>

            <!-- Filter tabs -->
            <div class="notif-filter-tabs" id="notif-filter-tabs">
                ${filters.map(f => `
                    <button class="notif-filter-btn${f.id === activeFilter ? ' active' : ''}" data-filter="${f.id}">
                        ${f.label}
                        ${f.id === 'unread' ? `<span class="notif-filter-badge" id="unread-count-badge" style="display:none">0</span>` : ''}
                    </button>
                `).join('')}
            </div>

            <div id="notifs-inner"><div class="loading-state ms-loading-min-80"><div class="spinner"></div></div></div>
        </div>`;

        const inner = container.querySelector('#notifs-inner');

        const renderList = (allItems) => {
            let items = allItems;
            
            if (activeFilter === 'archived') {
                items = allItems.filter(n => n.archived);
            } else {
                items = allItems.filter(n => !n.archived);
                if (activeFilter === 'unread')  items = items.filter(n => !n.read);
                if (activeFilter === 'push')    items = items.filter(n => n.type === 'push');
                if (activeFilter === 'message') items = items.filter(n => n.type === 'message');
            }

            if (items.length === 0) {
                inner.innerHTML = `<div class="empty-state">
                    <span class="material-symbols-outlined">notifications_off</span>
                    <h3>${t('notifications.noNotifications')}</h3>
                    <p>${t('notifications.noNotificationsSub')}</p>
                </div>`;
                return;
            }

            inner.innerHTML = items.map(n => {
                const date = n.createdAt?.toDate ? n.createdAt.toDate() : new Date(0);
                const m = iconMap[n.type] || iconMap.default;
                const iconCls = !n.read ? 'activity-icon-tone-notif-unread' : m.cls;
                
                const archiveIcon = n.archived ? 'unarchive' : 'archive';
                const archiveTitle = n.archived 
                    ? (isNo ? 'Legg tilbake i innkurv' : (isEs ? 'Desarchivar' : 'Unarchive')) 
                    : (isNo ? 'Arkiver varsel' : (isEs ? 'Archivar' : 'Archive'));
                const deleteTitle = isNo ? 'Slett permanent' : (isEs ? 'Eliminar permanentemente' : 'Delete permanently');

                return `<div class="activity-item${!n.read ? ' unread' : ''}" data-id="${n.id}" style="cursor:pointer; display:flex; align-items:center; width:100%; position:relative;">
                    <div class="activity-icon ${iconCls}" style="flex-shrink:0;">
                        <span class="material-symbols-outlined">${m.icon}</span>
                    </div>
                    <div class="activity-content" style="flex:1; min-width:0; margin-right:12px;">
                        <div class="activity-title" style="font-weight:700; color:var(--text-main); font-size:14px;">${this._escapeHtml(n.title)}</div>
                        ${n.body ? `<div class="activity-body" style="font-size:13px; color:var(--text-muted); margin-top:2px;">${this._escapeHtml(n.body)}</div>` : ''}
                        <div class="activity-time" style="font-size:11px; color:var(--text-muted); margin-top:4px;">${this._timeAgo(date)}</div>
                    </div>
                    
                    <div class="activity-right-section" style="display:flex; align-items:center; gap:8px; flex-shrink:0;">
                        ${!n.read ? `<div class="ms-unread-dot" style="margin-right:4px;"></div>` : ''}
                        
                        <div class="notif-actions" style="display:flex; gap:4px; align-items:center;">
                            <button type="button" class="btn-archive-notif" data-id="${n.id}" title="${archiveTitle}" style="background:transparent; border:none; color:var(--text-muted); cursor:pointer; padding:6px; border-radius:50%; display:inline-flex; align-items:center; justify-content:center; width:30px; height:30px; transition: background-color 0.2s, color 0.2s;">
                                <span class="material-symbols-outlined" style="font-size:18px !important; display:inline-flex !important; align-items:center !important; justify-content:center !important; line-height:1 !important; margin:0 !important;">${archiveIcon}</span>
                            </button>
                            <button type="button" class="btn-delete-notif" data-id="${n.id}" title="${deleteTitle}" style="background:transparent; border:none; color:var(--text-muted); cursor:pointer; padding:6px; border-radius:50%; display:inline-flex; align-items:center; justify-content:center; width:30px; height:30px; transition: background-color 0.2s, color 0.2s;">
                                <span class="material-symbols-outlined" style="font-size:18px !important; display:inline-flex !important; align-items:center !important; justify-content:center !important; line-height:1 !important; color:#ef4444 !important; margin:0 !important;">delete</span>
                            </button>
                        </div>
                    </div>
                </div>`;
            }).join('');

            // Bind click to open detail modal (but NOT when clicking action buttons)
            inner.querySelectorAll('.activity-item').forEach(el => {
                el.addEventListener('click', (e) => {
                    if (e.target.closest('.notif-actions')) return;
                    
                    const notif = items.find(n => n.id === el.dataset.id);
                    if (notif) this.showNotificationModal(notif);
                    if (notif && !notif.read) {
                        notif.read = true;
                        el.classList.remove('unread');
                        el.querySelector('.ms-unread-dot')?.remove();
                        const icon = el.querySelector('.activity-icon');
                        if (icon) {
                            icon.classList.remove('activity-icon-tone-notif-unread');
                            const m2 = iconMap[notif.type] || iconMap.default;
                            icon.classList.add(m2.cls);
                        }
                        firebase.firestore().collection('user_notifications').doc(notif.id)
                            .update({ read: true }).catch(() => {});
                    }
                });
            });

            // Bind action buttons hover
            inner.querySelectorAll('.btn-archive-notif, .btn-delete-notif').forEach(btn => {
                btn.addEventListener('mouseenter', () => {
                    btn.style.backgroundColor = 'var(--border-solid)';
                    if (!btn.classList.contains('btn-delete-notif')) {
                        btn.style.color = 'var(--text-main)';
                    }
                });
                btn.addEventListener('mouseleave', () => {
                    btn.style.backgroundColor = 'transparent';
                    if (!btn.classList.contains('btn-delete-notif')) {
                        btn.style.color = 'var(--text-muted)';
                    }
                });
            });

            // Bind archive click
            inner.querySelectorAll('.btn-archive-notif').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const notifId = btn.dataset.id;
                    const notif = allItems.find(n => n.id === notifId);
                    if (!notif) return;
                    
                    const newArchivedState = !notif.archived;
                    try {
                        await firebase.firestore().collection('user_notifications').doc(notifId)
                            .update({ archived: newArchivedState });
                        
                        const msg = newArchivedState 
                            ? (isNo ? 'Melding arkivert' : (isEs ? 'Mensaje archivado' : 'Message archived'))
                            : (isNo ? 'Melding flyttet til innkurv' : (isEs ? 'Mensaje movido a la bandeja de entrada' : 'Message moved to inbox'));
                        this._notify(msg, 'success');
                        
                        this.renderNotifications(container);
                    } catch (err) {
                        console.error('Error archiving notification:', err);
                        this._notify(isNo ? 'Kunne ikke arkivere melding' : (isEs ? 'Error al archivar' : 'Failed to archive message'), 'warning');
                    }
                });
            });

            // Bind delete click
            inner.querySelectorAll('.btn-delete-notif').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const notifId = btn.dataset.id;
                    const confirmMsg = isNo 
                        ? 'Vil du slette denne meldingen permanent?' 
                        : (isEs ? '¿Eliminar este mensaje permanentemente?' : 'Delete this message permanently?');
                    
                    if (confirm(confirmMsg)) {
                        try {
                            await firebase.firestore().collection('user_notifications').doc(notifId).delete();
                            this._notify(isNo ? 'Melding slettet' : (isEs ? 'Mensaje de alerta eliminado' : 'Message deleted'), 'success');
                            this.renderNotifications(container);
                        } catch (err) {
                            console.error('Error deleting notification:', err);
                            this._notify(isNo ? 'Kunne ikke slette melding' : (isEs ? 'Error al eliminar' : 'Failed to delete message'), 'warning');
                        }
                    }
                });
            });
        };

        try {
            const snap = await firebase.firestore()
                .collection('user_notifications')
                .where('userId', '==', uid)
                .orderBy('createdAt', 'desc')
                .limit(50)
                .get();

            const allItems = snap.docs.map(d => this._normalizeNotificationDoc(d));
            const unreadItems = allItems.filter(n => !n.read && !n.archived);

            // Show unread count badge on Ulest tab
            const unreadBadge = container.querySelector('#unread-count-badge');
            if (unreadBadge && unreadItems.length > 0) {
                unreadBadge.textContent = unreadItems.length;
                unreadBadge.style.display = '';
            }

            renderList(allItems);

            // Auto mark all unread as read (only when on "Alle" or "Ulest" tab)
            if ((activeFilter === 'all' || activeFilter === 'unread') && unreadItems.length > 0) {
                try {
                    const unreadSnap = await firebase.firestore()
                        .collection('user_notifications')
                        .where('userId', '==', uid)
                        .where('read', '==', false)
                        .get();
                    
                    if (!unreadSnap.empty) {
                        const batch = firebase.firestore().batch();
                        unreadSnap.docs.forEach(doc => {
                            batch.update(doc.ref, { read: true });
                        });
                        await batch.commit();
                    }
                    this._setBadge(0);
                } catch (err) {
                    console.error('Error auto-marking all read:', err);
                }
            }

            // Filter tab clicks
            container.querySelectorAll('.notif-filter-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    this._notifFilter = btn.dataset.filter;
                    this.renderNotifications(container);
                });
            });

            // Mark all read button
            document.getElementById('mark-all-read-btn')?.addEventListener('click', async () => {
                try {
                    const unreadSnap = await firebase.firestore()
                        .collection('user_notifications')
                        .where('userId', '==', uid)
                        .where('read', '==', false)
                        .get();
                    
                    if (!unreadSnap.empty) {
                        const b = firebase.firestore().batch();
                        unreadSnap.docs.forEach(doc => {
                            b.update(doc.ref, { read: true });
                        });
                        await b.commit();
                    }
                    this._setBadge(0);
                    this._notifFilter = 'all';
                    this.renderNotifications(container);
                } catch (err) {
                    console.error('Error marking all as read:', err);
                }
            });

        } catch (err) {
            console.error('renderNotifications error:', err);
            this._notify(t('notifications.loadErrorNotice'), 'warning');
            inner.innerHTML = `<div class="empty-state"><p>${t('notifications.loadErrorCopy')}</p></div>`;
        }
    }



    // ══════════════════════════════════════════════════════════
    // VIEW: GAVER
    // ══════════════════════════════════════════════════════════
    async renderGiving(container) {
        const uid = this.currentUser?.uid;
        container.innerHTML = `<div class="loading-state"><div class="spinner"></div></div>`;

        let donations = [];
        try {
            donations = await this._fetchCurrentUserDonations({ order: true });
        } catch (e) { }
        this.currentGivingDonations = donations;

        const isNo = document.documentElement.lang === 'no' || !document.documentElement.lang;
        const isEs = document.documentElement.lang === 'es';
        const allTypesLabel = isNo ? 'Alle typer' : (isEs ? 'Todos los tipos' : 'All types');
        const allYearsLabel = isNo ? 'Alle år' : (isEs ? 'Todos los años' : 'All years');
        const printReportLabel = isNo ? 'Skriv ut rapport' : (isEs ? 'Imprimir informe' : 'Print report');
        const typeGiftLabel = isNo ? 'Gave' : (isEs ? 'Ofrenda' : 'Gift');
        const typeShopLabel = isNo ? 'Butikk' : (isEs ? 'Tienda' : 'Shop');

        // Extract years dynamically from donations list
        const years = new Set();
        donations.forEach(d => {
            const date = this._getDonationDate(d);
            if (date && !isNaN(date.getFullYear())) {
                years.add(date.getFullYear());
            }
        });
        const yearsList = Array.from(years).sort((a, b) => b - a);

        let selectedType = 'all';
        let selectedYear = 'all';

        const updateGivingCharts = () => {
            if (typeof Chart === 'undefined') return;

            // 1. Prepare Trends Chart Data
            let trendsLabels = [];
            let trendsData = [];

            const chartFiltered = donations.filter(d => {
                const date = this._getDonationDate(d);
                const year = date ? date.getFullYear() : null;
                const matchesYear = (selectedYear === 'all' || String(year) === selectedYear);
                
                const type = (d.type || 'Gave').toLowerCase();
                const matchesType = (selectedType === 'all' || 
                    (selectedType === 'gave' && type === 'gave') || 
                    (selectedType === 'butikk' && type === 'butikk'));
                
                return matchesYear && matchesType;
            });

            if (selectedYear === 'all') {
                // Group by year
                const yearsMap = {};
                chartFiltered.forEach(d => {
                    const date = this._getDonationDate(d);
                    if (date) {
                        const year = date.getFullYear();
                        if (year) {
                            yearsMap[year] = (yearsMap[year] || 0) + this._normalizeDonationAmountNok(d);
                        }
                    }
                });
                trendsLabels = Object.keys(yearsMap).sort((a, b) => parseInt(a) - parseInt(b));
                trendsData = trendsLabels.map(y => yearsMap[y]);
            } else {
                // Group by month for selected year
                const monthsMap = Array(12).fill(0);
                const yearInt = parseInt(selectedYear);
                
                const isNoLang = document.documentElement.lang === 'no' || !document.documentElement.lang;
                const isEsLang = document.documentElement.lang === 'es';
                const monthsLabelsNo = ['Jan', 'Feb', 'Mar', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Des'];
                const monthsLabelsEs = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
                const monthsLabelsEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                trendsLabels = isNoLang ? monthsLabelsNo : (isEsLang ? monthsLabelsEs : monthsLabelsEn);

                chartFiltered.forEach(d => {
                    const date = this._getDonationDate(d);
                    if (date && date.getFullYear() === yearInt) {
                        const month = date.getMonth();
                        monthsMap[month] += this._normalizeDonationAmountNok(d);
                    }
                });
                trendsData = monthsMap;
            }

            // 2. Prepare Methods Chart Data
            const methodsMap = {};
            chartFiltered.forEach(d => {
                const method = String(d.method || 'card').trim().toLowerCase();
                const label = this._getDonationMethodLabel(method);
                methodsMap[label] = (methodsMap[label] || 0) + this._normalizeDonationAmountNok(d);
            });
            const methodsLabels = Object.keys(methodsMap);
            const methodsData = methodsLabels.map(l => methodsMap[l]);

            // Clean up existing charts
            if (this.givingTrendsChart) {
                try { this.givingTrendsChart.destroy(); } catch (e) {}
                this.givingTrendsChart = null;
            }
            if (this.givingMethodsChart) {
                try { this.givingMethodsChart.destroy(); } catch (e) {}
                this.givingMethodsChart = null;
            }

            // 3. Render Trends Chart (Line Chart)
            const ctxTrends = container.querySelector('#giving-trends-chart');
            if (ctxTrends) {
                const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
                const gridColor = isDark ? '#334155' : '#e2e8f0';
                const textColor = isDark ? '#94a3b8' : '#64748b';

                this.givingTrendsChart = new Chart(ctxTrends, {
                    type: 'line',
                    data: {
                        labels: trendsLabels,
                        datasets: [{
                            label: t('giving.chartNok'),
                            data: trendsData,
                            borderColor: '#1B4965',
                            backgroundColor: 'rgba(27, 73, 101, 0.05)',
                            borderWidth: 3,
                            fill: true,
                            tension: 0.35,
                            pointBackgroundColor: '#bd4f2a',
                            pointBorderColor: '#ffffff',
                            pointHoverRadius: 6,
                            pointRadius: 4
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                display: false
                            },
                            tooltip: {
                                padding: 12,
                                cornerRadius: 8,
                                callbacks: {
                                    label: function(context) {
                                        return 'kr ' + context.raw.toLocaleString('no-NO', { minimumFractionDigits: 0 });
                                    }
                                }
                            }
                        },
                        scales: {
                            x: {
                                grid: {
                                    display: false
                                },
                                ticks: {
                                    color: textColor,
                                    font: {
                                        family: 'inherit',
                                        weight: '600'
                                    }
                                }
                            },
                            y: {
                                grid: {
                                    color: gridColor
                                },
                                ticks: {
                                    color: textColor,
                                    font: {
                                        family: 'inherit',
                                        weight: '500'
                                    },
                                    callback: function(value) {
                                        return 'kr ' + value.toLocaleString('no-NO');
                                    }
                                }
                            }
                        }
                    }
                });
            }

            // 4. Render Methods Chart (Doughnut Chart)
            const ctxMethods = container.querySelector('#giving-methods-chart');
            if (ctxMethods && methodsLabels.length > 0) {
                const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
                const legendColor = isDark ? '#f8fafc' : '#0f172a';

                this.givingMethodsChart = new Chart(ctxMethods, {
                    type: 'doughnut',
                    data: {
                        labels: methodsLabels,
                        datasets: [{
                            data: methodsData,
                            backgroundColor: [
                                '#1B4965',
                                '#bd4f2a',
                                '#d17d39',
                                '#475569',
                                '#94a3b8',
                                '#cbd5e1'
                            ],
                            borderWidth: isDark ? 2 : 1,
                            borderColor: isDark ? '#1e293b' : '#ffffff'
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'right',
                                labels: {
                                    color: legendColor,
                                    boxWidth: 12,
                                    padding: 16,
                                    font: {
                                        family: 'inherit',
                                        weight: '600',
                                        size: 11
                                    }
                                }
                            },
                            tooltip: {
                                padding: 12,
                                cornerRadius: 8,
                                callbacks: {
                                    label: function(context) {
                                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                        const pct = ((context.raw / total) * 100).toFixed(1);
                                        return context.label + ': kr ' + context.raw.toLocaleString('no-NO') + ' (' + pct + '%)';
                                    }
                                }
                            }
                        },
                        cutout: '65%'
                    }
                });
            }
        };

        const updateGivingView = () => {
            const filtered = donations.filter(d => {
                const date = this._getDonationDate(d);
                const year = date ? date.getFullYear() : null;
                const matchesYear = (selectedYear === 'all' || String(year) === selectedYear);
                
                const type = (d.type || 'Gave').toLowerCase();
                const matchesType = (selectedType === 'all' || 
                    (selectedType === 'gave' && type === 'gave') || 
                    (selectedType === 'butikk' && type === 'butikk'));
                
                return matchesYear && matchesType;
            });

            // Update stats chips
            const currentYear = new Date().getFullYear();
            const statsYear = selectedYear === 'all' ? currentYear : parseInt(selectedYear);
            const yearTotal = donations.filter(d => {
                const date = this._getDonationDate(d);
                return date && date.getFullYear() === statsYear && (d.type || 'Gave').toLowerCase() === 'gave';
            }).reduce((s, d) => s + this._normalizeDonationAmountNok(d), 0);

            const stat1Label = container.querySelector('#giving-stat-year-label');
            const stat1Value = container.querySelector('#giving-stat-year-value');
            if (stat1Label) {
                stat1Label.textContent = t('giving.givenInYear', { year: statsYear });
            }
            if (stat1Value) {
                stat1Value.textContent = yearTotal > 0 ? `kr ${yearTotal.toLocaleString('no-NO', { minimumFractionDigits: 0 })}` : '—';
            }

            const filteredGiftsOnly = filtered.filter(d => (d.type || 'Gave').toLowerCase() === 'gave');
            const lastGift = filteredGiftsOnly[0];
            const lastGiftAmount = lastGift ? this._normalizeDonationAmountNok(lastGift) : 0;
            const stat2Value = container.querySelector('#giving-stat-last-value');
            const stat2Sub = container.querySelector('#giving-stat-last-sub');
            if (stat2Value) {
                stat2Value.textContent = lastGift ? `kr ${lastGiftAmount.toLocaleString('no-NO')}` : '—';
            }
            if (stat2Sub) {
                stat2Sub.textContent = lastGift ? (this._getDonationDate(lastGift)?.toLocaleDateString(document.documentElement.lang === 'en' ? 'en-US' : document.documentElement.lang === 'es' ? 'es-ES' : 'no-NO') || '') : '';
            }

            const stat3Value = container.querySelector('#giving-stat-count-value');
            if (stat3Value) {
                stat3Value.textContent = filtered.length || '—';
            }

            const tableContainer = container.querySelector('#giving-table-wrapper');
            if (tableContainer) {
                if (filtered.length === 0) {
                    tableContainer.innerHTML = `
                        <div class="empty-state ms-empty-state-giving" style="padding: 40px 20px; text-align: center;">
                            <span class="material-symbols-outlined" style="font-size: 48px; color: var(--text-muted); margin-bottom: 12px;">volunteer_activism</span>
                            <h3 style="font-size: 1.1rem; font-weight: 700; color: var(--text-main); margin-bottom: 6px;">${t('giving.noGiftsYet')}</h3>
                            <p style="font-size: 0.9rem; color: var(--text-muted);">${t('giving.noGiftsSub')}</p>
                        </div>
                    `;
                } else {
                    tableContainer.innerHTML = `
                        <div class="table-responsive">
                            <table class="data-table" style="width: 100%; border-collapse: collapse;">
                                <thead>
                                    <tr>
                                        <th>${t('giving.colDate')}</th>
                                        <th>${t('giving.colType')}</th>
                                        <th>${t('giving.colMethod')}</th>
                                        <th class="text-right">${t('giving.colAmount')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${filtered.map(d => {
                                        const date = this._getDonationDate(d) || new Date();
                                        const amountNok = this._normalizeDonationAmountNok(d);
                                        const typeStr = (d.type || 'Gave');
                                        const typeLabel = typeStr.charAt(0).toUpperCase() + typeStr.slice(1);
                                        return `<tr class="donation-row" data-donation-id="${this._escapeHtml(d.id)}" tabindex="0" style="cursor: pointer;">
                                            <td>${date.toLocaleDateString(document.documentElement.lang === 'en' ? 'en-US' : document.documentElement.lang === 'es' ? 'es-ES' : 'no-NO', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                            <td>${this._escapeHtml(typeLabel)}</td>
                                            <td><span class="method-tag">${this._escapeHtml(this._getDonationMethodLabel(d.method || 'Kort'))}</span></td>
                                            <td class="text-right"><strong>kr ${amountNok.toLocaleString('no-NO', { minimumFractionDigits: 2 })}</strong></td>
                                        </tr>`;
                                    }).join('')}
                                </tbody>
                            </table>
                        </div>
                    `;

                    tableContainer.querySelectorAll('.donation-row').forEach(row => {
                        const open = () => this.showDonationDetails(row.dataset.donationId);
                        row.addEventListener('click', open);
                        row.addEventListener('keydown', (event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                open();
                            }
                        });
                    });
                }
            }
            updateGivingCharts();
        };

        container.innerHTML = `
        <div>
            <div class="giving-stats">
                <div class="stat-chip">
                    <div class="stat-chip-label" id="giving-stat-year-label">${t('giving.givenInYear', { year: new Date().getFullYear() })}</div>
                    <div class="stat-chip-value" id="giving-stat-year-value">—</div>
                </div>
                <div class="stat-chip">
                    <div class="stat-chip-label">${t('giving.lastGift')}</div>
                    <div class="stat-chip-value" id="giving-stat-last-value">—</div>
                    <div class="stat-chip-sub" id="giving-stat-last-sub"></div>
                </div>
                <div class="stat-chip">
                    <div class="stat-chip-label">${t('giving.totalGiftsCount')}</div>
                    <div class="stat-chip-value" id="giving-stat-count-value">—</div>
                </div>
            </div>

            <div class="giving-charts-card">
                <div class="table-card" style="padding: 20px; display: flex; flex-direction: column; height: 320px; box-sizing: border-box;">
                    <h3 style="margin: 0 0 16px 0; font-size: 0.95rem; font-weight: 700; color: var(--text-main);">${t('giving.chartTrendsTitle')}</h3>
                    <div style="flex-grow: 1; position: relative; height: 0; min-height: 220px; width: 100%;">
                        <canvas id="giving-trends-chart"></canvas>
                    </div>
                </div>
                <div class="table-card" style="padding: 20px; display: flex; flex-direction: column; height: 320px; box-sizing: border-box;">
                    <h3 style="margin: 0 0 16px 0; font-size: 0.95rem; font-weight: 700; color: var(--text-main);">${t('giving.chartMethodsTitle')}</h3>
                    <div style="flex-grow: 1; position: relative; height: 0; min-height: 220px; width: 100%;">
                        <canvas id="giving-methods-chart"></canvas>
                    </div>
                </div>
            </div>

            <div class="table-card">
                <div class="table-card-header" style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; padding: 12px 20px;">
                    <h3 style="margin: 0; font-size: 1rem; font-weight: 700; color: var(--text-main);">${t('giving.givingHistory')}</h3>
                    
                    <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                        <select id="giving-type-filter" class="form-control" style="font-size:12px; padding:4px 28px 4px 8px !important; height:32px; border-radius:6px; border:1.5px solid var(--border-solid); background:var(--card-bg); color:var(--text-main); font-weight:600; width:110px; cursor:pointer; margin:0;">
                            <option value="all">${allTypesLabel}</option>
                            <option value="gave">${typeGiftLabel}</option>
                            <option value="butikk">${typeShopLabel}</option>
                        </select>
                        <select id="giving-year-filter" class="form-control" style="font-size:12px; padding:4px 28px 4px 8px !important; height:32px; border-radius:6px; border:1.5px solid var(--border-solid); background:var(--card-bg); color:var(--text-main); font-weight:600; width:100px; cursor:pointer; margin:0;">
                            <option value="all">${allYearsLabel}</option>
                            ${yearsList.map(y => `<option value="${y}">${y}</option>`).join('')}
                        </select>
                        <button type="button" class="btn btn-ghost" id="giving-print-report-btn" style="display:inline-flex !important; align-items:center !important; justify-content:center !important; gap:8px !important; padding:6px 12px !important; border-radius:6px !important; font-size:12px !important; font-weight:600 !important; height:32px !important; min-height:32px !important; cursor:pointer !important; transform-origin: center !important; margin:0;">
                            <span class="material-symbols-outlined" style="font-size:16px !important; display:inline-flex !important; align-items:center !important; justify-content:center !important; line-height:1 !important; margin:0 !important;">print</span>
                            <span style="display:inline-flex !important; align-items:center !important; line-height:1 !important;">${printReportLabel}</span>
                        </button>
                    </div>
                </div>
                <div id="giving-table-wrapper"></div>
            </div>
        </div>`;

        const typeFilter = container.querySelector('#giving-type-filter');
        const yearFilter = container.querySelector('#giving-year-filter');
        const printBtn = container.querySelector('#giving-print-report-btn');

        if (typeFilter) {
            typeFilter.addEventListener('change', (e) => {
                selectedType = e.target.value;
                updateGivingView();
            });
        }
        if (yearFilter) {
            yearFilter.addEventListener('change', (e) => {
                selectedYear = e.target.value;
                updateGivingView();
            });
        }
        if (printBtn) {
            printBtn.addEventListener('click', () => {
                this.printGivingReport(selectedType, selectedYear);
            });
        }

        updateGivingView();
    }

    printGivingReport(selectedType, selectedYear) {
        const donations = this.currentGivingDonations || [];
        const filtered = donations.filter(d => {
            const date = this._getDonationDate(d);
            const year = date ? date.getFullYear() : null;
            const matchesYear = (selectedYear === 'all' || String(year) === selectedYear);
            
            const type = (d.type || 'Gave').toLowerCase();
            const matchesType = (selectedType === 'all' || 
                (selectedType === 'gave' && type === 'gave') || 
                (selectedType === 'butikk' && type === 'butikk'));
            
            return matchesYear && matchesType;
        });

        const totalSum = filtered.reduce((s, d) => s + this._normalizeDonationAmountNok(d), 0);

        const isNo = document.documentElement.lang === 'no' || !document.documentElement.lang;
        const isEs = document.documentElement.lang === 'es';
        const title = isNo ? 'Gaveoversikt' : (isEs ? 'Resumen de Ofrendas' : 'Donation Overview');
        const subtitle = isNo ? 'Min gaveoversikt' : (isEs ? 'Mi historial de ofrendas' : 'My giving overview');
        const dateLabel = isNo ? 'Dato' : (isEs ? 'Fecha' : 'Date');
        const typeLabelStr = isNo ? 'Type' : (isEs ? 'Tipo' : 'Type');
        const methodLabelStr = isNo ? 'Metode' : (isEs ? 'Método' : 'Method');
        const amountLabelStr = isNo ? 'Beløp' : (isEs ? 'Monto' : 'Amount');
        const totalLabelStr = isNo ? 'Total sum' : (isEs ? 'Suma total' : 'Total sum');
        const periodLabelStr = isNo ? 'Periode' : (isEs ? 'Periodo' : 'Period');
        const filterLabelStr = isNo ? 'Filter' : (isEs ? 'Filtro' : 'Filter');
        const countLabelStr = isNo ? 'Antall poster' : (isEs ? 'Registros' : 'Record count');
        const noTransLabel = isNo ? 'Ingen transaksjoner funnet.' : (isEs ? 'No se encontraron transacciones.' : 'No transactions found.');
        const docLabel = isNo ? 'Dette dokumentet viser dine registrerte gaver og betalinger hos His Kingdom Ministry.' : (isEs ? 'Este documento muestra sus ofrendas y pagos registrados en His Kingdom Ministry.' : 'This document shows your registered donations and payments with His Kingdom Ministry.');
        const previewLabel = isNo ? 'Dette er en forhåndsvisning av din gaveoversikt. Bruk utskriftsknappen eller Ctrl+P/Cmd+P for å lagre som PDF / skrive ut.' : (isEs ? 'Esta es una vista previa de su historial de ofrendas. Use el botón de impresión o Ctrl+P/Cmd+P para guardar como PDF / imprimir.' : 'This is a preview of your donation overview. Use the print button or Ctrl+P/Cmd+P to save as PDF / print.');
        const printBtnLabel = isNo ? 'Skriv ut / PDF' : (isEs ? 'Imprimir / PDF' : 'Print / PDF');

        const periodText = selectedYear === 'all' ? (isNo ? 'Alle år' : (isEs ? 'Todos los años' : 'All years')) : `${selectedYear}`;
        const typeText = selectedType === 'all' ? (isNo ? 'Alle transaksjoner' : (isEs ? 'Todas las transacciones' : 'All transactions')) : (selectedType === 'gave' ? (isNo ? 'Kun gaver' : (isEs ? 'Solo ofrendas' : 'Donations only')) : (isNo ? 'Kun butikkjøp' : (isEs ? 'Solo tienda' : 'Shop purchases only')));

        const userName = this.profileData?.fullName || this.currentUser?.displayName || (isNo ? 'Medlem' : (isEs ? 'Miembro' : 'Member'));
        const userEmail = this.currentUser?.email || '';
        const userAddress = [
            this.profileData?.adresse,
            [this.profileData?.postnummer, this.profileData?.poststed].filter(Boolean).join(' '),
            this.profileData?.land
        ].filter(Boolean).join(', ') || (isNo ? 'Ingen registrert adresse' : (isEs ? 'Sin dirección registrada' : 'No registered address'));

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            this._notify('Popup-blokkerer forhindret åpning av utskriftsvinduet. Vennligst tillat popups.', 'warning');
            return;
        }

        const rowsHtml = filtered.map(d => {
            const date = this._getDonationDate(d) || new Date();
            const amountNok = this._normalizeDonationAmountNok(d);
            const typeStr = (d.type || 'Gave');
            const typeLabel = typeStr.charAt(0).toUpperCase() + typeStr.slice(1);
            const methodLabel = this._getDonationMethodLabel(d.method || 'Kort');
            
            return `
                <tr style="border-bottom:1px solid #e2e8f0;">
                    <td style="padding:8px; font-size:11px; color:#334155;">${date.toLocaleDateString('no-NO', { day: '2-digit', month: '2-digit', year: 'numeric' })}</td>
                    <td style="padding:8px; font-size:11px; color:#0f172a; font-weight:600;">${typeLabel}</td>
                    <td style="padding:8px; font-size:11px; color:#475569;">${methodLabel}</td>
                    <td style="padding:8px; font-size:11px; color:#0f172a; font-weight:700; text-align:right;">kr ${amountNok.toLocaleString('no-NO', { minimumFractionDigits: 2 })}</td>
                </tr>
            `;
        }).join('');

        printWindow.document.write(`
            <html>
            <head>
                <title>${title} - His Kingdom Ministry</title>
                <style>
                    body {
                        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                        color: #1e293b;
                        background: white;
                        margin: 0;
                        padding: 20px;
                    }
                    @media print {
                        body {
                            padding: 0;
                        }
                        .no-print {
                            display: none !important;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="no-print" style="margin-bottom:20px; padding:12px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-size:13px; color:#475569; font-weight:500;">${previewLabel}</span>
                    <button onclick="window.print()" style="background:#1B4965; color:white; border:none; padding:8px 16px; border-radius:6px; font-weight:600; cursor:pointer; font-size:13px;">
                        ${printBtnLabel}
                    </button>
                </div>

                <div style="padding: 20px; max-width: 800px; margin: 0 auto;">
                    <!-- Logo & Header -->
                    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:3px solid #1B4965; padding-bottom:16px; margin-bottom:24px;">
                        <div style="display:flex; align-items:center; gap:16px;">
                            <img src="/img/logo-hkm.png" alt="Logo" style="height:55px; width:auto; object-fit:contain; border-radius:4px;">
                            <div>
                                <h1 style="margin:0; font-size:24px; font-weight:800; color:#1B4965; letter-spacing:-0.02em;">HIS KINGDOM MINISTRY</h1>
                                <p style="margin:4px 0 0; font-size:11px; color:#64748b; font-weight:600; text-transform:uppercase; letter-spacing:0.05em;">${subtitle}</p>
                            </div>
                        </div>
                        <div style="text-align:right;">
                            <p style="margin:0; font-size:11px; color:#64748b;">Dato: ${new Date().toLocaleDateString('no-NO')}</p>
                        </div>
                    </div>

                    <!-- Member Info & Meta -->
                    <div style="display:flex; justify-content:space-between; margin-bottom:24px; gap:20px;">
                        <div style="flex:1; background:#f8fafc; border:1px solid #e2e8f0; padding:16px; border-radius:8px;">
                            <h3 style="margin:0 0 8px 0; font-size:12px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.05em;">Giver</h3>
                            <p style="margin:0; font-size:14px; font-weight:700; color:#0f172a;">${this._escapeHtml(userName)}</p>
                            ${userEmail ? `<p style="margin:4px 0 0; font-size:12px; color:#475569;">${this._escapeHtml(userEmail)}</p>` : ''}
                            ${userAddress && userAddress !== 'Ingen registrert adresse' && userAddress !== 'Sin dirección registrada' && userAddress !== 'No registered address' ? `<p style="margin:4px 0 0; font-size:12px; color:#475569;">${this._escapeHtml(userAddress)}</p>` : ''}
                        </div>
                        <div style="flex:1; background:#f8fafc; border:1px solid #e2e8f0; padding:16px; border-radius:8px;">
                            <h3 style="margin:0 0 8px 0; font-size:12px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.05em;">Rapportinfo</h3>
                            <p style="margin:0; font-size:13px; color:#334155;"><strong style="color:#0f172a;">${periodLabelStr}:</strong> ${periodText}</p>
                            <p style="margin:4px 0 0; font-size:13px; color:#334155;"><strong style="color:#0f172a;">${filterLabelStr}:</strong> ${typeText}</p>
                            <p style="margin:4px 0 0; font-size:13px; color:#334155;"><strong style="color:#0f172a;">${countLabelStr}:</strong> ${filtered.length}</p>
                        </div>
                    </div>

                    <!-- Main Table -->
                    <table style="width:100%; border-collapse:collapse; margin-bottom:32px;">
                        <thead>
                            <tr style="border-bottom:2px solid #1B4965; text-align:left;">
                                <th style="padding:10px 8px; font-size:11px; font-weight:700; color:#1B4965; text-transform:uppercase;">${dateLabel}</th>
                                <th style="padding:10px 8px; font-size:11px; font-weight:700; color:#1B4965; text-transform:uppercase;">${typeLabelStr}</th>
                                <th style="padding:10px 8px; font-size:11px; font-weight:700; color:#1B4965; text-transform:uppercase;">${methodLabelStr}</th>
                                <th style="padding:10px 8px; font-size:11px; font-weight:700; color:#1B4965; text-transform:uppercase; text-align:right;">${amountLabelStr}</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rowsHtml || `<tr><td colspan="4" style="padding:24px; text-align:center; color:#64748b;">${noTransLabel}</td></tr>`}
                        </tbody>
                    </table>

                    <!-- Total Block -->
                    <div style="display:flex; justify-content:flex-end; margin-bottom:40px;">
                        <div style="background:#1B4965; color:white; padding:12px 24px; border-radius:8px; text-align:right; min-width:200px;">
                            <span style="font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; opacity:0.85;">${totalLabelStr}</span>
                            <div style="font-size:22px; font-weight:800; margin-top:2px;">kr ${totalSum.toLocaleString('no-NO', { minimumFractionDigits: 2 })}</div>
                        </div>
                    </div>

                    <!-- Footer Details -->
                    <div style="border-top:1px dashed #cbd5e1; padding-top:20px; text-align:center; color:#64748b; font-size:11px; line-height:1.5;">
                        <p style="margin:0; font-weight:600; color:#475569;">His Kingdom Ministry</p>
                        <p style="margin:2px 0 0;">Org.nr: 928 290 839 | E-post: post@hkm.no | Web: www.hkm.no</p>
                        <p style="margin:4px 0 0; font-style:italic;">${docLabel}</p>
                    </div>
                </div>
            </body>
            </html>
        `);
        printWindow.document.close();
    }

    showDonationDetails(donationId) {
        const donation = (this.currentGivingDonations || []).find(item => item.id === donationId);
        if (!donation) return;

        const existing = document.getElementById('donation-detail-modal');
        if (existing) existing.remove();

        const amountNok = this._normalizeDonationAmountNok(donation);
        const date = this._getDonationDate(donation);
        const reference = this._getDonationReference(donation);
        const rows = [
            [t('giving.lblAmount'), `kr ${amountNok.toLocaleString('no-NO', { minimumFractionDigits: 2 })}`],
            [t('giving.lblDate'), date ? date.toLocaleString(document.documentElement.lang === 'en' ? 'en-US' : document.documentElement.lang === 'es' ? 'es-ES' : 'no-NO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : t('giving.statusUnknown')],
            [t('giving.lblPaidWith'), this._getDonationMethodLabel(donation.method)],
            [t('giving.lblStatus'), this._getDonationStatusLabel(donation.status)],
            [t('giving.lblType'), donation.type || t('giving.typeGift')],
            [t('giving.lblReference'), reference || t('giving.referenceNotRegistered')]
        ];
        if (donation.message) rows.push([t('giving.lblMessage'), donation.message]);
        if (donation.currency) rows.push([t('giving.lblCurrency'), String(donation.currency).toUpperCase()]);

        const modal = document.createElement('div');
        modal.id = 'donation-detail-modal';
        modal.className = 'hkm-modal-overlay';
        modal.innerHTML = `
            <div class="hkm-modal-container ms-donation-detail-modal">
                <div class="ms-note-modal-header">
                    <div>
                        <div class="hkm-modal-title ms-note-modal-title">${t('giving.detailsTitle')}</div>
                        <div class="ms-donation-detail-subtitle">${this._escapeHtml(date ? date.toLocaleDateString(document.documentElement.lang === 'en' ? 'en-US' : document.documentElement.lang === 'es' ? 'es-ES' : 'no-NO') : '')}</div>
                    </div>
                    <button id="close-donation-detail-modal" class="ms-icon-button" type="button">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </div>
                <div class="ms-donation-detail-amount">kr ${amountNok.toLocaleString('no-NO', { minimumFractionDigits: 2 })}</div>
                <div class="ms-donation-detail-grid">
                    ${rows.map(([label, value]) => `
                        <div class="ms-donation-detail-row">
                            <span>${this._escapeHtml(label)}</span>
                            <strong>${this._escapeHtml(value)}</strong>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        requestAnimationFrame(() => modal.classList.add('active'));

        const onEsc = (event) => {
            if (event.key === 'Escape') close();
        };
        const close = () => {
            document.removeEventListener('keydown', onEsc);
            modal.classList.remove('active');
            setTimeout(() => modal.remove(), 300);
        };
        modal.querySelector('#close-donation-detail-modal')?.addEventListener('click', close);
        modal.addEventListener('click', event => {
            if (event.target === modal) close();
        });
        document.addEventListener('keydown', onEsc);
    }

    // ══════════════════════════════════════════════════════════
    // VIEW: KURS
    // ══════════════════════════════════════════════════════════
    async renderCourses(container) {
        container.innerHTML = `<div class="ms-full-width"><div class="loading-state"><div class="spinner"></div></div></div>`;
        let courses = [];
        try {
            const snap = await firebase.firestore().collection('teaching').orderBy('createdAt', 'desc').get();
            snap.forEach(d => courses.push({ id: d.id, ...d.data() }));
        } catch (e) { }

        if (courses.length === 0) {
            container.innerHTML = `<div class="ms-full-width"><div class="empty-state">
                <span class="material-symbols-outlined">school</span>
                <h3>${t('courses.noCoursesYet')}</h3>
                <p>${t('courses.noCoursesSub')}</p>
            </div></div>`;
            return;
        }

        container.innerHTML = `<div class="courses-grid">
            ${courses.map(c => `
            <div class="course-card">
                <div class="course-thumb">
                    ${c.imageUrl ? `<img src="${c.imageUrl}" alt="${c.title}" loading="lazy">` : `<div class="ms-course-thumb-empty"><span class="material-symbols-outlined ms-course-thumb-empty-icon">school</span></div>`}
                    ${c.category ? `<span class="course-badge">${c.category}</span>` : ''}
                </div>
                <div class="course-body">
                    <div class="course-title">${c.title || t('courses.untitled')}</div>
                    <div class="course-desc">${c.excerpt || c.intro || ''}</div>
                    ${c.videoUrl ? `<a href="${c.videoUrl}" target="_blank" class="btn btn-primary btn-sm">
                        <span class="material-symbols-outlined">play_circle</span> ${t('courses.watchVideo')}
                    </a>` : ''}
                </div>
            </div>`).join('')}
        </div>`;
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

        container.innerHTML = `
            <div class="ms-reading-plan-dashboard">
                <!-- Plan Header & Progress Card -->
                <div class="ms-rp-card-header" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 20px; padding: 24px; margin-bottom: 24px; box-shadow: 0 4px 20px rgba(15, 23, 42, 0.02);">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px; margin-bottom: 16px;">
                        <div>
                            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px; flex-wrap: wrap;">
                                <h2 style="font-size: 22px; font-weight: 700; color: #1B4965; margin: 0;">${globalPlan.title}</h2>
                                ${streakHtml}
                            </div>
                            <p style="font-size: 14px; color: #64748b; margin: 0; line-height: 1.5; max-width: 600px;">${globalPlan.description || ''}</p>
                        </div>
                        <button class="btn btn-secondary btn-sm" id="btn-change-plan">Bytt leseplan</button>
                    </div>

                    <!-- Progress Bar -->
                    <div style="margin-top: 24px;">
                        <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: 600; color: #475569; margin-bottom: 8px;">
                            <span>Din Fremdrift</span>
                            <span>${progressPct}% fullført (${completedDays.length}/${totalDays} dager)</span>
                        </div>
                        <div style="height: 8px; background: #e2e8f0; border-radius: 99px; overflow: hidden;">
                            <div style="height: 100%; background: linear-gradient(135deg, #d17d39 0%, #bd4f2a 100%); border-radius: 99px; width: ${progressPct}%; transition: width 0.4s ease;"></div>
                        </div>
                    </div>

                    ${certificateHtml}
                </div>

                <!-- Main Layout Grid: Left Panel (Active Day), Right Panel (Days Checklist) -->
                <div style="display: grid; grid-template-columns: 1.3fr 1fr; gap: 24px; align-items: start;" class="ms-rp-grid">
                    <!-- Left Column: Dagens Andakt / Active Day details -->
                    <div style="display: flex; flex-direction: column; gap: 24px;">
                        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 20px; padding: 24px; box-shadow: 0 4px 20px rgba(15, 23, 42, 0.02);">
                            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px;">
                                <span class="material-symbols-outlined" style="color: #bd4f2a; font-size: 20px;">event</span>
                                <span style="font-size: 12px; font-weight: 700; color: #bd4f2a; text-transform: uppercase; letter-spacing: 0.05em;">Dagens Andakt</span>
                            </div>
                            
                            <h3 style="font-size: 18px; font-weight: 700; color: #0f172a; margin: 0 0 12px 0;">Dag ${currentDayNum}: ${currentDayConfig?.verses}</h3>
                            
                            <!-- Action Row -->
                            <div style="display: flex; gap: 12px; margin-top: 20px; flex-wrap: wrap;">
                                <a href="/bibel?ref=${encodeURIComponent(currentDayConfig?.verses)}" class="btn btn-outline" style="display: inline-flex; align-items: center; gap: 8px; font-size: 13px;">
                                    <span class="material-symbols-outlined">menu_book</span>
                                    Les i Bibelen
                                </a>
                                <button class="btn btn-primary" id="btn-start-devotional" style="display: inline-flex; align-items: center; gap: 8px; font-size: 13px; background: #1B4965; border-color: #1B4965; color: #ffffff;">
                                    <span class="material-symbols-outlined">auto_stories</span>
                                    Start Dagens Andakt
                                </button>
                            </div>
                        </div>

                        <!-- Prayer & Resources Preview -->
                        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 20px; padding: 24px; box-shadow: 0 4px 20px rgba(15, 23, 42, 0.02);">
                            <h3 style="font-size: 15px; font-weight: 700; color: #1B4965; margin: 0 0 16px 0;">Bønnefokus & Fordypning</h3>
                            
                            <div style="background: #f8fafc; border-left: 4px solid #d17d39; padding: 16px; border-radius: 0 12px 12px 0; margin-bottom: 20px; font-style: italic; font-size: 14px; line-height: 1.6; color: #475569;">
                                "${currentDayConfig?.prayerFocus || 'Be over ordene du har lest i dag.'}"
                            </div>
                            
                            <h4 style="font-size: 13px; font-weight: 700; color: #475569; margin: 0 0 12px 0;">Ressurser for dagen:</h4>
                            <div style="display: flex; flex-direction: column; gap: 8px;">
                                ${currentDayConfig?.resources && currentDayConfig.resources.length > 0 ? 
                                    currentDayConfig.resources.map(res => `
                                    <a href="${res.url || '#'}" target="_blank" style="display: flex; align-items: center; gap: 12px; padding: 12px; border: 1px solid #f1f5f9; border-radius: 10px; text-decoration: none; color: inherit; transition: all 0.2s;" onmouseover="this.style.borderColor='#cbd5e1'" onmouseout="this.style.borderColor='#f1f5f9'">
                                        <span class="material-symbols-outlined" style="color: #cbd5e1; font-size: 20px;">
                                            ${res.type === 'video' ? 'play_circle' : res.type === 'podcast' ? 'podcasts' : 'article'}
                                        </span>
                                        <div>
                                            <div style="font-size: 13px; font-weight: 600; color: #0f172a;">${res.title}</div>
                                            <div style="font-size: 10px; color: #94a3b8; text-transform: uppercase; font-weight: 700; margin-top: 1px;">${res.type}</div>
                                        </div>
                                    </a>
                                    `).join('') : `
                                    <p style="font-size: 13px; color: #94a3b8; font-style: italic; margin: 0;">Ingen tilknyttede ressurser.</p>
                                    `
                                }
                            </div>
                        </div>
                    </div>

                    <!-- Right Column: Checklist of days -->
                    <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 20px; padding: 24px; box-shadow: 0 4px 20px rgba(15, 23, 42, 0.02); max-height: 80vh; overflow-y: auto;">
                        <h3 style="font-size: 15px; font-weight: 700; color: #1B4965; margin: 0 0 16px 0;">Alle dager</h3>
                        
                        <div style="display: flex; flex-direction: column; gap: 8px;">
                            ${globalPlan.days.map(d => {
                                const isCompleted = completedDays.includes(d.dayNumber);
                                const isActive = d.dayNumber === currentDayNum;
                                return `
                                <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px; border-radius: 12px; border: 1px solid ${isActive ? '#1B4965' : '#f1f5f9'}; background: ${isActive ? 'rgba(27, 73, 101, 0.02)' : '#ffffff'}; cursor: pointer; transition: all 0.2s;" class="ms-rp-day-row" onclick="window.minSideManager.selectDayPreview('${globalPlan.id}', ${d.dayNumber})">
                                    <div style="display: flex; align-items: center; gap: 12px;">
                                        <div style="width: 28px; height: 28px; border-radius: 50%; border: 2px solid ${isCompleted ? '#10b981' : isActive ? '#1B4965' : '#cbd5e1'}; background: ${isCompleted ? '#10b981' : 'transparent'}; display: flex; align-items: center; justify-content: center; color: ${isCompleted ? '#ffffff' : '#cbd5e1'}; flex-shrink: 0;">
                                            ${isCompleted ? '<span class="material-symbols-outlined" style="font-size: 16px; font-weight:bold;">check</span>' : `<span style="font-size: 11px; font-weight:700; color: ${isActive ? '#1B4965' : '#475569'}">${d.dayNumber}</span>`}
                                        </div>
                                        <div>
                                            <div style="font-size: 13px; font-weight: 600; color: #0f172a;">${d.verses}</div>
                                        </div>
                                    </div>
                                    <span class="material-symbols-outlined" style="color: #94a3b8; font-size: 18px;">chevron_right</span>
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

        container.querySelector('#btn-start-devotional').onclick = () => {
            this.openDevotionalWizard(globalPlan, currentDayNum);
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
                    <h3 style="font-size: 16px; font-weight: 700; color: #1b4965; margin: 0 0 8px 0;">Ingen påbegynte leseplaner</h3>
                    <p style="font-size: 14px; color: #64748b; margin: 0 0 20px 0;">Du har ikke startet noen leseplaner ennå.</p>
                    <a href="/leseplaner.html" class="btn btn-primary" style="background: #1B4965; border-color: #1B4965; display: inline-flex; align-items: center; gap: 8px;">
                        <span class="material-symbols-outlined">explore</span> Finn en leseplan
                    </a>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div style="padding: 8px;">
                <h3 style="font-size: 18px; font-weight: 700; color: #1B4965; margin-bottom: 20px;">Dine påbegynte leseplaner</h3>
                <div class="courses-grid">
                    ${startedPlans.map(p => {
                        const totalDays = p.durationDays || p.days.length;
                        const completedDays = p.userPlan.completedDays || [];
                        const progressPct = Math.round((completedDays.length / totalDays) * 100);
                        
                        return `
                        <div class="course-card" style="display: flex; flex-direction: column; justify-content: space-between; height: 100%;">
                            <div class="course-body">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                                    <span class="course-badge" style="position: relative !important; top: auto !important; left: auto !important; margin: 0 !important; box-shadow: none !important; background: rgba(27, 73, 101, 0.1); color: #1B4965; font-weight: 700;">${totalDays} dager</span>
                                    <span style="font-size: 12px; font-weight: 600; color: #d17d39;">${progressPct}% fullført</span>
                                </div>
                                <div class="course-title" style="font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 8px;">${p.title}</div>
                                <div class="course-desc" style="font-size: 13px; color: #64748b; margin-bottom: 16px; line-height: 1.5; height: 60px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;">${p.description || ''}</div>
                                
                                <div style="height: 6px; background: #e2e8f0; border-radius: 99px; overflow: hidden; margin-bottom: 16px;">
                                    <div style="height: 100%; background: linear-gradient(135deg, #d17d39 0%, #bd4f2a 100%); border-radius: 99px; width: ${progressPct}%;"></div>
                                </div>
                            </div>
                            <div style="display: flex; gap: 8px; padding: 0 16px 16px 16px;">
                                <button class="btn btn-outline btn-sm" onclick="window.minSideManager.previewPlanDetails('${p.id}')" style="flex: 1;">Se dager</button>
                                <button class="btn btn-primary btn-sm" onclick="window.minSideManager.switchToPlan('${p.id}')" style="flex: 1; background: #1B4965; border-color: #1B4965;">Velg plan</button>
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
        const snap = await firebase.firestore().collection('reading_plans').doc(planId).get();
        if (!snap.exists) return;
        const plan = snap.data();
        
        let modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 500px; border-radius: 24px; padding: 24px;">
                <div class="modal-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 16px;">
                    <h3 style="font-size: 18px; font-weight: 700; color: #1B4965; margin:0;">${plan.title}</h3>
                    <span class="material-symbols-outlined close" style="cursor:pointer;" onclick="this.closest('.modal').remove()">close</span>
                </div>
                <div style="max-height: 350px; overflow-y: auto; padding-right: 6px;">
                    ${plan.days.map(d => `
                    <div style="display:flex; justify-content:space-between; align-items:center; padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px;">
                        <span style="font-weight: 600; color: #475569;">Dag ${d.dayNumber}</span>
                        <a href="/bibel?ref=${encodeURIComponent(d.verses)}" target="_blank" style="color: #1B4965; text-decoration: underline; font-weight: 500;">${d.verses}</a>
                    </div>
                    `).join('')}
                </div>
                <div style="display:flex; gap:12px; margin-top:20px; justify-content:flex-end;">
                    <button class="btn btn-outline" onclick="this.closest('.modal').remove()">Lukk</button>
                    <button class="btn btn-primary" onclick="window.minSideManager.switchToPlan('${planId}'); this.closest('.modal').remove()" style="background: #1B4965; border-color: #1B4965;">Velg plan</button>
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
                    <h3 style="font-size: 16px; font-weight: 700; color: #1B4965; margin:0;">Dag ${dayNumber}: Detaljer</h3>
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
                            <a href="${res.url || '#'}" target="_blank" style="display:flex; align-items:center; gap:8px; font-size: 12px; color: #1B4965; text-decoration: underline;">
                                <span class="material-symbols-outlined" style="font-size:16px;">launch</span>
                                ${res.title} (${res.type})
                            </a>
                            `).join('') : '<span style="font-size:12px; color:#cbd5e1; font-style:italic;">Ingen ressurser</span>'
                        }
                    </div>
                </div>

                <div style="display:flex; gap:12px; justify-content:flex-end;">
                    <button class="btn btn-outline" onclick="this.closest('.modal').remove()">Lukk</button>
                    <button class="btn btn-primary" onclick="window.minSideManager.openDevotionalWizardDirect('${planId}', ${dayNumber}); this.closest('.modal').remove()" style="background: #1B4965; border-color: #1B4965;">Åpne andakt</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    async openDevotionalWizardDirect(planId, dayNumber) {
        const snap = await firebase.firestore().collection('reading_plans').doc(planId).get();
        if (!snap.exists) return;
        const plan = snap.data();
        this.openDevotionalWizard(plan, dayNumber);
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

        const header = document.createElement('div');
        header.style.display = 'flex';
        header.style.justify = 'space-between';
        header.style.alignItems = 'center';
        header.style.marginBottom = '20px';
        header.innerHTML = `
            <div style="font-size: 11px; font-weight: 700; color: #bd4f2a; text-transform: uppercase; letter-spacing: 0.05em;">
                ${plan.title} &bull; Steg ${step} av 5
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
                    Neste: Ressurser
                    <span class="material-symbols-outlined">arrow_forward</span>
                </button>
            `;
            stepContainer.appendChild(actions);

            actions.querySelector('#btn-devotional-back').onclick = () => {
                this.renderDevotionalStep(modal, plan, dayNumber, dayConfig, 1, scriptureHtml);
            };
            actions.querySelector('#btn-devotional-next').onclick = () => {
                this.renderDevotionalStep(modal, plan, dayNumber, dayConfig, 3, scriptureHtml);
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
                this.renderDevotionalStep(modal, plan, dayNumber, dayConfig, 3, scriptureHtml);
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
                    dayNumber: dayNumber
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
                        border: 15px solid #1B4965;
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
                        color: #1B4965;
                        letter-spacing: 0.1em;
                        text-transform: uppercase;
                    }
                    .title {
                        font-family: 'Playfair Display', serif;
                        font-size: 42px;
                        font-weight: 700;
                        color: #1B4965;
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
                        background: #1B4965;
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
        let personalNotes = [], hkmNotes = [];
        try {
            const [personalSnap, hkmSnap] = await Promise.all([
                firebase.firestore()
                    .collection('personal_notes')
                    .where('userId', '==', uid)
                    .get(),
                firebase.firestore()
                    .collection('user_notes')
                    .where('userId', '==', uid)
                    .get(),
            ]);
            personalSnap.forEach(d => personalNotes.push(this._normalizeNoteDoc(d, 'personal')));
            hkmSnap.forEach(d => hkmNotes.push(this._normalizeNoteDoc(d, 'shared')));
            // Sort client-side (avoids composite index requirement)
            const sortByDate = (a, b) => {
                const ta = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
                const tb = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
                return tb - ta;
            };
            personalNotes.sort(sortByDate);
            hkmNotes.sort(sortByDate);
        } catch (e) {
            console.warn('renderNotes fetch:', e);
            this._notify(t('notifications.loadErrorNotice'), 'warning');
        }

        this._renderNotesUI(container, personalNotes, hkmNotes);
    }

    _renderNotesUI(container, personalNotes, hkmNotes) {
        const makePNote = (n) => `
        <div class="personal-note-card" data-id="${n.id}">
            <div class="personal-note-card-top">
                <div class="personal-note-title">${n.title || t('notes.untitled')}</div>
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
                <button class="btn btn-primary" id="new-note-btn">
                    <span class="material-symbols-outlined">add</span>
                    ${t('notes.newNote')}
                </button>
            </div>

            <!-- New note form (hidden by default) -->
            <div class="new-note-form is-hidden" id="new-note-form">
                <div class="form-group">
                    <label>${t('notes.title')}</label>
                    <input id="note-title-input" placeholder="${t('notes.titlePlaceholder')}" autocomplete="off">
                </div>
                <div class="form-group ms-form-group-gap-10">
                    <label>${t('notes.content')}</label>
                    <div class="rte-wrapper">
                        <div class="rte-toolbar" id="rte-toolbar-new">
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
                        <div class="rte-editor" id="note-body-editor" contenteditable="true"
                            data-placeholder="${t('notes.contentPlaceholder')}"></div>
                    </div>
                </div>
                <div class="ms-actions-row-end">
                    <button class="btn btn-ghost btn-sm" id="cancel-note-btn">${t('common.cancel')}</button>
                    <button class="btn btn-primary btn-sm" id="save-note-btn">
                        <span class="material-symbols-outlined">save</span>
                        ${t('notes.saveNote')}
                    </button>
                </div>
            </div>

            <!-- Personal notes list -->
            <div id="personal-notes-list" class="personal-notes-grid">
                ${personalNotes.length === 0
                ? `<div class="note-empty-personal">
                        <span class="material-symbols-outlined">edit_note</span>
                        <p>${t('notes.emptyPersonalNotes')}</p>
                       </div>`
                : personalNotes.map(makePNote).join('')}
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

        // Wire RTE toolbar
        this._wireRteToolbar('rte-toolbar-new', 'note-body-editor');

        // Toggle new note form
        document.getElementById('new-note-btn')?.addEventListener('click', () => {
            const form = document.getElementById('new-note-form');
            if (!form) return;
            const willOpen = form.classList.contains('is-hidden');
            form.classList.toggle('is-hidden');
            if (willOpen) document.getElementById('note-title-input')?.focus();
        });

        document.getElementById('cancel-note-btn')?.addEventListener('click', () => {
            document.getElementById('new-note-form')?.classList.add('is-hidden');
            document.getElementById('note-title-input').value = '';
            document.getElementById('note-body-editor').innerHTML = '';
        });

        // Save new note
        document.getElementById('save-note-btn')?.addEventListener('click', async () => {
            const title = document.getElementById('note-title-input').value.trim();
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
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                });
                // Prepend new note immediately
                personalNotes.unshift({ id: ref.id, title: title || t('notes.untitled'), text, createdAt: null });
                this._renderNotesUI(container, personalNotes, hkmNotes);
            } catch (e) {
                console.error('Save note error:', e);
                alert(t('notes.saveError') + ': ' + e.message);
                btn.disabled = false;
                btn.innerHTML = `<span class="material-symbols-outlined">save</span> ${t('notes.saveNote')}`;
            }
        });

        // Edit buttons
        container.querySelectorAll('.note-btn-edit').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                const note = personalNotes.find(n => n.id === id);
                if (!note) return;

                const card = container.querySelector(`.personal-note-card[data-id="${id}"]`);
                if (!card) return;

                // Save the original innerHTML to restore on cancel
                const originalContent = card.innerHTML;

                // Replace card contents with inline edit form (matching create note form layout)
                card.innerHTML = `
                <div class="new-note-form inline-edit-form" id="edit-note-form-${note.id}" style="border: none; padding: 0; margin: 0; box-shadow: none; display: block;">
                    <div class="form-group">
                        <label>${t('notes.title')}</label>
                        <input id="edit-note-title-${note.id}" value="${(note.title || '').replace(/"/g, '&quot;')}" autocomplete="off" style="width: 100%;">
                    </div>
                    <div class="form-group ms-form-group-gap-10" style="margin-top: 12px;">
                        <label>${t('notes.content')}</label>
                        <div class="rte-wrapper">
                            <div class="rte-toolbar" id="rte-toolbar-edit-${note.id}">
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
                            <div class="rte-editor" id="edit-note-body-${note.id}" contenteditable="true" style="min-height: 120px;"></div>
                        </div>
                    </div>
                    <div class="ms-actions-row-end" style="margin-top: 12px; display: flex; justify-content: flex-end; gap: 8px;">
                        <button class="btn btn-ghost btn-sm" id="cancel-edit-btn-${note.id}">${t('common.cancel')}</button>
                        <button class="btn btn-primary btn-sm" id="save-edit-btn-${note.id}">
                            <span class="material-symbols-outlined">save</span>
                            ${t('notes.save')}
                        </button>
                    </div>
                </div>`;

                // Set initial content in editor
                const editor = card.querySelector(`#edit-note-body-${note.id}`);
                if (editor) editor.innerHTML = note.text || '';

                // Wire up RTE toolbar
                this._wireRteToolbar(`rte-toolbar-edit-${note.id}`, `edit-note-body-${note.id}`);
                card.querySelector(`#edit-note-title-${note.id}`)?.focus();

                // Cancel button listener
                card.querySelector(`#cancel-edit-btn-${note.id}`)?.addEventListener('click', () => {
                    card.innerHTML = originalContent;
                    this._renderNotesUI(container, personalNotes, hkmNotes);
                });

                // Save button listener
                card.querySelector(`#save-edit-btn-${note.id}`)?.addEventListener('click', async () => {
                    const newTitle = card.querySelector(`#edit-note-title-${note.id}`).value.trim() || t('notes.untitled');
                    const newText = editor?.innerHTML?.trim() || '';
                    const plain = editor?.innerText?.trim() || '';
                    if (!plain) { editor?.focus(); return; }

                    const saveBtn = card.querySelector(`#save-edit-btn-${note.id}`);
                    saveBtn.disabled = true;
                    saveBtn.textContent = t('notes.saving');

                    try {
                        await firebase.firestore().collection('personal_notes').doc(id).update({
                            title: newTitle,
                            text: newText,
                            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                        });
                        note.title = newTitle;
                        note.text = newText;
                        this._renderNotesUI(container, personalNotes, hkmNotes);
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
            btn.addEventListener('click', () => {
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
            btn.addEventListener('mousedown', e => {
                e.preventDefault(); // keep focus in editor
                const cmd = btn.dataset.cmd;
                const val = btn.dataset.val || null;
                document.execCommand(cmd, false, val);
                editor.focus();
                this._updateRteActiveStates(toolbar);
            });
        });

        // Update active states on selection change
        editor.addEventListener('keyup', () => this._updateRteActiveStates(toolbar));
        editor.addEventListener('mouseup', () => this._updateRteActiveStates(toolbar));
        editor.addEventListener('focus', () => toolbar.classList.add('rte-focused'));
        editor.addEventListener('blur', () => toolbar.classList.remove('rte-focused'));
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
            ${notif.body ? `<div class="hkm-modal-message" style="text-align:left; white-space:pre-wrap; line-height:1.6; color:var(--text);">${notif.body}</div>` : ''}
            ${notif.link ? `<div style="margin-top: 24px;">
                <a href="${notif.link}" target="_blank" class="btn btn-primary" style="display:inline-flex; align-items:center; justify-content:center; gap:8px; width:100%;">
                    ${t('notifications.openLink')} <span class="material-symbols-outlined" style="font-size:20px;">open_in_new</span>
                </a>
            </div>` : ''}
            <div class="hkm-modal-actions ms-modal-actions-top" style="margin-top: 32px; border-top: 1px solid var(--border); padding-top: 16px;">
                <button class="btn btn-ghost hkm-modal-btn" id="delete-notif-modal" style="color: var(--danger); justify-content: center;">
                    <span class="material-symbols-outlined">delete</span> ${t('notifications.deleteAlert')}
                </button>
            </div>
        </div>`;

        document.body.appendChild(modal);
        requestAnimationFrame(() => modal.classList.add('active'));

        const close = () => { modal.classList.remove('active'); setTimeout(() => modal.remove(), 300); };
        modal.querySelector('#close-notif-modal').addEventListener('click', close);
        modal.addEventListener('click', e => { if (e.target === modal) close(); });

        // Delete action
        modal.querySelector('#delete-notif-modal').addEventListener('click', async () => {
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

        modal.querySelector('#cancel-delete-btn').addEventListener('click', () => {
            modal.classList.remove('active');
            setTimeout(() => modal.remove(), 300);
        });

        modal.querySelector('#confirm-delete-btn').addEventListener('click', async () => {
            if (!confirm(t('deleteAccount.doubleConfirm'))) return;
            await this.performAccountDeletion();
            modal.remove();
        });

        modal.addEventListener('click', e => {
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
                        : `<div class="member-avatar" style="background: #1B4965; color: #ffffff;">${(p.userName || '?').charAt(0).toUpperCase()}</div>`);

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
                                            <button class="btn btn-icon-only" style="background:none; border:none; color: #1B4965; padding: 4px; cursor:pointer;" onclick="window.minSideManager.editPrayer('${p.id}')" title="${t('common.edit')}">
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
                                
                                <button class="${hasPrayed ? 'btn-pray-disabled' : 'btn-pray'}" ${hasPrayed ? 'disabled style="background: #f1f5f9 !important; border-color: #f1f5f9 !important; color: #94a3b8 !important; display: inline-flex !important; align-items: center !important; justify-content: center !important; gap: 6px !important; padding: 8px 16px !important; font-size: 13.5px !important; font-weight: 600 !important; border: none !important; border-radius: 8px !important; cursor: not-allowed !important; line-height: 1 !important; width: auto !important; height: auto !important; box-sizing: border-box !important;"' : 'style="background: #1B4965 !important; border-color: #1B4965 !important; color: #ffffff !important; display: inline-flex !important; align-items: center !important; justify-content: center !important; gap: 6px !important; padding: 8px 16px !important; font-size: 13.5px !important; font-weight: 600 !important; border: none !important; border-radius: 8px !important; cursor: pointer !important; line-height: 1 !important; width: auto !important; height: auto !important; box-sizing: border-box !important;"'} onclick="window.minSideManager.supportPrayer('${p.id}', '${p.userId}')"><span class="material-symbols-outlined" style="font-size: 18px !important; position: relative !important; top: 1px !important; line-height: 1 !important; display: inline-block !important; margin: 0 !important; padding: 0 !important; width: auto !important; height: auto !important;">favorite</span><span style="line-height: 1 !important; display: inline-block !important; margin: 0 !important; padding: 0 !important; width: auto !important; height: auto !important;">${hasPrayed ? t('prayer.hasPrayed') : t('prayer.pray')}</span></button>
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
                                <h3 style="font-size: 16px; font-weight: 700; color: #1b4965; margin: 0 0 8px 0;">${t('prayer.emptyTitle')}</h3>
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
                    <h3 style="font-size: 18px; font-weight: 700; color: #1B4965; margin:0;">${t('prayer.editModalTitle')}</h3>
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
                    <h3 style="font-size: 18px; font-weight: 700; color: #1B4965; margin:0;">${t('prayer.modalTitle')}</h3>
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
                    db.collection('teaching').get(),
                    db.collection('reading_plans').get(),
                    uid ? db.collection('personal_notes').where('userId', '==', uid).get() : Promise.resolve({ empty: true })
                ];
                if (this.prayerWallEnabled) {
                    promises.push(db.collection('prayers').get());
                } else {
                    promises.push(Promise.resolve({ empty: true, docs: [] }));
                }

                const [coursesSnap, plansSnap, notesSnap, prayersSnap] = await Promise.all(promises);

                searchCache.courses = coursesSnap.empty ? [] : coursesSnap.docs.map(d => ({ id: d.id, type: 'course', title: d.data().title || '', desc: d.data().description || '' }));
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
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeSearch();
        });

        // Global hotkeys (CMD+K / ESC)
        window.addEventListener('keydown', (e) => {
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
                    item.style.borderColor = '#1B4965';
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
                        return `<a href="${href}" onclick="event.stopPropagation();" style="display: inline-block; font-size: 11px; margin: 4px 4px 0 0; padding: 4px 8px; border-radius: 6px; background: #1B496515; color: #1B4965; font-weight: 600; text-decoration: none; transition: background 0.2s;" onmouseover="this.style.background='#1B496530'" onmouseout="this.style.background='#1B496515'">${cleanRef}</a>`;
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
                            <div class="spinner" style="width: 20px; height: 20px; border-width: 2.5px; border-color: #cbd5e1; border-top-color: #1B4965; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
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
                'course': { name: 'Kurs & Undervisning', icon: 'school', color: '#1B4965' },
                'reading-plan': { name: 'Leseplaner & Andakt', icon: 'auto_stories', color: '#bd4f2a' },
                'note': { name: 'Dine Notater', icon: 'notes', color: '#d17d39' },
                'prayer-wall': { name: 'Bønneveggen', icon: 'favorite', color: '#bd4f2a' },
                'bible-search': { name: 'Bibel & Ordbok', icon: 'menu_book', color: '#1b4965' },
                'bible-ref': { name: 'Nettbibel', icon: 'menu_book', color: '#1b4965' },
                'biblical-character': { name: lang === 'en' ? 'Biblical Character' : (lang === 'es' ? 'Personaje Bíblico' : 'Bibelsk person'), icon: 'person', color: '#1B4965' },
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
                        <div class="spinner" style="width: 16px; height: 16px; border-width: 2px; border-color: #cbd5e1; border-top-color: #1B4965; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
                        <span style="font-size: 12.5px; color: #64748b; font-weight: 500;">Søker i Bibel & Ordbok...</span>
                    </div>
                `;
            }

            resultsContainer.innerHTML = html;
        };

        input.addEventListener('input', () => {
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
