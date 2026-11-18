/**
 * clinic.js
 * Prices and the free injury screen for the PT clinic.
 *
 * Treatment, soft-tissue work, and blister care are applied in
 * activities.js, because they spend coins the same way a run spends
 * energy. This file only knows what a visit costs in each town, and
 * what the free screen should say. Summit Hollow is the expensive one.
 * Its store is already the priciest in the design, and the clinic
 * matches that. Blister care is the cheap dressing, under soft tissue.
 */

import { CITIES, cityById, clinicRates } from "@/lib/constants";

export { clinicRates };

export function clinicCityId(state) {
  const id = state?.city;
  if (id && CITIES[id]) return id;
  return "brick-city";
}

export function ratesFor(state) {
  return clinicRates(clinicCityId(state));
}

/**
 * The free screen. It does not change the save. It reads the blister
 * (condition.injury), the sore flag, and how many hard weeks are stacked,
 * which is the same injury risk sleep already warns about.
 */
export function injuryScreenLines(state) {
  const injury = state?.condition?.injury;
  const lines = [];
  if (injury) {
    const nights = injury.daysLeft === 1 ? "1 night" : `${injury.daysLeft} nights`;
    lines.push(`${injury.name}. ${injury.note || ""} ${nights} left on the chart.`.replace(/\s+/g, " ").trim());
  } else {
    lines.push("No injury on the chart.");
  }
  if (state?.condition?.sore) {
    lines.push("You are sore. Easy running, or soft tissue work, clears that ache.");
  }
  const hard = state?.calendar?.hardWeeks || 0;
  if (hard >= 2) {
    lines.push(`${hard} hard weeks in a row. That is raising injury risk.`);
  } else if ((state?.condition?.fatigue || 0) >= 70) {
    lines.push("Fatigue is high. That is one strike toward getting sore.");
  } else if (!injury && !state?.condition?.sore) {
    lines.push("Risk looks ordinary. Keep the easy days easy.");
  }
  const city = cityById(clinicCityId(state));
  lines.push(`${city.clinic.name}. Treatment is ${city.clinic.treatment} coins. Soft tissue is ${city.clinic.tissue}. Blister care is ${city.clinic.blister}.`);
  return lines;
}
