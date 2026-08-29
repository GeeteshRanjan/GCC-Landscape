/**
 * The HQ-location vocabulary the form offers.
 *
 * **Why this is code and not `taxonomy.hqCountries`.** That list is DERIVED FROM
 * THE COMPANIES — `buildTaxonomy(companies)` in the seed importer rebuilds it from
 * whatever the spreadsheet contains — so anything added to it by hand is silently
 * deleted by the next import. It also means something specific and useful: it is
 * the list of countries we have evidence about, which is exactly what peer
 * matching should keep using. Widening it would have blurred the one list that has
 * a meaning.
 *
 * So there are two lists doing two jobs, and the split is the point:
 *
 *   - `taxonomy.hqCountries` — where the companies in our data are headquartered.
 *     Unchanged, still derived, still what the matching sees.
 *   - this list — where a VISITOR may say they are headquartered. Every country,
 *     because a CIO who cannot find their own country in the dropdown has just been
 *     told the tool is not for them, which is the same failure that killed
 *     company-name autocomplete.
 *
 * **Nothing about peer matching changes, and nothing needed to.** HQ country is a
 * sort preference and never a filter — `matchPeers` uses it to order a set it has
 * already chosen on industry and business similarity. A visitor from a country with
 * no companies in the data simply contributes no ordering signal, and the existing
 * skew toward the countries that ARE represented is preserved rather than diluted.
 * The peer set they see is the same one they would have seen picking any other
 * unrepresented country, which is the honest outcome.
 *
 * **Spellings match the dataset exactly where they overlap**, which is why "USA",
 * "UK" and "UAE" appear in these short forms rather than in full, and why
 * "Scotland" is here at all — it is in the supplied data. A second spelling of a
 * country already in the taxonomy would put two entries in the dropdown for one
 * place and split it across the two tiers. A generator asserted the overlap is
 * empty; if you add to this list, keep that true.
 *
 * Alphabetical here, deliberately. The ORDER a visitor sees is not this order — it
 * is computed per request from how many companies each country actually has, so the
 * common ones rise on their own instead of being ranked by hand. See
 * `hqCountryOptions` in `screen1.ts`.
 */
export const HQ_COUNTRIES: readonly string[] = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola",
  "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria",
  "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus",
  "Belgium", "Belize", "Benin", "Bermuda", "Bhutan", "Bolivia",
  "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria",
  "Burkina Faso", "Burundi", "Cambodia", "Cameroon", "Canada", "Cape Verde",
  "Cayman Islands", "Central African Republic", "Chad", "Chile", "China",
  "Colombia", "Comoros", "Congo", "Costa Rica", "Croatia", "Cuba", "Cyprus",
  "Czech Republic", "Democratic Republic of the Congo", "Denmark", "Djibouti",
  "Dominica", "Dominican Republic", "Ecuador", "Egypt", "El Salvador",
  "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia", "Fiji",
  "Finland", "France", "Gabon", "Gambia", "Georgia", "Germany", "Ghana",
  "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana",
  "Haiti", "Honduras", "Hong Kong", "Hungary", "Iceland", "India", "Indonesia",
  "Iran", "Iraq", "Ireland", "Israel", "Italy", "Ivory Coast", "Jamaica",
  "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati", "Kosovo", "Kuwait",
  "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya",
  "Liechtenstein", "Lithuania", "Luxembourg", "Madagascar", "Malawi",
  "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania",
  "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia",
  "Montenegro", "Morocco", "Mozambique", "Myanmar", "Namibia", "Nauru",
  "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria",
  "North Korea", "North Macedonia", "Norway", "Oman", "Pakistan", "Palau",
  "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines",
  "Poland", "Portugal", "Qatar", "Romania", "Russia", "Rwanda",
  "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines",
  "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Scotland",
  "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia",
  "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Korea",
  "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden",
  "Switzerland", "Syria", "Taiwan", "Tajikistan", "Tanzania", "Thailand",
  "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey",
  "Turkmenistan", "Tuvalu", "UAE", "UK", "USA", "Uganda", "Ukraine", "Uruguay",
  "Uzbekistan", "Vanuatu", "Vatican City", "Venezuela", "Vietnam", "Yemen",
  "Zambia", "Zimbabwe"
] as const;
