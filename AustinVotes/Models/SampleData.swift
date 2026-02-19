import Foundation

// MARK: - Sample Ballot Data (for previews and development)

extension Ballot {
    static var sampleRepublican: Ballot {
        Ballot(
            id: UUID(),
            party: .republican,
            electionDate: DateComponents(calendar: .current, year: 2026, month: 3, day: 3).date!,
            electionName: "March 2026 Republican Primary",
            districts: Districts(
                congressional: "District 37",
                stateSenate: "District 14",
                stateHouse: "District 48",
                countyCommissioner: "Precinct 2",
                schoolBoard: "District 5"
            ),
            races: sampleRaces,
            propositions: samplePropositions
        )
    }

    private static var sampleRaces: [Race] {
        [
            // US Senator
            Race(
                id: UUID(),
                office: "U.S. Senator",
                district: nil,
                candidates: [
                    Candidate(
                        id: UUID(),
                        name: "John Cornyn",
                        party: "Republican",
                        isIncumbent: true,
                        isRecommended: true,
                        summary: "22+ years in the Senate, former AG, former TX Supreme Court Justice. Legislative dealmaker who delivered the CHIPS Act and $13.5B for Texas.",
                        background: "Served as Texas Attorney General (1999-2002) and on the Texas Supreme Court (1991-1997). In the Senate since 2002, served as Majority Whip.",
                        keyPositions: ["Border security", "CHIPS Act semiconductor manufacturing", "Trump tax package"],
                        endorsements: ["National Border Patrol Council", "Rick Perry", "Senate Leadership"],
                        pros: ["Effective legislator with real deliverables", "Strongest general election candidate", "Massive spending advantage ($59M allied spending)"],
                        cons: ["Long-tenured career politician", "Sometimes seen as too establishment"],
                        fundraising: "$59M in allied spending",
                        polling: "Leads Paxton 31% but runoff likely"
                    ),
                    Candidate(
                        id: UUID(),
                        name: "Ken Paxton",
                        party: "Republican",
                        isIncumbent: false,
                        isRecommended: false,
                        summary: "Current AG with serious integrity issues — impeached by TX House, under federal indictment. Leads primary polling at 38%.",
                        background: "Texas Attorney General since 2015. Impeached by the Texas House in 2023, acquitted by Senate. Under federal indictment for securities fraud since 2015.",
                        keyPositions: ["Aggressive litigation against Biden/federal government", "Immigration enforcement", "Anti-ESG"],
                        endorsements: ["Donald Trump"],
                        pros: ["High name recognition", "Trump endorsement", "Aggressive on red-meat conservative issues"],
                        cons: ["Impeached by his own party", "Under federal indictment", "Staff reported him to FBI", "Integrity disqualifying"],
                        fundraising: "$2.3M",
                        polling: "Leading at 38%"
                    ),
                    Candidate(
                        id: UUID(),
                        name: "Wesley Hunt",
                        party: "Republican",
                        isIncumbent: false,
                        isRecommended: false,
                        summary: "West Point grad, combat helicopter pilot, triple Ivy League degrees. Appealing future candidate but only at 17% — vote may be wasted.",
                        background: "U.S. Army combat veteran (Apache helicopter pilot), West Point graduate, Cornell MBA. Currently serving as U.S. Representative (TX-38).",
                        keyPositions: ["Military/veterans", "Economic opportunity", "Next-generation leadership"],
                        endorsements: [],
                        pros: ["Exceptional resume", "Young, dynamic", "Military service"],
                        cons: ["Only 17% in polls", "Splits the anti-Paxton vote", "Less legislative experience"],
                        fundraising: nil,
                        polling: "17% — third place"
                    ),
                ],
                isContested: true,
                isKeyRace: false,
                recommendation: RaceRecommendation(
                    candidateId: UUID(),
                    candidateName: "John Cornyn",
                    reasoning: "You already like Cornyn — effective, experienced, not a bomb-thrower. If your #1 priority is stopping Paxton, Cornyn is the only viable vehicle. Hunt splits the anti-Paxton vote.",
                    strategicNotes: "A runoff is almost certain. Every anti-Paxton vote for Cornyn helps ensure he makes the runoff in the strongest position.",
                    caveats: "Career politician, which you sometimes find frustrating. But the alternative is Paxton.",
                    confidence: .strong
                )
            ),

            // Attorney General
            Race(
                id: UUID(),
                office: "Attorney General",
                district: nil,
                candidates: [
                    Candidate(
                        id: UUID(),
                        name: "Chip Roy",
                        party: "Republican",
                        isIncumbent: false,
                        isRecommended: true,
                        summary: "Former First Assistant AG and federal prosecutor. Constitutional conservative who voted to certify 2020 election on principle. Frontrunner at 33-40%.",
                        background: "Served as First Assistant AG under Greg Abbott. Assistant U.S. Attorney prosecuting violent criminals. Currently U.S. Representative (TX-21).",
                        keyPositions: ["Constitutional principles", "Border security", "Government accountability"],
                        endorsements: ["Ted Cruz"],
                        pros: ["Actually served in the AG's office", "Called on Paxton to resign — integrity", "Constitutional principles over performance", "Frontrunner"],
                        cons: ["Some may see him as too establishment"],
                        fundraising: "Well-funded",
                        polling: "33-40% — frontrunner"
                    ),
                    Candidate(
                        id: UUID(),
                        name: "Joan Huffman",
                        party: "Republican",
                        isIncumbent: false,
                        isRecommended: false,
                        summary: "Most courtroom experience (100+ jury trials) but polling at only 13%.",
                        background: "Former prosecutor and state senator. Over 100 jury trials.",
                        keyPositions: ["Law and order", "Prosecutorial experience"],
                        endorsements: [],
                        pros: ["Most actual courtroom experience", "Strong legal background"],
                        cons: ["Only 13% in polls — not viable"],
                        fundraising: nil,
                        polling: "13%"
                    ),
                    Candidate(
                        id: UUID(),
                        name: "Mayes Middleton",
                        party: "Republican",
                        isIncumbent: false,
                        isRecommended: false,
                        summary: "$12M self-funded 'MAGA Mayes' — has never practiced law. All branding, no substance.",
                        background: "State legislator and businessman. No legal practice experience.",
                        keyPositions: ["MAGA alignment", "Culture war issues"],
                        endorsements: [],
                        pros: ["Well-funded ($12M self-funded)"],
                        cons: ["Never practiced law", "All branding, no substance", "Culture warrior"],
                        fundraising: "$12M (self-funded)",
                        polling: nil
                    ),
                ],
                isContested: true,
                isKeyRace: true,
                recommendation: RaceRecommendation(
                    candidateId: UUID(),
                    candidateName: "Chip Roy",
                    reasoning: "Best competence + integrity fit. Actually served in the AG's office, stood on principle when it cost him politically. Kirk Watson energy — pragmatic, substance over style.",
                    strategicNotes: "Roy needs 50% to avoid a runoff. Every vote helps him win outright on March 3.",
                    caveats: nil,
                    confidence: .strong
                )
            ),

            // Commissioner of Agriculture
            Race(
                id: UUID(),
                office: "Commissioner of Agriculture",
                district: nil,
                candidates: [
                    Candidate(
                        id: UUID(),
                        name: "Nate Sheets",
                        party: "Republican",
                        isIncumbent: false,
                        isRecommended: true,
                        summary: "Built Nature Nate's Honey from one backyard beehive into a national brand. Navy veteran. Abbott endorsed him over the incumbent — a rare rebuke.",
                        background: "Entrepreneur who founded Nature Nate's Honey Co. U.S. Navy veteran.",
                        keyPositions: ["Agricultural innovation", "Refocus office on actual mission", "Support Texas farmers"],
                        endorsements: ["Greg Abbott (over his own party's incumbent)"],
                        pros: ["Built something real — entrepreneur", "Navy veteran", "Abbott endorsed over incumbent", "Results over culture war"],
                        cons: ["No government experience"],
                        fundraising: "Well-funded with Abbott backing",
                        polling: "Competitive"
                    ),
                    Candidate(
                        id: UUID(),
                        name: "Sid Miller",
                        party: "Republican",
                        isIncumbent: true,
                        isRecommended: false,
                        summary: "Scandal-plagued incumbent. Texas Rangers investigation, aide indicted for bribery, marijuana incident before DEA visit.",
                        background: "Current Commissioner of Agriculture. Former state representative.",
                        keyPositions: ["Culture war positioning", "Status quo"],
                        endorsements: [],
                        pros: ["Incumbent experience"],
                        cons: ["Texas Rangers investigation", "Aide indicted for bribery", "Marijuana/DEA incident", "Lost 18,000 farmers on his watch"],
                        fundraising: nil,
                        polling: nil
                    ),
                ],
                isContested: true,
                isKeyRace: true,
                recommendation: RaceRecommendation(
                    candidateId: UUID(),
                    candidateName: "Nate Sheets",
                    reasoning: "Your clearest and most satisfying vote. Entrepreneur-turned-public-servant vs. scandal-plagued incumbent. Abbott himself broke ranks to endorse Sheets — that's how bad Miller is.",
                    strategicNotes: nil,
                    caveats: nil,
                    confidence: .strong
                )
            ),

            // Comptroller
            Race(
                id: UUID(),
                office: "Comptroller of Public Accounts",
                district: nil,
                candidates: [
                    Candidate(
                        id: UUID(),
                        name: "Kelly Hancock",
                        party: "Republican",
                        isIncumbent: true,
                        isRecommended: true,
                        summary: "10 years on Senate Finance Committee, authored the state spending cap. Clean record, no scandals. Currently serving as Acting Comptroller.",
                        background: "Former state senator. 5 years on Legislative Budget Board. Became Acting Comptroller in 2025.",
                        keyPositions: ["Fiscal discipline", "State spending cap", "School voucher implementation"],
                        endorsements: ["Greg Abbott"],
                        pros: ["Most relevant fiscal experience", "Clean record", "Actually doing the job", "Abbott endorsement"],
                        cons: ["Insider appointment looks like backroom dealing", "Only 13% despite incumbency"],
                        fundraising: "Moderate",
                        polling: "13%"
                    ),
                    Candidate(
                        id: UUID(),
                        name: "Don Huffines",
                        party: "Republican",
                        isIncumbent: false,
                        isRecommended: false,
                        summary: "'DOGE Texas' platform — government efficiency. But family bought Epstein's ranch, lost two consecutive races, and has vanity campaign feel.",
                        background: "Former state senator. Real estate developer. Lost to Abbott in 2022 governor's race.",
                        keyPositions: ["DOGE Texas — government efficiency", "Cut waste", "Property tax elimination"],
                        endorsements: ["Ted Cruz", "Vivek Ramaswamy"],
                        pros: ["DOGE platform aligns with your values", "Best funded ($15.8M)", "Strong endorsements"],
                        cons: ["Family bought Epstein's Zorro Ranch", "Lost Senate seat to a Democrat", "Lost governor's race to Abbott", "Third consecutive race — vanity campaign"],
                        fundraising: "$15.8M ($10M personal)",
                        polling: "33% — frontrunner"
                    ),
                    Candidate(
                        id: UUID(),
                        name: "Christi Craddick",
                        party: "Republican",
                        isIncumbent: false,
                        isRecommended: false,
                        summary: "12+ years running Railroad Commission. Won statewide three times. But massive oil/gas conflicts of interest.",
                        background: "Current Railroad Commissioner since 2013. Attorney. Father is longest-serving TX legislator.",
                        keyPositions: ["Energy regulation experience", "Business-friendly"],
                        endorsements: ["Oil and gas industry"],
                        pros: ["12 years running a statewide agency", "Won statewide three times", "Best 'stop Huffines' strategic vote at 21%"],
                        cons: ["$20M+ in oil/gas lease interests while regulating oil/gas", "$2M+/year in royalties from regulated industry", "Misled public during Winter Storm Uri"],
                        fundraising: "$2.9M (mostly oil industry)",
                        polling: "21%"
                    ),
                ],
                isContested: true,
                isKeyRace: true,
                recommendation: RaceRecommendation(
                    candidateId: UUID(),
                    candidateName: "Kelly Hancock",
                    reasoning: "Best integrity + competence fit for your profile. Relevant fiscal experience, no scandals, doing the job competently. The insider appointment is awkward but not corrupt.",
                    strategicNotes: "If stopping Huffines is the priority, Craddick at 21% is the strategic alternative. Hancock at 13% may not be viable.",
                    caveats: "Only 13% in polls — your vote may not matter strategically. Craddick is the pragmatic alternative if you want to block Huffines.",
                    confidence: .moderate
                )
            ),

            // US Rep District 37
            Race(
                id: UUID(),
                office: "U.S. Representative",
                district: "District 37",
                candidates: [
                    Candidate(
                        id: UUID(),
                        name: "Janet Malzahn",
                        party: "Republican",
                        isIncumbent: false,
                        isRecommended: true,
                        summary: "30-year attorney, UT Law grad, constitutional law professor. Owns a legal AI firm. Only raised $1,000 — no real campaign.",
                        background: "Attorney for 30 years. Former prosecutor and constitutional law professor. Director of National Institute for Child Support Enforcement.",
                        keyPositions: ["AI innovation", "Eliminate property taxes", "Healthcare deregulation"],
                        endorsements: [],
                        pros: ["Legal competence + tech/AI alignment", "Best profile fit on paper"],
                        cons: ["Only raised $1,000", "No campaign infrastructure", "D+26 district — will lose in November"],
                        fundraising: "$1,000",
                        polling: "N/A — symbolic race"
                    ),
                ],
                isContested: true,
                isKeyRace: false,
                recommendation: RaceRecommendation(
                    candidateId: UUID(),
                    candidateName: "Janet Malzahn",
                    reasoning: "In a symbolic race (D+26 district), vote your values. Malzahn's legal competence and AI/tech focus align best with your profile.",
                    strategicNotes: "The Republican nominee will lose to Greg Casar in November. This vote is about expression, not outcome.",
                    caveats: "Running essentially no campaign. But the alternatives have bigger red flags.",
                    confidence: .symbolic
                )
            ),

            // Governor (effectively uncontested)
            Race(
                id: UUID(),
                office: "Governor",
                district: nil,
                candidates: [
                    Candidate(
                        id: UUID(),
                        name: "Greg Abbott",
                        party: "Republican",
                        isIncumbent: true,
                        isRecommended: true,
                        summary: "Incumbent with $106M war chest. No credible challenger.",
                        background: "Governor since 2015. Former Attorney General (2002-2015).",
                        keyPositions: ["Border security", "Economic development", "Grid improvements"],
                        endorsements: [],
                        pros: ["Massive funding advantage", "Incumbent"],
                        cons: ["Grid failures under his watch"],
                        fundraising: "$106M",
                        polling: "N/A — effectively uncontested"
                    ),
                ],
                isContested: false,
                isKeyRace: false,
                recommendation: nil
            ),

            // Lt. Governor (effectively uncontested)
            Race(
                id: UUID(),
                office: "Lieutenant Governor",
                district: nil,
                candidates: [
                    Candidate(
                        id: UUID(),
                        name: "Dan Patrick",
                        party: "Republican",
                        isIncumbent: true,
                        isRecommended: true,
                        summary: "Incumbent with $33.5M. No credible challenger.",
                        background: "Lt. Governor since 2015. Former state senator and radio host.",
                        keyPositions: ["School choice", "Property taxes", "Border security"],
                        endorsements: [],
                        pros: ["No credible alternative"],
                        cons: ["More of a culture warrior than your ideal"],
                        fundraising: "$33.5M",
                        polling: "N/A — effectively uncontested"
                    ),
                ],
                isContested: false,
                isKeyRace: false,
                recommendation: nil
            ),

            // Railroad Commissioner
            Race(
                id: UUID(),
                office: "Railroad Commissioner",
                district: nil,
                candidates: [
                    Candidate(
                        id: UUID(),
                        name: "Jim Wright",
                        party: "Republican",
                        isIncumbent: true,
                        isRecommended: true,
                        summary: "Steady-hand industry insider. Oil field services business owner, fifth-generation rancher. Emphasizes fair and consistent regulation.",
                        background: "Oil field services business owner. Fifth-generation Texas rancher.",
                        keyPositions: ["Fair regulation", "Energy development", "Industry stability"],
                        endorsements: [],
                        pros: ["Competent, boring, does the job", "Industry knowledge"],
                        cons: ["Industry insider — potential conflicts"],
                        fundraising: nil,
                        polling: nil
                    ),
                ],
                isContested: true,
                isKeyRace: false,
                recommendation: RaceRecommendation(
                    candidateId: UUID(),
                    candidateName: "Jim Wright",
                    reasoning: "Competent incumbent. His opponent campaigns on DEI and 'Islamic invasion of Texas' — culture war nonsense irrelevant to oil and gas regulation.",
                    strategicNotes: nil,
                    caveats: nil,
                    confidence: .strong
                )
            ),

            // State Rep 48 (uncontested)
            Race(
                id: UUID(),
                office: "State Representative",
                district: "District 48",
                candidates: [
                    Candidate(
                        id: UUID(),
                        name: "Anthony Gupta",
                        party: "Republican",
                        isIncumbent: false,
                        isRecommended: true,
                        summary: "Sole Republican candidate for this district.",
                        background: nil,
                        keyPositions: [],
                        endorsements: [],
                        pros: ["Only option"],
                        cons: [],
                        fundraising: nil,
                        polling: nil
                    ),
                ],
                isContested: false,
                isKeyRace: false,
                recommendation: nil
            ),
        ]
    }

    private static var samplePropositions: [Proposition] {
        [
            Proposition(id: UUID(), number: 1, title: "Phase out property taxes",
                        description: "Property taxes assessed at purchase price, phased out over 6 years via spending reductions.",
                        recommendation: .leanYes, reasoning: "Aligns with desire for property tax relief and government efficiency. Bold but aspirational."),
            Proposition(id: UUID(), number: 2, title: "Voter approval for tax hikes",
                        description: "Local government budgets that raise property taxes must be voter-approved in November elections.",
                        recommendation: .leanYes, reasoning: "Accountability mechanism. Aligns with skepticism of city government spending."),
            Proposition(id: UUID(), number: 3, title: "Healthcare & vaccination status",
                        description: "Prohibit denial of healthcare based on vaccination status.",
                        recommendation: .yourCall, reasoning: "Medical freedom issue. Not a core concern in your profile."),
            Proposition(id: UUID(), number: 4, title: "Life at fertilization in schools",
                        description: "Public schools must teach life begins at fertilization.",
                        recommendation: .leanNo, reasoning: "Culture-war proposition, not governance."),
            Proposition(id: UUID(), number: 5, title: "Ban school health clinics",
                        description: "Ban gender, sexuality, and reproductive clinics/services in K-12 schools.",
                        recommendation: .yourCall, reasoning: "Culture-war proposition. Depends on your views on school health services."),
            Proposition(id: UUID(), number: 6, title: "Term limits",
                        description: "Term limits for all elected officials.",
                        recommendation: .leanYes, reasoning: "You value fresh perspective and dislike career politicians."),
            Proposition(id: UUID(), number: 7, title: "Protect Texas water",
                        description: "Ban large-scale export/sale of groundwater and surface water.",
                        recommendation: .leanYes, reasoning: "Infrastructure/water is a concern. Protecting Texas water resources."),
            Proposition(id: UUID(), number: 8, title: "Public services for undocumented",
                        description: "End public services for illegal aliens to reduce taxpayer burden.",
                        recommendation: .yourCall, reasoning: "Depends on how broadly you interpret 'public services.'"),
            Proposition(id: UUID(), number: 9, title: "No Dem committee chairs",
                        description: "Stop giving Democrats committee chairmanships in the Republican-controlled Legislature.",
                        recommendation: .leanNo, reasoning: "You admire bipartisan leaders. This is hyper-partisan and punishes cross-aisle governance."),
            Proposition(id: UUID(), number: 10, title: "Prohibit Sharia Law",
                        description: "Prohibit Sharia Law in Texas.",
                        recommendation: .leanNo, reasoning: "Pure culture war signaling. Sharia law has no legal standing in Texas already. Performative politics."),
        ]
    }
}
