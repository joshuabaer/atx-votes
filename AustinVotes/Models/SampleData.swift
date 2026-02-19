import Foundation

// MARK: - Sample Ballot Data (real March 2026 Texas primary candidates)
// Sources: Travis County Clerk, Ballotpedia, Texas Tribune, KUT, Texas Secretary of State
// Note: Recommendations are placeholder samples — the Claude API will generate personalized ones.

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
            races: sampleRepRaces,
            propositions: sampleRepPropositions
        )
    }

    // MARK: - Republican Races

    private static var sampleRepRaces: [Race] {
        [
            // US Senate — headline race
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
                        summary: "Four-term incumbent, former TX Attorney General and TX Supreme Court Justice. Senate's second-ranking Republican. Legislative dealmaker who secured CHIPS Act manufacturing investments for Texas.",
                        background: "Served as Texas Attorney General (1999–2002) and on the Texas Supreme Court. In the U.S. Senate since 2002. Former Majority Whip.",
                        keyPositions: ["Border security", "Semiconductor manufacturing", "Tax reform", "Bipartisan dealmaking"],
                        endorsements: ["National Border Patrol Council", "Texas Farm Bureau"],
                        pros: ["Effective legislator with real deliverables", "Strongest general election candidate", "Massive spending advantage ($59M in allied spending)"],
                        cons: ["Long-tenured career politician", "Supported some bipartisan bills that angered the base"],
                        fundraising: "$59M in allied spending",
                        polling: "31% — second place, runoff likely"
                    ),
                    Candidate(
                        id: UUID(),
                        name: "Ken Paxton",
                        party: "Republican",
                        isIncumbent: false,
                        isRecommended: false,
                        summary: "Current Texas Attorney General. Impeached by the TX House in 2023, acquitted by Senate. Under federal indictment for securities fraud. Leads primary polling.",
                        background: "Texas Attorney General since 2015. Impeached by the Texas House, acquitted by Senate. Under federal indictment for securities fraud since 2015.",
                        keyPositions: ["Aggressive litigation against federal government", "Immigration enforcement", "Anti-ESG"],
                        endorsements: ["Former President Trump"],
                        pros: ["High name recognition", "Trump endorsement", "Aggressive on base issues"],
                        cons: ["Impeached by his own party's House", "Under federal indictment", "Staff reported him to FBI for bribery"],
                        fundraising: "$2.3M",
                        polling: "38% — frontrunner"
                    ),
                    Candidate(
                        id: UUID(),
                        name: "Wesley Hunt",
                        party: "Republican",
                        isIncumbent: false,
                        isRecommended: false,
                        summary: "U.S. Representative, West Point graduate, Apache helicopter combat pilot. Triple Ivy League degrees. Young, dynamic next-generation candidate.",
                        background: "U.S. Army combat veteran (Apache helicopter pilot). West Point graduate. MBA and MPA from Ivy League schools. Elected to Congress in 2022.",
                        keyPositions: ["Military/veterans", "Economic opportunity", "Next-generation leadership"],
                        endorsements: [],
                        pros: ["Exceptional resume", "Young and dynamic", "Military service and combat experience"],
                        cons: ["Only 17% in polls — splits anti-Paxton vote", "Less legislative experience"],
                        fundraising: nil,
                        polling: "17% — third place"
                    ),
                ],
                isContested: true,
                isKeyRace: true,
                recommendation: RaceRecommendation(
                    candidateId: UUID(),
                    candidateName: "John Cornyn",
                    reasoning: "Effective, experienced legislator with real deliverables for Texas. If stopping the indicted frontrunner matters to you, Cornyn is the only viable vehicle — Hunt splits the opposition vote at 17%.",
                    strategicNotes: "A runoff between the top two is almost certain. Every opposition vote for Cornyn helps ensure he makes the runoff in the strongest position.",
                    caveats: "Career politician, which frustrates some voters. But the alternative has serious legal and ethical issues.",
                    confidence: .strong
                )
            ),

            // Attorney General — open seat (Paxton running for Senate)
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
                        summary: "U.S. Representative and former First Assistant AG under Paxton. Federal prosecutor background. Constitutional conservative who resigned from AG's office on principle. Frontrunner at 33-40%.",
                        background: "Currently serving in Congress (TX-21). Served as First Assistant Attorney General. Former Assistant U.S. Attorney prosecuting violent criminals.",
                        keyPositions: ["Constitutional principles", "Border security", "Government accountability"],
                        endorsements: ["Sen. John Cornyn", "Sen. Ted Cruz"],
                        pros: ["Actually served in the AG's office", "Resigned on principle from Paxton's AG office", "Federal prosecutor experience", "Frontrunner"],
                        cons: ["Leaves an open congressional seat", "Some may see him as establishment"],
                        fundraising: "Well-funded with major endorsements",
                        polling: "33-40% — frontrunner"
                    ),
                    Candidate(
                        id: UUID(),
                        name: "Mayes Middleton",
                        party: "Republican",
                        isIncumbent: false,
                        isRecommended: false,
                        summary: "State Senator and businessman. Chair of the Texas Freedom Caucus. Positioned as the most conservative option.",
                        background: "Texas State Senator. Chairman of the Texas Freedom Caucus. Oil and gas businessman.",
                        keyPositions: ["Hard-right conservatism", "Property tax elimination", "Border security"],
                        endorsements: ["Texas Freedom Caucus allies"],
                        pros: ["Strong conservative credentials", "Legislative experience", "Business background"],
                        cons: ["Freedom Caucus approach can be combative", "Less legal experience than rivals"],
                        fundraising: nil,
                        polling: nil
                    ),
                    Candidate(
                        id: UUID(),
                        name: "Joan Huffman",
                        party: "Republican",
                        isIncumbent: false,
                        isRecommended: false,
                        summary: "State Senator with prosecutorial background. Over 100 jury trials. Led the Paxton impeachment trial as presiding judge.",
                        background: "Texas State Senator. Former prosecutor with over 100 jury trials. Presided over the Paxton impeachment trial in the Senate.",
                        keyPositions: ["Law and order", "Prosecutorial experience", "Judicial reform"],
                        endorsements: [],
                        pros: ["Most actual courtroom experience", "Presided over impeachment — understands the office"],
                        cons: ["Lower polling numbers", "May not be viable in a crowded field"],
                        fundraising: nil,
                        polling: "~13%"
                    ),
                    Candidate(
                        id: UUID(),
                        name: "Aaron Reitz",
                        party: "Republican",
                        isIncumbent: false,
                        isRecommended: false,
                        summary: "Deputy Secretary of State under Governor Abbott. Youngest candidate in the race. Self-funded with $12M.",
                        background: "Former Deputy Secretary of State. Attorney.",
                        keyPositions: ["MAGA alignment", "Election integrity", "Culture war issues"],
                        endorsements: [],
                        pros: ["Well-funded ($12M self-funded)", "Youth and energy"],
                        cons: ["Limited legal practice experience", "Heavy self-funding raises questions"],
                        fundraising: "$12M (self-funded)",
                        polling: nil
                    ),
                ],
                isContested: true,
                isKeyRace: true,
                recommendation: RaceRecommendation(
                    candidateId: UUID(),
                    candidateName: "Chip Roy",
                    reasoning: "Best combination of legal experience and principled conservatism. Actually served in the AG's office and resigned on principle. Federal prosecutor background gives him credibility for the role.",
                    strategicNotes: "Roy needs 50% to avoid a runoff. Consolidating behind the frontrunner helps avoid a prolonged primary.",
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
                        summary: "Appointed Comptroller after Glenn Hegar resigned. Former state senator with 10 years on the Senate Finance Committee. Authored the state spending cap.",
                        background: "Former state senator. Served on Legislative Budget Board. Appointed Acting Comptroller.",
                        keyPositions: ["Fiscal discipline", "State spending cap", "School voucher implementation"],
                        endorsements: ["Gov. Greg Abbott"],
                        pros: ["Most relevant fiscal experience", "Actually doing the job now", "Governor endorsement", "Clean record"],
                        cons: ["Insider appointment — didn't win the seat in an election", "Only polling at ~13%"],
                        fundraising: "Moderate",
                        polling: "~13%"
                    ),
                    Candidate(
                        id: UUID(),
                        name: "Don Huffines",
                        party: "Republican",
                        isIncumbent: false,
                        isRecommended: false,
                        summary: "'DOGE Texas' platform — government efficiency. Former state senator and real estate developer. Best-funded candidate at $15.8M (mostly self-funded). Lost 2022 governor's race.",
                        background: "Former state senator. Real estate developer. Lost the 2022 governor's primary to Abbott.",
                        keyPositions: ["DOGE Texas — government efficiency", "Cut waste", "Property tax elimination"],
                        endorsements: ["Elon Musk"],
                        pros: ["Best funded ($15.8M)", "DOGE platform resonates with efficiency voters", "Strong endorsements"],
                        cons: ["$10M is self-funded", "Lost two consecutive races", "Family real estate dealings raised questions"],
                        fundraising: "$15.8M ($10M personal)",
                        polling: "33% — frontrunner"
                    ),
                    Candidate(
                        id: UUID(),
                        name: "Christi Craddick",
                        party: "Republican",
                        isIncumbent: false,
                        isRecommended: false,
                        summary: "12+ years as Railroad Commissioner (state energy regulator). Won statewide three times. Father is former TX House Speaker Tom Craddick.",
                        background: "Current Railroad Commissioner since 2012. Attorney. Father is longest-serving Texas state legislator.",
                        keyPositions: ["Energy regulation experience", "Business-friendly governance"],
                        endorsements: ["Oil and gas industry supporters"],
                        pros: ["12 years running a statewide agency", "Won statewide three times", "Strategic alternative at 21%"],
                        cons: ["$20M+ in industry lease interests while regulating that industry", "Misled public during 2021 winter storm"],
                        fundraising: "$2.9M (mostly industry donors)",
                        polling: "21%"
                    ),
                    Candidate(
                        id: UUID(),
                        name: "Michael Berlanga",
                        party: "Republican",
                        isIncumbent: false,
                        isRecommended: false,
                        summary: "Lesser-known candidate in the Comptroller race.",
                        background: nil,
                        keyPositions: [],
                        endorsements: [],
                        pros: [],
                        cons: ["Low name recognition", "Minimal campaign infrastructure"],
                        fundraising: nil,
                        polling: nil
                    ),
                ],
                isContested: true,
                isKeyRace: true,
                recommendation: RaceRecommendation(
                    candidateId: UUID(),
                    candidateName: "Kelly Hancock",
                    reasoning: "Most relevant fiscal experience — 10 years on Senate Finance, authored the spending cap, currently doing the job. Clean record with no conflicts of interest.",
                    strategicNotes: "At only 13%, Hancock may not be viable. If stopping Huffines is the priority, Craddick at 21% is the strategic alternative.",
                    caveats: "Insider appointment feels like backroom dealing. If strategic viability matters more, consider Craddick.",
                    confidence: .moderate
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
                        summary: "Entrepreneur who built a specialty food company from a backyard operation into a national brand. Navy veteran. Governor Abbott endorsed him over the incumbent — a rare rebuke.",
                        background: "Founded a successful food company. U.S. Navy veteran. Entrepreneur.",
                        keyPositions: ["Agricultural innovation", "Refocus office on actual farming mission", "Support Texas farmers and ranchers"],
                        endorsements: ["Gov. Greg Abbott (endorsed over his own party's incumbent)"],
                        pros: ["Built a real business in the food industry", "Navy veteran", "Governor endorsed over incumbent — significant", "Results-oriented"],
                        cons: ["No government experience"],
                        fundraising: "Well-funded with Governor backing",
                        polling: "Competitive"
                    ),
                    Candidate(
                        id: UUID(),
                        name: "Sid Miller",
                        party: "Republican",
                        isIncumbent: true,
                        isRecommended: false,
                        summary: "Scandal-plagued incumbent. State investigators looking into his office. Aide indicted for bribery. Known more for culture war social media posts than agricultural policy.",
                        background: "Commissioner of Agriculture since 2015. Former state representative. Rodeo competitor.",
                        keyPositions: ["Culture war positioning", "Status quo"],
                        endorsements: [],
                        pros: ["Incumbent experience", "Name recognition"],
                        cons: ["Under state investigation", "Aide indicted for bribery", "Lost thousands of farmers from state programs on his watch", "Office focused on culture war, not agriculture"],
                        fundraising: nil,
                        polling: nil
                    ),
                ],
                isContested: true,
                isKeyRace: true,
                recommendation: RaceRecommendation(
                    candidateId: UUID(),
                    candidateName: "Nate Sheets",
                    reasoning: "Entrepreneur vs. scandal-plagued incumbent. Governor Abbott himself broke ranks to endorse Sheets — that's how problematic Miller's tenure has been. Sheets would refocus the office on actual agriculture.",
                    strategicNotes: nil,
                    caveats: nil,
                    confidence: .strong
                )
            ),

            // Governor
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
                        summary: "Three-term incumbent with $106M war chest. No credible primary challenger among 10 opponents.",
                        background: "Governor since 2015. Former Attorney General (2002-2015). Former Texas Supreme Court Justice.",
                        keyPositions: ["Border security (Operation Lone Star)", "Economic development", "School choice", "Grid improvements"],
                        endorsements: [],
                        pros: ["Massive funding advantage", "Incumbent with strong GOP base support"],
                        cons: ["Grid failures under his watch (2021 winter storm)", "Some conservatives feel he's not aggressive enough"],
                        fundraising: "$106M",
                        polling: "No credible challenger"
                    ),
                ],
                isContested: false,
                isKeyRace: false,
                recommendation: nil
            ),

            // Lt. Governor
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
                        summary: "Three-term incumbent with $33.5M. Presides over the Texas Senate. No credible challenger.",
                        background: "Lt. Governor since 2015. Former state senator and conservative radio host. Presides over the Texas Senate.",
                        keyPositions: ["School choice/vouchers", "Property tax reform", "Border security"],
                        endorsements: [],
                        pros: ["Effectively controls the Texas Senate agenda", "Well-funded"],
                        cons: ["Polarizing figure", "More culture warrior than some prefer"],
                        fundraising: "$33.5M",
                        polling: "No credible challenger"
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
                        summary: "Incumbent Railroad Commissioner. Oil field services business owner and fifth-generation Texas rancher. Emphasizes fair and consistent energy regulation.",
                        background: "Oil field services business owner. Fifth-generation Texas rancher. Railroad Commissioner since 2020.",
                        keyPositions: ["Fair regulation", "Energy development", "Industry stability"],
                        endorsements: [],
                        pros: ["Industry knowledge", "Incumbent experience", "Doing the job competently"],
                        cons: ["Industry insider — potential conflicts of interest"],
                        fundraising: nil,
                        polling: "Favored over challengers"
                    ),
                    Candidate(
                        id: UUID(),
                        name: "Katherine Culbert",
                        party: "Republican",
                        isIncumbent: false,
                        isRecommended: false,
                        summary: "Challenger in the Railroad Commissioner race.",
                        background: nil,
                        keyPositions: [],
                        endorsements: [],
                        pros: [],
                        cons: ["Low name recognition"],
                        fundraising: nil,
                        polling: nil
                    ),
                ],
                isContested: true,
                isKeyRace: false,
                recommendation: RaceRecommendation(
                    candidateId: UUID(),
                    candidateName: "Jim Wright",
                    reasoning: "Competent incumbent with relevant industry experience. None of his challengers have made a compelling case for change.",
                    strategicNotes: nil,
                    caveats: nil,
                    confidence: .strong
                )
            ),

            // US Rep District 37 (symbolic for Republicans — D+26 district)
            Race(
                id: UUID(),
                office: "U.S. Representative",
                district: "District 37",
                candidates: [
                    Candidate(
                        id: UUID(),
                        name: "Ge'Nell Gary",
                        party: "Republican",
                        isIncumbent: false,
                        isRecommended: false,
                        summary: "Republican candidate in the heavily Democratic Austin-centered CD-37.",
                        background: nil,
                        keyPositions: [],
                        endorsements: [],
                        pros: [],
                        cons: ["D+26 district — Republican nominee will lose in November"],
                        fundraising: nil,
                        polling: nil
                    ),
                    Candidate(
                        id: UUID(),
                        name: "Lauren B. Pena",
                        party: "Republican",
                        isIncumbent: false,
                        isRecommended: false,
                        summary: "Republican candidate in CD-37.",
                        background: nil,
                        keyPositions: [],
                        endorsements: [],
                        pros: [],
                        cons: ["D+26 district — Republican nominee will lose in November"],
                        fundraising: nil,
                        polling: nil
                    ),
                    Candidate(
                        id: UUID(),
                        name: "Janet Malzahn",
                        party: "Republican",
                        isIncumbent: false,
                        isRecommended: false,
                        summary: "Republican candidate in CD-37.",
                        background: nil,
                        keyPositions: [],
                        endorsements: [],
                        pros: [],
                        cons: ["D+26 district — Republican nominee will lose in November"],
                        fundraising: nil,
                        polling: nil
                    ),
                ],
                isContested: true,
                isKeyRace: false,
                recommendation: RaceRecommendation(
                    candidateId: UUID(),
                    candidateName: "Ge'Nell Gary",
                    reasoning: "In a symbolic race (D+26 district), this vote is about expression rather than outcome. The Republican nominee will not win in November.",
                    strategicNotes: "The real action in CD-37 is in the Democratic primary.",
                    caveats: "Limited information available about all three candidates.",
                    confidence: .symbolic
                )
            ),

            // US Rep District 10 (open seat — McCaul retiring — big contested race)
            Race(
                id: UUID(),
                office: "U.S. Representative",
                district: "District 10",
                candidates: [
                    Candidate(
                        id: UUID(),
                        name: "Chris Gober",
                        party: "Republican",
                        isIncumbent: false,
                        isRecommended: true,
                        summary: "Election law attorney. Considered one of the top contenders in the crowded 9-candidate field for McCaul's open seat.",
                        background: "Attorney specializing in election law. Well-connected in Republican politics.",
                        keyPositions: ["Election integrity", "Conservative governance"],
                        endorsements: [],
                        pros: ["Legal expertise", "Well-positioned in the race"],
                        cons: ["Crowded field makes outcomes unpredictable"],
                        fundraising: nil,
                        polling: nil
                    ),
                    Candidate(
                        id: UUID(),
                        name: "Jessica Karlsruher",
                        party: "Republican",
                        isIncumbent: false,
                        isRecommended: false,
                        summary: "Candidate in the CD-10 open seat race.",
                        background: nil,
                        keyPositions: [],
                        endorsements: [],
                        pros: [],
                        cons: [],
                        fundraising: nil,
                        polling: nil
                    ),
                    Candidate(
                        id: UUID(),
                        name: "Rob Altman",
                        party: "Republican",
                        isIncumbent: false,
                        isRecommended: false,
                        summary: "Candidate in the CD-10 open seat race.",
                        background: nil,
                        keyPositions: [],
                        endorsements: [],
                        pros: [],
                        cons: [],
                        fundraising: nil,
                        polling: nil
                    ),
                ],
                isContested: true,
                isKeyRace: true,
                recommendation: RaceRecommendation(
                    candidateId: UUID(),
                    candidateName: "Chris Gober",
                    reasoning: "Open seat with 9 candidates — one of the most competitive Republican primaries in the Austin area. A runoff is very likely given the crowded field.",
                    strategicNotes: "With 9 candidates, no one is likely to hit 50%. Expect a runoff between the top two.",
                    caveats: "Limited polling and public information available for many candidates in this race.",
                    confidence: .weak
                )
            ),

            // State Rep 48 (unopposed)
            Race(
                id: UUID(),
                office: "State Representative",
                district: "District 48",
                candidates: [
                    Candidate(
                        id: UUID(),
                        name: "Gupta",
                        party: "Republican",
                        isIncumbent: false,
                        isRecommended: true,
                        summary: "Sole Republican candidate for House District 48.",
                        background: nil,
                        keyPositions: [],
                        endorsements: [],
                        pros: ["Only option in Republican primary"],
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

    // MARK: - Republican Propositions (real March 2026)

    private static var sampleRepPropositions: [Proposition] {
        [
            Proposition(id: UUID(), number: 1, title: "Phase out property taxes",
                        description: "Texas property taxes should be assessed at the purchase price and phased out entirely over the next six years through spending reductions.",
                        recommendation: .leanYes, reasoning: "Aspirational but popular. Signals strong support for property tax relief."),
            Proposition(id: UUID(), number: 2, title: "Voter approval for local tax hikes",
                        description: "Texas should require any local government budget that raises property taxes to be approved by voters at a November general election.",
                        recommendation: .leanYes, reasoning: "Direct accountability mechanism for local government spending."),
            Proposition(id: UUID(), number: 3, title: "Healthcare & vaccination status",
                        description: "Texas should prohibit denial of healthcare or any medical service based solely on the patient's vaccination status.",
                        recommendation: .yourCall, reasoning: "Medical freedom issue. Not directly related to most voters' top priorities."),
            Proposition(id: UUID(), number: 4, title: "Life at fertilization in schools",
                        description: "Texas should require its public schools to teach that life begins at fertilization.",
                        recommendation: .yourCall, reasoning: "Social conservative priority. Depends on your views on school curriculum."),
            Proposition(id: UUID(), number: 5, title: "Ban school health clinics",
                        description: "Texas should ban gender, sexuality, and reproductive clinics and services in K-12 schools.",
                        recommendation: .yourCall, reasoning: "Social conservative priority. Depends on your views on school health services."),
            Proposition(id: UUID(), number: 6, title: "Term limits",
                        description: "Texas should enact term limits on all elected officials.",
                        recommendation: .leanYes, reasoning: "Broadly popular across the political spectrum. Limits entrenchment of career politicians."),
            Proposition(id: UUID(), number: 7, title: "Protect Texas water",
                        description: "Texas should ban the large-scale export, or sale, of our groundwater and surface water to any single private or public entity.",
                        recommendation: .leanYes, reasoning: "Water security is a growing Texas concern. Protects a critical resource."),
            Proposition(id: UUID(), number: 8, title: "End services for undocumented immigrants",
                        description: "The Texas Legislature should reduce the burden of illegal immigration on taxpayers by ending public services for illegal immigrants.",
                        recommendation: .yourCall, reasoning: "Depends on how broadly you define 'public services' and your immigration views."),
            Proposition(id: UUID(), number: 9, title: "No Democratic committee chairs",
                        description: "The Republican-controlled Texas Legislature should stop awarding leadership positions, including committee chairmanships, to Democrats.",
                        recommendation: .leanNo, reasoning: "Hyper-partisan. Cross-aisle governance and bipartisan committee work have long Texas traditions."),
            Proposition(id: UUID(), number: 10, title: "Prohibit Sharia Law",
                        description: "Texas should prohibit Sharia Law.",
                        recommendation: .leanNo, reasoning: "Foreign religious law has no legal standing in Texas courts already. Purely symbolic."),
        ]
    }

    // MARK: - Democratic Sample Ballot

    static var sampleDemocrat: Ballot {
        Ballot(
            id: UUID(),
            party: .democrat,
            electionDate: DateComponents(calendar: .current, year: 2026, month: 3, day: 3).date!,
            electionName: "March 2026 Democratic Primary",
            districts: Districts(
                congressional: "District 37",
                stateSenate: "District 14",
                stateHouse: "District 48",
                countyCommissioner: "Precinct 2",
                schoolBoard: "District 5"
            ),
            races: sampleDemRaces,
            propositions: sampleDemPropositions
        )
    }

    // MARK: - Democratic Races

    private static var sampleDemRaces: [Race] {
        [
            // US Senate — headline race
            Race(
                id: UUID(),
                office: "U.S. Senator",
                district: nil,
                candidates: [
                    Candidate(
                        id: UUID(),
                        name: "Jasmine Crockett",
                        party: "Democrat",
                        isIncumbent: false,
                        isRecommended: true,
                        summary: "U.S. Representative from Dallas. Rose to national prominence on the House Oversight Committee. Known for sharp, viral exchanges with Republican colleagues. Considered the frontrunner.",
                        background: "U.S. Representative (TX-30) since 2023. Attorney and former state representative. Member of House Oversight Committee.",
                        keyPositions: ["Voting rights", "Criminal justice reform", "Healthcare access", "Economic equity"],
                        endorsements: [],
                        pros: ["National profile and momentum", "Strong fundraising", "Proven communicator", "Federal legislative experience"],
                        cons: ["Relatively new to Congress (one term)", "Dallas-based — less Austin connection"],
                        fundraising: "Strong — leading Democratic fundraising",
                        polling: "Frontrunner"
                    ),
                    Candidate(
                        id: UUID(),
                        name: "James Talarico",
                        party: "Democrat",
                        isIncumbent: false,
                        isRecommended: false,
                        summary: "State Representative from Round Rock (HD-50). Former teacher. Known for bipartisan education legislation. Giving up his House seat to run.",
                        background: "Texas State Representative since 2019. Former public school teacher and education nonprofit worker. Georgetown University graduate.",
                        keyPositions: ["Public education funding", "Teacher pay", "Bipartisan governance", "Youth engagement"],
                        endorsements: [],
                        pros: ["Austin-area candidate — local connection", "Bipartisan track record in the Legislature", "Education expertise", "Younger generation voice"],
                        cons: ["State-level experience only", "Giving up safe House seat", "Lower name recognition statewide than Crockett"],
                        fundraising: nil,
                        polling: "Second place"
                    ),
                    Candidate(
                        id: UUID(),
                        name: "Ahmad R. Hassan",
                        party: "Democrat",
                        isIncumbent: false,
                        isRecommended: false,
                        summary: "Third candidate in the Democratic Senate primary.",
                        background: nil,
                        keyPositions: [],
                        endorsements: [],
                        pros: [],
                        cons: ["Low name recognition", "Minimal campaign infrastructure"],
                        fundraising: nil,
                        polling: nil
                    ),
                ],
                isContested: true,
                isKeyRace: true,
                recommendation: RaceRecommendation(
                    candidateId: UUID(),
                    candidateName: "Jasmine Crockett",
                    reasoning: "National profile, strong fundraising, and federal experience give her the best shot in the November general election. Talarico is a strong Austin-area alternative with bipartisan credentials if local connection matters more.",
                    strategicNotes: "Democrats need their strongest general election candidate to compete in November. Electability matters in a statewide Texas race.",
                    caveats: "If bipartisan governance and education are your top priorities, Talarico may be the better fit despite lower polling.",
                    confidence: .moderate
                )
            ),

            // Governor
            Race(
                id: UUID(),
                office: "Governor",
                district: nil,
                candidates: [
                    Candidate(
                        id: UUID(),
                        name: "Gina Hinojosa",
                        party: "Democrat",
                        isIncumbent: false,
                        isRecommended: true,
                        summary: "State Representative from Austin. Giving up her House seat to run for Governor. Known for education policy and progressive advocacy in the Legislature.",
                        background: "Texas State Representative. Former Austin ISD school board trustee. Attorney. Austin-based.",
                        keyPositions: ["Public education", "Reproductive rights", "Affordable housing", "Grid reliability"],
                        endorsements: [],
                        pros: ["Austin-area candidate", "Education policy expertise", "Legislative experience", "Progressive credentials"],
                        cons: ["State-level experience only", "Statewide name recognition challenge", "Crowded 9-candidate field"],
                        fundraising: nil,
                        polling: "Among top tier"
                    ),
                    Candidate(
                        id: UUID(),
                        name: "Chris Bell",
                        party: "Democrat",
                        isIncumbent: false,
                        isRecommended: false,
                        summary: "Former U.S. Representative from Houston. Previously ran for Governor in 2006. Most experienced candidate in terms of federal office.",
                        background: "Former U.S. Representative (2003-2005). Houston City Council member. Attorney. Ran for Governor in 2006 (lost to Rick Perry).",
                        keyPositions: ["Moderate Democratic governance", "Infrastructure", "Ethics reform"],
                        endorsements: [],
                        pros: ["Federal experience", "Previous statewide campaign experience", "Moderate positioning"],
                        cons: ["Lost 2006 Governor's race", "Out of office for two decades", "May lack fresh energy"],
                        fundraising: nil,
                        polling: "Among top tier"
                    ),
                    Candidate(
                        id: UUID(),
                        name: "Andrew White",
                        party: "Democrat",
                        isIncumbent: false,
                        isRecommended: false,
                        summary: "Businessman and son of former Governor Mark White. Ran for Governor in 2018, finished second in the Democratic primary.",
                        background: "Businessman. Son of former Texas Governor Mark White. Ran in the 2018 Democratic gubernatorial primary.",
                        keyPositions: ["Business-friendly Democratic governance", "Education (family legacy)", "Moderate approach"],
                        endorsements: [],
                        pros: ["Name recognition from father's legacy", "Business background", "Previous campaign experience"],
                        cons: ["Lost 2018 primary to Lupe Valdez", "No elected office experience"],
                        fundraising: nil,
                        polling: nil
                    ),
                ],
                isContested: true,
                isKeyRace: true,
                recommendation: RaceRecommendation(
                    candidateId: UUID(),
                    candidateName: "Gina Hinojosa",
                    reasoning: "Austin-area state representative with legislative experience and education expertise. In a 9-candidate field, she has strong local support and progressive credentials.",
                    strategicNotes: "9 candidates — a runoff is very likely. The top two finishers will face off in a May runoff.",
                    caveats: "If you prefer a more moderate candidate or value federal experience, Chris Bell is an alternative.",
                    confidence: .moderate
                )
            ),

            // Lt. Governor
            Race(
                id: UUID(),
                office: "Lieutenant Governor",
                district: nil,
                candidates: [
                    Candidate(
                        id: UUID(),
                        name: "Vikki Goodwin",
                        party: "Democrat",
                        isIncumbent: false,
                        isRecommended: true,
                        summary: "State Representative from Austin (HD-47). Giving up her House seat to run. Real estate background with focus on housing affordability.",
                        background: "Texas State Representative. Former real estate agent. Austin-based.",
                        keyPositions: ["Housing affordability", "Property tax reform", "Public education"],
                        endorsements: [],
                        pros: ["Austin-area candidate", "Real estate/housing expertise", "Legislative experience"],
                        cons: ["Statewide name recognition challenge", "Giving up safe House seat"],
                        fundraising: nil,
                        polling: nil
                    ),
                    Candidate(
                        id: UUID(),
                        name: "Courtney Head",
                        party: "Democrat",
                        isIncumbent: false,
                        isRecommended: false,
                        summary: "Candidate for Lieutenant Governor in the Democratic primary.",
                        background: nil,
                        keyPositions: [],
                        endorsements: [],
                        pros: [],
                        cons: [],
                        fundraising: nil,
                        polling: nil
                    ),
                    Candidate(
                        id: UUID(),
                        name: "Marcos Isaias Velez",
                        party: "Democrat",
                        isIncumbent: false,
                        isRecommended: false,
                        summary: "Candidate for Lieutenant Governor in the Democratic primary.",
                        background: nil,
                        keyPositions: [],
                        endorsements: [],
                        pros: [],
                        cons: [],
                        fundraising: nil,
                        polling: nil
                    ),
                ],
                isContested: true,
                isKeyRace: false,
                recommendation: RaceRecommendation(
                    candidateId: UUID(),
                    candidateName: "Vikki Goodwin",
                    reasoning: "Austin-area state representative with housing and real estate expertise. Most recognizable name in the Democratic Lt. Governor field.",
                    strategicNotes: nil,
                    caveats: nil,
                    confidence: .moderate
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
                        name: "Joe Jaworski",
                        party: "Democrat",
                        isIncumbent: false,
                        isRecommended: true,
                        summary: "Former Galveston mayor and attorney. Ran for AG in 2022. Grandson of Watergate special prosecutor Leon Jaworski.",
                        background: "Former Mayor of Galveston. Attorney. Grandson of Watergate special prosecutor Leon Jaworski. Ran for AG in the 2022 Democratic primary.",
                        keyPositions: ["Rule of law", "Consumer protection", "Environmental enforcement", "Government accountability"],
                        endorsements: [],
                        pros: ["Legal family pedigree (Watergate prosecutor's grandson)", "Executive experience as mayor", "Previous AG campaign — knows the race"],
                        cons: ["Lost 2022 primary runoff to Rochelle Garza", "Galveston-based — less Austin connection"],
                        fundraising: nil,
                        polling: nil
                    ),
                    Candidate(
                        id: UUID(),
                        name: "Nathan Johnson",
                        party: "Democrat",
                        isIncumbent: false,
                        isRecommended: false,
                        summary: "State Senator from Dallas. Experienced legislator with legal background.",
                        background: "Texas State Senator. Attorney. Dallas-based.",
                        keyPositions: ["Legislative reform", "Consumer protection", "Civil rights"],
                        endorsements: [],
                        pros: ["Legislative experience", "Legal background"],
                        cons: [],
                        fundraising: nil,
                        polling: nil
                    ),
                    Candidate(
                        id: UUID(),
                        name: "Anthony \"Tony\" Box",
                        party: "Democrat",
                        isIncumbent: false,
                        isRecommended: false,
                        summary: "Candidate in the Democratic AG primary.",
                        background: nil,
                        keyPositions: [],
                        endorsements: [],
                        pros: [],
                        cons: [],
                        fundraising: nil,
                        polling: nil
                    ),
                ],
                isContested: true,
                isKeyRace: false,
                recommendation: RaceRecommendation(
                    candidateId: UUID(),
                    candidateName: "Joe Jaworski",
                    reasoning: "Most experienced candidate with a legal family legacy (Watergate prosecutor's grandson), executive experience as Galveston mayor, and previous AG campaign knowledge.",
                    strategicNotes: nil,
                    caveats: "Nathan Johnson brings legislative experience as a state senator if that matters more to you.",
                    confidence: .moderate
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
                        name: "Sarah Eckhardt",
                        party: "Democrat",
                        isIncumbent: false,
                        isRecommended: true,
                        summary: "State Senator from Austin. Former Travis County Judge (top county executive). Deep fiscal and government management experience.",
                        background: "Texas State Senator. Former Travis County Judge (2015-2020). Former Travis County Commissioner. Attorney. Austin-based.",
                        keyPositions: ["Fiscal transparency", "Government efficiency", "Environmental protection", "Local government support"],
                        endorsements: [],
                        pros: ["Austin-area candidate", "Executive experience as County Judge", "Deep fiscal knowledge", "Legislative experience"],
                        cons: ["Giving up Senate seat"],
                        fundraising: nil,
                        polling: nil
                    ),
                    Candidate(
                        id: UUID(),
                        name: "Savant Moore",
                        party: "Democrat",
                        isIncumbent: false,
                        isRecommended: false,
                        summary: "Candidate in the Democratic Comptroller primary.",
                        background: nil,
                        keyPositions: [],
                        endorsements: [],
                        pros: [],
                        cons: [],
                        fundraising: nil,
                        polling: nil
                    ),
                    Candidate(
                        id: UUID(),
                        name: "Michael Lange",
                        party: "Democrat",
                        isIncumbent: false,
                        isRecommended: false,
                        summary: "Candidate in the Democratic Comptroller primary.",
                        background: nil,
                        keyPositions: [],
                        endorsements: [],
                        pros: [],
                        cons: [],
                        fundraising: nil,
                        polling: nil
                    ),
                ],
                isContested: true,
                isKeyRace: false,
                recommendation: RaceRecommendation(
                    candidateId: UUID(),
                    candidateName: "Sarah Eckhardt",
                    reasoning: "Austin-based state senator with executive experience as Travis County Judge. Deep fiscal and government management background makes her the strongest candidate for Comptroller.",
                    strategicNotes: nil,
                    caveats: nil,
                    confidence: .strong
                )
            ),

            // US Representative CD-37
            Race(
                id: UUID(),
                office: "U.S. Representative",
                district: "District 37",
                candidates: [
                    Candidate(
                        id: UUID(),
                        name: "Greg Casar",
                        party: "Democrat",
                        isIncumbent: true,
                        isRecommended: true,
                        summary: "First-term incumbent, former Austin City Council member and labor organizer. Progressive champion in a safe D+26 seat. Member of the Congressional Progressive Caucus.",
                        background: "U.S. Representative since 2023. Former Austin City Council member (District 4). Labor organizer. Member of the Congressional Progressive Caucus.",
                        keyPositions: ["Workers' rights", "Medicare for All", "Housing affordability", "Immigration reform"],
                        endorsements: ["Congressional Progressive Caucus", "AFL-CIO"],
                        pros: ["Strong constituent services", "Visible and accessible in district", "Effective coalition-builder", "Safe seat — can focus on policy"],
                        cons: ["Very progressive — some moderates feel unrepresented", "Only one term of experience"],
                        fundraising: "Well-funded as incumbent",
                        polling: "Heavy favorite"
                    ),
                    Candidate(
                        id: UUID(),
                        name: "Esther Amalia De Jesus Fleharty",
                        party: "Democrat",
                        isIncumbent: false,
                        isRecommended: false,
                        summary: "Challenger to Casar in the CD-37 Democratic primary.",
                        background: nil,
                        keyPositions: [],
                        endorsements: [],
                        pros: ["Offers an alternative to the incumbent"],
                        cons: ["Very low name recognition", "No significant campaign infrastructure against a popular incumbent"],
                        fundraising: nil,
                        polling: nil
                    ),
                ],
                isContested: true,
                isKeyRace: false,
                recommendation: RaceRecommendation(
                    candidateId: UUID(),
                    candidateName: "Greg Casar",
                    reasoning: "Popular first-term incumbent with strong constituent services in a safe Democratic seat. No compelling reason to unseat him.",
                    strategicNotes: nil,
                    caveats: nil,
                    confidence: .strong
                )
            ),

            // County Commissioner Precinct 2
            Race(
                id: UUID(),
                office: "County Commissioner",
                district: "Precinct 2",
                candidates: [
                    Candidate(
                        id: UUID(),
                        name: "Brigid Shea",
                        party: "Democrat",
                        isIncumbent: true,
                        isRecommended: true,
                        summary: "Incumbent Commissioner. Environmental advocate with focus on water quality, flooding, and transportation. Seeking re-election.",
                        background: "Travis County Commissioner since 2015. Environmental advocate. Former journalist.",
                        keyPositions: ["Environmental protection", "Flood mitigation", "Transportation", "Responsible growth"],
                        endorsements: [],
                        pros: ["Incumbent experience", "Deep knowledge of county operations", "Environmental leadership"],
                        cons: ["Some feel county needs fresh energy", "Long tenure"],
                        fundraising: nil,
                        polling: "Favored as incumbent"
                    ),
                    Candidate(
                        id: UUID(),
                        name: "Rick Astray-Caneda III",
                        party: "Democrat",
                        isIncumbent: false,
                        isRecommended: false,
                        summary: "Challenger for the Precinct 2 Commissioner seat.",
                        background: nil,
                        keyPositions: [],
                        endorsements: [],
                        pros: [],
                        cons: [],
                        fundraising: nil,
                        polling: nil
                    ),
                    Candidate(
                        id: UUID(),
                        name: "Amanda Marzullo",
                        party: "Democrat",
                        isIncumbent: false,
                        isRecommended: false,
                        summary: "Challenger for the Precinct 2 Commissioner seat.",
                        background: nil,
                        keyPositions: [],
                        endorsements: [],
                        pros: [],
                        cons: [],
                        fundraising: nil,
                        polling: nil
                    ),
                    Candidate(
                        id: UUID(),
                        name: "Reese Ricci Armstrong",
                        party: "Democrat",
                        isIncumbent: false,
                        isRecommended: false,
                        summary: "Challenger for the Precinct 2 Commissioner seat.",
                        background: nil,
                        keyPositions: [],
                        endorsements: [],
                        pros: [],
                        cons: [],
                        fundraising: nil,
                        polling: nil
                    ),
                ],
                isContested: true,
                isKeyRace: true,
                recommendation: RaceRecommendation(
                    candidateId: UUID(),
                    candidateName: "Brigid Shea",
                    reasoning: "Experienced incumbent with deep knowledge of county operations. Environmental and infrastructure focus addresses key Austin-area concerns.",
                    strategicNotes: "Four-way race — if no one gets 50%, expect a runoff.",
                    caveats: nil,
                    confidence: .moderate
                )
            ),

            // County Commissioner Precinct 4 (open seat — Margaret Gomez retiring)
            Race(
                id: UUID(),
                office: "County Commissioner",
                district: "Precinct 4",
                candidates: [
                    Candidate(
                        id: UUID(),
                        name: "Susanna Ledesma-Woody",
                        party: "Democrat",
                        isIncumbent: false,
                        isRecommended: false,
                        summary: "Candidate for the open Precinct 4 seat after Margaret Gomez's retirement.",
                        background: nil,
                        keyPositions: [],
                        endorsements: [],
                        pros: [],
                        cons: [],
                        fundraising: nil,
                        polling: nil
                    ),
                    Candidate(
                        id: UUID(),
                        name: "Ofelia Maldonado Zapata",
                        party: "Democrat",
                        isIncumbent: false,
                        isRecommended: false,
                        summary: "Candidate for the open Precinct 4 seat.",
                        background: nil,
                        keyPositions: [],
                        endorsements: [],
                        pros: [],
                        cons: [],
                        fundraising: nil,
                        polling: nil
                    ),
                    Candidate(
                        id: UUID(),
                        name: "George Morales III",
                        party: "Democrat",
                        isIncumbent: false,
                        isRecommended: false,
                        summary: "Candidate for the open Precinct 4 seat.",
                        background: nil,
                        keyPositions: [],
                        endorsements: [],
                        pros: [],
                        cons: [],
                        fundraising: nil,
                        polling: nil
                    ),
                    Candidate(
                        id: UUID(),
                        name: "Gavino Fernandez, Jr.",
                        party: "Democrat",
                        isIncumbent: false,
                        isRecommended: false,
                        summary: "Candidate for the open Precinct 4 seat.",
                        background: nil,
                        keyPositions: [],
                        endorsements: [],
                        pros: [],
                        cons: [],
                        fundraising: nil,
                        polling: nil
                    ),
                ],
                isContested: true,
                isKeyRace: true,
                recommendation: RaceRecommendation(
                    candidateId: UUID(),
                    candidateName: "Susanna Ledesma-Woody",
                    reasoning: "Open seat with four candidates — all relatively unknown. Research each candidate's background and community involvement before deciding.",
                    strategicNotes: "Open seat after long-serving Commissioner Gomez's retirement. Four-way race makes a runoff likely.",
                    caveats: "Limited public information available. Do your own research on these candidates.",
                    confidence: .weak
                )
            ),

            // State Representative District 49 (open seat — 8 candidates!)
            Race(
                id: UUID(),
                office: "State Representative",
                district: "District 49",
                candidates: [
                    Candidate(
                        id: UUID(),
                        name: "Kathie Tovo",
                        party: "Democrat",
                        isIncumbent: false,
                        isRecommended: true,
                        summary: "Former Austin City Council member (District 9) and former Mayor Pro Tem. Extensive local government experience. Well-known in Austin politics.",
                        background: "Former Austin City Council member. Former Mayor Pro Tem. Adjunct professor. Deep roots in Austin civic life.",
                        keyPositions: ["Housing affordability", "Homelessness policy", "Transportation", "Local governance"],
                        endorsements: [],
                        pros: ["Most government experience in the field", "Well-known in Austin politics", "Deep policy knowledge"],
                        cons: ["City council tenure was sometimes polarizing", "Some see her as an insider"],
                        fundraising: nil,
                        polling: nil
                    ),
                    Candidate(
                        id: UUID(),
                        name: "Sam Slade",
                        party: "Democrat",
                        isIncumbent: false,
                        isRecommended: false,
                        summary: "Candidate in the HD-49 open seat race.",
                        background: nil,
                        keyPositions: [],
                        endorsements: [],
                        pros: [],
                        cons: [],
                        fundraising: nil,
                        polling: nil
                    ),
                    Candidate(
                        id: UUID(),
                        name: "Montserrat Garibay",
                        party: "Democrat",
                        isIncumbent: false,
                        isRecommended: false,
                        summary: "Former Austin ISD board trustee and education advocate.",
                        background: "Former Austin ISD board trustee. Education and labor advocate.",
                        keyPositions: ["Public education", "Workers' rights", "Immigration"],
                        endorsements: [],
                        pros: ["Education policy experience", "Labor and community organizing background"],
                        cons: [],
                        fundraising: nil,
                        polling: nil
                    ),
                    Candidate(
                        id: UUID(),
                        name: "Kimmie Ellison",
                        party: "Democrat",
                        isIncumbent: false,
                        isRecommended: false,
                        summary: "Candidate in the HD-49 open seat race.",
                        background: nil,
                        keyPositions: [],
                        endorsements: [],
                        pros: [],
                        cons: [],
                        fundraising: nil,
                        polling: nil
                    ),
                ],
                isContested: true,
                isKeyRace: true,
                recommendation: RaceRecommendation(
                    candidateId: UUID(),
                    candidateName: "Kathie Tovo",
                    reasoning: "Most experienced candidate with deep Austin government experience as a former City Council member and Mayor Pro Tem. In an 8-candidate field, her name recognition and policy depth stand out.",
                    strategicNotes: "8 candidates — a runoff is almost certain. This open seat is one of the most competitive local Democratic primaries.",
                    caveats: "If education is your top priority, Montserrat Garibay's AISD board experience may be more relevant.",
                    confidence: .moderate
                )
            ),

            // State Representative District 48 (Donna Howard — unopposed)
            Race(
                id: UUID(),
                office: "State Representative",
                district: "District 48",
                candidates: [
                    Candidate(
                        id: UUID(),
                        name: "Donna Howard",
                        party: "Democrat",
                        isIncumbent: true,
                        isRecommended: true,
                        summary: "Long-serving incumbent. Registered nurse turned legislator. Known for healthcare and education advocacy in the Texas House.",
                        background: "Texas State Representative since 2006. Registered nurse. Serves on Appropriations and Public Education committees.",
                        keyPositions: ["Healthcare access", "Public education funding", "Women's health", "Budget oversight"],
                        endorsements: ["Texas State Teachers Association"],
                        pros: ["Deep legislative experience", "Healthcare expertise as an RN", "Strong committee positions"],
                        cons: [],
                        fundraising: nil,
                        polling: "Unopposed in primary"
                    ),
                ],
                isContested: false,
                isKeyRace: false,
                recommendation: nil
            ),

            // State Board of Education District 5
            Race(
                id: UUID(),
                office: "State Board of Education",
                district: "District 5",
                candidates: [
                    Candidate(
                        id: UUID(),
                        name: "Allison Bush",
                        party: "Democrat",
                        isIncumbent: false,
                        isRecommended: false,
                        summary: "Candidate for SBOE District 5.",
                        background: nil,
                        keyPositions: [],
                        endorsements: [],
                        pros: [],
                        cons: [],
                        fundraising: nil,
                        polling: nil
                    ),
                    Candidate(
                        id: UUID(),
                        name: "Victor Sampson",
                        party: "Democrat",
                        isIncumbent: false,
                        isRecommended: false,
                        summary: "Candidate for SBOE District 5.",
                        background: nil,
                        keyPositions: [],
                        endorsements: [],
                        pros: [],
                        cons: [],
                        fundraising: nil,
                        polling: nil
                    ),
                    Candidate(
                        id: UUID(),
                        name: "Neto Longoria",
                        party: "Democrat",
                        isIncumbent: false,
                        isRecommended: false,
                        summary: "Candidate for SBOE District 5.",
                        background: nil,
                        keyPositions: [],
                        endorsements: [],
                        pros: [],
                        cons: [],
                        fundraising: nil,
                        polling: nil
                    ),
                    Candidate(
                        id: UUID(),
                        name: "Stephanie Limon Bazan",
                        party: "Democrat",
                        isIncumbent: false,
                        isRecommended: false,
                        summary: "Candidate for SBOE District 5.",
                        background: nil,
                        keyPositions: [],
                        endorsements: [],
                        pros: [],
                        cons: [],
                        fundraising: nil,
                        polling: nil
                    ),
                ],
                isContested: true,
                isKeyRace: false,
                recommendation: RaceRecommendation(
                    candidateId: UUID(),
                    candidateName: "Allison Bush",
                    reasoning: "6-candidate field for SBOE District 5. Research each candidate's education background and priorities. The State Board of Education sets curriculum standards and textbook adoption for all Texas public schools.",
                    strategicNotes: "This down-ballot race has outsized impact — SBOE decisions affect millions of Texas students.",
                    caveats: "Limited public information available. Do your own research.",
                    confidence: .weak
                )
            ),
        ]
    }

    // MARK: - Democratic Propositions (real March 2026 — 13 propositions)

    private static var sampleDemPropositions: [Proposition] {
        [
            Proposition(id: UUID(), number: 1, title: "Expand Medicaid",
                        description: "Texas should expand Medicaid to ensure access to affordable healthcare for all residents.",
                        recommendation: .leanYes, reasoning: "Texas has the highest uninsured rate in the nation. Medicaid expansion would cover over a million Texans using available federal funding."),
            Proposition(id: UUID(), number: 2, title: "Humane immigration reform",
                        description: "Texas should adopt humane and dignified immigration policies and clear pathways to citizenship.",
                        recommendation: .yourCall, reasoning: "Depends on your immigration priorities. Both humanitarian and practical arguments exist."),
            Proposition(id: UUID(), number: 3, title: "Reproductive rights",
                        description: "Texans should have the right to make their own healthcare decisions, including reproductive rights, with removal of insurance barriers to treatment.",
                        recommendation: .leanYes, reasoning: "Core Democratic platform issue. Aligns with bodily autonomy and personal healthcare decision-making."),
            Proposition(id: UUID(), number: 4, title: "Housing affordability",
                        description: "The state should use funding and regulation to address the housing crisis in urban and rural communities.",
                        recommendation: .leanYes, reasoning: "Housing costs are a top concern across Texas, especially in Austin."),
            Proposition(id: UUID(), number: 5, title: "Public school funding",
                        description: "Texas should equalize per-pupil spending to the national average. Texas currently ranks 42nd.",
                        recommendation: .leanYes, reasoning: "Texas ranks near the bottom in per-pupil education spending despite a growing economy."),
            Proposition(id: UUID(), number: 6, title: "Online voter registration",
                        description: "Texas should implement secure online voter registration, already used by 42 other states.",
                        recommendation: .leanYes, reasoning: "42 other states already do this. Modernizes voter access without compromising security."),
            Proposition(id: UUID(), number: 7, title: "Environmental standards",
                        description: "Texas should enforce stricter environmental standards for air, water, and biodiversity.",
                        recommendation: .leanYes, reasoning: "Austin and Texas face growing environmental challenges including air quality, water scarcity, and urban heat."),
            Proposition(id: UUID(), number: 8, title: "Cannabis legalization",
                        description: "Texas should legalize adult cannabis use and automatically expunge past cannabis-related convictions.",
                        recommendation: .yourCall, reasoning: "Combines drug policy reform with criminal justice reform. Depends on your personal stance."),
            Proposition(id: UUID(), number: 9, title: "Raise state employee wages",
                        description: "State and school employee salaries should be raised to national averages with biennial cost-of-living adjustments.",
                        recommendation: .leanYes, reasoning: "Texas state employees and teachers are paid below national averages, contributing to recruitment and retention challenges."),
            Proposition(id: UUID(), number: 10, title: "Redistricting reform",
                        description: "Texas should ban racially motivated and mid-decade redistricting.",
                        recommendation: .leanYes, reasoning: "Fair maps are foundational to representative democracy. Texas has a long history of redistricting controversies."),
            Proposition(id: UUID(), number: 11, title: "Fair taxation",
                        description: "The federal tax burden should shift to the wealthiest individuals with working-class income tax relief.",
                        recommendation: .yourCall, reasoning: "Depends on your views on federal tax policy and progressivity."),
            Proposition(id: UUID(), number: 12, title: "Expand public transit",
                        description: "Texas should expand accessible transit in rural and urban areas.",
                        recommendation: .leanYes, reasoning: "Transportation is a top Austin concern. Expanded transit reduces congestion and improves access."),
            Proposition(id: UUID(), number: 13, title: "Red flag gun safety laws",
                        description: "Texas should enact Extreme Risk Protection Orders to prevent individuals with a history of domestic abuse from purchasing firearms.",
                        recommendation: .yourCall, reasoning: "Gun policy is deeply personal. Balances public safety with Second Amendment concerns."),
        ]
    }
}
