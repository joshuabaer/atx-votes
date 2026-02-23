// Automated balance checks for candidate pros/cons across races.
// Measures length, count, and specificity symmetry to flag imbalances.

/**
 * Resolve a field value that may be a tone-variant object.
 * Returns the plain string (tone 3 preferred, then first sorted key).
 */
function resolveTone(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object" && !Array.isArray(value)) {
    return value["3"] || value[Object.keys(value).sort()[0]] || null;
  }
  return null;
}

/**
 * Resolve an array where each element may be a tone-variant object.
 * Returns an array of plain strings.
 */
function resolveToneArray(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map(item => resolveTone(item)).filter(Boolean);
}

/**
 * Analyze pros/cons balance for a single candidate.
 * Returns { prosCount, consCount, prosLength, consLength, prosAvgLength, consAvgLength }.
 */
function analyzeCandidate(candidate) {
  const pros = resolveToneArray(candidate.pros || []);
  const cons = resolveToneArray(candidate.cons || []);

  const prosLength = pros.reduce((sum, p) => sum + p.length, 0);
  const consLength = cons.reduce((sum, c) => sum + c.length, 0);

  return {
    name: candidate.name,
    prosCount: pros.length,
    consCount: cons.length,
    prosLength,
    consLength,
    prosAvgLength: pros.length > 0 ? Math.round(prosLength / pros.length) : 0,
    consAvgLength: cons.length > 0 ? Math.round(consLength / cons.length) : 0,
  };
}

/**
 * Check balance within a single candidate (pros vs cons symmetry).
 * Returns an array of flag objects: { type, candidate, detail, severity }.
 * Severity: "info" | "warning" | "critical"
 */
function checkCandidateBalance(analysis) {
  const flags = [];

  // Flag missing pros or cons entirely
  if (analysis.prosCount === 0 && analysis.consCount === 0) {
    flags.push({
      type: "missing_both",
      candidate: analysis.name,
      detail: "No pros or cons listed",
      severity: "warning",
    });
    return flags;
  }

  if (analysis.prosCount === 0) {
    flags.push({
      type: "missing_pros",
      candidate: analysis.name,
      detail: `Has ${analysis.consCount} cons but no pros`,
      severity: "critical",
    });
  }

  if (analysis.consCount === 0) {
    flags.push({
      type: "missing_cons",
      candidate: analysis.name,
      detail: `Has ${analysis.prosCount} pros but no cons`,
      severity: "critical",
    });
  }

  // Flag count imbalance (more than 2:1 ratio)
  if (analysis.prosCount > 0 && analysis.consCount > 0) {
    const countRatio = Math.max(analysis.prosCount, analysis.consCount) /
      Math.min(analysis.prosCount, analysis.consCount);
    if (countRatio > 2) {
      const moreType = analysis.prosCount > analysis.consCount ? "pros" : "cons";
      flags.push({
        type: "count_imbalance",
        candidate: analysis.name,
        detail: `${analysis.prosCount} pros vs ${analysis.consCount} cons (${countRatio.toFixed(1)}:1 ratio favoring ${moreType})`,
        severity: "warning",
      });
    }
  }

  // Flag length imbalance (total text length differs by >2x)
  if (analysis.prosLength > 0 && analysis.consLength > 0) {
    const lengthRatio = Math.max(analysis.prosLength, analysis.consLength) /
      Math.min(analysis.prosLength, analysis.consLength);
    if (lengthRatio > 2) {
      const longerType = analysis.prosLength > analysis.consLength ? "pros" : "cons";
      flags.push({
        type: "length_imbalance",
        candidate: analysis.name,
        detail: `Total ${longerType} text is ${lengthRatio.toFixed(1)}x longer (${analysis.prosLength} vs ${analysis.consLength} chars)`,
        severity: "info",
      });
    }
  }

  return flags;
}

/**
 * Check balance across candidates within a race.
 * Compares total detail level between candidates to flag unequal treatment.
 * Returns { raceFlags, candidateAnalyses }.
 */
function checkRaceBalance(race) {
  const candidates = (race.candidates || []).filter(c => !c.withdrawn);
  const analyses = candidates.map(analyzeCandidate);
  const flags = [];

  // Skip races with fewer than 2 active candidates
  if (analyses.length < 2) {
    return { raceFlags: flags, candidateAnalyses: analyses };
  }

  // Compare total detail (pros + cons text length) across candidates
  const totalLengths = analyses.map(a => a.prosLength + a.consLength);
  const maxTotal = Math.max(...totalLengths);
  const minTotal = Math.min(...totalLengths);

  if (minTotal > 0 && maxTotal / minTotal > 3) {
    const mostDetailed = analyses[totalLengths.indexOf(maxTotal)];
    const leastDetailed = analyses[totalLengths.indexOf(minTotal)];
    flags.push({
      type: "cross_candidate_detail",
      detail: `${mostDetailed.name} has ${maxTotal} chars of pros/cons vs ${leastDetailed.name} with ${minTotal} chars (${(maxTotal / minTotal).toFixed(1)}x difference)`,
      severity: "warning",
    });
  }

  // Check if any candidate has zero pros/cons while others have them
  const hasProsOrCons = analyses.filter(a => a.prosCount > 0 || a.consCount > 0);
  const noProsOrCons = analyses.filter(a => a.prosCount === 0 && a.consCount === 0);
  if (hasProsOrCons.length > 0 && noProsOrCons.length > 0) {
    for (const missing of noProsOrCons) {
      flags.push({
        type: "cross_candidate_missing",
        detail: `${missing.name} has no pros/cons while other candidates in this race do`,
        severity: "critical",
      });
    }
  }

  // Compare pros count spread across candidates
  const prosCounts = analyses.map(a => a.prosCount).filter(c => c > 0);
  if (prosCounts.length >= 2) {
    const maxPros = Math.max(...prosCounts);
    const minPros = Math.min(...prosCounts);
    if (maxPros > minPros * 2 && maxPros - minPros >= 2) {
      flags.push({
        type: "cross_candidate_pros_count",
        detail: `Pros count ranges from ${minPros} to ${maxPros} across candidates`,
        severity: "info",
      });
    }
  }

  // Compare cons count spread across candidates
  const consCounts = analyses.map(a => a.consCount).filter(c => c > 0);
  if (consCounts.length >= 2) {
    const maxCons = Math.max(...consCounts);
    const minCons = Math.min(...consCounts);
    if (maxCons > minCons * 2 && maxCons - minCons >= 2) {
      flags.push({
        type: "cross_candidate_cons_count",
        detail: `Cons count ranges from ${minCons} to ${maxCons} across candidates`,
        severity: "info",
      });
    }
  }

  return { raceFlags: flags, candidateAnalyses: analyses };
}

/**
 * Run balance checks across an entire ballot.
 * Returns a full report with per-race and per-candidate analysis.
 *
 * @param {object} ballot - Ballot object with races[].candidates[].pros/cons
 * @returns {object} { summary, races[] }
 */
function checkBallotBalance(ballot) {
  if (!ballot || !ballot.races) {
    return {
      summary: { totalRaces: 0, totalCandidates: 0, totalFlags: 0, score: 100, criticalCount: 0, warningCount: 0, infoCount: 0 },
      races: [],
    };
  }

  const raceResults = [];
  let totalFlags = 0;
  let criticalCount = 0;
  let warningCount = 0;
  let infoCount = 0;
  let totalCandidates = 0;

  for (const race of ballot.races) {
    const activeCandidates = (race.candidates || []).filter(c => !c.withdrawn);
    totalCandidates += activeCandidates.length;

    const { raceFlags, candidateAnalyses } = checkRaceBalance(race);

    // Per-candidate flags
    const candidateFlags = [];
    for (const analysis of candidateAnalyses) {
      const flags = checkCandidateBalance(analysis);
      candidateFlags.push({ ...analysis, flags });
    }

    // Collect all flags for this race
    const allFlags = [...raceFlags, ...candidateFlags.flatMap(c => c.flags)];
    for (const f of allFlags) {
      totalFlags++;
      if (f.severity === "critical") criticalCount++;
      else if (f.severity === "warning") warningCount++;
      else infoCount++;
    }

    const label = race.district ? `${race.office} — ${race.district}` : race.office;
    raceResults.push({
      office: race.office,
      district: race.district || null,
      label,
      raceFlags,
      candidates: candidateFlags,
      flagCount: allFlags.length,
    });
  }

  // Calculate a balance score (100 = perfect, deduct for flags)
  // Critical: -10 each, Warning: -5 each, Info: -2 each
  const deductions = criticalCount * 10 + warningCount * 5 + infoCount * 2;
  const rawScore = Math.max(0, 100 - deductions);
  // Scale so that a few info flags don't tank the score too hard
  const score = totalCandidates > 0 ? rawScore : 100;

  return {
    summary: {
      totalRaces: ballot.races.length,
      totalCandidates,
      totalFlags,
      score,
      criticalCount,
      warningCount,
      infoCount,
    },
    races: raceResults,
  };
}

/**
 * Generate a concise text summary of balance check results.
 * Useful for logging or API responses.
 */
function formatBalanceSummary(report) {
  const s = report.summary;
  const lines = [
    `Balance Score: ${s.score}/100`,
    `Races: ${s.totalRaces} | Candidates: ${s.totalCandidates}`,
    `Flags: ${s.totalFlags} (${s.criticalCount} critical, ${s.warningCount} warning, ${s.infoCount} info)`,
  ];

  if (s.totalFlags > 0) {
    lines.push("");
    for (const race of report.races) {
      if (race.flagCount === 0) continue;
      lines.push(`${race.label}:`);
      for (const f of race.raceFlags) {
        lines.push(`  [${f.severity.toUpperCase()}] ${f.detail}`);
      }
      for (const c of race.candidates) {
        for (const f of c.flags) {
          lines.push(`  [${f.severity.toUpperCase()}] ${f.candidate}: ${f.detail}`);
        }
      }
    }
  }

  return lines.join("\n");
}

export {
  resolveTone,
  resolveToneArray,
  analyzeCandidate,
  checkCandidateBalance,
  checkRaceBalance,
  checkBallotBalance,
  formatBalanceSummary,
};
