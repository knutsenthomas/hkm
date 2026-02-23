<?php
/*
Template Name: Donasjoner
*/
get_header();
?>

<main>
    <!-- Page Hero -->
    <section class="page-hero"
        style="background-image: linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url('https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80');">
        <div class="container">
            <div class="page-hero-content">
                <h1 class="page-title">
                    <?php the_title(); ?>
                </h1>
                <div class="breadcrumbs">
                    <a href="<?php echo home_url(); ?>">Hjem</a>
                    <i class="fas fa-chevron-right"></i>
                    <span>Donasjoner</span>
                </div>
            </div>
        </div>
    </section>

    <!-- Donations Grid -->
    <section class="donations-page section">
        <div class="container">
            <div class="section-header">
                <span class="section-label">Støtt vårt arbeid</span>
                <h2 class="section-title">Våre aktive innsamlingsaksjoner</h2>
                <p class="section-description">Din gave utgjør en forskjell. Velg et prosjekt du ønsker å støtte og bli
                    med på å forandre liv.</p>
            </div>

            <div class="causes-grid">
                <!-- Dynamisk innhold fra Firebase (via JS) -->
                <!-- This content is populated by content-manager.js -->
            </div>
        </div>
    </section>


    <!-- Regular Donor Section -->
    <section class="regular-donor section" id="faste-givere" style="background: white;">
        <div class="container">
            <div class="section-header">
                <span class="section-label">Bli fast giver</span>
                <h2 class="section-title">Vær med på å skape varig endring</h2>
                <p class="section-description">Som fast giver er du med på å sikre forutsigbarhet i vårt arbeid,
                    slik at vi kan planlegge og gjennomføre flere prosjekter for Guds rike.</p>
            </div>

            <div
                style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 40px; margin-top: 50px;">
                <!-- Option 1: Vipps -->
                <div
                    style="background: #f8f9fa; padding: 40px; border-radius: 15px; text-align: center; border: 1px solid #eee;">
                    <div
                        style="width: 70px; height: 70px; background: #FF5B24; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 25px; color: white; font-size: 30px;">
                        <i class="fas fa-mobile-alt"></i>
                    </div>
                    <h3 style="margin-bottom: 15px;">Fast gave via Vipps</h3>
                    <p style="color: var(--text-light); margin-bottom: 25px;">Den enkleste måten å bli fast giver
                        på. Du oppretter en fast avtale direkte i Vipps-appen.</p>
                    <a href="https://vipps.no" target="_blank" class="btn btn-outline"
                        style="color: #FF5B24; border-color: #FF5B24;">Opprett i Vipps</a>
                </div>

                <!-- Option 2: AvtaleGiro -->
                <div
                    style="background: #f8f9fa; padding: 40px; border-radius: 15px; text-align: center; border: 1px solid #eee;">
                    <div
                        style="width: 70px; height: 70px; background: #2196F3; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 25px; color: white; font-size: 30px;">
                        <i class="fas fa-university"></i>
                    </div>
                    <h3 style="margin-bottom: 15px;">Bankoverføring</h3>
                    <p style="color: var(--text-light); margin-bottom: 25px;">Opprett et fast trekk i nettbanken din
                        til vår konto. Dette gir oss de laveste gebyrene.</p>
                    <div
                        style="background: white; padding: 15px; border-radius: 8px; font-weight: 700; color: var(--primary-orange); border: 1px dashed var(--primary-orange);">
                        Konto: 3000.66.08759
                    </div>
                </div>
            </div>

            <div style="margin-top: 60px; text-align: center; background: var(--bg-light); padding: 30px; border-radius: 15px;"
                id="skattefradrag">
                <h4 style="margin-bottom: 10px;"><i class="fas fa-info-circle"
                        style="margin-right: 10px; color: var(--primary-orange);"></i>Visste du at du får
                    skattefradrag?</h4>
                <p style="max-width: 800px; margin: 0 auto;">Gaver til His Kingdom Ministry gir rett til
                    skattefradrag dersom de samlede gavene i løpet av et kalenderår er på minst 500 kroner. For å få
                    fradrag må vi ha ditt fødselsnummer (11 siffer).</p>
            </div>
        </div>
    </section>

    <!-- Donation Form -->
    <section class="donation-form section" id="gi-gave"
        style="background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);">
        <div class="container">
            <div class="section-header">
                <span class="section-label">Gi gave</span>
                <h2 class="section-title">Støtt vårt arbeid</h2>
                <p class="section-description">Din gave gjør en reell forskjell. Velg beløp og betalingsmetode nedenfor.
                </p>
            </div>

            <div style="max-width: 700px; margin: 0 auto;">
                <form class="donation-form-content"
                    style="background: white; padding: 40px; border-radius: 15px; box-shadow: 0 10px 40px rgba(0,0,0,0.1);">
                    <!-- Amount Selection -->
                    <div style="margin-bottom: 30px;">
                        <label
                            style="display: block; font-weight: 600; margin-bottom: 15px; color: var(--text-dark);">Velg
                            beløp</label>
                        <div
                            style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px; margin-bottom: 15px;">
                            <button type="button" class="amount-btn" data-amount="100"
                                style="padding: 15px; border: 2px solid #e0e0e0; background: white; border-radius: 8px; cursor: pointer; font-weight: 600; transition: all 0.3s;">100
                                kr</button>
                            <button type="button" class="amount-btn" data-amount="250"
                                style="padding: 15px; border: 2px solid #e0e0e0; background: white; border-radius: 8px; cursor: pointer; font-weight: 600; transition: all 0.3s;">250
                                kr</button>
                            <button type="button" class="amount-btn" data-amount="500"
                                style="padding: 15px; border: 2px solid #e0e0e0; background: white; border-radius: 8px; cursor: pointer; font-weight: 600; transition: all 0.3s;">500
                                kr</button>
                            <button type="button" class="amount-btn" data-amount="1000"
                                style="padding: 15px; border: 2px solid #e0e0e0; background: white; border-radius: 8px; cursor: pointer; font-weight: 600; transition: all 0.3s;">1000
                                kr</button>
                        </div>
                        <input type="number" id="custom-amount" placeholder="Eller skriv inn eget beløp"
                            style="width: 100%; padding: 15px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 16px;">
                    </div>

                    <!-- Payment Method -->
                    <div style="margin-bottom: 30px;">
                        <label
                            style="display: block; font-weight: 600; margin-bottom: 15px; color: var(--text-dark);">Betalingsmetode</label>
                        <div
                            style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px;">
                            <label
                                style="display: flex; align-items: center; padding: 15px; border: 2px solid #e0e0e0; border-radius: 8px; cursor: pointer; transition: all 0.3s;">
                                <input type="radio" name="payment-method" value="vipps" style="margin-right: 10px;">
                                <span style="font-weight: 600;"><i class="fas fa-mobile-alt"
                                        style="margin-right: 8px; color: #FF5B24;"></i>Vipps</span>
                            </label>
                            <label
                                style="display: flex; align-items: center; padding: 15px; border: 2px solid #e0e0e0; border-radius: 8px; cursor: pointer; transition: all 0.3s;">
                                <input type="radio" name="payment-method" value="card" style="margin-right: 10px;">
                                <span style="font-weight: 600;"><i class="fas fa-credit-card"
                                        style="margin-right: 8px; color: #4CAF50;"></i>Kort</span>
                            </label>
                            <label
                                style="display: flex; align-items: center; padding: 15px; border: 2px solid #e0e0e0; border-radius: 8px; cursor: pointer; transition: all 0.3s;">
                                <input type="radio" name="payment-method" value="bank" style="margin-right: 10px;">
                                <span style="font-weight: 600;"><i class="fas fa-university"
                                        style="margin-right: 8px; color: #2196F3;"></i>Bank</span>
                            </label>
                        </div>
                    </div>

                    <!-- Donor Information -->
                    <div style="margin-bottom: 30px;">
                        <label
                            style="display: block; font-weight: 600; margin-bottom: 15px; color: var(--text-dark);">Dine
                            opplysninger</label>
                        <div style="display: grid; gap: 15px;">
                            <input type="text" id="donor-name" placeholder="Fullt navn" required
                                style="width: 100%; padding: 15px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 16px;">
                            <input type="email" id="donor-email" placeholder="E-postadresse" required
                                style="width: 100%; padding: 15px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 16px;">
                            <input type="tel" id="donor-phone" placeholder="Mobilnummer" required
                                style="width: 100%; padding: 15px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 16px;">
                            <input type="text" id="donor-address" placeholder="Adresse"
                                style="width: 100%; padding: 15px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 16px;">
                            <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 15px;">
                                <input type="text" id="donor-zip" placeholder="Postnr"
                                    style="width: 100%; padding: 15px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 16px;">
                                <input type="text" id="donor-city" placeholder="Sted"
                                    style="width: 100%; padding: 15px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 16px;">
                            </div>
                            <textarea id="donor-message" placeholder="Melding (valgfritt)" rows="4"
                                style="width: 100%; padding: 15px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 16px; resize: vertical;"></textarea>
                        </div>
                    </div>

                    <!-- Submit Button -->
                    <button type="submit" class="btn btn-primary"
                        style="width: 100%; padding: 18px; font-size: 18px; font-weight: 600;">
                        <i class="fas fa-heart" style="margin-right: 10px;"></i>Gi gave nå
                    </button>

                    <p style="text-align: center; margin-top: 20px; color: var(--text-light); font-size: 14px;">
                        <i class="fas fa-lock" style="margin-right: 5px;"></i>Sikker betaling
                    </p>
                </form>
            </div>

            <!-- Stripe Checkout Container -->
            <div id="stripe-checkout-container">
                <h3>Fullfør betaling</h3>
                <div id="payment-element">
                    <!-- Stripe.js injects the Payment Element here -->
                </div>
                <button id="submit-payment" type="button">
                    <div class="spinner hidden" id="spinner"></div>
                    <span id="button-text">Fullfør betaling</span>
                </button>
                <div id="payment-message" class="hidden"></div>
            </div>
        </div>
    </section>

    <!-- Newsletter -->
    <section class="newsletter">
        <div class="container">
            <div class="newsletter-content">
                <h2 class="newsletter-title">Hold deg oppdatert</h2>
                <p class="newsletter-text">Meld deg på vårt nyhetsbrev for å få siste nytt direkte i din innboks.</p>

                <form class="newsletter-form">
                    <input type="email" class="newsletter-input" placeholder="Din e-postadresse" required>
                    <button type="submit" class="btn btn-primary">Abonner</button>
                </form>
            </div>
        </div>
    </section>
</main>

<?php get_footer(); ?>