/* =========================================================
   SBI CLERK PRELIMS CBT ENGINE
   ---------------------------------------------------------
   Pattern:
   English       : 30 Questions / 20 Minutes
   Numerical     : 35 Questions / 20 Minutes
   Reasoning     : 35 Questions / 20 Minutes

   Marking:
   Correct       : +1
   Wrong         : -0.25
   Unattempted   : 0

   Important:
   - Uses VERIFIED questions only
   - Preserves original question order
   - English -> Quant -> Reasoning
   - Each section has its own 20-minute timer
   - Section automatically advances when submitted/time expires
   - Up to 15 papers displayed
========================================================= */

const CONFIG = {
    DATA_FILE: "data/questions.json",

    MAX_PAPERS: 15,

    sections: [
        {
            key: "English",
            title: "English Language",
            short: "English",
            questions: 30,
            marks: 30,
            time: 20 * 60
        },
        {
            key: "Quant",
            title: "Numerical Ability",
            short: "Numerical Ability",
            questions: 35,
            marks: 35,
            time: 20 * 60
        },
        {
            key: "Reasoning",
            title: "Reasoning Ability",
            short: "Reasoning",
            questions: 35,
            marks: 35,
            time: 20 * 60
        }
    ],

    marking: {
        correct: 1,
        wrong: -0.25,
        unanswered: 0
    }
};


/* =========================================================
   GLOBAL STATE
========================================================= */

const state = {
    bank: [],
    papers: [],
    selectedPaper: null,
    test: null
};

let timerInterval = null;


/* =========================================================
   HELPERS
========================================================= */

function $(selector) {
    return document.querySelector(selector);
}

function esc(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function shuffle(array) {
    return [...array].sort(() => Math.random() - 0.5);
}

function formatTime(seconds) {
    seconds = Math.max(0, Math.floor(seconds));

    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function sectionConfig(index) {
    return CONFIG.sections[index];
}


/* =========================================================
   QUESTION VALIDATION
========================================================= */

function isUsableQuestion(q) {

    if (!q) return false;

    // Only validated questions enter the CBT.
    if (q.status && q.status !== "VERIFIED") {
        return false;
    }

    if (!q.question) {
        return false;
    }

    if (!q.options || typeof q.options !== "object") {
        return false;
    }

    if (Object.keys(q.options).length < 4) {
        return false;
    }

    if (!q.canonical_answer) {
        return false;
    }

    return true;
}


/* =========================================================
   PAPER IDENTIFICATION
========================================================= */

function paperKey(q) {

    const year = q.year ?? "Unknown";
    const source = q.source_file ?? "unknown-source";
    const run = q.paper_run ?? 1;

    return `${year}::${source}::${run}`;
}


function paperLabel(paper) {

    return `SBI Clerk ${paper.year} — ${paper.source_file}`;
}


/* =========================================================
   BUILD PAPERS
========================================================= */

function buildPapers() {

    const groups = new Map();

    for (const q of state.bank) {

        if (!isUsableQuestion(q)) {
            continue;
        }

        const key = paperKey(q);

        if (!groups.has(key)) {
            groups.set(key, {
                key,
                year: q.year ?? "Unknown",
                source_file: q.source_file ?? "Unknown",
                paper_run: q.paper_run ?? 1,
                questions: []
            });
        }

        groups.get(key).questions.push(q);
    }


    const papers = Array.from(groups.values());


    // Preserve actual question ordering.
    for (const paper of papers) {

        paper.questions.sort((a, b) => {

            const na = Number(a.question_number ?? 999999);
            const nb = Number(b.question_number ?? 999999);

            return na - nb;
        });


        paper.sections = {};

        for (const sec of CONFIG.sections) {

            paper.sections[sec.key] = paper.questions
                .filter(q => normalizeSection(q.section) === sec.key)
                .sort((a, b) => {
                    return Number(a.question_number ?? 999999)
                         - Number(b.question_number ?? 999999);
                });
        }


        paper.counts = {
            English: paper.sections.English.length,
            Quant: paper.sections.Quant.length,
            Reasoning: paper.sections.Reasoning.length
        };


        paper.isComplete =
            paper.counts.English === 30 &&
            paper.counts.Quant === 35 &&
            paper.counts.Reasoning === 35;
    }


    // Sort oldest/lowest paper first.
    papers.sort((a, b) => {

        if (Number(a.year) !== Number(b.year)) {
            return Number(a.year) - Number(b.year);
        }

        return String(a.source_file)
            .localeCompare(String(b.source_file), undefined, {
                numeric: true
            });
    });


    state.papers = papers.slice(0, CONFIG.MAX_PAPERS);
}


function normalizeSection(section) {

    const value = String(section ?? "")
        .trim()
        .toLowerCase();

    if (
        value.includes("english") ||
        value === "eng"
    ) {
        return "English";
    }

    if (
        value.includes("quant") ||
        value.includes("numerical") ||
        value.includes("numeric")
    ) {
        return "Quant";
    }

    if (
        value.includes("reason")
    ) {
        return "Reasoning";
    }

    return section;
}


/* =========================================================
   HOME / PAPER LIST
========================================================= */

function renderHome() {

    clearTimer();

    const available = state.papers.length;

    let paperCards = "";

    for (let i = 0; i < CONFIG.MAX_PAPERS; i++) {

        const paper = state.papers[i];

        if (!paper) {

            paperCards += `
                <div class="paper-card disabled">
                    <div class="paper-number">
                        PAPER ${String(i + 1).padStart(2, "0")}
                    </div>

                    <div class="paper-title">
                        Not loaded yet
                    </div>

                    <div class="paper-status">
                        Add a verified paper to the question bank
                    </div>
                </div>
            `;

            continue;
        }


        const completeClass = paper.isComplete
            ? "available"
            : "incomplete";


        const button = paper.isComplete
            ? `
                <button
                    class="start-paper"
                    onclick="startPaper('${esc(paper.key)}')"
                >
                    Start Paper
                </button>
            `
            : `
                <button class="start-paper disabled-button" disabled>
                    Incomplete Paper
                </button>
            `;


        paperCards += `
            <div class="paper-card ${completeClass}">

                <div class="paper-top">

                    <div class="paper-number">
                        PAPER ${String(i + 1).padStart(2, "0")}
                    </div>

                    <div class="paper-check">
                        ${paper.isComplete ? "READY" : "CHECK DATA"}
                    </div>

                </div>


                <h2>
                    ${esc(paperLabel(paper))}
                </h2>


                <div class="paper-source">
                    Source: ${esc(paper.source_file)}
                </div>


                <div class="paper-counts">

                    <div>
                        <strong>${paper.counts.English}</strong>
                        <span>English</span>
                    </div>

                    <div>
                        <strong>${paper.counts.Quant}</strong>
                        <span>Numerical</span>
                    </div>

                    <div>
                        <strong>${paper.counts.Reasoning}</strong>
                        <span>Reasoning</span>
                    </div>

                </div>


                <div class="paper-total">
                    ${paper.questions.length} verified questions
                </div>


                ${button}

            </div>
        `;
    }


    $('#app').innerHTML = `

        <header class="home-header">

            <div>

                <div class="brand">
                    SBI CLERK
                </div>

                <div class="brand-sub">
                    PRELIMS COMPUTER BASED TEST
                </div>

            </div>

        </header>


        <main class="home-container">

            <section class="hero">

                <div class="hero-badge">
                    REALISTIC CBT MODE
                </div>

                <h1>
                    SBI Clerk Prelims
                </h1>

                <p>
                    Select a Previous Year Paper and attempt it
                    exactly as a three-section CBT.
                </p>


                <div class="exam-rules">

                    <div>
                        <strong>100</strong>
                        <span>Total Questions</span>
                    </div>

                    <div>
                        <strong>60</strong>
                        <span>Total Minutes</span>
                    </div>

                    <div>
                        <strong>+1</strong>
                        <span>Correct</span>
                    </div>

                    <div>
                        <strong>-0.25</strong>
                        <span>Wrong</span>
                    </div>

                </div>

            </section>


            <section class="instructions">

                <h2>
                    Prelims Pattern
                </h2>

                <div class="section-rules">

                    <div class="rule english">
                        <span class="rule-number">01</span>
                        <div>
                            <strong>English Language</strong>
                            <span>30 Questions · 20 Minutes</span>
                        </div>
                    </div>


                    <div class="rule quant">
                        <span class="rule-number">02</span>
                        <div>
                            <strong>Numerical Ability</strong>
                            <span>35 Questions · 20 Minutes</span>
                        </div>
                    </div>


                    <div class="rule reasoning">
                        <span class="rule-number">03</span>
                        <div>
                            <strong>Reasoning Ability</strong>
                            <span>35 Questions · 20 Minutes</span>
                        </div>
                    </div>

                </div>


                <div class="important-note">

                    <strong>Important:</strong>

                    Each section has a separate 20-minute timer.
                    When the timer reaches zero, the current section
                    is automatically submitted and the next section begins.

                    <br><br>

                    Order:

                    <strong>
                        English → Numerical Ability → Reasoning
                    </strong>

                </div>

            </section>


            <section class="papers-section">

                <div class="section-heading">

                    <div>
                        <h2>
                            Previous Year Papers
                        </h2>

                        <p>
                            ${available} paper(s) currently loaded
                        </p>
                    </div>

                    <div class="paper-limit">
                        MAX 15 PAPERS
                    </div>

                </div>


                <div class="paper-grid">

                    ${paperCards}

                </div>

            </section>

        </main>
    `;
}


/* =========================================================
   START PAPER
========================================================= */

function startPaper(key) {

    const paper = state.papers.find(p => p.key === key);

    if (!paper || !paper.isComplete) {
        alert(
            "This paper does not contain exactly 30 English, 35 Numerical and 35 Reasoning questions."
        );

        return;
    }


    const sections = CONFIG.sections.map(sec => {

        const originalQuestions = paper.sections[sec.key];

        return {
            key: sec.key,
            title: sec.title,
            questions: originalQuestions.map(q => ({
                ...q,
                userAnswer: null,
                marked: false
            })),
            currentIndex: 0,
            startedAt: null,
            endsAt: null,
            submitted: false
        };
    });


    state.selectedPaper = paper;


    state.test = {

        id: `SBI-${Date.now()}`,

        paperKey: paper.key,

        paperLabel: paperLabel(paper),

        startedAt: Date.now(),

        currentSection: 0,

        sections,

        completed: false

    };


    startCurrentSection();

    renderTest();
}


/* =========================================================
   START SECTION
========================================================= */

function startCurrentSection() {

    clearTimer();


    const test = state.test;

    const sectionIndex = test.currentSection;

    const section = test.sections[sectionIndex];

    if (!section) {
        finishTest();
        return;
    }


    const config = sectionConfig(sectionIndex);


    section.startedAt = Date.now();

    section.endsAt =
        Date.now() +
        config.time * 1000;


    section.submitted = false;


    startTimer();
}


/* =========================================================
   TIMER
========================================================= */

function startTimer() {

    clearTimer();

    updateTimerDisplay();

    timerInterval = setInterval(() => {

        updateTimerDisplay();

        const section = currentSection();

        if (!section) return;


        if (Date.now() >= section.endsAt) {

            clearTimer();

            autoSubmitSection();

        }

    }, 250);
}


function updateTimerDisplay() {

    const el = $("#timer");

    if (!el || !state.test) {
        return;
    }


    const section = currentSection();

    if (!section) return;


    const remaining = Math.max(
        0,
        Math.ceil((section.endsAt - Date.now()) / 1000)
    );


    el.textContent = formatTime(remaining);


    el.classList.remove(
        "timer-warning",
        "timer-danger"
    );


    if (remaining <= 60) {

        el.classList.add("timer-danger");

    } else if (remaining <= 300) {

        el.classList.add("timer-warning");

    }


    const progress = document.querySelector("#timer-progress");

    if (progress) {

        const config = sectionConfig(
            state.test.currentSection
        );

        const total = config.time;

        const percentage =
            Math.max(
                0,
                Math.min(
                    100,
                    ((remaining / total) * 100)
                )
            );

        progress.style.width = `${percentage}%`;
    }
}


function clearTimer() {

    if (timerInterval) {

        clearInterval(timerInterval);

        timerInterval = null;
    }
}


/* =========================================================
   CURRENT SECTION / QUESTION
========================================================= */

function currentSection() {

    if (!state.test) return null;

    return state.test.sections[
        state.test.currentSection
    ];
}


function currentQuestion() {

    const section = currentSection();

    if (!section) return null;

    return section.questions[
        section.currentIndex
    ];
}


/* =========================================================
   QUESTION NAVIGATION
========================================================= */

function selectQuestion(index) {

    const section = currentSection();

    if (!section) return;


    if (
        index < 0 ||
        index >= section.questions.length
    ) {
        return;
    }


    section.currentIndex = index;

    renderTest();
}


function nextQuestion() {

    const section = currentSection();

    if (!section) return;


    if (
        section.currentIndex <
        section.questions.length - 1
    ) {

        section.currentIndex++;

        renderTest();

    } else {

        // At the end of the section.
        if (
            confirm(
                "You have reached the last question of this section. Submit this section?"
            )
        ) {

            submitSection();

        }

    }
}


function previousQuestion() {

    const section = currentSection();

    if (!section) return;


    if (section.currentIndex > 0) {

        section.currentIndex--;

        renderTest();
    }
}


/* =========================================================
   ANSWERS
========================================================= */

function chooseAnswer(answer) {

    const q = currentQuestion();

    if (!q) return;

    q.userAnswer = answer;

    renderTest();
}


function toggleReview() {

    const q = currentQuestion();

    if (!q) return;

    q.marked = !q.marked;

    renderTest();
}


/* =========================================================
   SUBMIT SECTION
========================================================= */

function submitSection() {

    const section = currentSection();

    if (!section) return;


    const unanswered =
        section.questions.filter(
            q => !q.userAnswer
        ).length;


    const message =
        unanswered > 0
            ? `You have ${unanswered} unanswered question(s).\n\nSubmit this section and move to the next section?`
            : "Submit this section and move to the next section?";


    if (!confirm(message)) {
        return;
    }


    performSectionSubmit();
}


function autoSubmitSection() {

    const section = currentSection();

    if (!section) return;


    alert(
        `${section.title} time is over.\n\nThe section has been automatically submitted.`
    );


    performSectionSubmit();
}


function performSectionSubmit() {

    clearTimer();


    const section = currentSection();

    if (!section) return;


    section.submitted = true;


    if (
        state.test.currentSection <
        state.test.sections.length - 1
    ) {

        state.test.currentSection++;

        startCurrentSection();

        renderTest();

        return;

    }


    finishTest();
}


/* =========================================================
   FINAL TEST
========================================================= */

function finishTest() {

    clearTimer();


    state.test.completed = true;


    const result = calculateFullResult();


    localStorage.setItem(
        `sbi_result_${state.test.id}`,
        JSON.stringify({
            test: state.test,
            result,
            createdAt: new Date().toISOString()
        })
    );


    renderResult(result);
}


/* =========================================================
   SCORING
========================================================= */

function scoreSection(section) {

    let correct = 0;

    let wrong = 0;

    let unanswered = 0;


    for (const q of section.questions) {

        if (!q.userAnswer) {

            unanswered++;

            continue;
        }


        if (
            String(q.userAnswer).toUpperCase() ===
            String(q.canonical_answer).toUpperCase()
        ) {

            correct++;

        } else {

            wrong++;

        }
    }


    const score =
        correct * CONFIG.marking.correct +
        wrong * CONFIG.marking.wrong;


    const attempted = correct + wrong;


    const accuracy =
        attempted > 0
            ? (correct / attempted) * 100
            : 0;


    return {

        total: section.questions.length,

        correct,

        wrong,

        unanswered,

        attempted,

        score,

        accuracy

    };
}


function calculateFullResult() {

    const sections = state.test.sections.map(
        section => ({
            key: section.key,
            title: section.title,
            result: scoreSection(section)
        })
    );


    const total = sections.reduce(
        (sum, s) => sum + s.result.total,
        0
    );


    const correct = sections.reduce(
        (sum, s) => sum + s.result.correct,
        0
    );


    const wrong = sections.reduce(
        (sum, s) => sum + s.result.wrong,
        0
    );


    const unanswered = sections.reduce(
        (sum, s) => sum + s.result.unanswered,
        0
    );


    const score =
        sections.reduce(
            (sum, s) => sum + s.result.score,
            0
        );


    const attempted = correct + wrong;


    const accuracy =
        attempted > 0
            ? (correct / attempted) * 100
            : 0;


    return {

        total,

        correct,

        wrong,

        unanswered,

        attempted,

        score,

        accuracy,

        sections

    };
}


/* =========================================================
   RENDER TEST
========================================================= */

function renderTest() {

    clearTimer();


    const test = state.test;

    const section = currentSection();

    const q = currentQuestion();


    if (!section || !q) {

        finishTest();

        return;
    }


    const config =
        sectionConfig(
            test.currentSection
        );


    const sectionNumber =
        test.currentSection + 1;


    const questionNumber =
        section.currentIndex + 1;


    const totalQuestions =
        section.questions.length;


    const answered =
        section.questions.filter(
            x => x.userAnswer
        ).length;


    const marked =
        section.questions.filter(
            x => x.marked
        ).length;


    const unanswered =
        totalQuestions - answered;


    let optionsHtml = "";


    for (
        const [key, value]
        of Object.entries(q.options)
    ) {

        const checked =
            q.userAnswer === key
                ? "checked"
                : "";


        optionsHtml += `

            <label
                class="option ${checked ? "selected" : ""}"
            >

                <input
                    type="radio"
                    name="answer"
                    value="${esc(key)}"
                    ${checked}
                    onchange="chooseAnswer('${esc(key)}')"
                >

                <span class="option-letter">
                    ${esc(key)}
                </span>

                <span class="option-text">
                    ${esc(value)}
                </span>

            </label>

        `;
    }


    let paletteHtml = "";


    section.questions.forEach(
        (question, index) => {

            let classes = "palette-btn";


            if (
                index === section.currentIndex
            ) {

                classes += " current";
            }


            if (question.userAnswer) {

                classes += " answered";
            }


            if (question.marked) {

                classes += " review";
            }


            paletteHtml += `

                <button
                    class="${classes}"
                    onclick="selectQuestion(${index})"
                >
                    ${index + 1}
                </button>

            `;
        }
    );


    const canPrevious =
        section.currentIndex > 0;


    const isLast =
        section.currentIndex ===
        section.questions.length - 1;


    $('#app').innerHTML = `

        <header class="exam-header">

            <div class="exam-brand">

                <strong>
                    SBI CLERK PRELIMS
                </strong>

                <span>
                    ${esc(test.paperLabel)}
                </span>

            </div>


            <div class="exam-progress">

                <div class="progress-text">

                    Section
                    ${sectionNumber}
                    of 3

                    <span>
                        ${esc(config.title)}
                    </span>

                </div>

            </div>


            <div class="timer-box">

                <div class="timer-label">
                    TIME LEFT
                </div>

                <div
                    id="timer"
                    class="timer"
                >
                    20:00
                </div>

            </div>

        </header>


        <div class="timer-track">

            <div
                id="timer-progress"
                class="timer-progress"
            ></div>

        </div>


        <div class="section-tabs">

            ${CONFIG.sections.map((s, i) => `

                <div
                    class="
                        section-tab
                        ${i === test.currentSection ? "active" : ""}
                        ${i < test.currentSection ? "done" : ""}
                    "
                >

                    <span>
                        ${i + 1}
                    </span>

                    <div>
                        <strong>
                            ${esc(s.title)}
                        </strong>

                        <small>
                            ${s.questions} Questions · 20 Min
                        </small>
                    </div>

                </div>

            `).join("")}

        </div>


        <main class="exam-layout">


            <!-- QUESTION AREA -->

            <section class="question-panel">


                <div class="question-top">

                    <div>

                        <span class="question-label">
                            ${esc(config.title)}
                        </span>

                        <h1>
                            Question ${questionNumber}
                            <span>
                                / ${totalQuestions}
                            </span>
                        </h1>

                    </div>


                    <div class="question-actions">

                        <button
                            class="review-button
                            ${q.marked ? "active" : ""}"
                            onclick="toggleReview()"
                        >
                            ${q.marked
                                ? "★ Marked"
                                : "☆ Mark for Review"}
                        </button>

                    </div>

                </div>


                <div class="question-meta">

                    <span>
                        ${esc(q.topic || "General")}
                    </span>

                    <span>
                        1 Mark
                    </span>

                    <span>
                        -0.25 Wrong
                    </span>

                </div>


                <article class="question-card">

                    <div class="question-number-large">
                        ${questionNumber}
                    </div>


                    <div class="question-content">

                        <div class="question-text">

                            ${formatQuestion(
                                q.question
                            )}

                        </div>


                        <div class="options">

                            ${optionsHtml}

                        </div>

                    </div>

                </article>


                <div class="navigation-bar">


                    <button
                        class="nav-button secondary"
                        onclick="previousQuestion()"
                        ${!canPrevious ? "disabled" : ""}
                    >
                        ← Previous
                    </button>


                    <button
                        class="nav-button review-nav"
                        onclick="toggleReview()"
                    >
                        ${q.marked
                            ? "Remove Review"
                            : "Mark for Review"}
                    </button>


                    ${
                        !isLast
                        ?

                        `<button
                            class="nav-button primary"
                            onclick="nextQuestion()"
                        >
                            Save & Next →
                        </button>`

                        :

                        `<button
                            class="nav-button primary"
                            onclick="submitSection()"
                        >
                            Submit Section →
                        </button>`
                    }

                </div>


            </section>


            <!-- RIGHT SIDEBAR -->

            <aside class="sidebar">


                <div class="candidate-card">

                    <div class="candidate-avatar">
                        C
                    </div>

                    <div>

                        <strong>
                            SBI Clerk Candidate
                        </strong>

                        <span>
                            CBT Practice Mode
                        </span>

                    </div>

                </div>


                <div class="stats-card">

                    <div class="stats-title">
                        SECTION STATUS
                    </div>


                    <div class="status-grid">

                        <div>
                            <strong>
                                ${answered}
                            </strong>
                            <span>Answered</span>
                        </div>


                        <div>
                            <strong>
                                ${unanswered}
                            </strong>
                            <span>Not Answered</span>
                        </div>


                        <div>
                            <strong>
                                ${marked}
                            </strong>
                            <span>Review</span>
                        </div>

                    </div>

                </div>


                <div class="palette-card">

                    <div class="palette-header">

                        <strong>
                            Question Palette
                        </strong>

                        <span>
                            ${totalQuestions}
                        </span>

                    </div>


                    <div class="palette">

                        ${paletteHtml}

                    </div>


                    <div class="palette-legend">

                        <div>
                            <span class="legend-box answered"></span>
                            Answered
                        </div>

                        <div>
                            <span class="legend-box review"></span>
                            Review
                        </div>

                        <div>
                            <span class="legend-box current"></span>
                            Current
                        </div>

                    </div>

                </div>


                <div class="submit-card">

                    <div>
                        <strong>
                            ${esc(config.title)}
                        </strong>

                        <span>
                            ${totalQuestions} Questions
                            · 20 Minutes
                        </span>
                    </div>


                    <button
                        class="submit-section"
                        onclick="submitSection()"
                    >
                        Submit Section
                    </button>

                </div>


            </aside>


        </main>
    `;


    updateTimerDisplay();

    startTimer();
}


/* =========================================================
   QUESTION TEXT FORMATTING
========================================================= */

function formatQuestion(text) {

    return esc(text)
        .replace(/\n/g, "<br>");
}


/* =========================================================
   RESULT SCREEN
========================================================= */

function renderResult(result) {

    clearTimer();


    const score =
        Number(result.score).toFixed(2);


    $('#app').innerHTML = `

        <header class="result-header">

            <div>

                <strong>
                    SBI CLERK PRELIMS
                </strong>

                <span>
                    TEST COMPLETED
                </span>

            </div>

        </header>


        <main class="result-container">


            <section class="result-hero">

                <div class="result-badge">
                    TEST SUBMITTED
                </div>

                <h1>
                    ${esc(state.test.paperLabel)}
                </h1>

                <p>
                    Your complete Prelims CBT performance
                </p>


                <div class="score-main">

                    <strong>
                        ${score}
                    </strong>

                    <span>
                        / 100
                    </span>

                </div>

            </section>


            <section class="result-stats">


                <div class="result-stat">

                    <strong>
                        ${result.correct}
                    </strong>

                    <span>
                        Correct
                    </span>

                </div>


                <div class="result-stat">

                    <strong>
                        ${result.wrong}
                    </strong>

                    <span>
                        Wrong
                    </span>

                </div>


                <div class="result-stat">

                    <strong>
                        ${result.unanswered}
                    </strong>

                    <span>
                        Unattempted
                    </span>

                </div>


                <div class="result-stat">

                    <strong>
                        ${result.accuracy.toFixed(1)}%
                    </strong>

                    <span>
                        Accuracy
                    </span>

                </div>

            </section>


            <section class="section-results">

                <h2>
                    Section-wise Performance
                </h2>


                <div class="section-result-grid">

                    ${result.sections.map(
                        section => `

                            <div class="section-result">

                                <div class="section-result-title">

                                    <strong>
                                        ${esc(section.title)}
                                    </strong>

                                    <span>
                                        ${section.result.score.toFixed(2)}
                                        / ${section.result.total}
                                    </span>

                                </div>


                                <div class="result-line">

                                    <span>
                                        Correct
                                    </span>

                                    <strong>
                                        ${section.result.correct}
                                    </strong>

                                </div>


                                <div class="result-line">

                                    <span>
                                        Wrong
                                    </span>

                                    <strong>
                                        ${section.result.wrong}
                                    </strong>

                                </div>


                                <div class="result-line">

                                    <span>
                                        Unattempted
                                    </span>

                                    <strong>
                                        ${section.result.unanswered}
                                    </strong>

                                </div>


                                <div class="result-line">

                                    <span>
                                        Accuracy
                                    </span>

                                    <strong>
                                        ${section.result.accuracy.toFixed(1)}%
                                    </strong>

                                </div>

                            </div>

                        `
                    ).join("")}

                </div>

            </section>


            <div class="result-actions">

                <button
                    class="nav-button primary"
                    onclick="renderHome()"
                >
                    ← Back to Papers
                </button>

            </div>


        </main>
    `;
}


/* =========================================================
   BOOT
========================================================= */

async function boot() {

    try {

        const response =
            await fetch(CONFIG.DATA_FILE);


        if (!response.ok) {

            throw new Error(
                `Unable to load ${CONFIG.DATA_FILE}`
            );
        }


        state.bank =
            await response.json();


        if (!Array.isArray(state.bank)) {

            throw new Error(
                "questions.json must contain an array."
            );
        }


        buildPapers();

        renderHome();


    } catch (error) {

        console.error(error);


        $('#app').innerHTML = `

            <div class="fatal-error">

                <h1>
                    SBI Clerk CBT could not start
                </h1>

                <p>
                    ${esc(error.message)}
                </p>

                <p>
                    Check that:
                </p>

                <ul>

                    <li>
                        data/questions.json exists
                    </li>

                    <li>
                        GitHub Pages is publishing the repository root
                    </li>

                    <li>
                        the JSON file is valid
                    </li>

                </ul>

            </div>
        `;
    }
}


boot();


/* =========================================================
   GLOBAL EXPORTS
========================================================= */

window.startPaper = startPaper;
window.selectQuestion = selectQuestion;
window.nextQuestion = nextQuestion;
window.previousQuestion = previousQuestion;
window.chooseAnswer = chooseAnswer;
window.toggleReview = toggleReview;
window.submitSection = submitSection;
window.renderHome = renderHome;