const defaultSubjects = {
    "Mathematics": {
        category: "mathematics",
        subjects: [
            { name: "Calculus 1 (Limits, Derivatives, Basic Integration)", id: "calc1" },
            { name: "Calculus 2 (Integration Techniques, Series, Sequences)", id: "calc2", prereq: ["calc1"] },
            { name: "Calculus 3 (Multivariable Calculus)", id: "calc3", prereq: ["calc2"] },
            { name: "Linear Algebra", id: "linalg", coreq: ["calc2"] },
            { name: "Probability & Statistics (Bayesian Approach)", id: "prob", prereq: ["calc2"] },
            { name: "Discrete Mathematics and Combinatorics", id: "discrete" },
            { name: "Logic and Set Theory", id: "logic" },
            { name: "Ordinary Differential Equations (ODEs)", id: "odes", prereq: ["calc3"] },
            { name: "Real Analysis", id: "realanalysis", prereq: ["calc3"], coreq: ["odes"] },
            { name: "Complex Analysis", id: "complexanalysis", prereq: ["realanalysis"] },
            { name: "Fourier Analysis", id: "fourier", prereq: ["odes"], coreq: ["complexanalysis"] },
            { name: "Partial Differential Equations (PDEs)", id: "pdes", prereq: ["odes", "fourier"] },
            { name: "Dynamical Systems", id: "dynamical", prereq: ["odes"], coreq: ["pdes"] },
            { name: "Abstract Algebra (Group Theory)", id: "algebra", prereq: ["realanalysis"] },
            { name: "Topology", id: "topology", prereq: ["realanalysis"], coreq: ["algebra"] },
            { name: "Numerical Methods", id: "numerical", prereq: ["odes", "linalg"] },
            { name: "Optimization", id: "optimization", prereq: ["calc3", "linalg"] },
            { name: "Graph Theory", id: "graph", prereq: ["discrete"] },
            { name: "Information Theory", id: "infotheo", prereq: ["prob"] },
            { name: "Category Theory (Very Basic)", id: "category", prereq: ["algebra"], soft: ["topology"] }
        ]
    },
    "Physics": {
        category: "physics",
        subjects: [
            { name: "Classical Mechanics (including Lagrangian/Hamiltonian)", id: "classical", prereq: ["calc3"], coreq: ["odes"] },
            { name: "Thermodynamics", id: "thermo", prereq: ["calc2"] },
            { name: "Electromagnetism", id: "em", prereq: ["calc3"], soft: ["classical"] },
            { name: "Quantum Mechanics", id: "quantum", prereq: ["linalg", "complexanalysis", "odes", "classical"] },
            { name: "Statistical Mechanics", id: "statmech", prereq: ["thermo", "prob"], coreq: ["quantum"] },
            { name: "Relativity (Special & General)", id: "relativity", prereq: ["em", "classical"] },
            { name: "Particle Physics", id: "particle", prereq: ["quantum"] },
            { name: "Condensed Matter Physics", id: "condensed", prereq: ["quantum", "statmech"] },
            { name: "Astrophysics", id: "astro", soft: ["em", "thermo", "quantum"] },
            { name: "Observational Astronomy", id: "astronomy", coreq: ["astro"] },
            { name: "Biophysics", id: "biophys", prereq: ["classical", "cellbio"] }
        ]
    },
    "Chemistry & Biochemistry": {
        category: "chemistry",
        subjects: [
            { name: "General Chemistry", id: "genchem", soft: ["calc1"] },
            { name: "Physical Chemistry", id: "physchem", prereq: ["genchem", "calc2"], soft: ["quantum"] },
            { name: "Biochemistry", id: "biochem", prereq: ["molbio", "genchem"] }
        ]
    },
    "Biology & Life Sciences": {
        category: "biology",
        subjects: [
            { name: "Cell Biology", id: "cellbio", coreq: ["genchem"] },
            { name: "Molecular Biology", id: "molbio", prereq: ["cellbio"] },
            { name: "Genetics", id: "genetics", prereq: ["molbio"], coreq: ["biochem"] },
            { name: "Evolution", id: "evolution", prereq: ["genetics"] },
            { name: "Ecology", id: "ecology", prereq: ["evolution"] },
            { name: "Neuroscience", id: "neuro", prereq: ["cellbio"] },
            { name: "Systems Biology", id: "sysbio", prereq: ["graph", "odes"], soft: ["molbio"] },
            { name: "Bioinformatics", id: "bioinfo", prereq: ["molbio", "genetics", "algorithms", "prob"] },
            { name: "Anatomy and Physiology", id: "anatomy", prereq: ["cellbio"] },
            { name: "Microbiology", id: "microbio", prereq: ["cellbio"] },
            { name: "Immunology", id: "immunology", prereq: ["cellbio"] }
        ]
    },
    "Computer Science": {
        category: "cs",
        subjects: [
            { name: "Algorithms", id: "algorithms", coreq: ["discrete"] },
            { name: "Data Structures", id: "datastructures", coreq: ["algorithms"] },
            { name: "Theory of Computation", id: "computation", prereq: ["discrete", "logic"] },
            { name: "Computability Theory", id: "computability", coreq: ["computation"] },
            { name: "Complexity Theory (P vs NP)", id: "complexity", coreq: ["computability"] },
            { name: "Quantum Computing and Computational Complexity", id: "quantumcomp", prereq: ["quantum", "complexity"] },
            { name: "Machine Learning", id: "ml", prereq: ["linalg", "calc2", "prob", "algorithms"] },
            { name: "Deep Learning", id: "dl", prereq: ["ml"] },
            { name: "Reinforcement Learning", id: "rl", prereq: ["ml", "prob"] },
            { name: "Artificial Intelligence", id: "ai", coreq: ["ml"] },
            { name: "AI Safety and Alignment", id: "aisafety", prereq: ["ml", "dl", "rl", "decisiontheory"] },
            { name: "Cybersecurity", id: "security", prereq: ["algorithms", "datastructures"] }
        ]
    },
    "Economics & Finance": {
        category: "economics",
        subjects: [
            { name: "Microeconomics", id: "micro", soft: ["calc1"] },
            { name: "Behavioral Economics", id: "behavioral", prereq: ["micro"], coreq: ["cogpsych"] },
            { name: "Econometrics", id: "econometrics", prereq: ["prob", "micro"] },
            { name: "Game Theory", id: "gametheory", prereq: ["prob", "micro"] },
            { name: "Mechanism Design", id: "mechanism", prereq: ["gametheory"] },
            { name: "Social Choice Theory", id: "socialchoice", prereq: ["gametheory"] },
            { name: "Financial Economics", id: "finecon", prereq: ["micro", "prob"] },
            { name: "Finance/Investing", id: "finance", coreq: ["finecon"] },
            { name: "Accounting", id: "accounting" },
            { name: "Management", id: "management" },
            { name: "Operations Research", id: "opsresearch", soft: ["optimization"] }
        ]
    },
    "Psychology": {
        category: "psychology",
        subjects: [
            { name: "Cognitive Psychology", id: "cogpsych" },
            { name: "Judgment and Decision Making (Kahneman/Tversky)", id: "jdm", soft: ["prob"], coreq: ["cogpsych"] },
            { name: "Evolutionary Psychology", id: "evopsych", prereq: ["evolution"], coreq: ["cogpsych"] },
            { name: "Social Psychology", id: "socialpsych", prereq: ["cogpsych"] }
        ]
    },
    "Philosophy": {
        category: "philosophy",
        subjects: [
            { name: "Epistemology", id: "epistemology", soft: ["logic"] },
            { name: "Philosophy of Science", id: "philsci", coreq: ["epistemology"] },
            { name: "Ethics", id: "ethics" },
            { name: "Meta-ethics", id: "metaethics", prereq: ["ethics"] },
            { name: "Population Ethics and Longtermism", id: "popethics", prereq: ["ethics"], soft: ["metaethics"] },
            { name: "Philosophy of Mind", id: "philmind", coreq: ["cogpsych"], soft: ["neuro"] },
            { name: "Consciousness Studies", id: "consciousness", prereq: ["philmind", "neuro"] },
            { name: "Anthropics", id: "anthropics", prereq: ["prob", "epistemology"] },
            { name: "Formal Decision Theory (CDT, FDT, UDT)", id: "decisiontheory", prereq: ["prob", "gametheory"] }
        ]
    },
    "Social Sciences": {
        category: "social",
        subjects: [
            { name: "Political Economy", id: "polecon", prereq: ["micro"] },
            { name: "Comparative Politics", id: "comppol" },
            { name: "International Relations", id: "ir" },
            { name: "Public Policy", id: "policy" },
            { name: "U.S. Law", id: "uslaw" },
            { name: "International Law", id: "intlaw" },
            { name: "Sociology", id: "sociology" },
            { name: "Social Movements", id: "movements" },
            { name: "Organizations", id: "orgs" },
            { name: "Organizational Behavior", id: "orgbehavior" }
        ]
    },
    "Health Sciences": {
        category: "health",
        subjects: [
            { name: "Epidemiology", id: "epi", prereq: ["prob"] },
            { name: "Pathology", id: "pathology", prereq: ["cellbio"] },
            { name: "Public Health", id: "pubhealth", prereq: ["epi"] },
            { name: "Biosecurity & Pandemic Preparedness", id: "biosecurity", prereq: ["epi", "pubhealth"], soft: ["microbio"] }
        ]
    },
    "History & Humanities": {
        category: "humanities",
        subjects: [
            { name: "Big History", id: "bighist" },
            { name: "Modern History", id: "modernhist" },
            { name: "Intellectual History", id: "intelhist" },
            { name: "History of Science", id: "scihist" },
            { name: "Political History", id: "polhist" },
            { name: "Literary Theory", id: "littheory" },
            { name: "Comparative Literature", id: "complit" },
            { name: "Art History", id: "arthist" },
            { name: "Phonetics", id: "phonetics" }
        ]
    },
    "Languages": {
        category: "languages",
        subjects: [
            { name: "Japanese (continue to fluency)", id: "japanese" },
            { name: "Chinese", id: "chinese" }
        ]
    },
    "Interdisciplinary": {
        category: "interdisciplinary",
        subjects: [
            { name: "Experimental Design", id: "expdesign", prereq: ["prob"] },
            { name: "Forecasting & Prediction", id: "forecasting", prereq: ["prob", "jdm"] },
            { name: "Writing & Communication (rhetoric, technical writing)", id: "writing" },
            { name: "Complexity Science", id: "complexity-sci", prereq: ["dynamical", "graph"], soft: ["statmech"] },
            { name: "Existential Risk Studies", id: "xrisk", prereq: ["aisafety", "biosecurity"], soft: ["philsci"] },
            { name: "Rationality (LessWrong canon)", id: "rationality", prereq: ["prob", "jdm", "decisiontheory"] },
            { name: "Effective Altruism (cause prioritization, career planning)", id: "ea", prereq: ["ethics", "micro", "rationality"] }
        ]
    },
    "Other Subjects": {
        category: "other",
        subjects: [
            { name: "Physical Geography", id: "physgeo" },
            { name: "Human Geography", id: "humangeo" },
            { name: "Improv (Theatre)", id: "improv" },
            { name: "Geology", id: "geology" },
            { name: "Agronomy", id: "agronomy" }
        ]
    }
};
