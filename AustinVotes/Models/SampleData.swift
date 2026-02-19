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
                        name: "Robert Langford",
                        party: "Republican",
                        isIncumbent: true,
                        isRecommended: true,
                        summary: "22+ years in the Senate, former AG, former TX Supreme Court Justice. Legislative dealmaker who delivered major manufacturing investments for Texas.",
                        background: "Served as Texas Attorney General and on the Texas Supreme Court. In the Senate for over two decades, served as Majority Whip.",
                        keyPositions: ["Border security", "Semiconductor manufacturing", "Tax reform"],
                        endorsements: ["National Border Patrol Council", "Former Governor", "Senate Leadership"],
                        pros: ["Effective legislator with real deliverables", "Strongest general election candidate", "Massive spending advantage"],
                        cons: ["Long-tenured career politician", "Sometimes seen as too establishment"],
                        fundraising: "$59M in allied spending",
                        polling: "Leads closest rival 31% but runoff likely"
                    ),
                    Candidate(
                        id: UUID(),
                        name: "Dale Mercer",
                        party: "Republican",
                        isIncumbent: false,
                        isRecommended: false,
                        summary: "Current AG with serious integrity issues — impeached by TX House, under federal indictment. Leads primary polling at 38%.",
                        background: "Texas Attorney General. Impeached by the Texas House, acquitted by Senate. Under federal indictment for securities fraud.",
                        keyPositions: ["Aggressive litigation against federal government", "Immigration enforcement", "Anti-ESG"],
                        endorsements: ["Former President"],
                        pros: ["High name recognition", "Presidential endorsement", "Aggressive on base issues"],
                        cons: ["Impeached by his own party", "Under federal indictment", "Staff reported him to FBI", "Integrity disqualifying"],
                        fundraising: "$2.3M",
                        polling: "Leading at 38%"
                    ),
                    Candidate(
                        id: UUID(),
                        name: "Marcus Caldwell",
                        party: "Republican",
                        isIncumbent: false,
                        isRecommended: false,
                        summary: "West Point grad, combat helicopter pilot, triple Ivy League degrees. Appealing future candidate but only at 17% — vote may be wasted.",
                        background: "U.S. Army combat veteran (Apache helicopter pilot), West Point graduate, Ivy League MBA. Currently serving as U.S. Representative.",
                        keyPositions: ["Military/veterans", "Economic opportunity", "Next-generation leadership"],
                        endorsements: [],
                        pros: ["Exceptional resume", "Young, dynamic", "Military service"],
                        cons: ["Only 17% in polls", "Splits the anti-frontrunner vote", "Less legislative experience"],
                        fundraising: nil,
                        polling: "17% — third place"
                    ),
                ],
                isContested: true,
                isKeyRace: false,
                recommendation: RaceRecommendation(
                    candidateId: UUID(),
                    candidateName: "Robert Langford",
                    reasoning: "Effective, experienced, not a bomb-thrower. If your #1 priority is stopping the indicted frontrunner, Langford is the only viable vehicle. Caldwell splits the opposition vote.",
                    strategicNotes: "A runoff is almost certain. Every opposition vote for Langford helps ensure he makes the runoff in the strongest position.",
                    caveats: "Career politician, which can be frustrating. But the alternative has serious integrity issues.",
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
                        name: "Thomas Whitfield",
                        party: "Republican",
                        isIncumbent: false,
                        isRecommended: true,
                        summary: "Former First Assistant AG and federal prosecutor. Constitutional conservative who stood on principle. Frontrunner at 33-40%.",
                        background: "Served as First Assistant AG. Assistant U.S. Attorney prosecuting violent criminals. Currently serving in Congress.",
                        keyPositions: ["Constitutional principles", "Border security", "Government accountability"],
                        endorsements: ["Senior Senator"],
                        pros: ["Actually served in the AG's office", "Stood on principle when it cost him politically", "Constitutional values over performance", "Frontrunner"],
                        cons: ["Some may see him as too establishment"],
                        fundraising: "Well-funded",
                        polling: "33-40% — frontrunner"
                    ),
                    Candidate(
                        id: UUID(),
                        name: "Patricia Hargrove",
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
                        name: "Dustin Breckenridge",
                        party: "Republican",
                        isIncumbent: false,
                        isRecommended: false,
                        summary: "$12M self-funded culture warrior — has never practiced law. All branding, no substance.",
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
                    candidateName: "Thomas Whitfield",
                    reasoning: "Best competence + integrity fit. Actually served in the AG's office, stood on principle when it cost him politically. Pragmatic, substance over style.",
                    strategicNotes: "Whitfield needs 50% to avoid a runoff. Every vote helps him win outright on March 3.",
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
                        name: "Carter Jennings",
                        party: "Republican",
                        isIncumbent: false,
                        isRecommended: true,
                        summary: "Built a specialty food company from one backyard operation into a national brand. Navy veteran. Governor endorsed him over the incumbent — a rare rebuke.",
                        background: "Entrepreneur who founded a successful food company. U.S. Navy veteran.",
                        keyPositions: ["Agricultural innovation", "Refocus office on actual mission", "Support Texas farmers"],
                        endorsements: ["Governor (over his own party's incumbent)"],
                        pros: ["Built something real — entrepreneur", "Navy veteran", "Governor endorsed over incumbent", "Results over culture war"],
                        cons: ["No government experience"],
                        fundraising: "Well-funded with Governor backing",
                        polling: "Competitive"
                    ),
                    Candidate(
                        id: UUID(),
                        name: "Roy Bassett",
                        party: "Republican",
                        isIncumbent: true,
                        isRecommended: false,
                        summary: "Scandal-plagued incumbent. State investigators looking into office, aide indicted for bribery.",
                        background: "Current Commissioner of Agriculture. Former state representative.",
                        keyPositions: ["Culture war positioning", "Status quo"],
                        endorsements: [],
                        pros: ["Incumbent experience"],
                        cons: ["Under state investigation", "Aide indicted for bribery", "Lost thousands of farmers on his watch"],
                        fundraising: nil,
                        polling: nil
                    ),
                ],
                isContested: true,
                isKeyRace: true,
                recommendation: RaceRecommendation(
                    candidateId: UUID(),
                    candidateName: "Carter Jennings",
                    reasoning: "Your clearest and most satisfying vote. Entrepreneur-turned-public-servant vs. scandal-plagued incumbent. The Governor himself broke ranks to endorse Jennings — that's how bad the incumbent is.",
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
                        name: "Sandra Eklund",
                        party: "Republican",
                        isIncumbent: true,
                        isRecommended: true,
                        summary: "10 years on Senate Finance Committee, authored the state spending cap. Clean record, no scandals. Currently serving as Acting Comptroller.",
                        background: "Former state senator. 5 years on Legislative Budget Board. Became Acting Comptroller recently.",
                        keyPositions: ["Fiscal discipline", "State spending cap", "School voucher implementation"],
                        endorsements: ["Governor"],
                        pros: ["Most relevant fiscal experience", "Clean record", "Actually doing the job", "Governor endorsement"],
                        cons: ["Insider appointment looks like backroom dealing", "Only 13% despite incumbency"],
                        fundraising: "Moderate",
                        polling: "13%"
                    ),
                    Candidate(
                        id: UUID(),
                        name: "Victor Stanhope",
                        party: "Republican",
                        isIncumbent: false,
                        isRecommended: false,
                        summary: "'DOGE Texas' platform — government efficiency. But family has questionable real estate dealings, lost two consecutive races, and has vanity campaign feel.",
                        background: "Former state senator. Real estate developer. Lost previous governor's race.",
                        keyPositions: ["DOGE Texas — government efficiency", "Cut waste", "Property tax elimination"],
                        endorsements: ["Senior Senator", "Tech executive"],
                        pros: ["DOGE platform aligns with efficiency values", "Best funded ($15.8M)", "Strong endorsements"],
                        cons: ["Family has controversial real estate deals", "Lost two consecutive races", "Third consecutive campaign — vanity run"],
                        fundraising: "$15.8M ($10M personal)",
                        polling: "33% — frontrunner"
                    ),
                    Candidate(
                        id: UUID(),
                        name: "Diane Orosco",
                        party: "Republican",
                        isIncumbent: false,
                        isRecommended: false,
                        summary: "12+ years running state energy commission. Won statewide three times. But massive industry conflicts of interest.",
                        background: "Current state energy commissioner. Attorney. Father is longest-serving TX legislator.",
                        keyPositions: ["Energy regulation experience", "Business-friendly"],
                        endorsements: ["Oil and gas industry"],
                        pros: ["12 years running a statewide agency", "Won statewide three times", "Best strategic alternative at 21%"],
                        cons: ["$20M+ in industry lease interests while regulating that industry", "$2M+/year in royalties from regulated industry", "Misled public during major grid failure"],
                        fundraising: "$2.9M (mostly industry donors)",
                        polling: "21%"
                    ),
                ],
                isContested: true,
                isKeyRace: true,
                recommendation: RaceRecommendation(
                    candidateId: UUID(),
                    candidateName: "Sandra Eklund",
                    reasoning: "Best integrity + competence fit for your profile. Relevant fiscal experience, no scandals, doing the job competently. The insider appointment is awkward but not corrupt.",
                    strategicNotes: "If stopping the frontrunner is the priority, Orosco at 21% is the strategic alternative. Eklund at 13% may not be viable.",
                    caveats: "Only 13% in polls — your vote may not matter strategically. Orosco is the pragmatic alternative if you want to block the frontrunner.",
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
                        name: "Laura Pemberton",
                        party: "Republican",
                        isIncumbent: false,
                        isRecommended: true,
                        summary: "30-year attorney, UT Law grad, constitutional law professor. Owns a legal AI firm. Only raised $1,000 — no real campaign.",
                        background: "Attorney for 30 years. Former prosecutor and constitutional law professor. Director of a national legal enforcement institute.",
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
                    candidateName: "Laura Pemberton",
                    reasoning: "In a symbolic race (D+26 district), vote your values. Pemberton's legal competence and AI/tech focus align best with your profile.",
                    strategicNotes: "The Republican nominee will lose in November. This vote is about expression, not outcome.",
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
                        name: "James Brackett",
                        party: "Republican",
                        isIncumbent: true,
                        isRecommended: true,
                        summary: "Incumbent with $106M war chest. No credible challenger.",
                        background: "Governor for over a decade. Former Attorney General.",
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
                        name: "Wayne Hollister",
                        party: "Republican",
                        isIncumbent: true,
                        isRecommended: true,
                        summary: "Incumbent with $33.5M. No credible challenger.",
                        background: "Lt. Governor for over a decade. Former state senator and radio host.",
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
                        name: "Russell Tate",
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
                    candidateName: "Russell Tate",
                    reasoning: "Competent incumbent. His opponent campaigns on culture war issues irrelevant to oil and gas regulation.",
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
                        name: "Priya Nandakumar",
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
            Proposition(id: UUID(), number: 9, title: "No opposing-party committee chairs",
                        description: "Stop giving opposing party members committee chairmanships in the Legislature.",
                        recommendation: .leanNo, reasoning: "You value bipartisan leaders. This is hyper-partisan and punishes cross-aisle governance."),
            Proposition(id: UUID(), number: 10, title: "Prohibit foreign law",
                        description: "Prohibit application of foreign legal systems in Texas courts.",
                        recommendation: .leanNo, reasoning: "Pure culture war signaling. Foreign law has no legal standing in Texas already. Performative politics."),
        ]
    }
}
