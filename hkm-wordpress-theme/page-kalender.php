<?php
/**
 * Template Name: Kalender
 */

get_header(); ?>

<main>
    <section class="page-hero"
        style="background-image: linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url('https://images.unsplash.com/photo-1506784983877-45594efa4cbe?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80'); padding-top: 160px;">
        <div class="container">
            <div class="page-hero-content">
                <h1 class="page-title">
                    <?php the_title(); ?>
                </h1>
                <div class="breadcrumbs">
                    <a href="<?php echo home_url(); ?>">Hjem</a>
                    <i class="fas fa-chevron-right"></i>
                    <a href="<?php echo site_url('/arrangementer'); ?>">Arrangementer</a>
                    <i class="fas fa-chevron-right"></i>
                    <span>Kalender</span>
                </div>
            </div>
        </div>
    </section>

    <section class="calendar-section">
        <div class="container">
            <div class="calendar-container" data-cal-view="month">
                <div class="calendar-view-toggle">
                    <button class="cal-view-btn active" data-cal-view="month">Månedsvisning</button>
                    <button class="cal-view-btn" data-cal-view="agenda">Agenda</button>
                </div>

                <div class="calendar-header">
                    <h2 class="calendar-title" id="current-month-year">Månedskalender</h2>
                    <div class="calendar-nav">
                        <button class="cal-btn" id="prev-month"><i class="fas fa-chevron-left"></i></button>
                        <button class="cal-btn" id="today-btn"
                            style="width: auto; padding: 0 15px; border-radius: 20px; font-size: 13px; font-weight: 600;">I
                            dag</button>
                        <button class="cal-btn" id="next-month"><i class="fas fa-chevron-right"></i></button>
                    </div>
                </div>

                <div class="calendar-grid" id="calendar-grid">
                    <!-- Header days -->
                    <div class="cal-day-header">Man</div>
                    <div class="cal-day-header">Tir</div>
                    <div class="cal-day-header">Ons</div>
                    <div class="cal-day-header">Tor</div>
                    <div class="cal-day-header">Fre</div>
                    <div class="cal-day-header">Lør</div>
                    <div class="cal-day-header">Søn</div>

                    <!-- Calendar cells will be injected here -->
                </div>

                <div class="calendar-agenda-card">
                    <div class="calendar-agenda-header">
                        <div>
                            <h3 class="calendar-agenda-title">Agenda-oversikt</h3>
                        </div>
                    </div>
                    <ul class="calendar-agenda-list" id="calendar-agenda-list"></ul>
                </div>
            </div>
        </div>
    </section>

    <section class="calendar-section" style="padding-top: 20px;">
        <div class="container">
            <div class="section-header" style="margin-bottom: 30px; text-align: left;">
                <span class="section-label">Helligdager & høytider</span>
                <h2 class="section-title" style="font-size: 28px; margin-bottom: 10px;">Hvorfor markerer vi disse
                    dagene?</h2>
                <p class="section-description" style="margin: 0; max-width: 760px;">
                    Her finner du en kort forklaring på noen av de viktigste kristne høytidsdagene og norske
                    helligdagene som ofte påvirker kalenderen vår.
                </p>
            </div>

            <div class="values-grid">
                <div class="value-card">
                    <h3>1. nyttårsdag</h3>
                    <p>Første dag i det nye året. En dag for ettertanke, takk for året som ligger bak, og bønn for året
                        som kommer.</p>
                </div>
                <div class="value-card">
                    <h3>Palmesøndag</h3>
                    <p>Markerer Jesu inntog i Jerusalem, der folket hilste ham med palmegrener og ropte «Hosianna».
                        Innleder påskeuken.</p>
                </div>
                <div class="value-card">
                    <h3>Skjærtorsdag</h3>
                    <p>Til minne om Jesu siste måltid med disiplene, der han innstiftet nattverden og viste veien til
                        tjenende lederskap ved å vaske disiplenes føtter.</p>
                </div>
                <div class="value-card">
                    <h3>Langfredag</h3>
                    <p>Vi minnes Jesu lidelse og død på korset. En stille og alvorlig dag som peker på den store
                        kjærligheten Gud har vist oss.</p>
                </div>
                <div class="value-card">
                    <h3>1. påskedag</h3>
                    <p>Feiringen av Jesu oppstandelse. Denne dagen står i sentrum av den kristne tro og minner oss om
                        seier over synd, død og mørke.</p>
                </div>
                <div class="value-card">
                    <h3>2. påskedag</h3>
                    <p>Fortsetter gleden over oppstandelsen, og peker på møtene den oppstandne Jesus hadde med
                        disiplene.</p>
                </div>
                <div class="value-card">
                    <h3>Kristi himmelfartsdag</h3>
                    <p>Feirer at Jesus for opp til himmelen før Faderen, og at han fortsatt ber for oss og regjerer som
                        Herre.</p>
                </div>
                <div class="value-card">
                    <h3>1. pinsedag</h3>
                    <p>Til minne om at Den hellige ånd ble utøst over de første troende i Jerusalem. Pinsen blir ofte
                        kalt «kirkens fødselsdag».</p>
                </div>
                <div class="value-card">
                    <h3>2. pinsedag</h3>
                    <p>En forlengelse av pinsefeiringen, der fokuset fortsatt er på Den hellige ånds nærvær og gaver i
                        våre liv.</p>
                </div>
                <div class="value-card">
                    <h3>Arbeidernes dag (1. mai)</h3>
                    <p>Norsk offentlig fridag som hedrer arbeideres rettigheter. For mange også en dag for å be for
                        rettferdighet og gode arbeidsforhold.</p>
                </div>
                <div class="value-card">
                    <h3>Grunnlovsdagen (17. mai)</h3>
                    <p>Feiring av Norges grunnlov fra 1814. En festdag for frihet, fellesskap og takknemlighet for
                        landet vårt.</p>
                </div>
                <div class="value-card">
                    <h3>1. juledag</h3>
                    <p>Markerer selve juledagen og feirer at Guds Sønn ble født i verden. Fokus er på inkarnasjonen – at
                        Gud ble menneske.</p>
                </div>
                <div class="value-card">
                    <h3>2. juledag</h3>
                    <p>En roligere oppfølgingsdag i julen som gir rom for ettertanke, familie og hvile etter selve
                        høytidsdagen.</p>
                </div>
            </div>
        </div>
    </section>
</main>

<?php get_footer(); ?>