// address search methods for AdminManager.
export function createMethods34({ firebaseService, adminUtils, showErrorUI }) {
  return {
    injectAddressSearchStyles() {
      if (document.getElementById("admin-address-search-styles")) return;
      const style = document.createElement("style");
      style.id = "admin-address-search-styles";
      style.textContent = `
            .admin-address-search-results {
                position: absolute;
                left: 0;
                right: 0;
                background: var(--admin-surface, #ffffff) !important;
                border: 1px solid var(--admin-border, #e2e8f0) !important;
                border-radius: 8px !important;
                box-shadow: 0 4px 12px rgba(0,0,0,0.1) !important;
                z-index: 1000 !important;
                max-height: 280px !important;
                overflow-y: auto !important;
                margin-top: 8px !important;
                transform: translateZ(0) !important;
                backface-visibility: hidden !important;
                display: none;
                padding: 8px !important;
            }
            .admin-address-result-row {
                display: flex !important;
                align-items: center !important;
                gap: 16px !important;
                width: 100% !important;
                border: none !important;
                background: none !important;
                padding: 8px 16px !important;
                color: var(--admin-text, #1a202c) !important;
                text-align: left !important;
                cursor: pointer !important;
                border-radius: 8px !important;
                transition: background 0.2s ease, transform 0.1s ease !important;
                box-sizing: border-box !important;
            }
            .admin-address-result-row:hover {
                background: var(--admin-surface-muted, #f7fafc) !important;
            }
            .admin-address-result-row:active {
                transform: scale(0.99) !important;
            }
            .admin-address-result-row .material-symbols-outlined {
                color: #d17d39 !important;
                font-size: 24px !important;
                flex-shrink: 0 !important;
            }
            .admin-address-result-row span {
                display: flex !important;
                flex-direction: column !important;
                gap: 8px !important;
                min-width: 0 !important;
            }
            .admin-address-result-row strong {
                font-size: 14px !important;
                font-weight: 600 !important;
                color: #2d3748 !important;
            }
            .admin-address-result-row small {
                font-size: 12px !important;
                color: #718096 !important;
            }
        `;
      document.head.appendChild(style);
    },

    _getPhoneCountries() {
      return [
        ["NO", "+47", "Norge"],
        ["SE", "+46", "Sverige"],
        ["DK", "+45", "Danmark"],
        ["FI", "+358", "Finland"],
        ["IS", "+354", "Island"],
        ["GB", "+44", "Storbritannia"],
        ["US", "+1", "USA"],
        ["CA", "+1", "Canada"],
        ["AF", "+93", "Afghanistan"],
        ["AL", "+355", "Albania"],
        ["DZ", "+213", "Algerie"],
        ["AS", "+1684", "Amerikansk Samoa"],
        ["AD", "+376", "Andorra"],
        ["AO", "+244", "Angola"],
        ["AI", "+1264", "Anguilla"],
        ["AG", "+1268", "Antigua og Barbuda"],
        ["AR", "+54", "Argentina"],
        ["AM", "+374", "Armenia"],
        ["AW", "+297", "Aruba"],
        ["AU", "+61", "Australia"],
        ["AT", "+43", "Østerrike"],
        ["AZ", "+994", "Aserbajdsjan"],
        ["BS", "+1242", "Bahamas"],
        ["BH", "+973", "Bahrain"],
        ["BD", "+880", "Bangladesh"],
        ["BB", "+1246", "Barbados"],
        ["BY", "+375", "Belarus"],
        ["BE", "+32", "Belgia"],
        ["BZ", "+501", "Belize"],
        ["BJ", "+229", "Benin"],
        ["BM", "+1441", "Bermuda"],
        ["BT", "+975", "Bhutan"],
        ["BO", "+591", "Bolivia"],
        ["BA", "+387", "Bosnia-Hercegovina"],
        ["BW", "+267", "Botswana"],
        ["BR", "+55", "Brasil"],
        ["IO", "+246", "Britisk territorium i Indiahavet"],
        ["VG", "+1284", "De britiske jomfruøyene"],
        ["BN", "+673", "Brunei"],
        ["BG", "+359", "Bulgaria"],
        ["BF", "+226", "Burkina Faso"],
        ["BI", "+257", "Burundi"],
        ["KH", "+855", "Kambodsja"],
        ["CM", "+237", "Kamerun"],
        ["CV", "+238", "Kapp Verde"],
        ["KY", "+1345", "Caymanøyene"],
        ["CF", "+236", "Den sentralafrikanske republikk"],
        ["TD", "+235", "Tsjad"],
        ["CL", "+56", "Chile"],
        ["CN", "+86", "Kina"],
        ["CX", "+61", "Christmasøya"],
        ["CC", "+61", "Kokosøyene"],
        ["CO", "+57", "Colombia"],
        ["KM", "+269", "Komorene"],
        ["CG", "+242", "Kongo-Brazzaville"],
        ["CD", "+243", "Kongo-Kinshasa"],
        ["CK", "+682", "Cookøyene"],
        ["CR", "+506", "Costa Rica"],
        ["CI", "+225", "Elfenbenskysten"],
        ["HR", "+385", "Kroatia"],
        ["CU", "+53", "Cuba"],
        ["CW", "+599", "Curaçao"],
        ["CY", "+357", "Kypros"],
        ["CZ", "+420", "Tsjekkia"],
        ["DJ", "+253", "Djibouti"],
        ["DM", "+1767", "Dominica"],
        ["DO", "+1809", "Den dominikanske republikk"],
        ["EC", "+593", "Ecuador"],
        ["EG", "+20", "Egypt"],
        ["SV", "+503", "El Salvador"],
        ["GQ", "+240", "Ekvatorial-Guinea"],
        ["ER", "+291", "Eritrea"],
        ["EE", "+372", "Estland"],
        ["SZ", "+268", "Eswatini"],
        ["ET", "+251", "Etiopia"],
        ["FK", "+500", "Falklandsøyene"],
        ["FO", "+298", "Færøyene"],
        ["FJ", "+679", "Fiji"],
        ["FR", "+33", "Frankrike"],
        ["GF", "+594", "Fransk Guyana"],
        ["PF", "+689", "Fransk Polynesia"],
        ["GA", "+241", "Gabon"],
        ["GM", "+220", "Gambia"],
        ["GE", "+995", "Georgia"],
        ["DE", "+49", "Tyskland"],
        ["GH", "+233", "Ghana"],
        ["GI", "+350", "Gibraltar"],
        ["GR", "+30", "Hellas"],
        ["GL", "+299", "Grønland"],
        ["GD", "+1473", "Grenada"],
        ["GP", "+590", "Guadeloupe"],
        ["GU", "+1671", "Guam"],
        ["GT", "+502", "Guatemala"],
        ["GG", "+44", "Guernsey"],
        ["GN", "+224", "Guinea"],
        ["GW", "+245", "Guinea-Bissau"],
        ["GY", "+592", "Guyana"],
        ["HT", "+509", "Haiti"],
        ["HN", "+504", "Honduras"],
        ["HK", "+852", "Hongkong"],
        ["HU", "+36", "Ungarn"],
        ["IN", "+91", "India"],
        ["ID", "+62", "Indonesia"],
        ["IR", "+98", "Iran"],
        ["IQ", "+964", "Irak"],
        ["IE", "+353", "Irland"],
        ["IM", "+44", "Man"],
        ["IL", "+972", "Israel"],
        ["IT", "+39", "Italia"],
        ["JM", "+1876", "Jamaica"],
        ["JP", "+81", "Japan"],
        ["JE", "+44", "Jersey"],
        ["JO", "+962", "Jordan"],
        ["KZ", "+7", "Kasakhstan"],
        ["KE", "+254", "Kenya"],
        ["KI", "+686", "Kiribati"],
        ["XK", "+383", "Kosovo"],
        ["KW", "+965", "Kuwait"],
        ["KG", "+996", "Kirgisistan"],
        ["LA", "+856", "Laos"],
        ["LV", "+371", "Latvia"],
        ["LB", "+961", "Libanon"],
        ["LS", "+266", "Lesotho"],
        ["LR", "+231", "Liberia"],
        ["LY", "+218", "Libya"],
        ["LI", "+423", "Liechtenstein"],
        ["LT", "+370", "Litauen"],
        ["LU", "+352", "Luxembourg"],
        ["MO", "+853", "Macao"],
        ["MG", "+261", "Madagaskar"],
        ["MW", "+265", "Malawi"],
        ["MY", "+60", "Malaysia"],
        ["MV", "+960", "Maldivene"],
        ["ML", "+223", "Mali"],
        ["MT", "+356", "Malta"],
        ["MH", "+692", "Marshalløyene"],
        ["MQ", "+596", "Martinique"],
        ["MR", "+222", "Mauritania"],
        ["MU", "+230", "Mauritius"],
        ["YT", "+262", "Mayotte"],
        ["MX", "+52", "Mexico"],
        ["FM", "+691", "Mikronesia"],
        ["MD", "+373", "Moldova"],
        ["MC", "+377", "Monaco"],
        ["MN", "+976", "Mongolia"],
        ["ME", "+382", "Montenegro"],
        ["MS", "+1664", "Montserrat"],
        ["MA", "+212", "Marokko"],
        ["MZ", "+258", "Mosambik"],
        ["MM", "+95", "Myanmar"],
        ["NA", "+264", "Namibia"],
        ["NR", "+674", "Nauru"],
        ["NP", "+977", "Nepal"],
        ["NL", "+31", "Nederland"],
        ["NC", "+687", "Ny-Caledonia"],
        ["NZ", "+64", "New Zealand"],
        ["NI", "+505", "Nicaragua"],
        ["NE", "+227", "Niger"],
        ["NG", "+234", "Nigeria"],
        ["NU", "+683", "Niue"],
        ["NF", "+672", "Norfolkøya"],
        ["KP", "+850", "Nord-Korea"],
        ["MK", "+389", "Nord-Makedonia"],
        ["MP", "+1670", "Nord-Marianene"],
        ["OM", "+968", "Oman"],
        ["PK", "+92", "Pakistan"],
        ["PW", "+680", "Palau"],
        ["PS", "+970", "Palestina"],
        ["PA", "+507", "Panama"],
        ["PG", "+675", "Papua Ny-Guinea"],
        ["PY", "+595", "Paraguay"],
        ["PE", "+51", "Peru"],
        ["PH", "+63", "Filippinene"],
        ["PL", "+48", "Polen"],
        ["PT", "+351", "Portugal"],
        ["PR", "+1787", "Puerto Rico"],
        ["QA", "+974", "Qatar"],
        ["RE", "+262", "Réunion"],
        ["RO", "+40", "Romania"],
        ["RU", "+7", "Russland"],
        ["RW", "+250", "Rwanda"],
        ["WS", "+685", "Samoa"],
        ["SM", "+378", "San Marino"],
        ["ST", "+239", "São Tomé og Príncipe"],
        ["SA", "+966", "Saudi-Arabia"],
        ["SN", "+221", "Senegal"],
        ["RS", "+381", "Serbia"],
        ["SC", "+248", "Seychellene"],
        ["SL", "+232", "Sierra Leone"],
        ["SG", "+65", "Singapore"],
        ["SX", "+1721", "Sint Maarten"],
        ["SK", "+421", "Slovakia"],
        ["SI", "+386", "Slovenia"],
        ["SB", "+677", "Salomonøyene"],
        ["SO", "+252", "Somalia"],
        ["ZA", "+27", "Sør-Afrika"],
        ["KR", "+82", "Sør-Korea"],
        ["SS", "+211", "Sør-Sudan"],
        ["ES", "+34", "Spania"],
      ];
    },

    _wireAdminAddressAutocomplete(
      addressInputId,
      resultsId,
      statusId,
      formSelector,
    ) {
      const input = document.getElementById(addressInputId);
      const resultsEl = document.getElementById(resultsId);
      const statusEl = document.getElementById(statusId);
      if (!input || !resultsEl || !statusEl) return;

      // Clear suggestions list on click outside
      const closeSuggestions = (e) => {
        if (e.target !== input && !resultsEl.contains(e.target)) {
          resultsEl.style.display = "none";
        }
      };
      document.removeEventListener("click", closeSuggestions);
      document.addEventListener("click", closeSuggestions);

      input.addEventListener("input", () => {
        clearTimeout(this._adminAddressSearchTimer);
        const query = input.value.trim();

        if (query.length < 3) {
          this._adminAddressSuggestions = [];
          resultsEl.innerHTML = "";
          resultsEl.style.display = "none";
          statusEl.textContent = "";
          return;
        }

        statusEl.textContent = "Søker etter adresser...";
        this._adminAddressSearchTimer = setTimeout(() => {
          this.searchAdminGlobalAddresses(
            query,
            resultsId,
            statusId,
            formSelector,
          );
        }, 350);
      });

      // Reposition and show/hide if input gets focused and has suggestions
      input.addEventListener("focus", () => {
        if (resultsEl.children.length > 0) {
          resultsEl.style.display = "block";
        }
      });
    },

    async searchAdminGlobalAddresses(query, resultsId, statusId, formSelector) {
      const resultsEl = document.getElementById(resultsId);
      const statusEl = document.getElementById(statusId);
      if (!resultsEl || !statusEl) return;

      try {
        if (this._adminAddressSearchAbort)
          this._adminAddressSearchAbort.abort();
        this._adminAddressSearchAbort = new AbortController();

        const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=6`;
        const response = await fetch(url, {
          signal: this._adminAddressSearchAbort.signal,
        });
        if (!response.ok)
          throw new Error(`Address search failed: ${response.status}`);

        const data = await response.json();
        this._adminAddressSuggestions = (data.features || [])
          .map((feature) => this._formatPhotonAddress(feature.properties || {}))
          .filter((item) => item.label);

        if (!this._adminAddressSuggestions.length) {
          resultsEl.innerHTML = "";
          resultsEl.style.display = "none";
          statusEl.textContent = "Ingen adresseforslag.";
          return;
        }

        statusEl.textContent = "";
        resultsEl.style.display = "block";
        resultsEl.innerHTML = this._adminAddressSuggestions
          .map(
            (item, index) => `
                <button class="admin-address-result-row" type="button" data-address-index="${index}">
                    <span class="material-symbols-outlined">location_on</span>
                    <span>
                        <strong>${this.escapeHtml(item.address || item.label)}</strong>
                        <small>${this.escapeHtml([item.zip, item.city, item.country].filter(Boolean).join(", "))}</small>
                    </span>
                </button>
            `,
          )
          .join("");

        resultsEl
          .querySelectorAll(".admin-address-result-row")
          .forEach((row) => {
            row.addEventListener("click", (e) => {
              e.preventDefault();
              e.stopPropagation();
              this.selectAdminAddressSuggestion(
                Number(row.dataset.addressIndex),
                resultsId,
                statusId,
                formSelector,
              );
            });
          });
      } catch (error) {
        if (error.name === "AbortError") return;
        console.error("searchAdminGlobalAddresses:", error);
        resultsEl.innerHTML = "";
        resultsEl.style.display = "none";
        statusEl.textContent = "Kunne ikke hente adresseforslag.";
      }
    },

    selectAdminAddressSuggestion(index, resultsId, statusId, formSelector) {
      const item = (this._adminAddressSuggestions || [])[index];
      if (!item) return;

      const form = document.querySelector(formSelector);
      if (!form) return;

      const addressInput = form.querySelector('[name="address"]');
      const zipInput = form.querySelector('[name="zip"]');
      const cityInput = form.querySelector('[name="city"]');
      const countryInput = form.querySelector('[name="country"]');
      const resultsEl = document.getElementById(resultsId);
      const statusEl = document.getElementById(statusId);

      if (addressInput) addressInput.value = item.address || item.label;
      if (zipInput) zipInput.value = item.zip || "";
      if (cityInput) cityInput.value = item.city || "";
      if (countryInput) countryInput.value = item.country || "";
      if (resultsEl) {
        resultsEl.innerHTML = "";
        resultsEl.style.display = "none";
      }
      if (statusEl)
        statusEl.textContent = item.country
          ? `Valgt: ${item.country}`
          : "Adresse valgt.";
    },
  };
}
