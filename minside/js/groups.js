/* ═══════════════════════════════════════════════════════════════════════════
   HKM GRUPPER — Planning Center Groups Module for Min Side
   ═══════════════════════════════════════════════════════════════════════════ */

export class HkmGroupsManager {
    constructor(minSideApp) {
        this.app = minSideApp;
        this.currentView = 'directory'; // 'directory' | 'hub' | 'my-groups'
        this.selectedGroupId = null;
        this.selectedGroupTab = 'overview'; // 'overview' | 'chat' | 'events' | 'resources'
        this.groups = [];
        this.myGroups = [];
        this.categories = [];
        this.activeGroup = null;
        this.messagesListener = null;
        this.filterCategory = 'ALL';
        this.searchQuery = '';
        this.allContactsList = [];
        this.selectedContactIds = new Set();
        this.activeGroupForContacts = null;
    }

    get isAdmin() {
        const currentUser = firebase.auth() ? firebase.auth().currentUser : null;
        const email = currentUser ? (currentUser.email || '').toLowerCase() : '';
        const role = (this.app && this.app.profileData && this.app.profileData.role) || '';
        return role === 'admin' || role === 'superadmin' || email === 'thomas@hiskingdomministry.no' || email === 'knutsenthomas@gmail.com';
    }

    checkIsLeader(group) {
        if (!group) return false;
        const currentUser = firebase.auth() ? firebase.auth().currentUser : null;
        if (!currentUser) return false;
        const uid = currentUser.uid;

        // 1. Sjekk om brukerens UID er registrert i leaderUids
        if (group.leaderUids && group.leaderUids.includes(uid)) {
            return true;
        }

        // 2. Sjekk om brukerens visningsnavn matcher et av navnene i leaderNames (case-insensitive)
        const profileDisplayName = (this.app && this.app.profileData && this.app.profileData.displayName) || '';
        const authDisplayName = currentUser.displayName || '';
        
        const leaderNamesLower = (group.leaderNames || []).map(n => n.trim().toLowerCase());
        
        if (profileDisplayName && leaderNamesLower.includes(profileDisplayName.trim().toLowerCase())) {
            return true;
        }
        if (authDisplayName && leaderNamesLower.includes(authDisplayName.trim().toLowerCase())) {
            return true;
        }

        return false;
    }

    formatLocation(location) {
        if (!location) return '';
        const trimmed = location.trim();
        const lower = trimmed.toLowerCase();
        if (lower === 'zoom lenke' || lower === 'zoom-lenke' || lower === 'zoom lenke.' || lower === 'zoom-lenke.') {
            return '';
        }
        if (/^https?:\/\//i.test(trimmed)) {
            let label = 'Nettlenke';
            if (trimmed.toLowerCase().includes('zoom.us')) {
                label = 'Zoom-møte';
            } else if (trimmed.toLowerCase().includes('teams.microsoft.com')) {
                label = 'Teams-møte';
            } else if (trimmed.toLowerCase().includes('meet.google.com')) {
                label = 'Google Meet';
            } else {
                try {
                    const url = new URL(trimmed);
                    label = url.hostname.replace('www.', '');
                } catch (e) {
                    label = 'Lenke';
                }
            }
            return `<a href="${this.escapeHtml(trimmed)}" target="_blank" rel="noopener noreferrer" style="color: inherit; text-decoration: underline; font-weight: 600;">${this.escapeHtml(label)}</a>`;
        }
        return this.escapeHtml(trimmed);
    }

    parseDateString(str) {
        if (!str) return null;
        const trimmed = str.trim();
        
        // 1. Check YYYY-MM-DD
        const ymdMatch = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(trimmed);
        if (ymdMatch) {
            return new Date(parseInt(ymdMatch[1], 10), parseInt(ymdMatch[2], 10) - 1, parseInt(ymdMatch[3], 10));
        }
        
        // 2. Check DD.MM.YYYY
        const dmyMatch = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(trimmed);
        if (dmyMatch) {
            return new Date(parseInt(dmyMatch[3], 10), parseInt(dmyMatch[2], 10) - 1, parseInt(dmyMatch[1], 10));
        }

        // 3. Match English/Norwegian month name and date number
        const monthsEng = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
        const monthsNor = ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'];
        
        let monthIndex = -1;
        const lowerStr = trimmed.toLowerCase();
        
        for (let i = 0; i < 12; i++) {
            if (lowerStr.includes(monthsEng[i]) || lowerStr.includes(monthsNor[i])) {
                monthIndex = i;
                break;
            }
        }
        
        // Match day number
        const dayMatch = /(\d+)(?:st|nd|rd|th)?/.exec(trimmed);
        let day = 1;
        if (dayMatch) {
            day = parseInt(dayMatch[1], 10);
        }
        
        // Match year (optional)
        let year = new Date().getFullYear();
        const yearMatch = /\b(20\d{2})\b/.exec(trimmed);
        if (yearMatch) {
            year = parseInt(yearMatch[1], 10);
        }
        
        if (monthIndex !== -1) {
            return new Date(year, monthIndex, day);
        }
        
        // 4. Try native Date parse as fallback
        const timestamp = Date.parse(trimmed);
        if (!isNaN(timestamp)) {
            return new Date(timestamp);
        }
        
        return null;
    }

    formatNorwegianDate(dateInput) {
        if (!dateInput) return '';
        let dateObj = null;
        if (dateInput instanceof Date) {
            dateObj = dateInput;
        } else {
            dateObj = this.parseDateString(dateInput);
        }
        
        if (!dateObj || isNaN(dateObj.getTime())) {
            return dateInput;
        }
        
        const lang = document.documentElement.lang || 'no';
        
        const monthsDict = {
            no: ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'],
            en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
            es: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
        };
        
        const daysDict = {
            no: ['Søndag', 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag'],
            en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
            es: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
        };
        
        const months = monthsDict[lang] || monthsDict['no'];
        const days = daysDict[lang] || daysDict['no'];
        
        const dayName = days[dateObj.getDay()];
        const dayNum = dateObj.getDate();
        const monthName = months[dateObj.getMonth()];
        const year = dateObj.getFullYear();
        
        const currentYear = new Date().getFullYear();
        const showYear = year !== currentYear;
        
        if (lang === 'en') {
            const suffix = ['th', 'st', 'nd', 'rd'][(dayNum % 10 > 3 || Math.floor(dayNum % 100 / 10) === 1) ? 0 : dayNum % 10];
            return `${dayName}, ${monthName} ${dayNum}${suffix}${showYear ? ` ${year}` : ''}`;
        } else if (lang === 'es') {
            return `${dayName}, ${dayNum} de ${monthName}${showYear ? ` de ${year}` : ''}`;
        } else {
            // Default Norwegian
            return `${dayName} ${dayNum}. ${monthName}${showYear ? ` ${year}` : ''}`;
        }
    }

    renderMarkdown(text) {
        if (!text) return '';
        let html = this.escapeHtml(text);

        // 1. Convert headers: ### Title, ## Title, # Title
        html = html.replace(/^### (.*?)$/gm, '<h5 style="margin: 12px 0 6px 0; font-size: 14.5px; font-weight: 700; color: var(--text-color, #0f172a);">$1</h5>');
        html = html.replace(/^## (.*?)$/gm, '<h4 style="margin: 16px 0 8px 0; font-size: 16px; font-weight: 700; color: var(--text-color, #0f172a); border-bottom: 1px solid var(--border-color, #f1f5f9); padding-bottom: 4px;">$1</h4>');
        html = html.replace(/^# (.*?)$/gm, '<h3 style="margin: 20px 0 10px 0; font-size: 18px; font-weight: 800; color: var(--text-color, #0f172a);">$1</h3>');

        // 2. Convert bold: **text**
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight: 700; color: var(--text-color, #0f172a);">$1</strong>');
        // Convert italic: *text*
        html = html.replace(/\*(.*?)\*/g, '<em style="font-style: italic;">$1</em>');

        // 3. Convert links: [label](url)
        html = html.replace(/\[(.*?)\]\((.*?)\)/g, (match, label, url) => {
            const cleanUrl = url.replace(/&amp;/g, '&');
            return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer" style="color: var(--admin-orange, #d17d39); text-decoration: underline; font-weight: 600;">${label}</a>`;
        });

        // 4. Convert lists (unordered)
        let inList = false;
        const lines = html.split('\n');
        const processedLines = lines.map(line => {
            const listMatch = /^[\s]*[-*][\s]+(.*)$/.exec(line);
            if (listMatch) {
                let prefix = '';
                if (!inList) {
                    inList = true;
                    prefix = '<ul style="margin: 8px 0; padding-left: 20px; list-style-type: disc; display: flex; flex-direction: column; gap: 4px;">';
                }
                return prefix + `<li style="line-height: 1.6; font-size: 15px; color: var(--text-color, #334155);">${listMatch[1]}</li>`;
            } else {
                let suffix = '';
                if (inList) {
                    inList = false;
                    suffix = '</ul>';
                }
                return suffix + line;
            }
        });
        if (inList) {
            processedLines[processedLines.length - 1] += '</ul>';
        }
        html = processedLines.join('\n');

        // 5. Convert double newlines to paragraphs and single newlines to br
        html = html.replace(/\n/g, '<br>');
        
        // Remove duplicate <br> after block tags
        html = html.replace(/<\/h[345]><br>/g, (m) => m.substring(0, m.length - 4));
        html = html.replace(/<\/ul><br>/g, (m) => m.substring(0, m.length - 4));
        html = html.replace(/<li(.*?)><br>/g, '<li$1>');
        html = html.replace(/<\/li><br>/g, '</li>');

        return html;
    }

    stripMarkdown(text) {
        if (!text) return '';
        let clean = text;
        clean = clean.replace(/^#+\s+/gm, '');
        clean = clean.replace(/\*\*([^*]+)\*\*/g, '$1');
        clean = clean.replace(/\*([^*]+)\*/g, '$1');
        clean = clean.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
        clean = clean.replace(/^[\s]*[-*][\s]+/gm, '');
        return clean;
    }

    t(key) {
        const lang = document.documentElement.lang || 'no';
        const localDict = {
            no: {
                'groups.title': 'Smågrupper',
                'groups.subtitle': 'Finn og bli med i et kristent fellesskap',
                'groups.searchPlaceholder': 'Søk på navn, sted eller kategori...',
                'groups.adminCategories': 'Administrer kategorier',
                'groups.createNew': 'Opprett ny gruppe',
                'groups.categoryAll': 'Alle kategorier',
                'groups.myGroups': 'Mine grupper',
                'groups.exploreGroups': 'Utforsk grupper',
                'groups.backToGroups': 'Tilbake til grupper',
                'groups.groupLeder': 'Gruppeleder',
                'groups.groupMedlem': 'Medlem',
                'groups.membersCount': 'medlemmer',
                'groups.memberCount': 'medlem',
                'groups.joinPolicyOpen': 'Åpen for alle (Direkte påmelding)',
                'groups.joinPolicyApproval': 'Godkjenning (Søknad til leder)',
                'groups.joinOpen': 'Bli med i gruppen',
                'groups.joinApply': 'Søk om plass',
                'groups.openGroup': 'Åpne gruppe',
                'groups.noGroups': 'Ingen grupper funnet.',
                'groups.noMyGroups': 'Du er ikke medlem av noen grupper ennå.',
                
                // Group Hub
                'groups.hubOverview': 'Oversikt',
                'groups.hubChat': 'Meldinger & Chat',
                'groups.hubEvents': 'Samlinger',
                'groups.hubResources': 'Ressurser',
                'groups.hubSendEmail': 'Send e-post',
                'groups.hubEdit': 'Rediger gruppe',
                'groups.hubDuplicate': 'Dupliser',
                'groups.hubOverviewTitle': 'Om gruppen',
                'groups.hubInfo': 'Praktisk informasjon',
                'groups.hubSchedule': 'Møtetid',
                'groups.hubLocation': 'Sted',
                'groups.hubJoinPolicy': 'Påmeldingstype',
                'groups.hubLeaders': 'Gruppeledere',
                'groups.hubMembersTitle': 'Personer',
                'groups.hubGetFromContacts': 'Hent fra kontakter (Admin)',
                'groups.noDesc': 'Ingen beskrivelse skrevet ennå.',
                'groups.chatLoading': 'Laster gruppechat...',
                
                // Events
                'groups.eventsCreate': 'Opprett ny samling',
                'groups.eventsNoEvents': 'Ingen planlagte samlinger opprettet ennå.',
                'groups.eventsRsvpYes': '✓ Jeg kommer',
                'groups.eventsRsvpNo': '✕ Kan ikke',
                'groups.eventsEdit': 'Endre',
                'groups.eventsDelete': 'Slett',
                
                // Resources
                'groups.resourcesTitle': 'Delte ressurser',
                'groups.resourcesCreate': 'Legg til resurs',
                'groups.resourcesNoRes': 'Ingen delte ressurser i denne gruppen ennå.',
                'groups.resourcesOpen': 'Åpne lenke',
                
                // Modals
                'groups.modalEditTitle': 'Rediger gruppe',
                'groups.modalCreateTitle': 'Opprett ny gruppe',
                'groups.modalSave': 'Lagre gruppe',
                'groups.modalCancel': 'Avbryt',
                'groups.modalName': 'Gruppenavn *',
                'groups.modalCategory': 'Kategori *',
                'groups.modalSchedule': 'Møtetidspunkt *',
                'groups.modalLocation': 'Sted / Lokasjon *',
                'groups.modalDesc': 'Beskrivelse',
                'groups.modalPolicy': 'Påmeldingstype',
                'groups.modalImage': 'Gruppebilde',
                'groups.modalUpload': 'Last opp',
                'groups.modalUnsplash': 'Unsplash',
                'groups.modalRemove': 'Fjern',
                'groups.modalUrlPlaceholder': 'Lim inn bilde-URL her...',
                'groups.modalLoading': 'Laster...',
                'groups.modalLoadingGroups': 'Laster grupper...',
                'groups.modalLeader': 'Leder: ',

                // Categories
                'groups.category.Husfellesskap': 'Husfellesskap',
                'groups.category.Bønnegruppe': 'Bønnegruppe',
                'groups.category.Bibelstudie': 'Bibelstudie',
                'groups.category.Ung-voksen': 'Ung-voksen',
                'groups.category.Lovsang & Musikk': 'Lovsang & Musikk',
                'groups.category.Lederteam': 'Lederteam',

                // Custom keys for layout and widgets
                'groups.memberCountText': 'person',
                'groups.membersCountText': 'personer',
                'groups.totalInGroup': 'Totalt {count} {unit} i smågruppen',
                'groups.removeSelected': 'Fjern markerte',
                'groups.selectAll': 'Marker alle',
                'groups.loadingDetails': 'Henter medlemsdetaljer...',
                'groups.whatsappGroup': 'WhatsApp-gruppe',
                'groups.whatsappDesc': 'Bli med i gruppens interne chat på WhatsApp.',
                'groups.whatsappOpen': 'Åpne chat',
                'groups.nextEvent': 'Neste Samling',
                'groups.loadingNextEvent': 'Henter neste samling...',
                'groups.noUpcomingEvents': 'Ingen planlagte samlinger',
                'groups.errorNextEvent': 'Kunne ikke hente samling',
                'groups.zoomMeetingId': 'Zoom Meeting ID',
                'groups.zoomPasscode': 'Zoom Passcode',
                // Database content translations
                'HKM prayer team': 'HKM bønneteam',
                'Bønneteam for HKM profetiske skole -  His Kingdom Ministry har fokus på misjon, utrustning av de hellige, bibelundervisning, bønn, forbønn, helbredelse og utfrielse, samt å vokse i Åndens profetiske gaver. Alt vi gjør skal gjøres etter bibelske standarder og med Guds ledelse.': 'Bønneteam for HKM profetiske skole -  His Kingdom Ministry har fokus på misjon, utrustning av de hellige, bibelundervisning, bønn, forbønn, helbredelse og utfrielse, samt å vokse i Åndens profetiske gaver. Alt vi gjør skal gjøres etter bibelske standarder og med Guds ledelse.',
                'Bønneteam for HKM profetiske skole - His Kingdom Ministry har fokus på misjon, utrustning av de hellige, bibelundervisning, bønn, forbønn, helbredelse og utfrielse, samt å vokse i Åndens profetiske gaver. Alt vi gjør skal gjøres etter bibelske standarder og med Guds ledelse.': 'Bønneteam for HKM profetiske skole - His Kingdom Ministry har fokus på misjon, utrustning av de hellige, bibelundervisning, bønn, forbønn, helbredelse og utfrielse, samt å vokse i Åndens profetiske gaver. Alt vi gjør skal gjøres etter bibelske standarder og med Guds ledelse.'
            },
            en: {
                'groups.title': 'Small Groups',
                'groups.subtitle': 'Find and join a Christian community',
                'groups.searchPlaceholder': 'Search by name, location or category...',
                'groups.adminCategories': 'Manage categories',
                'groups.createNew': 'Create new group',
                'groups.categoryAll': 'All categories',
                'groups.myGroups': 'My groups',
                'groups.exploreGroups': 'Explore groups',
                'groups.backToGroups': 'Back to groups',
                'groups.groupLeder': 'Leader',
                'groups.groupMedlem': 'Member',
                'groups.membersCount': 'members',
                'groups.memberCount': 'member',
                'groups.joinPolicyOpen': 'Open for everyone (Direct join)',
                'groups.joinPolicyApproval': 'Approval (Apply to leader)',
                'groups.joinOpen': 'Join group',
                'groups.joinApply': 'Apply for spot',
                'groups.openGroup': 'Open group',
                'groups.noGroups': 'No groups found.',
                'groups.noMyGroups': 'You are not a member of any groups yet.',
                
                // Group Hub
                'groups.hubOverview': 'Overview',
                'groups.hubChat': 'Messages & Chat',
                'groups.hubEvents': 'Gatherings',
                'groups.hubResources': 'Resources',
                'groups.hubSendEmail': 'Send email',
                'groups.hubEdit': 'Edit group',
                'groups.hubDuplicate': 'Duplicate',
                'groups.hubOverviewTitle': 'About the Group',
                'groups.hubInfo': 'Practical Information',
                'groups.hubSchedule': 'Meeting Time',
                'groups.hubLocation': 'Location',
                'groups.hubJoinPolicy': 'Join Policy',
                'groups.hubLeaders': 'Leaders',
                'groups.hubMembersTitle': 'People',
                'groups.hubGetFromContacts': 'Get from Contacts (Admin)',
                'groups.noDesc': 'No description written yet.',
                'groups.chatLoading': 'Loading group chat...',
                
                // Events
                'groups.eventsCreate': 'Create gathering',
                'groups.eventsNoEvents': 'No planned gatherings created yet.',
                'groups.eventsRsvpYes': '✓ Attending',
                'groups.eventsRsvpNo': '✕ Cannot attend',
                'groups.eventsEdit': 'Edit',
                'groups.eventsDelete': 'Delete',
                
                // Resources
                'groups.resourcesTitle': 'Shared resources',
                'groups.resourcesCreate': 'Add resource',
                'groups.resourcesNoRes': 'No shared resources in this group yet.',
                'groups.resourcesOpen': 'Open link',
                
                // Modals
                'groups.modalEditTitle': 'Edit group',
                'groups.modalCreateTitle': 'Create new group',
                'groups.modalSave': 'Save group',
                'groups.modalCancel': 'Cancel',
                'groups.modalName': 'Group name *',
                'groups.modalCategory': 'Category *',
                'groups.modalSchedule': 'Meeting time *',
                'groups.modalLocation': 'Location *',
                'groups.modalDesc': 'Description',
                'groups.modalPolicy': 'Join policy',
                'groups.modalImage': 'Group image',
                'groups.modalUpload': 'Upload',
                'groups.modalUnsplash': 'Unsplash',
                'groups.modalRemove': 'Remove',
                'groups.modalUrlPlaceholder': 'Paste image URL here...',
                'groups.modalLoading': 'Loading...',
                'groups.modalLoadingGroups': 'Loading groups...',
                'groups.modalLeader': 'Leader: ',

                // Categories
                'groups.category.Husfellesskap': 'House Fellowship',
                'groups.category.Bønnegruppe': 'Prayer Group',
                'groups.category.Bibelstudie': 'Bible Study',
                'groups.category.Ung-voksen': 'Young Adults',
                'groups.category.Lovsang & Musikk': 'Worship & Music',
                'groups.category.Lederteam': 'Leadership Team',

                // Custom keys for layout and widgets
                'groups.memberCountText': 'person',
                'groups.membersCountText': 'people',
                'groups.totalInGroup': 'Total {count} {unit} in the small group',
                'groups.removeSelected': 'Remove selected',
                'groups.selectAll': 'Select all',
                'groups.loadingDetails': 'Loading member details...',
                'groups.whatsappGroup': 'WhatsApp Group',
                'groups.whatsappDesc': "Join the group's internal chat on WhatsApp.",
                'groups.whatsappOpen': 'Open chat',
                'groups.nextEvent': 'Next Gathering',
                'groups.loadingNextEvent': 'Loading next gathering...',
                'groups.noUpcomingEvents': 'No planned gatherings',
                'groups.errorNextEvent': 'Could not load gathering',
                'groups.zoomMeetingId': 'Zoom Meeting ID',
                'groups.zoomPasscode': 'Zoom Passcode',
                // Database content translations
                'HKM prayer team': 'HKM Prayer Team',
                'Bønneteam for HKM profetiske skole -  His Kingdom Ministry har fokus på misjon, utrustning av de hellige, bibelundervisning, bønn, forbønn, helbredelse og utfrielse, samt å vokse i Åndens profetiske gaver. Alt vi gjør skal gjøres etter bibelske standarder og med Guds ledelse.': 'Prayer team for HKM prophetic school - His Kingdom Ministry focuses on mission, equipping of the saints, Bible teaching, prayer, intercession, healing and deliverance, as well as growing in the prophetic gifts of the Spirit. Everything we do shall be done according to biblical standards and with God\'s guidance.',
                'Bønneteam for HKM profetiske skole - His Kingdom Ministry har fokus på misjon, utrustning av de hellige, bibelundervisning, bønn, forbønn, helbredelse og utfrielse, samt å vokse i Åndens profetiske gaver. Alt vi gjør skal gjøres etter bibelske standarder og med Guds ledelse.': 'Prayer team for HKM prophetic school - His Kingdom Ministry focuses on mission, equipping of the saints, Bible teaching, prayer, intercession, healing and deliverance, as well as growing in the prophetic gifts of the Spirit. Everything we do shall be done according to biblical standards and with God\'s guidance.'
            },
            es: {
                'groups.title': 'Grupos Pequeños',
                'groups.subtitle': 'Encuentra y únete a una comunidad cristiana',
                'groups.searchPlaceholder': 'Buscar por nombre, ubicación o categoría...',
                'groups.adminCategories': 'Administrar categorías',
                'groups.createNew': 'Crear nuevo grupo',
                'groups.categoryAll': 'Todas las categorías',
                'groups.myGroups': 'Mis grupos',
                'groups.exploreGroups': 'Explorar grupos',
                'groups.backToGroups': 'Volver a grupos',
                'groups.groupLeder': 'Líder',
                'groups.groupMedlem': 'Miembro',
                'groups.membersCount': 'miembros',
                'groups.memberCount': 'miembro',
                'groups.joinPolicyOpen': 'Abierto para todos (Inscripción directa)',
                'groups.joinPolicyApproval': 'Aprobación (Solicitud al líder)',
                'groups.joinOpen': 'Unirse al grupo',
                'groups.joinApply': 'Solicitar plaza',
                'groups.openGroup': 'Abrir grupo',
                'groups.noGroups': 'No se encontraron grupos.',
                'groups.noMyGroups': 'Aún no eres miembro de ningún grupo.',
                
                // Group Hub
                'groups.hubOverview': 'Resumen',
                'groups.hubChat': 'Mensajes y chat',
                'groups.hubEvents': 'Reuniones',
                'groups.hubResources': 'Recursos',
                'groups.hubSendEmail': 'Enviar correo',
                'groups.hubEdit': 'Editar grupo',
                'groups.hubDuplicate': 'Duplicar',
                'groups.hubOverviewTitle': 'Sobre el grupo',
                'groups.hubInfo': 'Información práctica',
                'groups.hubSchedule': 'Horario de reunión',
                'groups.hubLocation': 'Ubicación',
                'groups.hubJoinPolicy': 'Tipo de registro',
                'groups.hubLeaders': 'Líderes',
                'groups.hubMembersTitle': 'Personas',
                'groups.hubGetFromContacts': 'Obtener de contactos (Admin)',
                'groups.noDesc': 'Aún no se ha escrito ninguna descripción.',
                'groups.chatLoading': 'Cargando chat grupal...',
                
                // Events
                'groups.eventsCreate': 'Crear reunión',
                'groups.eventsNoEvents': 'Aún no se han creado reuniones planificadas.',
                'groups.eventsRsvpYes': '✓ Asistiré',
                'groups.eventsRsvpNo': '✕ No asistiré',
                'groups.eventsEdit': 'Editar',
                'groups.eventsDelete': 'Eliminar',
                
                // Resources
                'groups.resourcesTitle': 'Recursos compartidos',
                'groups.resourcesCreate': 'Añadir recurso',
                'groups.resourcesNoRes': 'Aún no hay recursos compartidos en este grupo.',
                'groups.resourcesOpen': 'Abrir enlace',
                
                // Modals
                'groups.modalEditTitle': 'Editar grupo',
                'groups.modalCreateTitle': 'Crear nuevo grupo',
                'groups.modalSave': 'Guardar grupo',
                'groups.modalCancel': 'Cancelar',
                'groups.modalName': 'Nombre del grupo *',
                'groups.modalCategory': 'Categoría *',
                'groups.modalSchedule': 'Horario de reunión *',
                'groups.modalLocation': 'Ubicación *',
                'groups.modalDesc': 'Descripción',
                'groups.modalPolicy': 'Tipo de registro',
                'groups.modalImage': 'Imagen del grupo',
                'groups.modalUpload': 'Subir',
                'groups.modalUnsplash': 'Unsplash',
                'groups.modalRemove': 'Quitar',
                'groups.modalUrlPlaceholder': 'Pegar URL de la imagen aquí...',
                'groups.modalLoading': 'Cargando...',
                'groups.modalLoadingGroups': 'Cargando grupos...',
                'groups.modalLeader': 'Líder: ',

                // Custom keys for layout and widgets
                'groups.memberCountText': 'persona',
                'groups.membersCountText': 'personas',
                'groups.totalInGroup': 'Total {count} {unit} en el grupo pequeño',
                'groups.removeSelected': 'Eliminar seleccionados',
                'groups.selectAll': 'Seleccionar todos',
                'groups.loadingDetails': 'Cargando detalles de los miembros...',
                'groups.whatsappGroup': 'Grupo de WhatsApp',
                'groups.whatsappDesc': 'Únete al chat interno del grupo en WhatsApp.',
                'groups.whatsappOpen': 'Abrir chat',
                'groups.nextEvent': 'Próxima Reunión',
                'groups.loadingNextEvent': 'Cargando próxima reunión...',
                'groups.noUpcomingEvents': 'No hay reuniones planificadas',
                'groups.errorNextEvent': 'No se pudo obtener la reunión',
                'groups.zoomMeetingId': 'ID de reunión de Zoom',
                'groups.zoomPasscode': 'Código de acceso de Zoom',
                // Database content translations
                'HKM prayer team': 'Equipo de oración de HKM',
                'Bønneteam for HKM profetiske skole -  His Kingdom Ministry har fokus på misjon, utrustning av de hellige, bibelundervisning, bønn, forbønn, helbredelse og utfrielse, samt å vokse i Åndens profetiske gaver. Alt vi gjør skal gjøres etter bibelske standarder og med Guds ledelse.': 'Equipo de oración para la escuela profética de HKM - His Kingdom Ministry se enfoca en la misión, el equipamiento de los santos, la enseñanza bíblica, la oración, la intercesión, la sanidad y la liberación, así como en el crecimiento en los dones proféticos del Espíritu. Todo lo que hacemos se hará de acuerdo con los estándares bíblicos y bajo la guía de Dios.',
                'Bønneteam for HKM profetiske skole - His Kingdom Ministry har fokus på misjon, utrustning av de hellige, bibelundervisning, bønn, forbønn, helbredelse og utfrielse, samt å vokse i Åndens profetiske gaver. Alt vi gjør skal gjøres etter bibelske standarder og med Guds ledelse.': 'Equipo de oración para la escuela profética de HKM - His Kingdom Ministry se enfoca en la misión, el equipamiento de los santos, la enseñanza bíblica, la oración, la intercesión, la sanidad y la liberación, así como en el crecimiento en los dones proféticos del Espíritu. Todo lo que hacemos se hará de acuerdo con los estándares bíblicos y bajo la guía de Dios.'
            }
        };

        try {
            if (typeof window.t === 'function') {
                const globalVal = window.t(key);
                if (globalVal && globalVal !== key) {
                    return globalVal;
                }
            }
        } catch (e) {}

        return localDict[lang]?.[key] || localDict['no']?.[key] || key;
    }

    translateCategory(categoryName) {
        if (!categoryName) return '';
        const key = `groups.category.${categoryName}`;
        const translated = this.t(key);
        return translated === key ? categoryName : translated;
    }

    async render(container, queryParams = {}) {
        this.container = container;
        if (queryParams && queryParams.id) {
            this.selectedGroupId = queryParams.id;
            this.currentView = 'hub';
        }

        container.innerHTML = `
            <style>
                .groups-tab-btn {
                    color: var(--text-color, #1e293b) !important;
                }
                .groups-tab-btn.active {
                    background: var(--admin-orange, #d17d39) !important;
                    color: #ffffff !important;
                }
                .groups-tab-btn:not(.active):hover {
                    background: rgba(15, 23, 42, 0.06) !important;
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                
                /* Custom styles for select dropdowns to prevent squeezed arrow */
                .groups-module-wrapper select,
                .modal-overlay select {
                    appearance: none !important;
                    -webkit-appearance: none !important;
                    -moz-appearance: none !important;
                    background-image: url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23475569' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E") !important;
                    background-repeat: no-repeat !important;
                    background-position: right 14px center !important;
                    background-size: 16px !important;
                    padding-right: 40px !important;
                }

                /* Sub-navigation active tabs and group action buttons styling */
                .hub-tab-btn {
                    color: var(--text-color, #1e293b) !important;
                    transition: all 0.2s ease !important;
                }
                .hub-tab-btn.active {
                    background: var(--admin-orange, #d17d39) !important;
                    color: #ffffff !important;
                }
                .hub-tab-btn:not(.active):hover {
                    background: rgba(15, 23, 42, 0.06) !important;
                }
                .groups-banner-btn {
                    transition: all 0.2s ease !important;
                }
                .groups-banner-btn:hover {
                    background: rgba(255, 255, 255, 0.3) !important;
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                }
                .groups-banner-btn:active {
                    transform: translateY(0);
                }
                #btn-open-group-email-modal:hover {
                    background: #b86524 !important;
                }
            </style>
            <div class="groups-module-wrapper">
                <!-- Top Module Navigation & Actions (Dynamic PCO Style) -->
                <div id="groups-header-bar-container"></div>

                <!-- Main Content Body -->
                <div id="groups-content-body">
                    <div class="loading-state" style="padding: 40px; text-align: center;">
                        <div class="spinner"></div>
                        <p style="margin-top: 12px; opacity: 0.7;">${this.t('groups.modalLoadingGroups')}</p>
                    </div>
                </div>
            </div>

            <!-- Create / Edit Group Modal -->
            <div id="group-form-modal" class="modal-overlay" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); z-index: 9999; align-items: center; justify-content: center; padding: 16px;">
                <div class="modal-card" style="background: var(--card-bg, #ffffff); border-radius: 20px; width: 100%; max-width: 580px; max-height: 90vh; overflow-y: auto; padding: 28px; box-shadow: 0 20px 40px rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <h3 id="group-modal-title" style="margin: 0; font-size: 20px; font-weight: 700;">Opprett ny gruppe</h3>
                        <button type="button" id="close-group-modal" style="background: none; border: none; cursor: pointer; color: var(--text-muted, #64748b);"><span class="material-symbols-outlined">close</span></button>
                    </div>
                    <form id="group-form" style="display: flex; flex-direction: column; gap: 16px;">
                        <input type="hidden" id="group-form-id" value="">
                        <div>
                            <label style="display: block; font-weight: 600; font-size: 13px; margin-bottom: 6px;">Gruppenavn *</label>
                            <input type="text" id="group-name-input" required placeholder="f.eks. Husfellesskap Majorstuen" style="width: 100%; padding: 10px 14px; border-radius: 10px; border: 1px solid var(--border-color, #cbd5e1); background: var(--input-bg, #fff); color: var(--text-color, #0f172a);">
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                            <div>
                                <label style="display: block; font-weight: 600; font-size: 13px; margin-bottom: 6px;">Kategori</label>
                                <select id="group-category-input" style="width: 100%; padding: 10px 14px; border-radius: 10px; border: 1px solid var(--border-color, #cbd5e1); background: var(--input-bg, #fff); color: var(--text-color, #0f172a);">
                                    <option value="Husfellesskap">Husfellesskap</option>
                                    <option value="Bønnegruppe">Bønnegruppe</option>
                                    <option value="Bibelstudie">Bibelstudie</option>
                                    <option value="Ung-voksen">Ung-voksen</option>
                                    <option value="Lovsang & Musikk">Lovsang & Musikk</option>
                                    <option value="Lederteam">Lederteam</option>
                                </select>
                            </div>
                            <div>
                                <label style="display: block; font-weight: 600; font-size: 13px; margin-bottom: 6px;">Møtetid / Frekvens</label>
                                <input type="text" id="group-schedule-input" placeholder="f.eks. Annenhver tirsdag kl 19:00" style="width: 100%; padding: 10px 14px; border-radius: 10px; border: 1px solid var(--border-color, #cbd5e1); background: var(--input-bg, #fff); color: var(--text-color, #0f172a);">
                            </div>
                        </div>
                        <div>
                            <label style="display: block; font-weight: 600; font-size: 13px; margin-bottom: 6px;">Sted / Adresse / Link</label>
                            <input type="text" id="group-location-input" placeholder="f.eks. Majorstuen, Oslo eller Zoom-lenke" style="width: 100%; padding: 10px 14px; border-radius: 10px; border: 1px solid var(--border-color, #cbd5e1); background: var(--input-bg, #fff); color: var(--text-color, #0f172a);">
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                            <div>
                                <label style="display: block; font-weight: 600; font-size: 13px; margin-bottom: 6px;">Zoom Meeting ID (valgfri)</label>
                                <input type="text" id="group-zoom-id-input" placeholder="f.eks. 899 2581 2071" style="width: 100%; padding: 10px 14px; border-radius: 10px; border: 1px solid var(--border-color, #cbd5e1); background: var(--input-bg, #fff); color: var(--text-color, #0f172a);">
                            </div>
                            <div>
                                <label style="display: block; font-weight: 600; font-size: 13px; margin-bottom: 6px;">Zoom Passcode (valgfri)</label>
                                <input type="text" id="group-zoom-passcode-input" placeholder="f.eks. 529270" style="width: 100%; padding: 10px 14px; border-radius: 10px; border: 1px solid var(--border-color, #cbd5e1); background: var(--input-bg, #fff); color: var(--text-color, #0f172a);">
                            </div>
                        </div>
                        <div>
                            <label style="display: block; font-weight: 600; font-size: 13px; margin-bottom: 6px;">Beskrivelse</label>
                            <!-- Rich Formatting Toolbar -->
                            <div class="textarea-toolbar" style="display: flex; gap: 8px; margin-bottom: 0; background: var(--bg-muted, #f8fafc); padding: 8px 12px; border-radius: 10px 10px 0 0; border: 1px solid var(--border-color, #cbd5e1); border-bottom: none; align-items: center;">
                                <button type="button" class="toolbar-btn" data-format="bold" title="Fet skrift" style="background: transparent; border: none; padding: 4px; border-radius: 4px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s ease; outline: none;" onmouseover="this.style.background='rgba(15,23,42,0.06)'" onmouseout="this.style.background='transparent'">
                                    <span class="material-symbols-outlined" style="font-size: 20px; font-weight: bold; color: var(--text-color, #475569);">format_bold</span>
                                </button>
                                <button type="button" class="toolbar-btn" data-format="italic" title="Kursiv skrift" style="background: transparent; border: none; padding: 4px; border-radius: 4px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s ease; outline: none;" onmouseover="this.style.background='rgba(15,23,42,0.06)'" onmouseout="this.style.background='transparent'">
                                    <span class="material-symbols-outlined" style="font-size: 20px; color: var(--text-color, #475569);">format_italic</span>
                                </button>
                                <button type="button" class="toolbar-btn" data-format="list" title="Punktliste" style="background: transparent; border: none; padding: 4px; border-radius: 4px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s ease; outline: none;" onmouseover="this.style.background='rgba(15,23,42,0.06)'" onmouseout="this.style.background='transparent'">
                                    <span class="material-symbols-outlined" style="font-size: 20px; color: var(--text-color, #475569);">format_list_bulleted</span>
                                </button>
                                <button type="button" class="toolbar-btn" data-format="link" title="Sett inn lenke" style="background: transparent; border: none; padding: 4px; border-radius: 4px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s ease; outline: none;" onmouseover="this.style.background='rgba(15,23,42,0.06)'" onmouseout="this.style.background='transparent'">
                                    <span class="material-symbols-outlined" style="font-size: 20px; color: var(--text-color, #475569);">link</span>
                                </button>
                                <div style="height: 16px; width: 1px; background: var(--border-color, #cbd5e1); margin: 0 4px;"></div>
                                <span style="font-size: 11px; color: var(--text-muted, #64748b); font-weight: 500;">Markdown-verktøy</span>
                            </div>
                            <textarea id="group-description-input" rows="4" placeholder="Fortell om hva gruppen gjør... Du kan bruke rik formatering (f.eks. **fet skrift**, - punkter, og [lenke](url))." style="width: 100%; padding: 10px 14px; border-radius: 0 0 10px 10px; border: 1px solid var(--border-color, #cbd5e1); background: var(--input-bg, #fff); color: var(--text-color, #0f172a); font-family: inherit; font-size: 13px; line-height: 1.5; outline: none;"></textarea>
                        </div>
                        <div>
                            <label style="display: block; font-weight: 600; font-size: 13px; margin-bottom: 6px;">WhatsApp Gruppelenke (valgfri)</label>
                            <input type="url" id="group-whatsapp-input" placeholder="f.eks. https://chat.whatsapp.com/..." style="width: 100%; padding: 10px 14px; border-radius: 10px; border: 1px solid var(--border-color, #cbd5e1); background: var(--input-bg, #fff); color: var(--text-color, #0f172a);">
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr; gap: 16px;">
                            <div>
                                <label style="display: block; font-weight: 600; font-size: 13px; margin-bottom: 6px;">Påmeldingstype</label>
                                <select id="group-policy-input" style="width: 100%; padding: 10px 14px; border-radius: 10px; border: 1px solid var(--border-color, #cbd5e1); background: var(--input-bg, #fff); color: var(--text-color, #0f172a);">
                                    <option value="open">Åpen for alle (Direkte påmelding)</option>
                                    <option value="approval">Godkjenning (Søknad til leder)</option>
                                </select>
                            </div>
                            <div>
                                <label style="display: block; font-weight: 600; font-size: 13px; margin-bottom: 6px;">Gruppebilde</label>
                                <div style="display: flex; gap: 16px; align-items: center; background: var(--bg-muted, #f8fafc); padding: 16px; border-radius: 16px; border: 1px dashed var(--border-color, #cbd5e1);">
                                    <div id="group-image-preview-container" style="width: 80px; height: 80px; border-radius: 12px; overflow: hidden; background: #e2e8f0; border: 1px solid var(--border-color, #cbd5e1); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                                        <img id="group-image-preview" src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=150&q=80" style="width: 100%; height: 100%; object-fit: cover;">
                                    </div>
                                    <div style="display: flex; flex-direction: column; gap: 8px; flex: 1;">
                                        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                                            <button type="button" id="btn-upload-group-image" style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 10px; background: #1e293b; color: white; border: none; font-size: 12px; font-weight: 600; cursor: pointer; transition: background 0.15s ease;">
                                                <span class="material-symbols-outlined" style="font-size: 16px;">upload</span>
                                                <span>Last opp</span>
                                            </button>
                                            <button type="button" id="btn-unsplash-group-image" style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 10px; background: var(--admin-orange, #d17d39); color: white; border: none; font-size: 12px; font-weight: 600; cursor: pointer; transition: background 0.15s ease;">
                                                <span class="material-symbols-outlined" style="font-size: 16px;">image_search</span>
                                                <span>Unsplash</span>
                                            </button>
                                            <button type="button" id="btn-clear-group-image" style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 10px; background: rgba(239, 68, 68, 0.1); color: #ef4444; border: none; font-size: 12px; font-weight: 600; cursor: pointer; transition: background 0.15s ease;">
                                                <span class="material-symbols-outlined" style="font-size: 16px;">delete</span>
                                                <span>Fjern</span>
                                            </button>
                                        </div>
                                        <input type="text" id="group-image-input" placeholder="Lim inn bilde-URL her..." style="width: 100%; padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border-color, #cbd5e1); background: var(--input-bg, #fff); color: var(--text-color, #0f172a); font-size: 12px;">
                                        <input type="file" id="group-image-file-input" accept="image/*" style="display: none;">
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 12px;">
                            <button type="button" id="cancel-group-form" style="padding: 10px 18px; border-radius: 10px; border: 1px solid var(--border-color, #cbd5e1); background: transparent; cursor: pointer;">Avbryt</button>
                            <button type="submit" style="padding: 10px 22px; border-radius: 10px; background: var(--admin-orange, #d17d39); color: white; border: none; font-weight: 600; cursor: pointer;">Lagre gruppe</button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- Duplicate Group Modal -->
            <div id="group-duplicate-modal" class="modal-overlay" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); z-index: 9999; align-items: center; justify-content: center; padding: 16px;">
                <div class="modal-card" style="background: var(--card-bg, #ffffff); border-radius: 20px; width: 100%; max-width: 480px; padding: 28px; box-shadow: 0 20px 40px rgba(0,0,0,0.2);">
                    <h3 style="margin-top: 0; font-size: 18px; font-weight: 700; margin-bottom: 8px;">Dupliser gruppe</h3>
                    <p style="font-size: 14px; opacity: 0.8; margin-bottom: 16px;">Opprett en ny kopi for nytt semester. Medlemmer og oppsett blir med over, mens nye samlinger startes fra rad 1.</p>
                    <form id="duplicate-form">
                        <input type="hidden" id="duplicate-source-id" value="">
                        <label style="display: block; font-weight: 600; font-size: 13px; margin-bottom: 6px;">Nytt gruppenavn</label>
                        <input type="text" id="duplicate-name-input" required style="width: 100%; padding: 10px 14px; border-radius: 10px; border: 1px solid var(--border-color, #cbd5e1); margin-bottom: 16px;">
                        <div style="display: flex; justify-content: flex-end; gap: 10px;">
                            <button type="button" id="cancel-duplicate-btn" style="padding: 10px 16px; border-radius: 10px; border: 1px solid #cbd5e1; background: transparent; cursor: pointer;">Avbryt</button>
                            <button type="submit" style="padding: 10px 20px; border-radius: 10px; background: var(--admin-orange, #d17d39); color: white; border: none; font-weight: 600; cursor: pointer;">Dupliser nå</button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- Import Contacts Modal (Admin only) -->
            <div id="group-contacts-modal" class="modal-overlay" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); z-index: 9999; align-items: center; justify-content: center; padding: 16px;">
                <div class="modal-card" style="background: var(--card-bg, #ffffff); border-radius: 20px; width: 100%; max-width: 640px; padding: 28px; box-shadow: 0 20px 40px rgba(0,0,0,0.2); max-height: 85vh; display: flex; flex-direction: column;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                        <div>
                            <h3 style="margin: 0; font-size: 20px; font-weight: 700;">Hent personer fra Kontakter</h3>
                            <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.7;">Søk i CRM-kontakter og velg hvem som skal legges til i gruppen.</p>
                        </div>
                        <button type="button" id="close-contacts-modal" style="background: transparent; border: none; font-size: 24px; cursor: pointer; color: var(--text-color, #64748b);">&times;</button>
                    </div>

                    <div style="display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap;">
                        <input type="text" id="contacts-search-input" placeholder="Søk på navn, e-post eller telefon..." style="flex: 2; min-width: 200px; padding: 10px 14px; border-radius: 10px; border: 1px solid var(--border-color, #cbd5e1); background: var(--input-bg, #fff); color: var(--text-color, #0f172a); font-size: 14px;">
                        <select id="contacts-tag-filter" style="flex: 1; min-width: 130px; padding: 10px 14px; border-radius: 10px; border: 1px solid var(--border-color, #cbd5e1); background: var(--input-bg, #fff); color: var(--text-color, #0f172a); font-size: 13px; font-weight: 600;">
                            <option value="ALL">Alle etiketter</option>
                        </select>
                        <select id="contacts-role-picker" style="flex: 1; min-width: 160px; padding: 10px 14px; border-radius: 10px; border: 1px solid var(--border-color, #cbd5e1); background: var(--input-bg, #fff); color: var(--text-color, #0f172a); font-size: 13px; font-weight: 600;">
                            <option value="member">Legg til som Medlem</option>
                            <option value="leader">Legg til som Gruppeleder</option>
                        </select>
                    </div>

                    <div id="contacts-list-container" style="flex: 1; overflow-y: auto; border: 1px solid var(--border-color, #e2e8f0); border-radius: 12px; padding: 12px; display: flex; flex-direction: column; gap: 8px; max-height: 380px; min-height: 200px;">
                        <div style="text-align: center; padding: 24px; color: var(--text-muted, #64748b);">Laster inn kontakter...</div>
                    </div>

                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 24px; padding-top: 24px; border-top: 1px solid var(--border-color, #e2e8f0);">
                        <button type="button" id="select-all-contacts-btn" style="background: transparent; border: none; color: var(--admin-orange, #d17d39); font-weight: 600; font-size: 13px; cursor: pointer;">Velg alle</button>
                        <div style="display: flex; gap: 10px;">
                            <button type="button" id="cancel-contacts-modal" style="padding: 10px 16px; border-radius: 10px; border: 1px solid #cbd5e1; background: transparent; cursor: pointer; font-size: 13px;">Avbryt</button>
                            <button type="button" id="submit-import-contacts-btn" style="padding: 10px 20px; border-radius: 10px; background: var(--admin-orange, #d17d39); color: white; border: none; font-weight: 600; cursor: pointer; font-size: 13px;">Legg til valgte kontakter</button>
                        </div>
                    </div>
                </div>
            </div>
            <!-- Send Group Email Modal -->
            <div id="group-email-modal" class="modal-overlay" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); z-index: 9999; align-items: center; justify-content: center; padding: 16px;">
                <div class="modal-card" style="background: var(--card-bg, #ffffff); border-radius: 20px; width: 100%; max-width: 580px; padding: 28px; box-shadow: 0 20px 40px rgba(0,0,0,0.2); max-height: 90vh; overflow-y: auto;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div style="width: 40px; height: 40px; border-radius: 12px; background: rgba(209, 125, 57, 0.12); color: var(--admin-orange, #d17d39); display: flex; align-items: center; justify-content: center;">
                                <span class="material-symbols-outlined" style="font-size: 22px;">mail</span>
                            </div>
                            <div>
                                <h3 style="margin: 0; font-size: 20px; font-weight: 700;">Send e-post til gruppen</h3>
                                <p id="group-email-subtitle" style="margin: 2px 0 0 0; font-size: 13px; opacity: 0.7;">Send melding til alle gruppemedlemmer</p>
                            </div>
                        </div>
                        <button type="button" id="close-email-modal" style="background: transparent; border: none; font-size: 24px; cursor: pointer; color: var(--text-color, #64748b);">&times;</button>
                    </div>

                    <form id="group-send-email-form" style="display: flex; flex-direction: column; gap: 16px;">
                        <div>
                            <label style="display: block; font-weight: 600; font-size: 13px; margin-bottom: 6px;">Emne *</label>
                            <input type="text" id="group-email-subject" required placeholder="f.eks. Viktig beskjed angående neste samling" style="width: 100%; padding: 10px 14px; border-radius: 10px; border: 1px solid var(--border-color, #cbd5e1); background: var(--input-bg, #fff); color: var(--text-color, #0f172a); font-size: 14px;">
                        </div>

                        <div>
                            <label style="display: block; font-weight: 600; font-size: 13px; margin-bottom: 6px;">Melding *</label>
                            <textarea id="group-email-message" rows="6" required placeholder="Skriv din e-postmelding til gruppen her..." style="width: 100%; padding: 12px 14px; border-radius: 10px; border: 1px solid var(--border-color, #cbd5e1); background: var(--input-bg, #fff); color: var(--text-color, #0f172a); font-family: inherit; font-size: 14px; line-height: 1.5;"></textarea>
                        </div>

                        <div style="background: var(--bg-muted, #f8fafc); padding: 12px 16px; border-radius: 10px; border: 1px solid var(--border-color, #e2e8f0); font-size: 12px; color: var(--text-muted, #64748b);">
                            💡 E-posten sendes fra His Kingdom Ministry sin e-posttjeneste og utformes med offisiell mal og underskrift.
                        </div>

                        <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 8px;">
                            <button type="button" id="cancel-group-email-btn" style="padding: 10px 16px; border-radius: 10px; border: 1px solid #cbd5e1; background: transparent; cursor: pointer; font-size: 13px;">Avbryt</button>
                            <button type="submit" id="submit-group-email-btn" style="display: inline-flex; align-items: center; gap: 8px; padding: 10px 22px; border-radius: 10px; background: linear-gradient(135deg, #d17d39 0%, #b86524 100%); color: white; border: none; font-weight: 600; cursor: pointer; font-size: 13px;">
                                <span class="material-symbols-outlined" style="font-size: 18px;">send</span>
                                <span>Send e-post til gruppen</span>
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- Categories Management Modal (Admin only) -->
            <div id="group-categories-modal" class="modal-overlay" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); z-index: 9999; align-items: center; justify-content: center; padding: 16px;">
                <div class="modal-card" style="background: var(--card-bg, #ffffff); border-radius: 20px; width: 100%; max-width: 480px; padding: 28px; box-shadow: 0 20px 40px rgba(0,0,0,0.2); max-height: 85vh; display: flex; flex-direction: column;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                        <div>
                            <h3 style="margin: 0; font-size: 20px; font-weight: 700;">Administrer kategorier</h3>
                            <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.7;">Opprett eller slett kategorier for smågrupper.</p>
                        </div>
                        <button type="button" id="close-categories-modal" style="background: transparent; border: none; font-size: 24px; cursor: pointer; color: var(--text-color, #64748b);">&times;</button>
                    </div>

                    <div id="categories-list-container" style="flex: 1; overflow-y: auto; border: 1px solid var(--border-color, #e2e8f0); border-radius: 12px; padding: 12px; display: flex; flex-direction: column; gap: 8px; max-height: 300px; min-height: 150px; margin-bottom: 16px;">
                        <!-- Will be populated dynamically -->
                    </div>

                    <form id="add-category-form" style="display: flex; gap: 10px; align-items: center; border-top: 1px solid var(--border-color, #e2e8f0); padding-top: 16px;">
                        <input type="text" id="new-category-input" required placeholder="Nytt kategorinavn..." style="flex: 1; padding: 10px 14px; border-radius: 10px; border: 1px solid var(--border-color, #cbd5e1); background: var(--input-bg, #fff); color: var(--text-color, #0f172a); font-size: 14px;">
                        <button type="submit" style="padding: 10px 18px; border-radius: 10px; background: var(--admin-orange, #d17d39); color: white; border: none; font-weight: 600; cursor: pointer; font-size: 13px; display: inline-flex; align-items: center; gap: 6px;">
                            <span class="material-symbols-outlined" style="font-size: 18px;">add</span>
                            <span>Legg til</span>
                        </button>
                    </form>
                </div>
            </div>

            <!-- Unsplash Picker Modal -->
            <div id="group-unsplash-modal" class="modal-overlay" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); z-index: 9999; align-items: center; justify-content: center; padding: 16px;">
                <div class="modal-card" style="background: var(--card-bg, #ffffff); border-radius: 20px; width: 100%; max-width: 720px; padding: 28px; box-shadow: 0 20px 40px rgba(0,0,0,0.2); max-height: 85vh; display: flex; flex-direction: column;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                        <div>
                            <h3 style="margin: 0; font-size: 20px; font-weight: 700;">Hent bilde fra Unsplash</h3>
                            <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.7;">Søk etter bilder for å bruke som gruppebilde.</p>
                        </div>
                        <button type="button" id="close-unsplash-modal" style="background: transparent; border: none; font-size: 24px; cursor: pointer; color: var(--text-color, #64748b);">&times;</button>
                    </div>

                    <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 16px;">
                        <input type="text" id="unsplash-search-input" placeholder="Søk etter bilder (f.eks. fellesskap, bibel, natur)..." style="flex: 1; padding: 10px 14px; border-radius: 10px; border: 1px solid var(--border-color, #cbd5e1); background: var(--input-bg, #fff); color: var(--text-color, #0f172a); font-size: 14px;">
                        <button type="button" id="btn-search-unsplash" style="padding: 10px 18px; border-radius: 10px; background: var(--admin-orange, #d17d39); color: white; border: none; font-weight: 600; cursor: pointer; font-size: 13px;">Søk</button>
                    </div>

                    <div id="unsplash-loader" style="display: none; text-align: center; padding: 30px 0; color: var(--text-muted, #64748b);">
                        <div style="display: inline-block; width: 30px; height: 30px; border: 3px solid rgba(0,0,0,0.1); border-top-color: var(--admin-orange, #d17d39); border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 8px;"></div>
                        <div>Søker etter bilder...</div>
                    </div>

                    <div id="unsplash-results" style="flex: 1; overflow-y: auto; display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px; max-height: 380px; min-height: 200px; padding: 4px;">
                        <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted, #64748b);">
                            Søk etter bilder over.
                        </div>
                    </div>
                </div>
            </div>

            <!-- Create / Edit Event Modal -->
            <div id="group-event-modal" class="modal-overlay" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); z-index: 9999; align-items: center; justify-content: center; padding: 16px;">
                <div class="modal-card" style="background: var(--card-bg, #ffffff); border-radius: 20px; width: 100%; max-width: 480px; padding: 28px; box-shadow: 0 20px 40px rgba(0,0,0,0.2);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <h3 id="group-event-modal-title" style="margin: 0; font-size: 20px; font-weight: 700;">Opprett ny samling</h3>
                        <button type="button" id="close-event-modal" style="background: none; border: none; cursor: pointer; color: var(--text-muted, #64748b);"><span class="material-symbols-outlined">close</span></button>
                    </div>
                    <form id="group-event-form" style="display: flex; flex-direction: column; gap: 16px;">
                        <input type="hidden" id="group-event-form-id" value="">
                        <div>
                            <label style="display: block; font-weight: 600; font-size: 13px; margin-bottom: 6px;">Tittel / Tema *</label>
                            <input type="text" id="group-event-title-input" required placeholder="f.eks. Ukentlig samling & Lovsang" style="width: 100%; padding: 10px 14px; border-radius: 10px; border: 1px solid var(--border-color, #cbd5e1); background: var(--input-bg, #fff); color: var(--text-color, #0f172a);">
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                            <div>
                                <label style="display: block; font-weight: 600; font-size: 13px; margin-bottom: 6px;">Dato *</label>
                                <input type="text" id="group-event-date-input" required placeholder="f.eks. Tirsdag 12. August" style="width: 100%; padding: 10px 14px; border-radius: 10px; border: 1px solid var(--border-color, #cbd5e1); background: var(--input-bg, #fff); color: var(--text-color, #0f172a);">
                            </div>
                            <div>
                                <label style="display: block; font-weight: 600; font-size: 13px; margin-bottom: 6px;">Klokkeslett *</label>
                                <input type="text" id="group-event-time-input" required placeholder="f.eks. 19:00" style="width: 100%; padding: 10px 14px; border-radius: 10px; border: 1px solid var(--border-color, #cbd5e1); background: var(--input-bg, #fff); color: var(--text-color, #0f172a);">
                            </div>
                        </div>
                        <div>
                            <label style="display: block; font-weight: 600; font-size: 13px; margin-bottom: 6px;">Sted / Lokasjon</label>
                            <input type="text" id="group-event-location-input" placeholder="Bruker gruppens sted hvis tom" style="width: 100%; padding: 10px 14px; border-radius: 10px; border: 1px solid var(--border-color, #cbd5e1); background: var(--input-bg, #fff); color: var(--text-color, #0f172a);">
                        </div>
                        <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 8px;">
                            <button type="button" id="cancel-event-form" style="padding: 10px 18px; border-radius: 10px; border: 1px solid var(--border-color, #cbd5e1); background: transparent; cursor: pointer;">Avbryt</button>
                            <button type="submit" style="padding: 10px 22px; border-radius: 10px; background: var(--admin-orange, #d17d39); color: white; border: none; font-weight: 600; cursor: pointer;">Lagre samling</button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- Create / Edit Resource Modal -->
            <div id="group-resource-modal" class="modal-overlay" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); z-index: 9999; align-items: center; justify-content: center; padding: 16px;">
                <div class="modal-card" style="background: var(--card-bg, #ffffff); border-radius: 20px; width: 100%; max-width: 480px; padding: 28px; box-shadow: 0 20px 40px rgba(0,0,0,0.2);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <h3 id="group-resource-modal-title" style="margin: 0; font-size: 20px; font-weight: 700;">Legg til resurs</h3>
                        <button type="button" id="close-resource-modal" style="background: none; border: none; cursor: pointer; color: var(--text-muted, #64748b);"><span class="material-symbols-outlined">close</span></button>
                    </div>
                    <form id="group-resource-form" style="display: flex; flex-direction: column; gap: 16px;">
                        <input type="hidden" id="group-resource-form-id" value="">
                        <div>
                            <label style="display: block; font-weight: 600; font-size: 13px; margin-bottom: 6px;">Tittel *</label>
                            <input type="text" id="group-resource-title-input" required placeholder="f.eks. Studiehefte PDF" style="width: 100%; padding: 10px 14px; border-radius: 10px; border: 1px solid var(--border-color, #cbd5e1); background: var(--input-bg, #fff); color: var(--text-color, #0f172a);">
                        </div>
                        <div>
                            <label style="display: block; font-weight: 600; font-size: 13px; margin-bottom: 6px;">Lenke (URL) *</label>
                            <div style="display: flex; gap: 8px; align-items: center;">
                                <input type="url" id="group-resource-url-input" required placeholder="f.eks. https://example.com/file.pdf" style="flex: 1; padding: 10px 14px; border-radius: 10px; border: 1px solid var(--border-color, #cbd5e1); background: var(--input-bg, #fff); color: var(--text-color, #0f172a);">
                                <input type="file" id="group-resource-file-input" style="display: none;">
                                <button type="button" id="btn-upload-resource-file" style="display: inline-flex; align-items: center; justify-content: center; width: 42px; height: 42px; border-radius: 10px; border: 1px solid var(--border-color, #cbd5e1); background: var(--bg-muted, #f8fafc); cursor: pointer; color: var(--text-color, #0f172a);" title="Last opp fil fra enhet">
                                    <span class="material-symbols-outlined" style="font-size: 20px;">upload_file</span>
                                </button>
                            </div>
                            <span id="resource-upload-status" style="display: block; font-size: 11px; color: var(--text-muted, #64748b); margin-top: 4px;"></span>
                        </div>
                        <div>
                            <label style="display: block; font-weight: 600; font-size: 13px; margin-bottom: 6px;">Type resurs</label>
                            <select id="group-resource-type-input" style="width: 100%; padding: 10px 14px; border-radius: 10px; border: 1px solid var(--border-color, #cbd5e1); background: var(--input-bg, #fff); color: var(--text-color, #0f172a);">
                                <option value="PDF">PDF-hefte</option>
                                <option value="Dokument">Dokument / Ark</option>
                                <option value="Lenke">Nettside-lenke</option>
                                <option value="Video">Video-lenke</option>
                            </select>
                        </div>
                        <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 8px;">
                            <button type="button" id="cancel-resource-form" style="padding: 10px 18px; border-radius: 10px; border: 1px solid var(--border-color, #cbd5e1); background: transparent; cursor: pointer;">Avbryt</button>
                            <button type="submit" style="padding: 10px 22px; border-radius: 10px; background: var(--admin-orange, #d17d39); color: white; border: none; font-weight: 600; cursor: pointer;">Lagre resurs</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        this.bindEvents();
        await this.loadGroupsData();
    }

    bindEvents() {

        // Event form events
        const eventModal = this.container.querySelector('#group-event-modal');
        this.container.querySelector('#close-event-modal')?.addEventListener('click', () => {
            if (eventModal) eventModal.style.display = 'none';
        });
        this.container.querySelector('#cancel-event-form')?.addEventListener('click', () => {
            if (eventModal) eventModal.style.display = 'none';
        });
        this.container.querySelector('#group-event-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSaveEvent();
        });

        // Resource form events
        const resModal = this.container.querySelector('#group-resource-modal');
        this.container.querySelector('#close-resource-modal')?.addEventListener('click', () => {
            if (resModal) resModal.style.display = 'none';
        });
        this.container.querySelector('#cancel-resource-form')?.addEventListener('click', () => {
            if (resModal) resModal.style.display = 'none';
        });
        this.container.querySelector('#group-resource-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSaveResource();
        });

        // Resource file upload events
        const resForm = this.container.querySelector('#group-resource-form');
        const resFileInput = resForm?.querySelector('#group-resource-file-input');
        const resUploadBtn = resForm?.querySelector('#btn-upload-resource-file');
        const resStatusEl = resForm?.querySelector('#resource-upload-status');

        resUploadBtn?.addEventListener('click', () => {
            resFileInput?.click();
        });

        resFileInput?.addEventListener('change', async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;

            if (resStatusEl) resStatusEl.textContent = 'Laster opp fil...';

            try {
                const uid = firebase.auth().currentUser?.uid || 'anonymous';
                const tempId = firebase.firestore().collection('groups').doc().id;
                const storageRef = firebase.storage().ref(`group_resources/res-${uid}-${tempId}-${file.name}`);
                await storageRef.put(file);
                const downloadUrl = await storageRef.getDownloadURL();

                const urlInput = resForm.querySelector('#group-resource-url-input');
                if (urlInput) urlInput.value = downloadUrl;
                if (resStatusEl) resStatusEl.textContent = `Vellykket opplastet: ${file.name}`;

                // Auto-detect type
                const ext = file.name.split('.').pop().toLowerCase();
                const typeSelect = resForm.querySelector('#group-resource-type-input');
                if (typeSelect) {
                    if (ext === 'pdf') {
                        typeSelect.value = 'PDF';
                    } else if (['jpg', 'jpeg', 'png', 'gif', 'svg'].includes(ext)) {
                        typeSelect.value = 'Dokument';
                    } else if (['mp4', 'mov', 'avi', 'mkv'].includes(ext)) {
                        typeSelect.value = 'Video';
                    } else {
                        typeSelect.value = 'Dokument';
                    }
                }
            } catch (err) {
                console.error("Failed to upload resource:", err);
                if (resStatusEl) resStatusEl.textContent = 'Kunne ikke laste opp fil.';
                alert("Feil ved opplasting av fil: " + err.message);
            }
        });

        // Create modal toggle
        const modal = this.container.querySelector('#group-form-modal');
        this.container.querySelector('#groups-create-btn')?.addEventListener('click', () => {
            this.openCreateModal();
        });

        // Categories management modal (Admin only)
        const categoriesModal = this.container.querySelector('#group-categories-modal');
        this.container.querySelector('#groups-manage-categories-btn')?.addEventListener('click', () => {
            this.openCategoriesModal();
        });
        this.container.querySelector('#close-categories-modal')?.addEventListener('click', () => {
            if (categoriesModal) categoriesModal.style.display = 'none';
        });
        this.container.querySelector('#add-category-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAddCategory();
        });


        this.container.querySelector('#close-group-modal')?.addEventListener('click', () => {
            modal.style.display = 'none';
        });
        this.container.querySelector('#cancel-group-form')?.addEventListener('click', () => {
            modal.style.display = 'none';
        });

        // Save group form
        this.container.querySelector('#group-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSaveGroup();
        });

        // Photo upload / selection events
        const imageInput = this.container.querySelector('#group-image-input');
        const fileInput = this.container.querySelector('#group-image-file-input');
        const previewImg = this.container.querySelector('#group-image-preview');
        const unsplashModal = this.container.querySelector('#group-unsplash-modal');

        this.container.querySelector('#btn-upload-group-image')?.addEventListener('click', () => {
            fileInput?.click();
        });

        fileInput?.addEventListener('change', async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;

            // Show temporary loading state
            if (previewImg) previewImg.style.opacity = '0.5';

            try {
                const uid = firebase.auth().currentUser?.uid || 'anonymous';
                const tempId = firebase.firestore().collection('groups').doc().id;
                const storageRef = firebase.storage().ref(`groups/temp-${uid}-${tempId}`);
                await storageRef.put(file);
                const downloadUrl = await storageRef.getDownloadURL();

                if (imageInput) imageInput.value = downloadUrl;
                if (previewImg) {
                    previewImg.src = downloadUrl;
                    previewImg.style.opacity = '1';
                }
            } catch (err) {
                console.error("Failed to upload image:", err);
                alert("Kunne ikke laste opp bilde: " + err.message);
                if (previewImg) previewImg.style.opacity = '1';
            }
        });

        this.container.querySelector('#btn-unsplash-group-image')?.addEventListener('click', () => {
            if (unsplashModal) {
                unsplashModal.style.display = 'flex';
                this.container.querySelector('#unsplash-search-input')?.focus();
            }
        });

        this.container.querySelector('#close-unsplash-modal')?.addEventListener('click', () => {
            if (unsplashModal) unsplashModal.style.display = 'none';
        });

        this.container.querySelector('#btn-search-unsplash')?.addEventListener('click', () => {
            this.handleUnsplashSearch();
        });

        this.container.querySelector('#unsplash-search-input')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.handleUnsplashSearch();
            }
        });

        this.container.querySelector('#btn-clear-group-image')?.addEventListener('click', () => {
            const defaultImg = 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=150&q=80';
            if (imageInput) imageInput.value = '';
            if (previewImg) previewImg.src = defaultImg;
        });

        imageInput?.addEventListener('input', () => {
            if (previewImg) {
                previewImg.src = imageInput.value.trim() || 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=150&q=80';
            }
        });

        // Duplicate modal cancel
        const dupModal = this.container.querySelector('#group-duplicate-modal');
        this.container.querySelector('#cancel-duplicate-btn')?.addEventListener('click', () => {
            dupModal.style.display = 'none';
        });
        this.container.querySelector('#duplicate-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleDuplicateGroup();
        });

        // Contacts import modal (Admin only)
        const contactsModal = this.container.querySelector('#group-contacts-modal');
        this.container.querySelector('#close-contacts-modal')?.addEventListener('click', () => {
            if (contactsModal) contactsModal.style.display = 'none';
        });
        this.container.querySelector('#cancel-contacts-modal')?.addEventListener('click', () => {
            if (contactsModal) contactsModal.style.display = 'none';
        });
        this.container.querySelector('#contacts-search-input')?.addEventListener('input', () => {
            this.renderContactsList();
        });
        this.container.querySelector('#contacts-tag-filter')?.addEventListener('change', () => {
            this.renderContactsList();
        });
        this.container.querySelector('#select-all-contacts-btn')?.addEventListener('click', () => {
            if (this.allContactsList) {
                this.allContactsList.forEach(c => this.selectedContactIds.add(c.id));
                this.renderContactsList();
            }
        });
        this.container.querySelector('#submit-import-contacts-btn')?.addEventListener('click', () => {
            this.submitImportContacts();
        });

        // Group Email modal
        const emailModal = this.container.querySelector('#group-email-modal');
        this.container.querySelector('#close-email-modal')?.addEventListener('click', () => {
            if (emailModal) emailModal.style.display = 'none';
        });
        this.container.querySelector('#cancel-group-email-btn')?.addEventListener('click', () => {
            if (emailModal) emailModal.style.display = 'none';
        });
        this.container.querySelector('#group-send-email-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSendGroupEmail();
        });
    }

    async loadGroupsData() {
        try {
            const db = firebase.firestore();

            // Temporary Zoom Details Seeder Hook for HKM prayer team
            if (!this._hasSeededZoom) {
                this._hasSeededZoom = true;
                setTimeout(async () => {
                    try {
                        const q = await db.collection('groups').where('name', '==', 'HKM prayer team').get();
                        if (!q.empty) {
                            const docId = q.docs[0].id;
                            const docData = q.docs[0].data();
                            if (!docData.zoomMeetingId || !docData.zoomPasscode) {
                                await db.collection('groups').doc(docId).update({
                                    location: "https://us06web.zoom.us/j/89925812071?pwd=ZJUzTOWHwaQES4UQLAxA3WT4lnsx9.1",
                                    zoomMeetingId: "899 2581 2071",
                                    zoomPasscode: "529270"
                                });
                                console.log("Seeded HKM prayer team zoom details client-side!");
                                await this.loadGroupsData();
                                if (this.activeGroup && this.activeGroup.name === 'HKM prayer team') {
                                    this.renderGroupHubView(this.container.querySelector('#groups-view-container'));
                                }
                            }
                        }
                    } catch (err) {
                        console.warn("Client-side zoom seeder failed:", err);
                    }
                }, 1500);
            }

            // Load categories
            const catsSnap = await db.collection('groupCategories').orderBy('name').get();
            let fetchedCats = [];
            catsSnap.forEach(doc => {
                fetchedCats.push(doc.data().name);
            });

            // If empty, seed categories and reload
            if (fetchedCats.length === 0) {
                const defaultCats = ['Husfellesskap', 'Bønnegruppe', 'Bibelstudie', 'Ung-voksen', 'Lovsang & Musikk', 'Lederteam'];
                const uid = firebase.auth().currentUser?.uid;
                if (uid) {
                    try {
                        const batch = db.batch();
                        defaultCats.forEach(cat => {
                            const docRef = db.collection('groupCategories').doc();
                            batch.set(docRef, { name: cat, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
                        });
                        await batch.commit();
                        return this.loadGroupsData();
                    } catch (e) {
                        console.warn("Failed to seed groupCategories in Firestore, using fallback:", e);
                        this.categories = defaultCats;
                    }
                } else {
                    this.categories = defaultCats;
                }
            } else {
                this.categories = fetchedCats;
            }

            const snap = await db.collection('groups').get();
            let fetchedGroups = [];
            snap.forEach(doc => {
                fetchedGroups.push({ id: doc.id, ...doc.data() });
            });

            this.groups = fetchedGroups;
            const uid = firebase.auth().currentUser?.uid;

            // Categorize user's joined groups
            this.myGroups = this.groups.filter(g => 
                (g.leaderUids && g.leaderUids.includes(uid)) || 
                (g.memberUids && g.memberUids.includes(uid))
            );

            this.renderCurrentView();
        } catch (err) {
            console.error("Error loading groups:", err);
            const content = this.container.querySelector('#groups-content-body');
            if (content) {
                content.innerHTML = `
                    <div style="padding: 30px; text-align: center; color: #ef4444;">
                        <span class="material-symbols-outlined" style="font-size: 36px;">warning</span>
                        <p style="margin-top: 8px;">Kunne ikke laste grupper. Sjekk nettverk eller prøv igjen.</p>
                    </div>
                `;
            }
        }
    }

    async seedDemoGroups() {
        const db = firebase.firestore();
        const currentUser = firebase.auth().currentUser;
        const uid = currentUser ? currentUser.uid : 'demo-user';
        const name = currentUser ? (currentUser.displayName || 'Thomas Knutsen') : 'Thomas Knutsen';

        const demoList = [
            {
                name: 'Husfellesskap Majorstuen',
                category: 'Husfellesskap',
                description: 'Vi møtes til varm mat, dype samtaler, lovsang og bibelstudie i et åpent og hyggelig hjem.',
                meetingSchedule: 'Annenhver tirsdag kl. 19:00',
                location: 'Majorstuen, Oslo',
                isPublic: true,
                joinPolicy: 'open',
                leaderUids: [uid],
                leaderNames: [name],
                memberUids: [uid],
                memberCount: 8,
                imageUrl: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=800&q=80',
                isMockup: true,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            },
            {
                name: 'Bønnegruppe for Ung-Voksne',
                category: 'Bønnegruppe',
                description: 'Et ukentlig bønnefellesskap for ung-voksne hvor vi ber sammen for kirken, byen og personlige emner.',
                meetingSchedule: 'Hver torsdag kl. 20:00',
                location: 'HKM Kirkesal & Zoom',
                isPublic: true,
                joinPolicy: 'open',
                leaderUids: [uid],
                leaderNames: [name],
                memberUids: [uid],
                memberCount: 14,
                imageUrl: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=800&q=80',
                isMockup: true,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            },
            {
                name: 'Bibelstudie: Romerbrevet',
                category: 'Bibelstudie',
                description: 'Vi går grundig gjennom Romerbrevets evangelium, nåde og rettferdiggjørelse kapittel for kapittel.',
                meetingSchedule: 'Annenhver mandag kl. 18:30',
                location: 'Lokalet på Frogner',
                isPublic: true,
                joinPolicy: 'approval',
                leaderUids: [uid],
                leaderNames: [name],
                memberUids: [uid],
                memberCount: 6,
                imageUrl: 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&w=800&q=80',
                isMockup: true,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            }
        ];

        const created = [];
        for (const item of demoList) {
            const ref = await db.collection('groups').add(item);
            created.push({ id: ref.id, ...item });
        }
        return created;
    }

    async handleLeaveGroup(groupId) {
        const uid = firebase.auth().currentUser?.uid;
        if (!uid) return;

        try {
            const db = firebase.firestore();
            const groupRef = db.collection('groups').doc(groupId);

            await groupRef.update({
                memberUids: firebase.firestore.FieldValue.arrayRemove(uid)
            });

            // Also clean up from groupMembers collection if it exists
            await db.collection('groupMembers').doc(`${groupId}_${uid}`).delete().catch(() => null);

            alert("Du har meldt deg ut av gruppen.");
            this.selectedGroupId = null;
            this.activeGroup = null;
            this.currentView = 'directory';
            await this.loadGroupsData();
        } catch (err) {
            console.error("Error leaving group:", err);
            alert("Kunne ikke melde deg ut av gruppen: " + err.message);
        }
    }

    renderTopBar(headerContainer) {
        const uid = firebase.auth().currentUser?.uid;
        const isAdmin = this.isAdmin;
        
        let currentTitle = '';
        let menuOptionsHtml = '';
        let contextOptionsHtml = '';
        const isHub = this.currentView === 'hub' && this.selectedGroupId;
        const activeGroup = isHub ? this.groups.find(g => g.id === this.selectedGroupId) : null;

        if (isHub && activeGroup) {
            currentTitle = this.t(activeGroup.name);
            
            // Switch groups dropdown options
            const otherGroups = this.groups.filter(g => 
                g.id !== activeGroup.id && 
                (isAdmin || (g.memberUids && g.memberUids.includes(uid)) || this.checkIsLeader(g))
            );

            if (otherGroups.length > 0) {
                menuOptionsHtml = otherGroups.map(g => `
                    <button type="button" class="pco-menu-item" data-action="switch-group" data-group-id="${g.id}">
                        <span class="material-symbols-outlined">group</span>
                        <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${this.escapeHtml(this.t(g.name))}</span>
                    </button>
                `).join('');
            } else {
                menuOptionsHtml = `
                    <div style="padding: 10px 14px; font-size: 13px; color: var(--text-muted, #64748b); font-weight: 500; text-align: center;">
                        Ingen andre grupper
                    </div>
                `;
            }

            // Context menu options for active group
            const isLeader = this.checkIsLeader(activeGroup);
            contextOptionsHtml = `
                ${(isLeader || isAdmin) ? `
                    <button type="button" class="pco-menu-item" id="ctx-create-event">
                        <span class="material-symbols-outlined">add_circle</span>
                        <span>Opprett samling</span>
                    </button>
                    <button type="button" class="pco-menu-item" id="ctx-email-members">
                        <span class="material-symbols-outlined">mail</span>
                        <span>E-post til medlemmer</span>
                    </button>
                    <button type="button" class="pco-menu-item" id="ctx-edit-group">
                        <span class="material-symbols-outlined">edit</span>
                        <span>Rediger gruppe</span>
                    </button>
                    <button type="button" class="pco-menu-item" id="ctx-duplicate-group">
                        <span class="material-symbols-outlined">content_copy</span>
                        <span>Dupliser semester</span>
                    </button>
                    <button type="button" class="pco-menu-item" id="ctx-delete-group" style="color: #ef4444;">
                        <span class="material-symbols-outlined" style="color: #ef4444;">delete</span>
                        <span>Slett gruppe</span>
                    </button>
                ` : `
                    <button type="button" class="pco-menu-item" id="ctx-leave-group" style="color: #ef4444;">
                        <span class="material-symbols-outlined" style="color: #ef4444;">logout</span>
                        <span>Forlat gruppe</span>
                    </button>
                `}
                <div style="height: 1px; background: var(--border-color, #cbd5e1); margin: 4px 0;"></div>
                <button type="button" class="pco-menu-item" id="ctx-share-group">
                    <span class="material-symbols-outlined">share</span>
                    <span>Del gruppe</span>
                </button>
            `;

        } else {
            currentTitle = this.currentView === 'directory' ? this.t('groups.exploreGroups') : this.t('groups.myGroups');
            
            // Switch views dropdown options
            menuOptionsHtml = `
                <button type="button" class="pco-menu-item ${this.currentView === 'directory' ? 'active' : ''}" data-action="switch-view" data-view="directory">
                    <span class="material-symbols-outlined">explore</span>
                    <span>${this.t('groups.exploreGroups')}</span>
                </button>
                <button type="button" class="pco-menu-item ${this.currentView === 'my-groups' ? 'active' : ''}" data-action="switch-view" data-view="my-groups">
                    <span class="material-symbols-outlined">group_work</span>
                    <span>${this.t('groups.myGroups')}</span>
                </button>
            `;

            // Context menu options for directory
            contextOptionsHtml = `
                <button type="button" class="pco-menu-item" id="ctx-create-group">
                    <span class="material-symbols-outlined">add</span>
                    <span>${this.t('groups.createNew')}</span>
                </button>
                ${isAdmin ? `
                    <button type="button" class="pco-menu-item" id="ctx-manage-categories">
                        <span class="material-symbols-outlined">category</span>
                        <span>${this.t('groups.adminCategories')}</span>
                    </button>
                ` : ''}
                <div style="height: 1px; background: var(--border-color, #cbd5e1); margin: 4px 0;"></div>
                <button type="button" class="pco-menu-item" id="ctx-share-directory">
                    <span class="material-symbols-outlined">share</span>
                    <span>Del grupper</span>
                </button>
                <button type="button" class="pco-menu-item" id="ctx-help">
                    <span class="material-symbols-outlined">help</span>
                    <span>Hjelp & Support</span>
                </button>
                <button type="button" class="pco-menu-item" id="ctx-feedback">
                    <span class="material-symbols-outlined">feedback</span>
                    <span>Gi tilbakemelding</span>
                </button>
            `;
        }

        headerContainer.innerHTML = `
            <style>
                .pco-menu-item {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    width: 100%;
                    padding: 10px 14px;
                    background: transparent;
                    border: none;
                    border-radius: 8px;
                    font-size: 13.5px;
                    font-weight: 600;
                    color: var(--text-color, #334155);
                    cursor: pointer;
                    text-align: left;
                    transition: all 0.15s ease;
                }
                .pco-menu-item:hover {
                    background: rgba(15, 23, 42, 0.04);
                    color: var(--admin-orange, #d17d39);
                }
                .pco-menu-item.active {
                    background: rgba(209,125,57,0.08);
                    color: var(--admin-orange, #d17d39);
                }
                .pco-menu-item .material-symbols-outlined {
                    font-size: 18px;
                }
            </style>
            <div class="pco-header-bar" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: var(--card-bg, #ffffff); border: 1px solid var(--border-color, #e2e8f0); border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.02); position: relative; z-index: 100; width: 100%;">
                <!-- Left: Back Button -->
                <button type="button" id="btn-groups-back" style="background: transparent; border: none; padding: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; color: var(--text-color, #0f172a); transition: transform 0.2s ease, background-color 0.2s ease; border-radius: 50%;" onmouseover="this.style.background='rgba(15,23,42,0.05)';" onmouseout="this.style.background='transparent';">
                    <span class="material-symbols-outlined" style="font-size: 24px; font-weight: 600;">chevron_left</span>
                </button>

                <!-- Center: Dropdown Selector -->
                <div style="position: relative;">
                    <button type="button" id="btn-groups-nav-dropdown" style="background: transparent; border: none; display: flex; align-items: center; gap: 8px; cursor: pointer; padding: 6px 14px; border-radius: 12px; transition: background 0.2s ease; outline: none;">
                        <div style="width: 28px; height: 28px; background: var(--admin-orange, #d17d39); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; box-shadow: 0 2px 4px rgba(209,125,57,0.3);">
                            <span class="material-symbols-outlined" style="font-size: 16px; font-variation-settings: 'FILL' 1;">groups</span>
                        </div>
                        <span style="font-size: 16px; font-weight: 700; color: var(--text-color, #0f172a); max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${this.escapeHtml(currentTitle)}</span>
                        <span class="material-symbols-outlined" style="font-size: 20px; color: var(--text-muted, #64748b);">expand_more</span>
                    </button>

                    <!-- Dropdown Menu Options -->
                    <div id="groups-nav-menu" style="display: none; position: absolute; top: 110%; left: 50%; transform: translateX(-50%); background: var(--card-bg, #ffffff); border: 1px solid var(--border-color, #e2e8f0); border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); width: 220px; z-index: 1000; padding: 6px; overflow: hidden;">
                        ${menuOptionsHtml}
                    </div>
                </div>

                <!-- Right: Context Menu (...) -->
                <div style="position: relative;">
                    <button type="button" id="btn-groups-context-menu" style="background: transparent; border: none; padding: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; color: var(--text-color, #0f172a); transition: background-color 0.2s ease; border-radius: 50%; outline: none;" onmouseover="this.style.background='rgba(15,23,42,0.05)';" onmouseout="this.style.background='transparent';">
                        <span class="material-symbols-outlined" style="font-size: 24px;">more_horiz</span>
                    </button>

                    <!-- Context Dropdown Menu -->
                    <div id="groups-context-menu" style="display: none; position: absolute; top: 110%; right: 0; background: var(--card-bg, #ffffff); border: 1px solid var(--border-color, #e2e8f0); border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); width: 220px; z-index: 1000; padding: 6px; overflow: hidden;">
                        ${contextOptionsHtml}
                    </div>
                </div>
            </div>
        `;

        // Bind dropdown toggles
        const navBtn = headerContainer.querySelector('#btn-groups-nav-dropdown');
        const navMenu = headerContainer.querySelector('#groups-nav-menu');
        const contextBtn = headerContainer.querySelector('#btn-groups-context-menu');
        const contextMenu = headerContainer.querySelector('#groups-context-menu');

        navBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (contextMenu) contextMenu.style.display = 'none';
            navMenu.style.display = navMenu.style.display === 'block' ? 'none' : 'block';
        });

        contextBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (navMenu) navMenu.style.display = 'none';
            contextMenu.style.display = contextMenu.style.display === 'block' ? 'none' : 'block';
        });

        // Close dropdowns on outside click
        const closeDropdowns = (e) => {
            if (navMenu && !navBtn.contains(e.target) && !navMenu.contains(e.target)) {
                navMenu.style.display = 'none';
            }
            if (contextMenu && !contextBtn.contains(e.target) && !contextMenu.contains(e.target)) {
                contextMenu.style.display = 'none';
            }
        };
        window.removeEventListener('click', this._closeGroupsDropdowns);
        this._closeGroupsDropdowns = closeDropdowns;
        window.addEventListener('click', this._closeGroupsDropdowns);

        // Bind navigation back button
        const backBtn = headerContainer.querySelector('#btn-groups-back');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                if (isHub) {
                    this.selectedGroupId = null;
                    this.activeGroup = null;
                    this.currentView = 'directory';
                    this.render(this.container);
                } else {
                    window.location.hash = '#overview';
                }
            });
        }

        // Bind switch view actions
        headerContainer.querySelectorAll('[data-action="switch-view"]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.currentView = btn.dataset.view;
                navMenu.style.display = 'none';
                this.renderCurrentView();
            });
        });

        // Bind switch group actions
        headerContainer.querySelectorAll('[data-action="switch-group"]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.selectedGroupId = btn.dataset.groupId;
                this.currentView = 'hub';
                navMenu.style.display = 'none';
                this.renderCurrentView();
            });
        });

        // Bind Context Actions
        headerContainer.querySelector('#ctx-create-group')?.addEventListener('click', () => {
            contextMenu.style.display = 'none';
            this.openCreateModal();
        });

        headerContainer.querySelector('#ctx-manage-categories')?.addEventListener('click', () => {
            contextMenu.style.display = 'none';
            this.openCategoriesModal();
        });

        headerContainer.querySelector('#ctx-share-directory')?.addEventListener('click', () => {
            contextMenu.style.display = 'none';
            navigator.clipboard.writeText(window.location.href);
            alert("Lenken til medlemsgrupper er kopiert til utklippstavlen!");
        });

        headerContainer.querySelector('#ctx-help')?.addEventListener('click', () => {
            contextMenu.style.display = 'none';
            alert("For hjelp med grupper, kontakt HKM support på e-post eller snakk med din gruppeleder.");
        });

        headerContainer.querySelector('#ctx-feedback')?.addEventListener('click', () => {
            contextMenu.style.display = 'none';
            alert("Vi setter stor pris på tilbakemeldinger! Send gjerne en e-post til post@hkm.no.");
        });

        // Active Group specific actions
        headerContainer.querySelector('#ctx-create-event')?.addEventListener('click', () => {
            contextMenu.style.display = 'none';
            this.openEventModal();
        });

        headerContainer.querySelector('#ctx-email-members')?.addEventListener('click', () => {
            contextMenu.style.display = 'none';
            this.openGroupEmailModal();
        });

        headerContainer.querySelector('#ctx-edit-group')?.addEventListener('click', () => {
            contextMenu.style.display = 'none';
            this.openCreateModal(activeGroup);
        });

        headerContainer.querySelector('#ctx-duplicate-group')?.addEventListener('click', () => {
            contextMenu.style.display = 'none';
            this.openDuplicateModal(activeGroup);
        });

        headerContainer.querySelector('#ctx-delete-group')?.addEventListener('click', () => {
            contextMenu.style.display = 'none';
            if (confirm(`Er du sikker på at du vil slette gruppen "${activeGroup.name}" permanent?`)) {
                this.performDeleteGroup(activeGroup.id, activeGroup.name);
            }
        });

        headerContainer.querySelector('#ctx-share-group')?.addEventListener('click', () => {
            contextMenu.style.display = 'none';
            const shareUrl = `${window.location.origin}${window.location.pathname}?view=groups&id=${activeGroup.id}`;
            navigator.clipboard.writeText(shareUrl);
            alert("Lenken til denne gruppen er kopiert til utklippstavlen!");
        });

        headerContainer.querySelector('#ctx-leave-group')?.addEventListener('click', () => {
            contextMenu.style.display = 'none';
            if (confirm(`Er du sikker på at du vil melde deg ut av "${activeGroup.name}"?`)) {
                this.handleLeaveGroup(activeGroup.id);
            }
        });
    }

    renderCurrentView() {
        const body = this.container.querySelector('#groups-content-body');
        if (!body) return;

        // Render the top bar dynamic navigation
        const headerContainer = this.container.querySelector('#groups-header-bar-container');
        if (headerContainer) {
            this.renderTopBar(headerContainer);
        }

        if (this.currentView === 'directory') {
            this.renderDirectoryView(body);
        } else if (this.currentView === 'my-groups') {
            this.renderMyGroupsView(body);
        } else if (this.currentView === 'hub' && this.selectedGroupId) {
            this.renderGroupHubView(body);
        }
    }

    renderDirectoryView(container) {
        const categories = ['ALL', ...this.categories];

        let filtered = this.groups;
        if (this.filterCategory !== 'ALL') {
            filtered = filtered.filter(g => g.category === this.filterCategory);
        }
        if (this.searchQuery.trim() !== '') {
            const q = this.searchQuery.toLowerCase();
            filtered = filtered.filter(g => 
                (g.name && g.name.toLowerCase().includes(q)) || 
                (g.description && g.description.toLowerCase().includes(q)) ||
                (g.location && g.location.toLowerCase().includes(q))
            );
        }

        container.innerHTML = `
            <!-- Filter Bar -->
            <div style="display: flex; flex-wrap: wrap; gap: 12px; align-items: center; justify-content: space-between; margin-bottom: 24px; background: var(--card-bg, #ffffff); padding: 16px 20px; border-radius: 16px; border: 1px solid var(--border-color, #e2e8f0); box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
                <!-- Search Input -->
                <div style="position: relative; flex: 1; min-width: 240px;">
                    <span class="material-symbols-outlined" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #94a3b8; font-size: 20px;">search</span>
                    <input type="text" id="group-search-input" value="${this.escapeHtml(this.searchQuery)}" placeholder="${this.t('groups.searchPlaceholder')}" style="width: 100%; padding: 10px 14px 10px 40px !important; padding-left: 40px !important; border-radius: 10px; border: 1px solid var(--border-color, #cbd5e1); background: var(--input-bg, #fff); font-size: 14px;">
                </div>

                <!-- Category Filter Pills -->
                <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
                    ${categories.map(cat => `
                        <button type="button" class="cat-pill-btn ${this.filterCategory === cat ? 'active' : ''}" data-cat="${cat}" style="padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 500; border: 1px solid ${this.filterCategory === cat ? 'var(--admin-orange, #d17d39)' : 'var(--border-color, #e2e8f0)'}; background: ${this.filterCategory === cat ? 'var(--admin-orange, #d17d39)' : 'transparent'}; color: ${this.filterCategory === cat ? '#fff' : 'inherit'}; cursor: pointer; transition: all 0.2s ease;">
                            ${cat === 'ALL' ? this.t('groups.categoryAll') : this.translateCategory(cat)}
                        </button>
                    `).join('')}
                </div>
            </div>

            <!-- Groups Directory Grid -->
            ${filtered.length === 0 ? `
                <div style="padding: 60px 20px; text-align: center; background: var(--card-bg, #fff); border-radius: 16px; border: 1px dashed #cbd5e1;">
                    <span class="material-symbols-outlined" style="font-size: 48px; color: #94a3b8;">groups</span>
                    <h3 style="margin-top: 12px; font-size: 18px; font-weight: 600;">${this.t('groups.noGroups')}</h3>
                </div>
            ` : `
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 24px;">
                    ${filtered.map(group => this.renderGroupCard(group)).join('')}
                </div>
            `}
        `;

        // Search event
        container.querySelector('#group-search-input')?.addEventListener('input', (e) => {
            this.searchQuery = e.target.value;
            this.renderDirectoryView(container);
        });

        // Category pills event
        container.querySelectorAll('.cat-pill-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.filterCategory = btn.dataset.cat;
                this.renderDirectoryView(container);
            });
        });

        this.bindCardActions(container);
    }

    renderGroupCard(group) {
        const uid = firebase.auth().currentUser?.uid;
        const isMember = group.memberUids && group.memberUids.includes(uid);
        const isLeader = this.checkIsLeader(group);

        const img = group.imageUrl || 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=800&q=80';
        const totalCount = ((group.memberNames || []).length + (group.leaderNames || []).length) || (group.memberUids || []).length;

        return `
            <div class="group-card" style="background: var(--card-bg, #ffffff); border-radius: 16px; border: 1px solid var(--border-color, #e2e8f0); overflow: hidden; display: flex; flex-direction: column; transition: transform 0.2s ease, box-shadow 0.2s ease; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
                <div class="group-card-banner" style="position: relative; height: 140px; background: url('${img}') center/cover no-repeat;">
                    <div style="position: absolute; inset: 0; background: linear-gradient(to top, rgba(15,23,42,0.8), transparent);"></div>
                    <span style="position: absolute; top: 12px; left: 12px; background: rgba(15, 23, 42, 0.7); backdrop-filter: blur(4px); color: #fff; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; padding: 4px 10px; border-radius: 20px;">
                        ${this.escapeHtml(this.translateCategory(group.category || 'Grupper'))}
                    </span>
                    <div style="position: absolute; top: 12px; right: 12px; display: flex; align-items: center; gap: 8px; z-index: 2;">
                        ${isLeader ? `
                            <span style="background: var(--admin-orange, #d17d39); color: #fff; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 20px; white-space: nowrap; display: inline-flex; align-items: center; gap: 4px;">
                                <span class="material-symbols-outlined" style="font-size: 14px; color: #fff; font-variation-settings: 'FILL' 1;">star</span>
                                <span>${this.t('groups.groupLeder')}</span>
                            </span>
                        ` : ''}
                        ${(isLeader || this.isAdmin) ? `
                            <button type="button" class="btn-delete-card-group" data-id="${group.id}" data-name="${this.escapeHtml(group.name)}" title="Slett gruppe" style="background: rgba(239, 68, 68, 0.9); backdrop-filter: blur(4px); color: white; border: none; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: transform 0.15s ease, background-color 0.15s ease;">
                                <span class="material-symbols-outlined" style="font-size: 16px;">delete</span>
                            </button>
                        ` : ''}
                    </div>
                </div>

                <div style="padding: 20px; flex: 1; display: flex; flex-direction: column;">
                    <h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 700;">${this.escapeHtml(this.t(group.name))}</h3>
                    <p style="font-size: 13px; line-height: 1.5; opacity: 0.8; margin: 0 0 16px 0; flex: 1; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                        ${this.escapeHtml(this.stripMarkdown(this.t(group.description || '')))}
                    </p>

                    <div style="display: flex; flex-direction: column; gap: 8px; font-size: 13px; opacity: 0.9; margin-bottom: 20px;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span class="material-symbols-outlined" style="font-size: 18px; color: var(--admin-orange, #d17d39);">schedule</span>
                            <span>${this.escapeHtml(group.meetingSchedule || '')}</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span class="material-symbols-outlined" style="font-size: 18px; color: var(--admin-orange, #d17d39);">location_on</span>
                            <span>${this.formatLocation(group.location || '')}</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span class="material-symbols-outlined" style="font-size: 18px; color: var(--admin-orange, #d17d39);">person</span>
                            <span>${this.t('groups.modalLeader')}${this.escapeHtml((group.leaderNames && group.leaderNames[0]) || '')}</span>
                        </div>
                    </div>

                    <div style="display: flex; align-items: center; justify-content: space-between; padding-top: 14px; border-top: 1px solid var(--border-color, #f1f5f9);">
                        <span style="font-size: 12px; font-weight: 600; opacity: 0.7; display: inline-flex; align-items: center; gap: 4px;">
                            <span class="material-symbols-outlined" style="font-size: 18px; color: var(--text-color, #64748b);">group</span>
                            <span>${totalCount} ${totalCount === 1 ? this.t('groups.memberCount') : this.t('groups.membersCount')}</span>
                        </span>
                        
                        ${isMember ? `
                            <button type="button" class="btn-open-group" data-id="${group.id}" style="padding: 8px 16px; border-radius: 10px; background: var(--admin-orange, #d17d39); color: white; border: none; font-weight: 600; font-size: 13px; cursor: pointer; transition: background 0.2s ease;">
                                ${this.t('groups.openGroup')}
                            </button>
                        ` : `
                            <button type="button" class="btn-join-group" data-id="${group.id}" data-policy="${group.joinPolicy || 'open'}" style="padding: 8px 16px; border-radius: 10px; background: transparent; border: 1px solid var(--admin-orange, #d17d39); color: var(--admin-orange, #d17d39); font-weight: 600; font-size: 13px; cursor: pointer; transition: all 0.2s ease;">
                                ${group.joinPolicy === 'approval' ? this.t('groups.joinApply') : this.t('groups.joinOpen')}
                            </button>
                        `}
                    </div>
                </div>
            </div>
        `;
    }

    renderMyGroupsView(container) {
        if (this.myGroups.length === 0) {
            container.innerHTML = `
                <div style="padding: 60px 20px; text-align: center; background: var(--card-bg, #fff); border-radius: 16px; border: 1px dashed #cbd5e1;">
                    <span class="material-symbols-outlined" style="font-size: 48px; color: #94a3b8;">group_work</span>
                    <h3 style="margin-top: 12px; font-size: 18px; font-weight: 600;">${this.t('groups.noMyGroups')}</h3>
                    <div style="margin-top: 20px;">
                        <button type="button" id="btn-explore-groups-now" style="padding: 10px 20px; border-radius: 10px; background: var(--admin-orange, #d17d39); color: white; border: none; font-weight: 600; cursor: pointer;">
                            ${this.t('groups.exploreGroups')}
                        </button>
                    </div>
                </div>
            `;

            container.querySelector('#btn-explore-groups-now')?.addEventListener('click', () => {
                this.currentView = 'directory';
                this.container.querySelectorAll('.groups-tab-btn').forEach(b => b.classList.remove('active'));
                this.container.querySelector('[data-gview="directory"]')?.classList.add('active');
                this.renderCurrentView();
            });
            return;
        }

        container.innerHTML = `
            <h3 style="margin-top: 0; font-size: 18px; font-weight: 700; margin-bottom: 16px;">Mine aktive grupper (${this.myGroups.length})</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 24px;">
                ${this.myGroups.map(group => this.renderGroupCard(group)).join('')}
            </div>
        `;

        this.bindCardActions(container);
    }

    bindCardActions(container) {
        container.querySelectorAll('.btn-open-group').forEach(btn => {
            btn.addEventListener('click', () => {
                this.selectedGroupId = btn.dataset.id;
                this.currentView = 'hub';
                this.renderCurrentView();
            });
        });

        container.querySelectorAll('.btn-join-group').forEach(btn => {
            btn.addEventListener('click', async () => {
                const groupId = btn.dataset.id;
                const policy = btn.dataset.policy;
                await this.handleJoinGroup(groupId, policy);
            });
        });

        container.querySelectorAll('.btn-delete-card-group').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const groupId = btn.dataset.id;
                const groupName = btn.dataset.name;
                this.handleDeleteGroup(groupId, groupName);
            });
        });
    }

    async handleJoinGroup(groupId, policy) {
        const uid = firebase.auth().currentUser?.uid;
        if (!uid) {
            alert("Du må være innlogget for å bli med i grupper.");
            return;
        }

        try {
            const db = firebase.firestore();
            const groupRef = db.collection('groups').doc(groupId);

            if (policy === 'approval') {
                await groupRef.update({
                    pendingUids: firebase.firestore.FieldValue.arrayUnion(uid)
                });
                alert("Forespørsel sendt! Gruppeleder vil godkjenne søknaden din.");
            } else {
                await groupRef.update({
                    memberUids: firebase.firestore.FieldValue.arrayUnion(uid)
                });
                alert("Gratulerer! Du er nå medlem av gruppen.");
            }
            await this.loadGroupsData();
        } catch (err) {
            console.error("Error joining group:", err);
            alert("Feil ved påmelding: " + err.message);
        }
    }

    async handleDeleteGroup(groupId, groupName) {
        if (this.app && typeof this.app.showCustomConfirm === 'function') {
            this.app.showCustomConfirm({
                title: 'Slett gruppe',
                message: `Er du sikker på at du vil slette gruppen "${groupName}"? Dette vil slette gruppen permanent.`,
                confirmText: 'Slett',
                cancelText: 'Avbryt',
                isDanger: true,
                onConfirm: async () => {
                    await this.performDeleteGroup(groupId, groupName);
                }
            });
        } else {
            if (confirm(`Er du sikker på at du vil slette gruppen "${groupName}"? Dette vil slette gruppen permanent.`)) {
                await this.performDeleteGroup(groupId, groupName);
            }
        }
    }

    async performDeleteGroup(groupId, groupName) {
        try {
            await this.deleteGroupQuietly(groupId);
            alert(`Suksess! Gruppen "${groupName}" ble slettet.`);
            
            if (this.selectedGroupId === groupId) {
                this.selectedGroupId = null;
                this.currentView = 'directory';
            }
            
            await this.loadGroupsData();
        } catch (err) {
            console.error("Error deleting group:", err);
            alert("Kunne ikke slette gruppen: " + err.message);
        }
    }

    async handleRemoveMockupGroups() {
        if (this.app && typeof this.app.showCustomConfirm === 'function') {
            this.app.showCustomConfirm({
                title: 'Fjern mockup-grupper',
                message: 'Er du sikker på at du vil fjerne alle mockup- og demogrupper? Dette vil slette dem permanent.',
                confirmText: 'Slett',
                cancelText: 'Avbryt',
                isDanger: true,
                onConfirm: async () => {
                    await this.performRemoveMockupGroups();
                }
            });
        } else {
            if (confirm('Er du sikker på at du vil fjerne alle mockup- og demogrupper? Dette vil slette dem permanent.')) {
                await this.performRemoveMockupGroups();
            }
        }
    }

    async performRemoveMockupGroups() {
        try {
            const db = firebase.firestore();
            const snap = await db.collection('groups').get();
            let count = 0;
            
            const promises = [];
            snap.forEach(doc => {
                const data = doc.data();
                const name = data.name || '';
                const isMock = data.isMockup === true || 
                               name === 'Husfellesskap Majorstuen' || 
                               name === 'Bønnegruppe for Ung-Voksne' || 
                               name === 'Bibelstudie: Romerbrevet' || 
                               name.toLowerCase().includes('demo') ||
                               name.toLowerCase().includes('mockup');
                
                if (isMock) {
                    count++;
                    promises.push(this.deleteGroupQuietly(doc.id));
                }
            });

            if (count === 0) {
                alert("Fant ingen mockup- eller demogrupper å slette.");
                return;
            }

            await Promise.all(promises);
            alert(`Suksess! ${count} mockup/demogrupper ble fjernet.`);
            this.selectedGroupId = null;
            this.currentView = 'directory';
            await this.loadGroupsData();
        } catch (err) {
            console.error("Error removing mockup groups:", err);
            alert("Kunne ikke fjerne mockup-grupper: " + err.message);
        }
    }

    async deleteGroupQuietly(groupId) {
        const db = firebase.firestore();
        await db.collection('groups').doc(groupId).delete();
        
        // Clean up related sub-collections / documents
        const collections = ['groupMembers', 'groupEvents', 'groupAttendance', 'groupMessages', 'groupResources'];
        for (const col of collections) {
            try {
                const snap = await db.collection(col).where('groupId', '==', groupId).get();
                if (!snap.empty) {
                    const batch = db.batch();
                    snap.forEach(doc => batch.delete(doc.ref));
                    await batch.commit();
                }
            } catch (e) {
                console.warn(`Could not clean up collection ${col} for group ${groupId}:`, e);
            }
        }
    }

    openCategoriesModal() {
        if (!this.isAdmin) {
            alert("Kun administratorer kan administrere kategorier.");
            return;
        }

        const modal = this.container.querySelector('#group-categories-modal');
        if (!modal) return;

        modal.style.display = 'flex';
        this.renderCategoriesList();
    }

    renderCategoriesList() {
        const container = this.container.querySelector('#categories-list-container');
        if (!container) return;

        if (this.categories.length === 0) {
            container.innerHTML = '<div style="text-align: center; padding: 16px; color: var(--text-muted, #64748b);">Ingen kategorier funnet.</div>';
            return;
        }

        container.innerHTML = this.categories.map(cat => `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border-radius: 12px; background: var(--bg-muted, #f8fafc); border: 1px solid var(--border-color, #e2e8f0);">
                <span style="font-weight: 600; font-size: 14px; color: var(--text-color, #0f172a);">${this.escapeHtml(cat)}</span>
                <button type="button" class="btn-delete-category" data-cat="${this.escapeHtml(cat)}" title="Slett kategori" style="background: rgba(239, 68, 68, 0.1); color: #ef4444; border: none; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: background 0.15s ease;">
                    <span class="material-symbols-outlined" style="font-size: 16px;">delete</span>
                </button>
            </div>
        `).join('');

        container.querySelectorAll('.btn-delete-category').forEach(btn => {
            btn.addEventListener('click', () => {
                const catName = btn.dataset.cat;
                this.handleDeleteCategory(catName);
            });
        });
    }

    async handleAddCategory() {
        const input = this.container.querySelector('#new-category-input');
        const catName = input ? input.value.trim() : '';
        if (!catName) return;

        if (this.categories.includes(catName)) {
            alert("Kategorien eksisterer allerede.");
            return;
        }

        try {
            const db = firebase.firestore();
            await db.collection('groupCategories').add({
                name: catName,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            if (input) input.value = '';
            
            await this.loadGroupsData();
            this.renderCategoriesList();
        } catch (err) {
            console.error("Error adding category:", err);
            alert("Kunne ikke legge til kategori: " + err.message);
        }
    }

    async handleUnsplashSearch() {
        const queryInput = this.container.querySelector('#unsplash-search-input');
        const resultsContainer = this.container.querySelector('#unsplash-results');
        const loader = this.container.querySelector('#unsplash-loader');

        const query = queryInput ? queryInput.value.trim() : '';
        if (!query) return;

        if (loader) loader.style.display = 'block';
        if (resultsContainer) resultsContainer.style.display = 'none';

        try {
            // Translate search term to English using Google Translate API for better Unsplash results
            let searchQuery = query;
            try {
                const translateUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=no&tl=en&dt=t&q=${encodeURIComponent(query)}`;
                const translateRes = await fetch(translateUrl);
                if (translateRes.ok) {
                    const translateData = await translateRes.json();
                    if (translateData && translateData[0]) {
                        const translatedText = translateData[0].map(s => s[0]).filter(Boolean).join('');
                        if (translatedText && translatedText.trim()) {
                            searchQuery = translatedText.trim();
                        }
                    }
                }
            } catch (transErr) {
                console.warn('[Unsplash] Translation error:', transErr);
            }

            const accessKey = 'W5CRu1Mp-4eJ7FV2PIdjVWPfHdkZV00F4I9fjIOEr60';
            const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(searchQuery)}&per_page=20&client_id=${accessKey}`;
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error('Kunne ikke hente bilder fra Unsplash.');
            }

            const data = await response.json();
            this.renderUnsplashResults(data.results);
        } catch (err) {
            console.error("Unsplash search error:", err);
            if (resultsContainer) {
                resultsContainer.innerHTML = `<div style="grid-column: 1/-1; color: #ef4444; text-align: center; padding: 20px;">Feil: ${err.message}</div>`;
                resultsContainer.style.display = 'grid';
            }
        } finally {
            if (loader) loader.style.display = 'none';
        }
    }

    renderUnsplashResults(images) {
        const resultsContainer = this.container.querySelector('#unsplash-results');
        if (!resultsContainer) return;

        resultsContainer.innerHTML = '';
        resultsContainer.style.display = 'grid';

        if (!images || images.length === 0) {
            resultsContainer.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted, #64748b);">Ingen bilder funnet.</div>';
            return;
        }

        images.forEach(img => {
            const item = document.createElement('div');
            item.style.cssText = `
                position: relative;
                aspect-ratio: 1.5;
                border-radius: 12px;
                overflow: hidden;
                cursor: pointer;
                background: #f1f5f9;
                border: 1px solid var(--border-color, #e2e8f0);
                transition: transform 0.2s ease, box-shadow 0.2s ease;
            `;

            item.innerHTML = `
                <img src="${img.urls.small}" style="width: 100%; height: 100%; object-fit: cover;">
                <div class="hover-overlay" style="position: absolute; inset: 0; background: rgba(0,0,0,0.4); opacity: 0; transition: opacity 0.2s; display: flex; align-items: center; justify-content: center; color: white;">
                    <span class="material-symbols-outlined" style="font-size: 28px;">check_circle</span>
                </div>
                <div style="position: absolute; bottom: 0; left: 0; right: 0; padding: 4px 8px; background: rgba(0,0,0,0.6); color: white; font-size: 10px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    av ${img.user.name}
                </div>
            `;

            item.addEventListener('mouseenter', () => {
                item.style.transform = 'scale(1.03)';
                item.style.boxShadow = '0 6px 16px rgba(0,0,0,0.15)';
                item.querySelector('.hover-overlay').style.opacity = '1';
            });

            item.addEventListener('mouseleave', () => {
                item.style.transform = 'scale(1)';
                item.style.boxShadow = 'none';
                item.querySelector('.hover-overlay').style.opacity = '0';
            });

            item.addEventListener('click', () => {
                this.selectUnsplashImage(img.urls.regular, img.links.download_location);
            });

            resultsContainer.appendChild(item);
        });
    }

    async selectUnsplashImage(imageUrl, downloadLocation) {
        const imageInput = this.container.querySelector('#group-image-input');
        const previewImg = this.container.querySelector('#group-image-preview');
        const unsplashModal = this.container.querySelector('#group-unsplash-modal');

        if (imageInput) imageInput.value = imageUrl;
        if (previewImg) previewImg.src = imageUrl;

        if (unsplashModal) unsplashModal.style.display = 'none';

        // Trigger download tracking as required by Unsplash API terms
        try {
            const accessKey = 'W5CRu1Mp-4eJ7FV2PIdjVWPfHdkZV00F4I9fjIOEr60';
            await fetch(`${downloadLocation}?client_id=${accessKey}`);
        } catch (e) {
            console.warn('[Unsplash] Download tracking failed:', e);
        }
    }

    async handleDeleteCategory(catName) {
        if (this.app && typeof this.app.showCustomConfirm === 'function') {
            this.app.showCustomConfirm({
                title: 'Slett kategori',
                message: `Er du sikker på at du vil slette kategorien "${catName}"?`,
                confirmText: 'Slett',
                cancelText: 'Avbryt',
                isDanger: true,
                onConfirm: async () => {
                    await this.performDeleteCategory(catName);
                }
            });
        } else {
            if (confirm(`Er du sikker på at du vil slette kategorien "${catName}"?`)) {
                await this.performDeleteCategory(catName);
            }
        }
    }

    async performDeleteCategory(catName) {
        try {
            const db = firebase.firestore();
            const snap = await db.collection('groupCategories').where('name', '==', catName).get();
            
            const batch = db.batch();
            snap.forEach(doc => batch.delete(doc.ref));
            await batch.commit();

            await this.loadGroupsData();
            this.renderCategoriesList();
        } catch (err) {
            console.error("Error deleting category:", err);
            alert("Kunne ikke slette kategori: " + err.message);
        }
    }

    /* ═══════════════════════════════════════════════════════════════════════════
       GROUP HUB VIEW (Oversikt, Meldinger/Chat, Samlinger & Ressurser)
       ═══════════════════════════════════════════════════════════════════════════ */
    async renderGroupHubView(container) {
        this.activeGroup = this.groups.find(g => g.id === this.selectedGroupId);
        if (!this.activeGroup) {
            container.innerHTML = `<div style="padding:40px; text-align:center;">Fant ikke gruppen.</div>`;
            return;
        }

        const group = this.activeGroup;
        const uid = firebase.auth().currentUser?.uid;
        const isLeader = this.checkIsLeader(group);
        const img = group.imageUrl || 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=800&q=80';
        const totalCount = ((group.memberNames || []).length + (group.leaderNames || []).length) || (group.memberUids || []).length;

        container.innerHTML = `
            <!-- Group Banner & Header Card -->
            <div style="background: var(--card-bg, #ffffff); border-radius: 20px; border: 1px solid var(--border-color, #e2e8f0); overflow: hidden; margin-bottom: 24px; box-shadow: 0 4px 16px rgba(0,0,0,0.04);">
                <div style="position: relative; min-height: 220px; background: url('${img}') center/cover no-repeat; display: flex; align-items: flex-end; padding: 32px 24px;">
                    <div style="position: absolute; inset: 0; background: linear-gradient(to top, rgba(15,23,42,0.9) 0%, rgba(15,23,42,0.4) 60%, rgba(15,23,42,0.1) 100%);"></div>
                    <div style="position: relative; color: white; display: flex; justify-content: space-between; align-items: flex-end; gap: 20px; flex-wrap: wrap; width: 100%; z-index: 2;">
                        <div>
                            <span style="background: var(--admin-orange, #d17d39); font-size: 11px; font-weight: 700; text-transform: uppercase; padding: 4px 10px; border-radius: 20px; letter-spacing: 0.5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                                ${this.escapeHtml(this.translateCategory(group.category))}
                            </span>
                            <h2 style="margin: 12px 0 8px 0; font-size: 32px; font-weight: 800; text-shadow: 0 2px 4px rgba(0,0,0,0.2);">${this.escapeHtml(this.t(group.name))}</h2>
                            <p style="margin: 0; opacity: 0.95; font-size: 14.5px; display: flex; align-items: center; gap: 20px; flex-wrap: wrap; font-weight: 500;">
                                <style>
                                    .banner-location-label a {
                                        color: #fff !important;
                                        text-decoration: underline !important;
                                        font-weight: 600 !important;
                                    }
                                </style>
                                <span style="display: inline-flex; align-items: center; gap: 6px;">
                                    <span class="material-symbols-outlined" style="font-size: 18px; opacity: 0.85;">location_on</span>
                                    <span class="banner-location-label">${this.formatLocation(group.location || '')}</span>
                                </span>
                                <span style="display: inline-flex; align-items: center; gap: 6px;">
                                    <span class="material-symbols-outlined" style="font-size: 18px; opacity: 0.85;">schedule</span>
                                    <span>${this.escapeHtml(group.meetingSchedule || '')}</span>
                                </span>
                                <span style="display: inline-flex; align-items: center; gap: 6px;">
                                    <span class="material-symbols-outlined" style="font-size: 18px; opacity: 0.85;">group</span>
                                    <span>${totalCount} ${totalCount === 1 ? this.t('groups.memberCount') : this.t('groups.membersCount')}</span>
                                </span>
                            </p>
                        </div>
                    </div>
                </div>

                <!-- Hub Sub-navigation Tabs -->
                <div style="display: flex; gap: 4px; padding: 12px 24px; background: var(--card-bg, #fff); border-top: 1px solid var(--border-color, #f1f5f9); overflow-x: auto;">
                    <button type="button" class="hub-tab-btn ${this.selectedGroupTab === 'overview' ? 'active' : ''}" data-htab="overview" style="display: inline-flex; align-items: center; gap: 8px; padding: 8px 16px; border: none; background: transparent; border-radius: 10px; font-weight: 600; font-size: 14px; cursor: pointer;">
                        <span class="material-symbols-outlined" style="font-size: 18px;">info</span> ${this.t('groups.hubOverview')}
                    </button>
                    <button type="button" class="hub-tab-btn ${this.selectedGroupTab === 'members' ? 'active' : ''}" data-htab="members" style="display: inline-flex; align-items: center; gap: 8px; padding: 8px 16px; border: none; background: transparent; border-radius: 10px; font-weight: 600; font-size: 14px; cursor: pointer;">
                        <span class="material-symbols-outlined" style="font-size: 18px;">group</span> ${this.t('groups.hubMembersTitle')}
                    </button>
                    <button type="button" class="hub-tab-btn ${this.selectedGroupTab === 'chat' ? 'active' : ''}" data-htab="chat" style="display: inline-flex; align-items: center; gap: 8px; padding: 8px 16px; border: none; background: transparent; border-radius: 10px; font-weight: 600; font-size: 14px; cursor: pointer;">
                        <span class="material-symbols-outlined" style="font-size: 18px;">chat</span> ${this.t('groups.hubChat')}
                    </button>
                    <button type="button" class="hub-tab-btn ${this.selectedGroupTab === 'events' ? 'active' : ''}" data-htab="events" style="display: inline-flex; align-items: center; gap: 8px; padding: 8px 16px; border: none; background: transparent; border-radius: 10px; font-weight: 600; font-size: 14px; cursor: pointer;">
                        <span class="material-symbols-outlined" style="font-size: 18px;">calendar_month</span> ${this.t('groups.hubEvents')}
                    </button>
                    <button type="button" class="hub-tab-btn ${this.selectedGroupTab === 'resources' ? 'active' : ''}" data-htab="resources" style="display: inline-flex; align-items: center; gap: 8px; padding: 8px 16px; border: none; background: transparent; border-radius: 10px; font-weight: 600; font-size: 14px; cursor: pointer;">
                        <span class="material-symbols-outlined" style="font-size: 18px;">folder</span> ${this.t('groups.hubResources')}
                    </button>
                </div>
            </div>

            <!-- Hub Tab Body -->
            <div id="hub-tab-body"></div>
        `;

        // Tab click
        container.querySelectorAll('.hub-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.selectedGroupTab = btn.dataset.htab;
                container.querySelectorAll('.hub-tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.renderHubTabBody(container.querySelector('#hub-tab-body'));
            });
        });

        this.renderHubTabBody(container.querySelector('#hub-tab-body'));
    }

    renderHubTabBody(tabContainer) {
        if (!tabContainer || !this.activeGroup) return;

        if (this.selectedGroupTab === 'overview') {
            this.renderHubOverview(tabContainer);
        } else if (this.selectedGroupTab === 'members') {
            this.renderHubMembers(tabContainer);
        } else if (this.selectedGroupTab === 'chat') {
            this.renderHubChat(tabContainer);
        } else if (this.selectedGroupTab === 'events') {
            this.renderHubEvents(tabContainer);
        } else if (this.selectedGroupTab === 'resources') {
            this.renderHubResources(tabContainer);
        }
    }

    renderHubOverview(tabContainer) {
        const group = this.activeGroup;
        tabContainer.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr; gap: 24px; align-items: start; width: 100%;">
                <style>
                    @media (min-width: 992px) {
                        .hub-overview-grid {
                            display: grid !important;
                            grid-template-columns: 1.6fr 1fr !important;
                            gap: 24px !important;
                        }
                    }
                </style>
                <div class="hub-overview-grid" style="display: flex; flex-direction: column; gap: 24px; width: 100%;">
                    
                    <!-- Left Column: Description & WhatsApp -->
                    <div style="display: flex; flex-direction: column; gap: 24px;">
                        
                        <!-- Description Card -->
                        <div style="background: var(--card-bg, #fff); padding: 28px; border-radius: 16px; border: 1px solid var(--border-color, #e2e8f0); box-shadow: 0 4px 20px rgba(0,0,0,0.02); display: flex; flex-direction: column; gap: 16px;">
                            <h3 style="margin: 0; font-size: 18px; font-weight: 800; color: var(--text-color, #0f172a); display: flex; align-items: center; gap: 10px; border-bottom: 1px solid var(--border-color, #f1f5f9); padding-bottom: 12px;">
                                <span class="material-symbols-outlined" style="color: var(--admin-orange, #d17d39); font-size: 22px;">description</span>
                                <span>${this.t('groups.hubOverviewTitle')}</span>
                            </h3>
                            <div style="line-height: 1.7; opacity: 0.95; font-size: 15.5px; margin: 0; color: var(--text-color, #334155);">
                                ${group.description ? this.renderMarkdown(this.t(group.description)) : this.escapeHtml(this.t('groups.noDesc'))}
                            </div>
                        </div>

                        <!-- WhatsApp Widget -->
                        ${group.whatsappUrl ? `
                            <div style="background: linear-gradient(135deg, rgba(37,211,102,0.08) 0%, rgba(37,211,102,0.02) 100%); border: 1px solid rgba(37,211,102,0.2); border-radius: 16px; padding: 20px 24px; display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; transition: all 0.2s ease; box-shadow: 0 4px 12px rgba(37,211,102,0.05);" onmouseover="this.style.borderColor='rgba(37,211,102,0.4)';" onmouseout="this.style.borderColor='rgba(37,211,102,0.2)';">
                                <div style="display: flex; align-items: center; gap: 16px; min-width: 250px;">
                                    <div style="background: #25d366; color: white; width: 48px; height: 48px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 4px 12px rgba(37,211,102,0.3);">
                                        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                                            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.725-1.458L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.863-9.748.002-2.607-1.012-5.059-2.859-6.91-1.847-1.851-4.3-2.87-6.906-2.87-5.438 0-9.863 4.37-9.866 9.749-.001 1.813.493 3.59 1.426 5.148l-1.002 3.661 3.768-.973zm13.102-7.391c-.269-.134-1.593-.787-1.839-.877-.247-.09-.427-.134-.607.134-.18.269-.696.877-.853 1.055-.157.18-.314.202-.583.067-.27-.134-1.14-.422-2.172-1.341-.803-.715-1.346-1.597-1.503-1.866-.157-.269-.017-.415.118-.549.121-.122.269-.314.404-.471.134-.157.18-.27.27-.449.09-.18.045-.337-.022-.471-.067-.134-.607-1.46-.831-2.001-.219-.527-.46-.454-.63-.463-.162-.008-.347-.01-.533-.01-.186 0-.489.07-.746.353-.258.28-.985.963-.985 2.348 0 1.385 1.01 2.721 1.15 2.901.14.18 1.988 3.037 4.814 4.253.673.29 1.2.463 1.61.592.677.215 1.294.185 1.782.112.543-.081 1.593-.651 1.817-1.28.225-.63.225-1.17.157-1.28-.068-.113-.247-.202-.516-.337z"/>
                                        </svg>
                                    </div>
                                    <div>
                                        <h4 style="margin: 0; font-size: 15.5px; font-weight: 700; color: #1b5e20;">${this.t('groups.whatsappGroup')}</h4>
                                        <p style="margin: 2px 0 0 0; font-size: 13.5px; color: #2e7d32; opacity: 0.9;">${this.t('groups.whatsappDesc')}</p>
                                    </div>
                                </div>
                                <a href="${group.whatsappUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-flex; align-items: center; gap: 8px; justify-content: center; padding: 10px 20px; border-radius: 12px; background: #25d366; color: white; border: none; font-weight: 700; font-size: 13.5px; text-decoration: none; transition: all 0.2s ease; box-shadow: 0 4px 12px rgba(37,211,102,0.2);" onmouseover="this.style.transform='scale(1.03)';" onmouseout="this.style.transform='none';">
                                    <span>${this.t('groups.whatsappOpen')}</span>
                                    <span class="material-symbols-outlined" style="font-size: 16px; display: block;">open_in_new</span>
                                </a>
                            </div>
                        ` : ''}
                    </div>

                    <!-- Right Column: Practical Info Card -->
                    <div style="background: var(--card-bg, #fff); padding: 28px; border-radius: 16px; border: 1px solid var(--border-color, #e2e8f0); box-shadow: 0 4px 20px rgba(0,0,0,0.02); display: flex; flex-direction: column; gap: 20px;">
                        <h3 style="margin: 0; font-size: 18px; font-weight: 800; color: var(--text-color, #0f172a); display: flex; align-items: center; gap: 10px; border-bottom: 1px solid var(--border-color, #f1f5f9); padding-bottom: 12px;">
                            <span class="material-symbols-outlined" style="color: var(--admin-orange, #d17d39); font-size: 22px;">info</span>
                            <span>${this.t('groups.hubInfo')}</span>
                        </h3>
                        
                        <div style="display: flex; flex-direction: column; gap: 20px;">
                            <!-- Next Event Container -->
                            <div id="overview-next-event-container" style="display: flex; align-items: center; gap: 16px; background: linear-gradient(135deg, rgba(209,125,57,0.06) 0%, rgba(209,125,57,0.02) 100%); border: 1px solid rgba(209,125,57,0.15); padding: 16px; border-radius: 14px; margin-bottom: 4px; min-height: 92px;">
                                <div style="display: flex; align-items: center; gap: 8px; color: var(--text-muted, #64748b); font-size: 13.5px; font-weight: 600; width: 100%; justify-content: center;">
                                    <span class="material-symbols-outlined" style="font-size: 20px; animation: hkm-spin 1.5s linear infinite; color: var(--admin-orange, #d17d39);">sync</span>
                                    <span>${this.t('groups.loadingNextEvent')}</span>
                                </div>
                            </div>

                            <div style="display: flex; align-items: flex-start; gap: 14px;">
                                <span class="material-symbols-outlined" style="font-size: 22px; color: var(--text-muted, #64748b); margin-top: 2px;">calendar_month</span>
                                <div>
                                    <span style="font-size: 11px; font-weight: 700; opacity: 0.6; text-transform: uppercase; color: var(--text-muted, #64748b); letter-spacing: 0.5px;">${this.t('groups.hubSchedule')}</span>
                                    <p style="margin: 2px 0 0 0; font-weight: 700; font-size: 14.5px; color: var(--text-color, #0f172a);">${this.escapeHtml(group.meetingSchedule)}</p>
                                </div>
                            </div>

                            <div style="display: flex; align-items: flex-start; gap: 14px;">
                                <span class="material-symbols-outlined" style="font-size: 22px; color: var(--text-muted, #64748b); margin-top: 2px;">location_on</span>
                                <style>
                                  .location-link-wrapper a {
                                      color: var(--admin-orange, #d17d39) !important;
                                      text-decoration: underline !important;
                                      font-weight: 700 !important;
                                  }
                                  .location-link-wrapper a:hover {
                                      color: #b86524 !important;
                                  }
                                </style>
                                <div>
                                    <span style="font-size: 11px; font-weight: 700; opacity: 0.6; text-transform: uppercase; color: var(--text-muted, #64748b); letter-spacing: 0.5px;">${this.t('groups.hubLocation')}</span>
                                    <p class="location-link-wrapper" style="margin: 2px 0 0 0; font-weight: 700; font-size: 14.5px; color: var(--text-color, #0f172a);">${this.formatLocation(group.location)}</p>
                                </div>
                            </div>

                            ${group.zoomMeetingId ? `
                                <div style="display: flex; align-items: flex-start; gap: 14px;">
                                    <span class="material-symbols-outlined" style="font-size: 22px; color: var(--text-muted, #64748b); margin-top: 2px;">key</span>
                                    <div>
                                        <span style="font-size: 11px; font-weight: 700; opacity: 0.6; text-transform: uppercase; color: var(--text-muted, #64748b); letter-spacing: 0.5px;">${this.t('groups.zoomMeetingId')}</span>
                                        <p style="margin: 2px 0 0 0; font-weight: 700; font-size: 14.5px; color: var(--text-color, #0f172a); letter-spacing: 0.5px;">${this.escapeHtml(group.zoomMeetingId)}</p>
                                    </div>
                                </div>
                            ` : ''}

                            ${group.zoomPasscode ? `
                                <div style="display: flex; align-items: flex-start; gap: 14px;">
                                    <span class="material-symbols-outlined" style="font-size: 22px; color: var(--text-muted, #64748b); margin-top: 2px;">lock</span>
                                    <div>
                                        <span style="font-size: 11px; font-weight: 700; opacity: 0.6; text-transform: uppercase; color: var(--text-muted, #64748b); letter-spacing: 0.5px;">${this.t('groups.zoomPasscode')}</span>
                                        <p style="margin: 2px 0 0 0; font-weight: 700; font-size: 14.5px; color: var(--text-color, #0f172a);">${this.escapeHtml(group.zoomPasscode)}</p>
                                    </div>
                                </div>
                            ` : ''}

                            <div style="display: flex; align-items: flex-start; gap: 14px;">
                                <span class="material-symbols-outlined" style="font-size: 22px; color: var(--text-muted, #64748b); margin-top: 2px;">lock_open</span>
                                <div>
                                    <span style="font-size: 11px; font-weight: 700; opacity: 0.6; text-transform: uppercase; color: var(--text-muted, #64748b); letter-spacing: 0.5px;">${this.t('groups.hubJoinPolicy')}</span>
                                    <p style="margin: 2px 0 0 0; font-weight: 700; font-size: 14.5px; color: var(--text-color, #0f172a);">${group.joinPolicy === 'approval' ? this.t('groups.joinPolicyApproval') : this.t('groups.joinPolicyOpen')}</p>
                                </div>
                            </div>

                            <div style="display: flex; align-items: flex-start; gap: 14px;">
                                <span class="material-symbols-outlined" style="font-size: 22px; color: var(--text-muted, #64748b); margin-top: 2px;">star</span>
                                <div>
                                    <span style="font-size: 11px; font-weight: 700; opacity: 0.6; text-transform: uppercase; color: var(--text-muted, #64748b); letter-spacing: 0.5px;">${this.t('groups.hubLeaders')}</span>
                                    <p style="margin: 2px 0 0 0; font-weight: 700; font-size: 14.5px; color: var(--text-color, #0f172a);">${this.escapeHtml((group.leaderNames || []).join(', '))}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        `;

        // Fetch next event asynchronously
        (async () => {
            try {
                const db = firebase.firestore();
                const snap = await db.collection('groupEvents')
                    .where('groupId', '==', this.selectedGroupId)
                    .get();

                const todayStr = new Date().toISOString().split('T')[0];
                const events = [];
                snap.forEach(doc => {
                    const data = doc.data();
                    if (data.date) {
                        events.push(data);
                    }
                });

                const upcoming = events.filter(e => {
                    // Try parsing date string
                    const dObj = this.parseDateString(e.date);
                    if (!dObj || isNaN(dObj.getTime())) {
                        // If it can't be parsed, fallback to comparing string
                        return e.date >= todayStr;
                    }
                    const compToday = new Date();
                    compToday.setHours(0,0,0,0);
                    dObj.setHours(0,0,0,0);
                    return dObj >= compToday;
                });

                const containerEl = tabContainer.querySelector('#overview-next-event-container');
                if (!containerEl) return;

                if (upcoming.length === 0) {
                    containerEl.innerHTML = `
                        <div style="display: flex; align-items: center; gap: 12px; width: 100%;">
                            <div style="width: 54px; height: 60px; background: var(--bg-muted, #f1f5f9); border: 1px solid var(--border-color, #e2e8f0); border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                                <span class="material-symbols-outlined" style="font-size: 28px; color: var(--text-muted, #64748b);">calendar_today</span>
                            </div>
                            <div>
                                <span style="font-size: 10px; font-weight: 700; opacity: 0.65; text-transform: uppercase; color: var(--text-muted, #64748b); letter-spacing: 0.7px;">${this.t('groups.nextEvent')}</span>
                                <div style="font-size: 13.5px; color: var(--text-muted, #64748b); font-weight: 600; margin-top: 2px;">${this.t('groups.noUpcomingEvents')}</div>
                            </div>
                        </div>
                    `;
                    return;
                }

                // Sort by date and time
                upcoming.sort((a, b) => {
                    const dateA = this.parseDateString(a.date);
                    const dateB = this.parseDateString(b.date);
                    if (dateA && dateB) {
                        return dateA.getTime() - dateB.getTime();
                    }
                    return a.date.localeCompare(b.date);
                });

                const nextEvt = upcoming[0];
                const dateObj = this.parseDateString(nextEvt.date);
                const formattedDate = this.formatNorwegianDate(dateObj || nextEvt.date);
                
                let badgeHtml = '';
                if (dateObj && !isNaN(dateObj.getTime())) {
                    const monthsShortDict = {
                        no: ['JAN', 'FEB', 'MAR', 'APR', 'MAI', 'JUN', 'JUL', 'AUG', 'SEP', 'OKT', 'NOV', 'DES'],
                        en: ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'],
                        es: ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC']
                    };
                    const daysShortDict = {
                        no: ['søn', 'man', 'tir', 'ons', 'tor', 'fre', 'lør'],
                        en: ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'],
                        es: ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']
                    };
                    const lang = document.documentElement.lang || 'no';
                    const mStr = (monthsShortDict[lang] || monthsShortDict['no'])[dateObj.getMonth()];
                    const dStr = dateObj.getDate();
                    const dName = (daysShortDict[lang] || daysShortDict['no'])[dateObj.getDay()];
                    
                    badgeHtml = `
                        <div style="width: 54px; height: 60px; background: var(--card-bg, #fff); border: 1px solid var(--border-color, #cbd5e1); border-radius: 12px; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.03); flex-shrink: 0; text-align: center;">
                            <div style="background: linear-gradient(135deg, #d17d39 0%, #b86524 100%); color: white; font-size: 9.5px; font-weight: 800; padding: 4px 0; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.2;">
                                ${mStr}
                            </div>
                            <div style="flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 2px 0;">
                                <span style="font-size: 18px; font-weight: 800; color: var(--text-color, #0f172a); line-height: 1.1;">${dStr}</span>
                                <span style="font-size: 9px; font-weight: 700; color: var(--text-muted, #64748b); text-transform: uppercase; margin-top: 1px; line-height: 1;">${dName}</span>
                            </div>
                        </div>
                    `;
                } else {
                    badgeHtml = `
                        <div style="width: 54px; height: 60px; background: linear-gradient(135deg, rgba(209,125,57,0.1) 0%, rgba(209,125,57,0.05) 100%); border: 1px solid rgba(209,125,57,0.2); border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                            <span class="material-symbols-outlined" style="font-size: 28px; color: var(--admin-orange, #d17d39);">calendar_month</span>
                        </div>
                    `;
                }

                const lang = document.documentElement.lang || 'no';
                const timePrefixDict = {
                    no: ' kl. ',
                    en: ' at ',
                    es: ' a las '
                };
                const timePrefix = timePrefixDict[lang] || timePrefixDict['no'];

                containerEl.innerHTML = `
                    <style>
                        .next-event-location-wrapper a {
                            color: var(--admin-orange, #d17d39) !important;
                            text-decoration: none !important;
                            background: rgba(209,125,57,0.06);
                            padding: 5px 12px;
                            border-radius: 8px;
                            border: 1px solid rgba(209,125,57,0.15);
                            transition: all 0.15s ease;
                            display: inline-flex;
                            align-items: center;
                            gap: 4px;
                            font-weight: 700;
                        }
                        .next-event-location-wrapper a:hover {
                            background: rgba(209,125,57,0.12) !important;
                            color: #b86524 !important;
                            transform: translateY(-1px);
                        }
                    </style>
                    ${badgeHtml}
                    <div style="flex: 1; min-width: 0;">
                        <span style="font-size: 10px; font-weight: 700; opacity: 0.65; text-transform: uppercase; color: var(--admin-orange, #d17d39); letter-spacing: 0.7px;">${this.t('groups.nextEvent')}</span>
                        <h4 style="margin: 4px 0 2px 0; font-size: 15.5px; font-weight: 800; color: var(--text-color, #0f172a); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                            ${this.escapeHtml(nextEvt.title)}
                        </h4>
                        <div style="font-size: 13.5px; color: var(--text-color, #334155); font-weight: 600;">
                            ${this.escapeHtml(formattedDate)}${nextEvt.time ? `${timePrefix}${this.escapeHtml(nextEvt.time)}` : ''}
                        </div>
                        ${(() => {
                            const loc = this.formatLocation(nextEvt.location || '');
                            return loc ? `
                                <div class="next-event-location-wrapper" style="margin-top: 8px;">
                                    ${loc}
                                </div>
                            ` : '';
                        })()}
                    </div>
                `;
            } catch (err) {
                console.error("Error loading next event:", err);
                const containerEl = tabContainer.querySelector('#overview-next-event-container');
                if (containerEl) {
                    containerEl.innerHTML = `<span style="font-size: 13px; color: #ef4444;">${this.t('groups.errorNextEvent')}</span>`;
                }
            }
        })();
    }

    async renderHubMembers(tabContainer) {
        const group = this.activeGroup;
        const uid = firebase.auth().currentUser?.uid;
        const isLeader = this.checkIsLeader(group);
        const canManage = isLeader || this.isAdmin;
        const totalCount = ((group.memberNames || []).length + (group.leaderNames || []).length) || (group.memberUids || []).length;

        // Render loading state first
        tabContainer.innerHTML = `
            <div style="background: var(--card-bg, #fff); padding: 24px; border-radius: 16px; border: 1px solid var(--border-color, #e2e8f0); display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 200px;">
                <style>
                    @keyframes hkm-spin {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
                    }
                </style>
                <span class="material-symbols-outlined" style="font-size: 32px; animation: hkm-spin 1.5s linear infinite; color: var(--admin-orange, #d17d39); margin-bottom: 12px; display: block;">sync</span>
                <div style="font-size: 14px; opacity: 0.8; font-weight: 500;">${this.t('groups.loadingDetails')}</div>
            </div>
        `;

        let membersDetailMap = {};
        try {
            const db = firebase.firestore();
            const snap = await db.collection('groupMembers').where('groupId', '==', group.id).get();
            snap.forEach(doc => {
                const data = doc.data();
                if (data.name) {
                    membersDetailMap[data.name.trim().toLowerCase()] = {
                        contactId: data.contactId || '',
                        email: data.email || '',
                        phone: data.phone || ''
                    };
                }
            });
        } catch (e) {
            console.error("Error loading group member details:", e);
        }

        tabContainer.innerHTML = `
            <div style="background: var(--card-bg, #fff); padding: 24px; border-radius: 16px; border: 1px solid var(--border-color, #e2e8f0); display: flex; flex-direction: column;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; border-bottom: 1px solid var(--border-color, #f1f5f9); padding-bottom: 16px;">
                    <div>
                        <h3 style="margin: 0; font-size: 18px; font-weight: 700;">${this.t('groups.hubMembersTitle')}</h3>
                        <p style="margin: 4px 0 0 0; font-size: 13px; color: var(--text-muted, #64748b);">${this.t('groups.totalInGroup').replace('{count}', totalCount).replace('{unit}', totalCount === 1 ? this.t('groups.memberCountText') : this.t('groups.membersCountText'))}</p>
                    </div>
                    <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                        ${this.isAdmin ? `
                            <button type="button" id="btn-open-contacts-modal" style="display: inline-flex; align-items: center; gap: 8px; font-size: 13px; padding: 8px 16px; border-radius: 10px; background: linear-gradient(135deg, #d17d39 0%, #b86524 100%); color: white; border: none; font-weight: 600; cursor: pointer; transition: transform 0.15s ease;">
                                <span class="material-symbols-outlined" style="font-size: 18px;">contacts</span>
                                <span>${this.t('groups.hubGetFromContacts')}</span>
                            </button>
                        ` : ''}
                        ${canManage ? `
                            <button type="button" id="btn-remove-selected-members" style="display: none; align-items: center; gap: 6px; font-size: 13px; padding: 8px 16px; border-radius: 10px; background: #fee2e2; color: #ef4444; border: 1px solid #fca5a5; font-weight: 600; cursor: pointer; transition: all 0.15s ease;">
                                <span class="material-symbols-outlined" style="font-size: 18px;">person_remove</span>
                                <span>${this.t('groups.removeSelected')}</span>
                            </button>
                        ` : ''}
                    </div>
                </div>

                ${canManage ? `
                    <div style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; margin-bottom: 12px; border-bottom: 1px solid var(--border-color, #e2e8f0); padding-bottom: 12px;">
                        <input type="checkbox" id="checkbox-select-all-members" style="width: 16px; height: 16px; cursor: pointer; accent-color: var(--admin-orange, #d17d39);">
                        <label for="checkbox-select-all-members" style="font-size: 13px; font-weight: 600; cursor: pointer; opacity: 0.8; user-select: none;">${this.t('groups.selectAll')}</label>
                    </div>
                ` : ''}

                <div class="members-list" style="display: flex; flex-direction: column; gap: 12px;">
                    ${(group.leaderNames || []).filter(Boolean).map(leader => {
                        const detail = membersDetailMap[leader.trim().toLowerCase()];
                        return `
                            <div style="display: flex; align-items: center; justify-content: space-between; padding: 16px 24px; border-radius: 16px; border: 1px solid var(--border-color, #e2e8f0); background: var(--card-bg, #fff); transition: all 0.2s ease;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(0,0,0,0.04)'; this.style.borderColor='var(--admin-orange, #d17d39)';" onmouseout="this.style.transform='none'; this.style.boxShadow='none'; this.style.borderColor='var(--border-color, #e2e8f0)';">
                                <div style="display: flex; align-items: center; gap: 16px;">
                                    ${canManage ? `
                                        <input type="checkbox" class="remove-member-checkbox" data-name="${this.escapeHtml(leader)}" data-role="leader" style="width: 18px; height: 18px; cursor: pointer; accent-color: #ef4444;">
                                    ` : ''}
                                    <div style="width: 40px; height: 40px; border-radius: 50%; background: var(--admin-orange, #d17d39); color: white; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 15px; flex-shrink: 0; box-shadow: 0 3px 8px rgba(209,125,57,0.15);">
                                        ${leader.charAt(0).toUpperCase()}
                                    </div>
                                    <div style="display: flex; flex-direction: column;">
                                        <div style="font-weight: 700; font-size: 15px; color: var(--text-color, #0f172a);">${this.escapeHtml(leader)}</div>
                                        ${detail && (detail.email || detail.phone) ? `
                                            <div style="font-size: 12.5px; color: var(--text-muted, #64748b); margin-top: 4px; display: flex; gap: 16px; align-items: center; flex-wrap: wrap;">
                                                ${detail.email ? `
                                                    <span style="display: inline-flex; align-items: center; gap: 6px;">
                                                        <span class="material-symbols-outlined" style="font-size: 15px; opacity: 0.7; display: block;">mail</span>
                                                        <a href="mailto:${this.escapeHtml(detail.email)}" style="color: inherit; text-decoration: none; font-weight: 500;">${this.escapeHtml(detail.email)}</a>
                                                    </span>
                                                ` : ''}
                                                ${detail.phone ? `
                                                    <span style="display: inline-flex; align-items: center; gap: 6px;">
                                                        <span class="material-symbols-outlined" style="font-size: 15px; opacity: 0.7; display: block;">call</span>
                                                        <a href="tel:${this.escapeHtml(detail.phone)}" style="color: inherit; text-decoration: none; font-weight: 500;">${this.escapeHtml(detail.phone)}</a>
                                                    </span>
                                                ` : ''}
                                            </div>
                                        ` : ''}
                                    </div>
                                </div>
                                ${canManage ? `
                                    <div style="display: flex; align-items: center; gap: 8px;">
                                        <select class="member-role-select" data-name="${this.escapeHtml(leader)}" data-current-role="leader" style="font-size: 12.5px; font-weight: 700; border: 1px solid #fde68a; border-radius: 12px; padding: 6px 14px; background: #fef3c7; color: var(--admin-orange, #d17d39); cursor: pointer; outline: none; transition: all 0.2s; box-shadow: 0 1px 2px rgba(0,0,0,0.03);">
                                            <option value="leader" selected>★ ${this.t('groups.groupLeder')}</option>
                                            <option value="member">${this.t('groups.groupMedlem')}</option>
                                        </select>
                                        ${this.isAdmin && detail && detail.contactId ? `
                                            <a href="/admin/admin-kommunikasjon.html?edit=${this.escapeHtml(detail.contactId)}" target="_blank" title="Endre kontaktinformasjon" style="display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 50%; border: 1px solid var(--border-color, #cbd5e1); color: var(--text-muted, #64748b); background: var(--bg-muted, #f8fafc); cursor: pointer; transition: all 0.15s ease;" onmouseover="this.style.color='var(--admin-orange, #d17d39)'; this.style.borderColor='var(--admin-orange, #d17d39)';" onmouseout="this.style.color='var(--text-muted, #64748b)'; this.style.borderColor='var(--border-color, #cbd5e1)';">
                                                <span class="material-symbols-outlined" style="font-size: 18px;">edit</span>
                                            </a>
                                        ` : ''}
                                    </div>
                                ` : `
                                    <div style="display: flex; align-items: center; gap: 8px;">
                                        <div style="font-size: 11.5px; color: var(--admin-orange, #d17d39); font-weight: 700; background: #fffbeb; border: 1px solid #fef3c7; padding: 4px 10px; border-radius: 12px; display: inline-flex; align-items: center; gap: 4px;">
                                            <span class="material-symbols-outlined" style="font-size: 13px; color: var(--admin-orange, #d17d39); font-variation-settings: 'FILL' 1;">star</span>
                                            <span>${this.t('groups.groupLeder')}</span>
                                        </div>
                                        ${this.isAdmin && detail && detail.contactId ? `
                                            <a href="/admin/admin-kommunikasjon.html?edit=${this.escapeHtml(detail.contactId)}" target="_blank" title="Endre kontaktinformasjon" style="display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 50%; border: 1px solid var(--border-color, #cbd5e1); color: var(--text-muted, #64748b); background: var(--bg-muted, #f8fafc); cursor: pointer; transition: all 0.15s ease;" onmouseover="this.style.color='var(--admin-orange, #d17d39)'; this.style.borderColor='var(--admin-orange, #d17d39)';" onmouseout="this.style.color='var(--text-muted, #64748b)'; this.style.borderColor='var(--border-color, #cbd5e1)';">
                                                <span class="material-symbols-outlined" style="font-size: 18px;">edit</span>
                                            </a>
                                        ` : ''}
                                    </div>
                                `}
                            </div>
                        `;
                    }).join('')}
                    ${(group.memberNames || []).filter(Boolean).filter(m => !(group.leaderNames || []).includes(m)).map(member => {
                        const detail = membersDetailMap[member.trim().toLowerCase()];
                        return `
                            <div style="display: flex; align-items: center; justify-content: space-between; padding: 16px 24px; border-radius: 16px; border: 1px solid var(--border-color, #e2e8f0); background: var(--card-bg, #fff); transition: all 0.2s ease;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(0,0,0,0.04)'; this.style.borderColor='var(--admin-orange, #d17d39)';" onmouseout="this.style.transform='none'; this.style.boxShadow='none'; this.style.borderColor='var(--border-color, #e2e8f0)';">
                                <div style="display: flex; align-items: center; gap: 16px;">
                                    ${canManage ? `
                                        <input type="checkbox" class="remove-member-checkbox" data-name="${this.escapeHtml(member)}" data-role="member" style="width: 18px; height: 18px; cursor: pointer; accent-color: #ef4444;">
                                    ` : ''}
                                    <div style="width: 40px; height: 40px; border-radius: 50%; background: #0f172a; color: white; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 15px; flex-shrink: 0; box-shadow: 0 3px 8px rgba(15,23,42,0.15);">
                                        ${member.charAt(0).toUpperCase()}
                                    </div>
                                    <div style="display: flex; flex-direction: column;">
                                        <div style="font-weight: 700; font-size: 15px; color: var(--text-color, #0f172a);">${this.escapeHtml(member)}</div>
                                        ${detail && (detail.email || detail.phone) ? `
                                            <div style="font-size: 12.5px; color: var(--text-muted, #64748b); margin-top: 4px; display: flex; gap: 16px; align-items: center; flex-wrap: wrap;">
                                                ${detail.email ? `
                                                    <span style="display: inline-flex; align-items: center; gap: 6px;">
                                                        <span class="material-symbols-outlined" style="font-size: 15px; opacity: 0.7; display: block;">mail</span>
                                                        <a href="mailto:${this.escapeHtml(detail.email)}" style="color: inherit; text-decoration: none; font-weight: 500;">${this.escapeHtml(detail.email)}</a>
                                                    </span>
                                                ` : ''}
                                                ${detail.phone ? `
                                                    <span style="display: inline-flex; align-items: center; gap: 6px;">
                                                        <span class="material-symbols-outlined" style="font-size: 15px; opacity: 0.7; display: block;">call</span>
                                                        <a href="tel:${this.escapeHtml(detail.phone)}" style="color: inherit; text-decoration: none; font-weight: 500;">${this.escapeHtml(detail.phone)}</a>
                                                    </span>
                                                ` : ''}
                                            </div>
                                        ` : ''}
                                    </div>
                                </div>
                                ${canManage ? `
                                    <div style="display: flex; align-items: center; gap: 8px;">
                                        <select class="member-role-select" data-name="${this.escapeHtml(member)}" data-current-role="member" style="font-size: 12.5px; font-weight: 600; border: 1px solid var(--border-color, #cbd5e1); border-radius: 12px; padding: 6px 14px; background: var(--bg-muted, #f8fafc); color: var(--text-muted, #64748b); cursor: pointer; outline: none; transition: all 0.2s; box-shadow: 0 1px 2px rgba(0,0,0,0.03);">
                                            <option value="leader">★ ${this.t('groups.groupLeder')}</option>
                                            <option value="member" selected>${this.t('groups.groupMedlem')}</option>
                                        </select>
                                        ${this.isAdmin && detail && detail.contactId ? `
                                            <a href="/admin/admin-kommunikasjon.html?edit=${this.escapeHtml(detail.contactId)}" target="_blank" title="Endre kontaktinformasjon" style="display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 50%; border: 1px solid var(--border-color, #cbd5e1); color: var(--text-muted, #64748b); background: var(--bg-muted, #f8fafc); cursor: pointer; transition: all 0.15s ease;" onmouseover="this.style.color='var(--admin-orange, #d17d39)'; this.style.borderColor='var(--admin-orange, #d17d39)';" onmouseout="this.style.color='var(--text-muted, #64748b)'; this.style.borderColor='var(--border-color, #cbd5e1)';">
                                                <span class="material-symbols-outlined" style="font-size: 18px;">edit</span>
                                            </a>
                                        ` : ''}
                                    </div>
                                ` : `
                                    <div style="display: flex; align-items: center; gap: 8px;">
                                        <div style="font-size: 11.5px; color: var(--text-muted, #64748b); font-weight: 700; background: var(--bg-muted, #f1f5f9); padding: 4px 10px; border-radius: 12px;">
                                            ${this.t('groups.groupMedlem')}
                                        </div>
                                        ${this.isAdmin && detail && detail.contactId ? `
                                            <a href="/admin/admin-kommunikasjon.html?edit=${this.escapeHtml(detail.contactId)}" target="_blank" title="Endre kontaktinformasjon" style="display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 50%; border: 1px solid var(--border-color, #cbd5e1); color: var(--text-muted, #64748b); background: var(--bg-muted, #f8fafc); cursor: pointer; transition: all 0.15s ease;" onmouseover="this.style.color='var(--admin-orange, #d17d39)'; this.style.borderColor='var(--admin-orange, #d17d39)';" onmouseout="this.style.color='var(--text-muted, #64748b)'; this.style.borderColor='var(--border-color, #cbd5e1)';">
                                                <span class="material-symbols-outlined" style="font-size: 18px;">edit</span>
                                            </a>
                                        ` : ''}
                                    </div>
                                `}
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;

        tabContainer.querySelector('#btn-open-contacts-modal')?.addEventListener('click', () => {
            this.openContactsModal(group);
        });

        if (canManage) {
            const checkboxes = tabContainer.querySelectorAll('.remove-member-checkbox');
            const removeBtn = tabContainer.querySelector('#btn-remove-selected-members');
            const selectAllCb = tabContainer.querySelector('#checkbox-select-all-members');

            selectAllCb?.addEventListener('change', (e) => {
                const checked = e.target.checked;
                checkboxes.forEach(cb => {
                    cb.checked = checked;
                });
                if (removeBtn) {
                    removeBtn.style.display = checked && checkboxes.length > 0 ? 'inline-flex' : 'none';
                }
            });

            checkboxes.forEach(cb => {
                cb.addEventListener('change', () => {
                    const checkedCount = Array.from(checkboxes).filter(c => c.checked).length;
                    if (removeBtn) {
                        removeBtn.style.display = checkedCount > 0 ? 'inline-flex' : 'none';
                    }
                    if (selectAllCb) {
                        selectAllCb.checked = checkedCount === checkboxes.length;
                        selectAllCb.indeterminate = checkedCount > 0 && checkedCount < checkboxes.length;
                    }
                });
            });

            removeBtn?.addEventListener('click', async () => {
                const selected = Array.from(checkboxes)
                    .filter(c => c.checked)
                    .map(c => ({
                        name: c.dataset.name,
                        role: c.dataset.role
                    }));

                if (selected.length === 0) return;

                const confirmMsg = selected.length === 1 
                    ? `Er du sikker på at du vil fjerne ${selected[0].name} fra gruppen?`
                    : `Er du sikker på at du vil fjerne ${selected.length} valgte personer fra gruppen?`;

                if (!confirm(confirmMsg)) return;

                try {
                    const db = firebase.firestore();
                    const groupRef = db.collection('groups').doc(group.id);

                    // Filter local arrays
                    let updatedMembers = [...(group.memberNames || [])];
                    let updatedLeaders = [...(group.leaderNames || [])];

                    selected.forEach(p => {
                        if (p.role === 'leader') {
                            updatedLeaders = updatedLeaders.filter(n => n !== p.name);
                        }
                        updatedMembers = updatedMembers.filter(n => n !== p.name);
                    });

                    const updatedCount = updatedMembers.length;

                    // Update Firestore group doc
                    await groupRef.update({
                        memberNames: updatedMembers,
                        leaderNames: updatedLeaders,
                        memberCount: updatedCount,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });

                    // Update local memory object
                    group.memberNames = updatedMembers;
                    group.leaderNames = updatedLeaders;
                    group.memberCount = updatedCount;

                    // Clean up groupMembers collection
                    const selectedNamesList = selected.map(p => p.name);
                    const membersSnap = await db.collection('groupMembers')
                        .where('groupId', '==', group.id)
                        .get();

                    const batch = db.batch();
                    let hasDocsToDelete = false;
                    membersSnap.forEach(doc => {
                        if (selectedNamesList.includes(doc.data().name)) {
                            batch.delete(doc.ref);
                            hasDocsToDelete = true;
                        }
                    });

                    if (hasDocsToDelete) {
                        await batch.commit();
                    }

                    alert(selected.length === 1 ? "Personen ble fjernet." : "De valgte personene ble fjernet.");
                    
                    // Re-render members list
                    this.renderHubMembers(tabContainer);
                } catch (err) {
                    console.error("Error removing members:", err);
                    alert("Feil ved fjerning av personer: " + err.message);
                }
            });

            // Bind endre rolle event lyttere
            tabContainer.querySelectorAll('.member-role-select').forEach(select => {
                select.addEventListener('change', async (e) => {
                    const name = e.target.dataset.name;
                    const currentRole = e.target.dataset.currentRole;
                    const newRole = e.target.value;
                    
                    const confirmMsg = `Er du sikker på at du vil endre rollen til ${name} fra ${currentRole === 'leader' ? 'Gruppeleder' : 'Medlem'} til ${newRole === 'leader' ? 'Gruppeleder' : 'Medlem'}?`;
                    if (confirm(confirmMsg)) {
                        await this.handleUpdateMemberRole(name, currentRole, newRole, tabContainer);
                    } else {
                        e.target.value = currentRole;
                    }
                });
            });
        }
    }

    async handleUpdateMemberRole(name, currentRole, newRole, tabContainer) {
        if (currentRole === newRole) return;

        const group = this.activeGroup;
        if (!group) return;

        try {
            const db = firebase.firestore();
            const groupRef = db.collection('groups').doc(group.id);

            let updatedLeaders = [...(group.leaderNames || [])];
            let updatedMembers = [...(group.memberNames || [])];

            let leaderUids = [...(group.leaderUids || [])];
            let memberUids = [...(group.memberUids || [])];

            // 1. Oppdater navn-matriser
            if (newRole === 'leader') {
                updatedMembers = updatedMembers.filter(m => m !== name);
                if (!updatedLeaders.includes(name)) {
                    updatedLeaders.push(name);
                }
            } else {
                updatedLeaders = updatedLeaders.filter(m => m !== name);
                if (!updatedMembers.includes(name)) {
                    updatedMembers.push(name);
                }
            }

            // 2. Søk etter samsvarende UID i users-samlingen
            let targetUid = null;
            try {
                const userQuery = await db.collection('users')
                    .where('displayName', '==', name)
                    .limit(1)
                    .get();
                if (!userQuery.empty) {
                    targetUid = userQuery.docs[0].id;
                }
            } catch (err) {
                console.warn("[Groups] Kunne ikke søke etter bruker-UID:", err);
            }

            // 3. Oppdater UID-matriser
            if (targetUid) {
                if (newRole === 'leader') {
                    if (!leaderUids.includes(targetUid)) {
                        leaderUids.push(targetUid);
                    }
                } else {
                    leaderUids = leaderUids.filter(u => u !== targetUid);
                }
            }

            // Beregn nytt antall medlemmer
            const uniqueNames = Array.from(new Set([...updatedMembers, ...updatedLeaders]));
            const newCount = uniqueNames.length || memberUids.length;

            const payload = {
                leaderNames: updatedLeaders,
                memberNames: updatedMembers,
                memberCount: newCount,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            if (group.leaderUids !== undefined || leaderUids.length > 0) {
                payload.leaderUids = leaderUids;
            }
            if (group.memberUids !== undefined || memberUids.length > 0) {
                payload.memberUids = memberUids;
            }

            await groupRef.update(payload);

            // 4. Oppdater lokal minnetilstand
            group.leaderNames = updatedLeaders;
            group.memberNames = updatedMembers;
            group.leaderUids = leaderUids;
            group.memberUids = memberUids;
            group.memberCount = newCount;

            alert("Rollen ble endret.");
            this.renderHubMembers(tabContainer);

        } catch (err) {
            console.error("Error updating member role:", err);
            alert("Feil ved endring av rolle: " + err.message);
        }
    }

    renderHubChat(tabContainer) {
        const group = this.activeGroup;
        const waBannerHtml = group.whatsappUrl ? `
            <div style="background: linear-gradient(135deg, #128c7e 0%, #075e54 100%); color: white; padding: 14px 20px; display: flex; align-items: center; justify-content: space-between; gap: 16px; border-bottom: 1px solid rgba(0,0,0,0.1); flex-wrap: wrap;">
                <div style="display: flex; align-items: center; gap: 12px; min-width: 250px;">
                    <div style="background: rgba(255,255,255,0.15); width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="white">
                            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.725-1.458L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.863-9.748.002-2.607-1.012-5.059-2.859-6.91-1.847-1.851-4.3-2.87-6.906-2.87-5.438 0-9.863 4.37-9.866 9.749-.001 1.813.493 3.59 1.426 5.148l-1.002 3.661 3.768-.973zm13.102-7.391c-.269-.134-1.593-.787-1.839-.877-.247-.09-.427-.134-.607.134-.18.269-.696.877-.853 1.055-.157.18-.314.202-.583.067-.27-.134-1.14-.422-2.172-1.341-.803-.715-1.346-1.597-1.503-1.866-.157-.269-.017-.415.118-.549.121-.122.269-.314.404-.471.134-.157.18-.27.27-.449.09-.18.045-.337-.022-.471-.067-.134-.607-1.46-.831-2.001-.219-.527-.46-.454-.63-.463-.162-.008-.347-.01-.533-.01-.186 0-.489.07-.746.353-.258.28-.985.963-.985 2.348 0 1.385 1.01 2.721 1.15 2.901.14.18 1.988 3.037 4.814 4.253.673.29 1.2.463 1.61.592.677.215 1.294.185 1.782.112.543-.081 1.593-.651 1.817-1.28.225-.63.225-1.17.157-1.28-.068-.113-.247-.202-.516-.337z"/>
                        </svg>
                    </div>
                    <div>
                        <h4 style="margin: 0; font-size: 13.5px; font-weight: 700; color: white;">WhatsApp Gruppechat</h4>
                        <p style="margin: 2px 0 0 0; font-size: 11.5px; color: rgba(255,255,255,0.9); line-height: 1.3;">Bli med i smågruppens chat på WhatsApp.</p>
                    </div>
                </div>
                <a href="${group.whatsappUrl}" target="_blank" rel="noopener noreferrer" style="background: #25d366; color: white; text-decoration: none; padding: 7px 14px; border-radius: 8px; font-size: 12.5px; font-weight: 700; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 3px 8px rgba(0,0,0,0.15); transition: background-color 0.15s ease, transform 0.15s ease;">
                    <span class="material-symbols-outlined" style="font-size: 16px; display: block;">open_in_new</span>
                    Åpne WhatsApp
                </a>
            </div>
        ` : '';

        tabContainer.innerHTML = `
            <div style="background: var(--card-bg, #fff); border-radius: 16px; border: 1px solid var(--border-color, #e2e8f0); height: 500px; display: flex; flex-direction: column; overflow: hidden;">
                ${waBannerHtml}
                
                <!-- Chat Feed -->
                <div id="group-chat-feed" style="flex: 1; padding: 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 14px;">
                    <div style="text-align: center; color: #94a3b8; font-size: 13px; margin: auto;">${this.t('groups.chatLoading')}</div>
                </div>

                <!-- Chat Input Form -->
                <form id="group-chat-form" style="display: flex; gap: 10px; padding: 14px 20px; border-top: 1px solid var(--border-color, #f1f5f9); background: var(--bg-muted, #f8fafc);">
                    <input type="text" id="chat-msg-input" placeholder="Skriv en melding, et bønneemne eller hilsen..." required style="flex: 1; padding: 12px 16px; border-radius: 20px; border: 1px solid var(--border-color, #cbd5e1); background: var(--input-bg, #fff);">
                    <button type="submit" style="padding: 10px 20px; border-radius: 20px; background: var(--admin-orange, #d17d39); color: white; border: none; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px;">
                        <span class="material-symbols-outlined" style="font-size: 18px;">send</span> Send
                    </button>
                </form>
            </div>
        `;

        this.listenToGroupMessages(tabContainer.querySelector('#group-chat-feed'));

        tabContainer.querySelector('#group-chat-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const input = tabContainer.querySelector('#chat-msg-input');
            const msg = input.value.trim();
            if (!msg) return;

            input.value = '';
            await this.sendGroupMessage(msg);
        });
    }

    listenToGroupMessages(feedContainer) {
        if (this.messagesListener) this.messagesListener();

        const db = firebase.firestore();
        this.messagesListener = db.collection('groups').doc(this.activeGroup.id)
            .collection('messages')
            .orderBy('createdAt', 'asc')
            .limitToLast(50)
            .onSnapshot(snap => {
                if (snap.empty) {
                    feedContainer.innerHTML = `
                        <div style="text-align: center; color: #94a3b8; font-size: 14px; margin: auto;">
                            💬 Ingen meldinger i gruppen ennå. Bli den første til å skrive en hilsen!
                        </div>
                    `;
                    return;
                }

                const uid = firebase.auth().currentUser?.uid;
                let html = '';
                snap.forEach(doc => {
                    const m = doc.data();
                    const isMine = m.senderUid === uid;
                    const dateStr = m.createdAt ? new Date(m.createdAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

                    html += `
                        <div style="display: flex; flex-direction: column; align-items: ${isMine ? 'flex-end' : 'flex-start'}; max-width: 80%; align-self: ${isMine ? 'flex-end' : 'flex-start'};">
                            <span style="font-size: 11px; font-weight: 600; opacity: 0.6; margin-bottom: 2px;">${this.escapeHtml(m.senderName || 'Medlem')} • ${dateStr}</span>
                            <div style="padding: 10px 16px; border-radius: 16px; font-size: 14px; line-height: 1.4; ${isMine ? 'background: var(--admin-orange, #d17d39); color: white; border-bottom-right-radius: 4px;' : 'background: var(--bg-muted, #f1f5f9); color: inherit; border-bottom-left-radius: 4px;'}">
                                ${this.escapeHtml(m.content)}
                            </div>
                        </div>
                    `;
                });
                feedContainer.innerHTML = html;
                feedContainer.scrollTop = feedContainer.scrollHeight;
            }, err => {
                console.error("Chat listener error:", err);
            });
    }

    async sendGroupMessage(content) {
        const currentUser = firebase.auth().currentUser;
        if (!currentUser) return;

        try {
            const db = firebase.firestore();
            await db.collection('groups').doc(this.activeGroup.id)
                .collection('messages')
                .add({
                    senderUid: currentUser.uid,
                    senderName: currentUser.displayName || 'HKM Medlem',
                    content: content,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
        } catch (err) {
            console.error("Error sending message:", err);
        }
    }

    async renderHubEvents(tabContainer) {
        const uid = firebase.auth().currentUser?.uid;
        const isLeader = this.checkIsLeader(this.activeGroup);
        const isAdmin = this.isAdmin;

        tabContainer.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 16px;">
                ${(isLeader || isAdmin) ? `
                    <div style="display: flex; justify-content: flex-end; margin-bottom: 8px;">
                        <button type="button" id="btn-create-event" style="display: inline-flex; align-items: center; gap: 6px; padding: 10px 18px; border-radius: 10px; font-weight: 600; font-size: 14px; background: var(--admin-orange, #d17d39); color: white; border: none; cursor: pointer; transition: transform 0.2s ease;">
                            <span class="material-symbols-outlined" style="font-size: 20px;">add</span>
                            <span>${this.t('groups.eventsCreate')}</span>
                        </button>
                    </div>
                ` : ''}
                <div id="hub-events-list" style="display: flex; flex-direction: column; gap: 12px;">
                    <div style="text-align: center; padding: 30px; color: var(--text-muted, #64748b);">${this.t('groups.modalLoading')}</div>
                </div>
            </div>
        `;

        // Bind create button
        tabContainer.querySelector('#btn-create-event')?.addEventListener('click', () => {
            this.openEventModal();
        });

        // Load events from Firestore
        try {
            const db = firebase.firestore();
            const snap = await db.collection('groupEvents')
                .where('groupId', '==', this.selectedGroupId)
                .get();

            let fetchedEvents = [];
            snap.forEach(doc => {
                fetchedEvents.push({ id: doc.id, ...doc.data() });
            });

            fetchedEvents.sort((a, b) => {
                const dateA = a.createdAt ? a.createdAt.toMillis() : 0;
                const dateB = b.createdAt ? b.createdAt.toMillis() : 0;
                return dateA - dateB;
            });

            const listEl = tabContainer.querySelector('#hub-events-list');
            if (!listEl) return;

            if (fetchedEvents.length === 0) {
                listEl.innerHTML = `
                    <div style="text-align: center; padding: 40px; background: var(--card-bg, #fff); border-radius: 16px; border: 1px solid var(--border-color, #e2e8f0); color: var(--text-muted, #64748b);">
                        <span class="material-symbols-outlined" style="font-size: 48px; opacity: 0.5; margin-bottom: 8px; display: block;">calendar_today</span>
                        ${this.t('groups.eventsNoEvents')}
                    </div>
                `;
                return;
            }

            listEl.innerHTML = fetchedEvents.map(evt => {
                const canEdit = isLeader || isAdmin;
                return `
                    <div style="background: var(--card-bg, #fff); padding: 20px; border-radius: 16px; border: 1px solid var(--border-color, #e2e8f0); display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 16px;">
                        <div>
                            <span style="font-size: 12px; font-weight: 700; color: var(--admin-orange, #d17d39); text-transform: uppercase;">${this.escapeHtml(evt.date)} kl. ${this.escapeHtml(evt.time)}</span>
                            <h4 style="margin: 4px 0; font-size: 16px; font-weight: 700;">${this.escapeHtml(evt.title)}</h4>
                            ${(() => {
                                const loc = this.formatLocation(evt.location || this.activeGroup.location || '');
                                return loc ? `<p style="margin: 0; font-size: 13px; opacity: 0.8;">📍 ${loc}</p>` : '';
                            })()}
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                            <button type="button" class="btn-rsvp" data-evt-id="${evt.id}" data-status="yes" style="padding: 8px 14px; border-radius: 10px; background: #ecfdf5; color: #166534; border: 1px solid #bbf7d0; font-weight: 600; font-size: 13px; cursor: pointer;">
                                ${this.t('groups.eventsRsvpYes')}
                            </button>
                            <button type="button" class="btn-rsvp" data-evt-id="${evt.id}" data-status="no" style="padding: 8px 14px; border-radius: 10px; background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; font-weight: 600; font-size: 13px; cursor: pointer;">
                                ${this.t('groups.eventsRsvpNo')}
                            </button>

                            ${canEdit ? `
                                <button type="button" class="btn-edit-event" data-evt-id="${evt.id}" style="padding: 8px 14px; border-radius: 10px; background: #f1f5f9; color: var(--text-color, #1e293b); border: 1px solid var(--border-color, #cbd5e1); font-weight: 600; font-size: 13px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;">
                                    <span class="material-symbols-outlined" style="font-size: 16px;">edit</span>
                                    <span>${this.t('groups.eventsEdit')}</span>
                                </button>
                                <button type="button" class="btn-delete-event" data-evt-id="${evt.id}" style="padding: 8px 14px; border-radius: 10px; background: rgba(239,68,68,0.1); color: #ef4444; border: none; font-weight: 600; font-size: 13px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;">
                                    <span class="material-symbols-outlined" style="font-size: 16px;">delete</span>
                                    <span>${this.t('groups.eventsDelete')}</span>
                                </button>
                            ` : ''}
                        </div>
                    </div>
                `;
            }).join('');

            // Bind RSVP buttons
            listEl.querySelectorAll('.btn-rsvp').forEach(btn => {
                btn.addEventListener('click', () => {
                    const status = btn.dataset.status;
                    alert(status === 'yes' ? "Du har meldt deg på denne samlingen ✓" : "Du har meldt fra at du ikke kan komme.");
                });
            });

            // Bind Edit & Delete buttons
            listEl.querySelectorAll('.btn-edit-event').forEach(btn => {
                btn.addEventListener('click', () => {
                    const evtId = btn.dataset.evtId;
                    const evt = fetchedEvents.find(e => e.id === evtId);
                    if (evt) this.openEventModal(evt);
                });
            });

            listEl.querySelectorAll('.btn-delete-event').forEach(btn => {
                btn.addEventListener('click', () => {
                    const evtId = btn.dataset.evtId;
                    const evt = fetchedEvents.find(e => e.id === evtId);
                    if (evt) this.handleDeleteEvent(evt.id, evt.title);
                });
            });

        } catch (err) {
            console.error("Error loading events:", err);
            const listEl = tabContainer.querySelector('#hub-events-list');
            if (listEl) listEl.innerHTML = '<div style="text-align: center; color: #ef4444; padding: 20px;">Kunne ikke laste samlinger.</div>';
        }
    }

    async renderHubResources(tabContainer) {
        const uid = firebase.auth().currentUser?.uid;
        const isLeader = this.checkIsLeader(this.activeGroup);
        const isAdmin = this.isAdmin;

        tabContainer.innerHTML = `
            <div style="background: var(--card-bg, #fff); padding: 24px; border-radius: 16px; border: 1px solid var(--border-color, #e2e8f0);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                    <h3 style="margin: 0; font-size: 18px; font-weight: 700;">${this.t('groups.resourcesTitle')}</h3>
                    ${(isLeader || isAdmin) ? `
                        <button type="button" id="btn-create-resource" style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 10px; font-weight: 600; font-size: 13px; background: var(--admin-orange, #d17d39); color: white; border: none; cursor: pointer;">
                            <span class="material-symbols-outlined" style="font-size: 18px;">add</span>
                            <span>${this.t('groups.resourcesCreate')}</span>
                        </button>
                    ` : ''}
                </div>
                <div id="hub-resources-list" style="display: flex; flex-direction: column; gap: 12px;">
                    <div style="text-align: center; padding: 20px; color: var(--text-muted, #64748b);">${this.t('groups.modalLoading')}</div>
                </div>
            </div>
        `;

        // Bind create button
        tabContainer.querySelector('#btn-create-resource')?.addEventListener('click', () => {
            this.openResourceModal();
        });

        // Load resources from Firestore
        try {
            const db = firebase.firestore();
            const snap = await db.collection('groupResources')
                .where('groupId', '==', this.selectedGroupId)
                .get();

            let fetchedRes = [];
            snap.forEach(doc => {
                fetchedRes.push({ id: doc.id, ...doc.data() });
            });

            fetchedRes.sort((a, b) => {
                const dateA = a.createdAt ? a.createdAt.toMillis() : 0;
                const dateB = b.createdAt ? b.createdAt.toMillis() : 0;
                return dateA - dateB;
            });

            const listEl = tabContainer.querySelector('#hub-resources-list');
            if (!listEl) return;

            if (fetchedRes.length === 0) {
                listEl.innerHTML = `
                    <div style="text-align: center; padding: 30px; color: var(--text-muted, #64748b);">
                        ${this.t('groups.resourcesNoRes')}
                    </div>
                `;
                return;
            }

            listEl.innerHTML = fetchedRes.map(res => {
                const canEdit = isLeader || isAdmin;
                let icon = 'description';
                if (res.type === 'PDF') icon = 'picture_as_pdf';
                else if (res.type === 'Lenke') icon = 'link';
                else if (res.type === 'Video') icon = 'video_library';

                return `
                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; border-radius: 12px; background: var(--bg-muted, #f8fafc); border: 1px solid var(--border-color, #e2e8f0); gap: 16px; flex-wrap: wrap;">
                        <div style="display: flex; align-items: center; gap: 12px; flex: 1; min-width: 200px;">
                            <span class="material-symbols-outlined" style="color: var(--admin-orange, #d17d39); font-size: 24px;">${icon}</span>
                            <div>
                                <div style="font-weight: 600; font-size: 14px;">${this.escapeHtml(res.title)}</div>
                                <span style="font-size: 11px; opacity: 0.6; font-weight: 600;">${this.escapeHtml(res.type)}</span>
                            </div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <a href="${this.escapeHtml(res.url)}" target="_blank" style="padding: 6px 14px; border-radius: 8px; background: var(--admin-orange, #d17d39); color: white; text-decoration: none; font-size: 13px; font-weight: 600;">
                                ${this.t('groups.resourcesOpen')}
                            </a>
                            ${canEdit ? `
                                <button type="button" class="btn-edit-resource" data-res-id="${res.id}" style="padding: 6px 12px; border-radius: 8px; background: #f1f5f9; color: var(--text-color, #1e293b); border: 1px solid var(--border-color, #cbd5e1); font-weight: 600; font-size: 13px; cursor: pointer; display: inline-flex; align-items: center;">
                                    <span class="material-symbols-outlined" style="font-size: 16px;">edit</span>
                                </button>
                                <button type="button" class="btn-delete-resource" data-res-id="${res.id}" style="padding: 6px 12px; border-radius: 8px; background: rgba(239,68,68,0.1); color: #ef4444; border: none; font-weight: 600; font-size: 13px; cursor: pointer; display: inline-flex; align-items: center;">
                                    <span class="material-symbols-outlined" style="font-size: 16px;">delete</span>
                                </button>
                            ` : ''}
                        </div>
                    </div>
                `;
            }).join('');

            // Bind Edit & Delete buttons
            listEl.querySelectorAll('.btn-edit-resource').forEach(btn => {
                btn.addEventListener('click', () => {
                    const resId = btn.dataset.resId;
                    const res = fetchedRes.find(r => r.id === resId);
                    if (res) this.openResourceModal(res);
                });
            });

            listEl.querySelectorAll('.btn-delete-resource').forEach(btn => {
                btn.addEventListener('click', () => {
                    const resId = btn.dataset.resId;
                    const res = fetchedRes.find(r => r.id === resId);
                    if (res) this.handleDeleteResource(res.id, res.title);
                });
            });

        } catch (err) {
            console.error("Error loading resources:", err);
            const listEl = tabContainer.querySelector('#hub-resources-list');
            if (listEl) listEl.innerHTML = '<div style="text-align: center; color: #ef4444; padding: 20px;">Kunne ikke laste ressurser.</div>';
        }
    }

    openEventModal(eventToEdit = null) {
        const modal = this.container.querySelector('#group-event-modal');
        const form = this.container.querySelector('#group-event-form');
        const titleEl = this.container.querySelector('#group-event-modal-title');
        if (!modal || !form) return;

        form.reset();
        if (eventToEdit) {
            titleEl.textContent = 'Rediger samling';
            form.querySelector('#group-event-form-id').value = eventToEdit.id;
            form.querySelector('#group-event-title-input').value = eventToEdit.title || '';
            form.querySelector('#group-event-date-input').value = eventToEdit.date || '';
            form.querySelector('#group-event-time-input').value = eventToEdit.time || '';
            form.querySelector('#group-event-location-input').value = eventToEdit.location || '';
        } else {
            titleEl.textContent = 'Opprett ny samling';
            form.querySelector('#group-event-form-id').value = '';
            form.querySelector('#group-event-location-input').value = this.activeGroup.location || '';
        }

        modal.style.display = 'flex';
    }

    async handleSaveEvent() {
        const form = this.container.querySelector('#group-event-form');
        const id = form.querySelector('#group-event-form-id').value;
        
        const payload = {
            groupId: this.selectedGroupId,
            title: form.querySelector('#group-event-title-input').value.trim(),
            date: form.querySelector('#group-event-date-input').value.trim(),
            time: form.querySelector('#group-event-time-input').value.trim(),
            location: form.querySelector('#group-event-location-input').value.trim(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        try {
            const db = firebase.firestore();
            if (id) {
                await db.collection('groupEvents').doc(id).update(payload);
            } else {
                payload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                await db.collection('groupEvents').add(payload);
            }

            this.container.querySelector('#group-event-modal').style.display = 'none';
            // Reload the events tab
            this.renderHubEvents(this.container.querySelector('#hub-tab-body'));
        } catch (err) {
            console.error("Error saving event:", err);
            alert("Kunne ikke lagre samling: " + err.message);
        }
    }

    async handleDeleteEvent(eventId, eventTitle) {
        if (this.app && typeof this.app.showCustomConfirm === 'function') {
            this.app.showCustomConfirm({
                title: 'Slett samling',
                message: `Er du sikker på at du vil slette samlingen "${eventTitle}"?`,
                confirmText: 'Slett',
                cancelText: 'Avbryt',
                isDanger: true,
                onConfirm: async () => {
                    await this.performDeleteEvent(eventId);
                }
            });
        } else {
            if (confirm(`Er du sikker på at du vil slette samlingen "${eventTitle}"?`)) {
                await this.performDeleteEvent(eventId);
            }
        }
    }

    async performDeleteEvent(eventId) {
        try {
            const db = firebase.firestore();
            await db.collection('groupEvents').doc(eventId).delete();
            this.renderHubEvents(this.container.querySelector('#hub-tab-body'));
        } catch (err) {
            console.error("Error deleting event:", err);
            alert("Kunne ikke slette samling: " + err.message);
        }
    }

    openResourceModal(resToEdit = null) {
        const modal = this.container.querySelector('#group-resource-modal');
        const form = this.container.querySelector('#group-resource-form');
        const titleEl = this.container.querySelector('#group-resource-modal-title');
        if (!modal || !form) return;

        form.reset();
        const statusEl = form.querySelector('#resource-upload-status');
        if (statusEl) statusEl.textContent = '';
        const fileInput = form.querySelector('#group-resource-file-input');
        if (fileInput) fileInput.value = '';
        if (resToEdit) {
            titleEl.textContent = 'Rediger resurs';
            form.querySelector('#group-resource-form-id').value = resToEdit.id;
            form.querySelector('#group-resource-title-input').value = resToEdit.title || '';
            form.querySelector('#group-resource-url-input').value = resToEdit.url || '';
            form.querySelector('#group-resource-type-input').value = resToEdit.type || 'PDF';
        } else {
            titleEl.textContent = 'Legg til resurs';
            form.querySelector('#group-resource-form-id').value = '';
        }

        modal.style.display = 'flex';
    }

    async handleSaveResource() {
        const form = this.container.querySelector('#group-resource-form');
        const id = form.querySelector('#group-resource-form-id').value;

        const payload = {
            groupId: this.selectedGroupId,
            title: form.querySelector('#group-resource-title-input').value.trim(),
            url: form.querySelector('#group-resource-url-input').value.trim(),
            type: form.querySelector('#group-resource-type-input').value,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        try {
            const db = firebase.firestore();
            if (id) {
                await db.collection('groupResources').doc(id).update(payload);
            } else {
                payload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                await db.collection('groupResources').add(payload);
            }

            this.container.querySelector('#group-resource-modal').style.display = 'none';
            // Reload resources tab
            this.renderHubResources(this.container.querySelector('#hub-tab-body'));
        } catch (err) {
            console.error("Error saving resource:", err);
            alert("Kunne ikke lagre resurs: " + err.message);
        }
    }

    async handleDeleteResource(resId, resTitle) {
        if (this.app && typeof this.app.showCustomConfirm === 'function') {
            this.app.showCustomConfirm({
                title: 'Slett resurs',
                message: `Er du sikker på at du vil slette resursen "${resTitle}"?`,
                confirmText: 'Slett',
                cancelText: 'Avbryt',
                isDanger: true,
                onConfirm: async () => {
                    await this.performDeleteResource(resId);
                }
            });
        } else {
            if (confirm(`Er du sikker på at du vil slette resursen "${resTitle}"?`)) {
                await this.performDeleteResource(resId);
            }
        }
    }

    async performDeleteResource(resId) {
        try {
            const db = firebase.firestore();
            await db.collection('groupResources').doc(resId).delete();
            this.renderHubResources(this.container.querySelector('#hub-tab-body'));
        } catch (err) {
            console.error("Error deleting resource:", err);
            alert("Kunne ikke slette resurs: " + err.message);
        }
    }

    /* ═══════════════════════════════════════════════════════════════════════════
       MODAL & GROUP MANAGEMENT (Create, Edit, Duplicate)
       ═══════════════════════════════════════════════════════════════════════════ */
    openCreateModal(groupToEdit = null) {
        const modal = this.container.querySelector('#group-form-modal');
        const form = this.container.querySelector('#group-form');
        const titleEl = this.container.querySelector('#group-modal-title');

        if (!modal || !form) return;

        // Populate categories dynamically
        const categorySelect = form.querySelector('#group-category-input');
        if (categorySelect) {
            categorySelect.innerHTML = this.categories.map(cat => `
                <option value="${this.escapeHtml(cat)}">${this.escapeHtml(this.translateCategory(cat))}</option>
            `).join('');
        }

        form.reset();
        const previewEl = form.querySelector('#group-image-preview');
        const defaultImg = 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=150&q=80';
        if (groupToEdit) {
            titleEl.textContent = 'Rediger gruppe';
            form.querySelector('#group-form-id').value = groupToEdit.id;
            form.querySelector('#group-name-input').value = groupToEdit.name || '';
            form.querySelector('#group-category-input').value = groupToEdit.category || (this.categories[0] || 'Husfellesskap');
            form.querySelector('#group-schedule-input').value = groupToEdit.meetingSchedule || '';
            form.querySelector('#group-location-input').value = groupToEdit.location || '';
            form.querySelector('#group-zoom-id-input').value = groupToEdit.zoomMeetingId || '';
            form.querySelector('#group-zoom-passcode-input').value = groupToEdit.zoomPasscode || '';
            form.querySelector('#group-description-input').value = groupToEdit.description || '';
            form.querySelector('#group-whatsapp-input').value = groupToEdit.whatsappUrl || '';
            form.querySelector('#group-policy-input').value = groupToEdit.joinPolicy || 'open';
            form.querySelector('#group-image-input').value = groupToEdit.imageUrl || '';
            if (previewEl) previewEl.src = groupToEdit.imageUrl || defaultImg;
        } else {
            titleEl.textContent = 'Opprett ny gruppe';
            form.querySelector('#group-form-id').value = '';
            form.querySelector('#group-zoom-id-input').value = '';
            form.querySelector('#group-zoom-passcode-input').value = '';
            form.querySelector('#group-whatsapp-input').value = '';
            form.querySelector('#group-image-input').value = '';
            if (previewEl) previewEl.src = defaultImg;
        }
        // Bind rich formatting toolbar buttons
        const toolbarButtons = modal.querySelectorAll('.toolbar-btn');
        const textarea = form.querySelector('#group-description-input');
        toolbarButtons.forEach(btn => {
            btn.onclick = (e) => {
                e.preventDefault();
                const format = btn.dataset.format;
                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;
                const text = textarea.value;
                const selected = text.substring(start, end);
                
                let replacement = '';
                if (format === 'bold') {
                    replacement = `**${selected || 'fet tekst'}**`;
                } else if (format === 'italic') {
                    replacement = `*${selected || 'kursiv tekst'}*`;
                } else if (format === 'list') {
                    replacement = `\n- ${selected || 'punkt'}`;
                } else if (format === 'link') {
                    replacement = `[${selected || 'lenketekst'}](https://)`;
                }
                
                textarea.value = text.substring(0, start) + replacement + text.substring(end);
                textarea.focus();
                textarea.setSelectionRange(start + replacement.length, start + replacement.length);
            };
        });

        modal.style.display = 'flex';
    }

    openDuplicateModal(group) {
        const modal = this.container.querySelector('#group-duplicate-modal');
        if (!modal) return;

        modal.querySelector('#duplicate-source-id').value = group.id;
        modal.querySelector('#duplicate-name-input').value = `${group.name} - Nytt semester`;
        modal.style.display = 'flex';
    }

    async handleSaveGroup() {
        const form = this.container.querySelector('#group-form');
        const id = form.querySelector('#group-form-id').value;
        const currentUser = firebase.auth().currentUser;
        const uid = currentUser ? currentUser.uid : 'demo-user';
        const name = currentUser ? (currentUser.displayName || 'Thomas Knutsen') : 'Thomas Knutsen';

        const payload = {
            name: form.querySelector('#group-name-input').value.trim(),
            category: form.querySelector('#group-category-input').value,
            meetingSchedule: form.querySelector('#group-schedule-input').value.trim(),
            location: form.querySelector('#group-location-input').value.trim(),
            zoomMeetingId: form.querySelector('#group-zoom-id-input').value.trim(),
            zoomPasscode: form.querySelector('#group-zoom-passcode-input').value.trim(),
            description: form.querySelector('#group-description-input').value.trim(),
            whatsappUrl: form.querySelector('#group-whatsapp-input').value.trim(),
            joinPolicy: form.querySelector('#group-policy-input').value,
            imageUrl: form.querySelector('#group-image-input').value.trim() || 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=800&q=80',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        try {
            const db = firebase.firestore();
            if (id) {
                await db.collection('groups').doc(id).update(payload);
            } else {
                payload.leaderUids = [uid];
                payload.leaderNames = [name];
                payload.memberUids = [uid];
                payload.memberCount = 1;
                payload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                await db.collection('groups').add(payload);
            }

            this.container.querySelector('#group-form-modal').style.display = 'none';
            await this.loadGroupsData();
        } catch (err) {
            console.error("Error saving group:", err);
            alert("Kunne ikke lagre gruppe: " + err.message);
        }
    }

    async handleDuplicateGroup() {
        const sourceId = this.container.querySelector('#duplicate-source-id').value;
        const newName = this.container.querySelector('#duplicate-name-input').value.trim();

        const source = this.groups.find(g => g.id === sourceId);
        if (!source || !newName) return;

        try {
            const db = firebase.firestore();
            const copyPayload = {
                ...source,
                name: newName,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            delete copyPayload.id;

            const ref = await db.collection('groups').add(copyPayload);
            this.container.querySelector('#group-duplicate-modal').style.display = 'none';
            alert(`Suksess! Gruppen ble duplisert som "${newName}".`);
            this.selectedGroupId = ref.id;
            this.currentView = 'hub';
            await this.loadGroupsData();
        } catch (err) {
            console.error("Error duplicating group:", err);
            alert("Kunne ikke duplisere gruppe: " + err.message);
        }
    }

    /* ═══════════════════════════════════════════════════════════════════════════
       CONTACTS IMPORT (ADMIN ONLY)
       ═══════════════════════════════════════════════════════════════════════════ */
    async openContactsModal(targetGroup = null) {
        if (!this.isAdmin) {
            alert("Kun administratorer kan hente personer fra kontakter.");
            return;
        }

        this.activeGroupForContacts = targetGroup || this.groups.find(g => g.id === this.selectedGroupId) || this.activeGroup;
        if (!this.activeGroupForContacts) {
            alert("Vennligst velg en gruppe først.");
            return;
        }

        const modal = this.container.querySelector('#group-contacts-modal');
        const container = this.container.querySelector('#contacts-list-container');
        if (!modal || !container) return;

        modal.style.display = 'flex';
        container.innerHTML = '<div style="text-align: center; padding: 24px; color: var(--text-muted, #64748b);">Laster inn kontakter fra CRM...</div>';

        try {
            const db = firebase.firestore();
            const snapshot = await db.collection('contacts').get();
            this.allContactsList = [];
            const tagsSet = new Set();
            snapshot.forEach(doc => {
                const data = doc.data();
                const name = data.displayName || data.name || `${data.firstName || ''} ${data.lastName || ''}`.trim() || data.email || 'Uten navn';
                this.allContactsList.push({
                    id: doc.id,
                    name,
                    email: data.email || '',
                    phone: data.phone || '',
                    ...data
                });

                // Extract unique tags/labels
                if (Array.isArray(data.tags)) {
                    data.tags.forEach(t => t && tagsSet.add(String(t).trim()));
                } else if (data.tags) {
                    tagsSet.add(String(data.tags).trim());
                }
            });

            // Populate the tag filter dropdown
            const tagFilterSelect = this.container.querySelector('#contacts-tag-filter');
            if (tagFilterSelect) {
                tagFilterSelect.innerHTML = '<option value="ALL">Alle etiketter</option>';
                Array.from(tagsSet).sort().forEach(tag => {
                    const opt = document.createElement('option');
                    opt.value = tag;
                    opt.textContent = tag;
                    tagFilterSelect.appendChild(opt);
                });
            }

            this.selectedContactIds.clear();
            this.renderContactsList();
        } catch (err) {
            console.error("Feil ved henting av kontakter:", err);
            container.innerHTML = `<div style="text-align: center; padding: 24px; color: #ef4444;">Kunne ikke laste kontakter: ${this.escapeHtml(err.message)}</div>`;
        }
    }

    renderContactsList() {
        const container = this.container.querySelector('#contacts-list-container');
        const queryInput = this.container.querySelector('#contacts-search-input');
        const tagFilterSelect = this.container.querySelector('#contacts-tag-filter');
        if (!container) return;

        const query = (queryInput ? queryInput.value : '').toLowerCase().trim();
        const selectedTag = tagFilterSelect ? tagFilterSelect.value : 'ALL';

        const filtered = this.allContactsList.filter(c => {
            // Text query filter
            const matchesQuery = c.name.toLowerCase().includes(query) ||
                c.email.toLowerCase().includes(query) ||
                c.phone.toLowerCase().includes(query);

            // Label/tag filter
            let matchesTag = true;
            if (selectedTag !== 'ALL') {
                if (Array.isArray(c.tags)) {
                    matchesTag = c.tags.map(t => String(t).trim()).includes(selectedTag);
                } else if (c.tags) {
                    matchesTag = String(c.tags).trim() === selectedTag;
                } else {
                    matchesTag = false;
                }
            }

            return matchesQuery && matchesTag;
        });

        if (filtered.length === 0) {
            container.innerHTML = '<div style="text-align: center; padding: 24px; color: var(--text-muted, #64748b);">Ingen kontakter funnet.</div>';
            return;
        }

        container.innerHTML = filtered.map(contact => {
            const isChecked = this.selectedContactIds.has(contact.id);
            return `
                <label style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border-radius: 10px; background: var(--bg-muted, #f8fafc); border: 1px solid var(--border-color, #e2e8f0); cursor: pointer; transition: background 0.15s ease;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <input type="checkbox" class="contact-checkbox" data-cid="${contact.id}" ${isChecked ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: var(--admin-orange, #d17d39); cursor: pointer;">
                        <div style="width: 34px; height: 34px; border-radius: 50%; background: var(--admin-orange, #d17d39); color: white; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px;">
                            ${(contact.name.charAt(0) || 'K').toUpperCase()}
                        </div>
                        <div>
                            <div style="font-weight: 600; font-size: 14px; color: var(--text-color, #0f172a);">${this.escapeHtml(contact.name)}</div>
                            <div style="font-size: 12px; opacity: 0.7; color: var(--text-muted, #64748b);">${this.escapeHtml(contact.email)}${contact.phone ? ` • ${this.escapeHtml(contact.phone)}` : ''}</div>
                        </div>
                    </div>
                </label>
            `;
        }).join('');

        container.querySelectorAll('.contact-checkbox').forEach(box => {
            box.addEventListener('change', () => {
                const cid = box.dataset.cid;
                if (box.checked) {
                    this.selectedContactIds.add(cid);
                } else {
                    this.selectedContactIds.delete(cid);
                }
            });
        });
    }

    async submitImportContacts() {
        if (!this.activeGroupForContacts) return;
        if (this.selectedContactIds.size === 0) {
            alert("Vennligst velg minst én kontakt.");
            return;
        }

        const rolePicker = this.container.querySelector('#contacts-role-picker');
        const roleType = rolePicker ? rolePicker.value : 'member';
        const group = this.activeGroupForContacts;

        const selectedContacts = this.allContactsList.filter(c => this.selectedContactIds.has(c.id));
        const selectedNames = selectedContacts.map(c => c.name);

        try {
            const db = firebase.firestore();
            const groupRef = db.collection('groups').doc(group.id);

            if (roleType === 'leader') {
                const updatedLeaders = Array.from(new Set([...(group.leaderNames || []), ...selectedNames]));
                await groupRef.update({
                    leaderNames: updatedLeaders,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                group.leaderNames = updatedLeaders;
            } else {
                const updatedMembers = Array.from(new Set([...(group.memberNames || []), ...selectedNames]));
                const updatedCount = updatedMembers.length;
                await groupRef.update({
                    memberNames: updatedMembers,
                    memberCount: updatedCount,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                group.memberNames = updatedMembers;
                group.memberCount = updatedCount;
            }

            // Create individual groupMembers docs
            const batch = db.batch();
            selectedContacts.forEach(contact => {
                const memRef = db.collection('groupMembers').doc(`${group.id}_${contact.id}`);
                batch.set(memRef, {
                    groupId: group.id,
                    contactId: contact.id,
                    name: contact.name,
                    email: contact.email || '',
                    phone: contact.phone || '',
                    role: roleType,
                    addedAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
            });
            await batch.commit();

            this.container.querySelector('#group-contacts-modal').style.display = 'none';
            alert(`Suksess! ${selectedContacts.length} kontakter ble lagt til i "${group.name}".`);

            await this.loadGroupsData();
            if (this.currentView === 'hub') {
                this.renderCurrentView();
            }
        } catch (err) {
            console.error("Feil ved import av kontakter til gruppe:", err);
            alert("Kunne ikke legge til kontakter: " + err.message);
        }
    }

    /* ═══════════════════════════════════════════════════════════════════════════
       SEND EMAIL TO GROUP
       ═══════════════════════════════════════════════════════════════════════════ */
    openGroupEmailModal(targetGroup = null) {
        const group = targetGroup || this.activeGroup || this.groups.find(g => g.id === this.selectedGroupId);
        if (!group) {
            alert("Velg en gruppe først.");
            return;
        }

        const modal = this.container.querySelector('#group-email-modal');
        const subtitle = this.container.querySelector('#group-email-subtitle');
        if (!modal) return;

        if (subtitle) {
            subtitle.textContent = `Send e-postmelding til alle medlemmer i "${group.name}"`;
        }

        modal.style.display = 'flex';
    }

    async handleSendGroupEmail() {
        const group = this.activeGroup || this.groups.find(g => g.id === this.selectedGroupId);
        if (!group) return;

        const subjectInput = this.container.querySelector('#group-email-subject');
        const messageInput = this.container.querySelector('#group-email-message');
        const submitBtn = this.container.querySelector('#submit-group-email-btn');

        const subject = subjectInput ? subjectInput.value.trim() : '';
        const message = messageInput ? messageInput.value.trim() : '';

        if (!subject || !message) {
            alert("Vennligst fyll ut både emne og melding.");
            return;
        }

        let recipients = [];
        try {
            const db = firebase.firestore();
            const memDocs = await db.collection('groupMembers').where('groupId', '==', group.id).get();
            memDocs.forEach(d => {
                const data = d.data();
                if (data.email) recipients.push({ name: data.name || '', email: data.email });
            });
        } catch (e) {
            console.warn("Mangler direkte groupMembers:", e);
        }

        if (recipients.length === 0) {
            (this.allContactsList || []).forEach(c => {
                if (c.email && (group.memberNames || []).some(m => m.toLowerCase().includes((c.name || '').toLowerCase()))) {
                    recipients.push({ name: c.name, email: c.email });
                }
            });
        }

        if (recipients.length === 0 && firebase.auth().currentUser?.email) {
            recipients.push({
                name: firebase.auth().currentUser.displayName || 'Gruppeleder',
                email: firebase.auth().currentUser.email
            });
        }

        if (recipients.length === 0) {
            alert("Fant ingen e-postadresser registrert for gruppens medlemmer. Legg til kontakter eller medlemmer med e-post først.");
            return;
        }

        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner" style="width: 16px; height: 16px;"></span> <span>Sender e-post...</span>';

        try {
            const token = await firebase.auth().currentUser.getIdToken();
            const response = await fetch('/sendGroupEmail', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    groupId: group.id,
                    groupName: group.name,
                    recipients,
                    subject,
                    message
                })
            });

            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.error || data.message || "Kunne ikke sende e-post");
            }

            alert(`Suksess! E-post ble sendt til ${data.successCount || recipients.length} medlemmer i gruppen "${group.name}".`);
            this.container.querySelector('#group-email-modal').style.display = 'none';
            if (subjectInput) subjectInput.value = '';
            if (messageInput) messageInput.value = '';
        } catch (err) {
            console.error("Feil ved utsending av e-post til gruppen:", err);
            alert("Kunne ikke sende e-post: " + err.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size: 18px;">send</span> <span>Send e-post til gruppen</span>';
        }
    }

    escapeHtml(str) {
        return (str || '').replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }
}
