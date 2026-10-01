const questionInput =
    document.getElementById("question");

const subjectInput =
    document.getElementById("subject");

const answerStyleInput =
    document.getElementById("answerStyle");

const answerLengthInput =
    document.getElementById("answerLength");

const generateButton =
    document.getElementById("generateButton");

const clearButton =
    document.getElementById("clearButton");

const loading =
    document.getElementById("loading");

const errorBox =
    document.getElementById("errorBox");

const resultSection =
    document.getElementById("resultSection");


const resultSubject =
    document.getElementById("resultSubject");

const resultTopic =
    document.getElementById("resultTopic");

const answer =
    document.getElementById("answer");

const explanation =
    document.getElementById("explanation");

const example =
    document.getElementById("example");

const code =
    document.getElementById("code");

const keyPoints =
    document.getElementById("keyPoints");

const importantTerms =
    document.getElementById("importantTerms");

const references =
    document.getElementById("references");


const codeCard =
    document.getElementById("codeCard");

const explanationCard =
    document.getElementById("explanationCard");

const exampleCard =
    document.getElementById("exampleCard");

const referencesCard =
    document.getElementById("referencesCard");


const copyAnswerButton =
    document.getElementById(
        "copyAnswerButton"
    );

const copyCodeButton =
    document.getElementById(
        "copyCodeButton"
    );


const fileInput =
    document.getElementById("fileInput");

const uploadButton =
    document.getElementById("uploadButton");

const uploadStatus =
    document.getElementById("uploadStatus");


const statusDot =
    document.getElementById("statusDot");

const statusText =
    document.getElementById("statusText");


const studyNotesButton =
    document.getElementById(
        "studyNotesButton"
    );

const studyNotes =
    document.getElementById(
        "studyNotes"
    );


// =====================================================
// CHECK OLLAMA
// =====================================================

async function checkHealth() {

    try {

        const response =
            await fetch("/api/health");

        const data =
            await response.json();


        if (
            data.success &&
            data.ollama
        ) {

            statusDot.style.background =
                "#198754";

            statusText.textContent =
                "Local AI Online";

        }
        else {

            statusDot.style.background =
                "#dc3545";

            statusText.textContent =
                "Ollama Offline";
        }

    }
    catch (error) {

        statusDot.style.background =
            "#dc3545";

        statusText.textContent =
            "Ollama Offline";
    }
}


// =====================================================
// GENERATE ANSWER
// =====================================================

async function generateAnswer() {

    const question =
        questionInput.value.trim();


    if (!question) {

        showError(
            "Please enter an assignment question."
        );

        questionInput.focus();

        return;
    }


    hideError();

    setLoading(true);

    resultSection.style.display =
        "none";


    try {

        const response =
            await fetch(
                "/api/ask",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        question: question,

                        subject:
                            subjectInput.value,

                        answer_style:
                            answerStyleInput.value,

                        answer_length:
                            answerLengthInput.value

                    })
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.detail ||
                "Unable to generate answer."
            );
        }


        if (!data.success) {

            throw new Error(
                "AI did not return an answer."
            );
        }


        displayResult(
            data.data
        );

    }
    catch (error) {

        console.error(error);

        showError(
            error.message ||
            "Something went wrong."
        );

    }
    finally {

        setLoading(false);
    }
}


// =====================================================
// DISPLAY RESULT
// =====================================================

function displayResult(data) {

    resultSubject.textContent =
        data.subject ||
        "Unknown";


    resultTopic.textContent =
        data.topic ||
        "General";


    answer.textContent =
        data.answer ||
        "";


    // Explanation

    if (
        data.explanation &&
        data.explanation.trim()
    ) {

        explanationCard.style.display =
            "block";

        explanation.textContent =
            data.explanation;

    }
    else {

        explanationCard.style.display =
            "none";
    }


    // Example

    if (
        data.example &&
        data.example.trim()
    ) {

        exampleCard.style.display =
            "block";

        example.textContent =
            data.example;

    }
    else {

        exampleCard.style.display =
            "none";
    }


    // Code

    if (
        data.code &&
        data.code.trim()
    ) {

        codeCard.style.display =
            "block";

        code.textContent =
            data.code;

    }
    else {

        codeCard.style.display =
            "none";
    }


    // Key points

    keyPoints.innerHTML = "";


    if (
        Array.isArray(
            data.key_points
        )
    ) {

        data.key_points.forEach(
            function(point) {

                const li =
                    document.createElement(
                        "li"
                    );

                li.textContent =
                    point;

                keyPoints.appendChild(
                    li
                );
            }
        );
    }


    // Important terms

    importantTerms.innerHTML = "";


    if (
        Array.isArray(
            data.important_terms
        )
    ) {

        data.important_terms.forEach(
            function(term) {

                const span =
                    document.createElement(
                        "span"
                    );

                span.className =
                    "term";

                span.textContent =
                    term;

                importantTerms.appendChild(
                    span
                );
            }
        );
    }


    // References

    references.innerHTML = "";


    if (
        Array.isArray(
            data.references
        ) &&
        data.references.length > 0
    ) {

        referencesCard.style.display =
            "block";


        data.references.forEach(
            function(reference) {

                const li =
                    document.createElement(
                        "li"
                    );

                li.textContent =
                    reference;

                references.appendChild(
                    li
                );
            }
        );

    }
    else {

        referencesCard.style.display =
            "none";
    }


    resultSection.style.display =
        "block";


    resultSection.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}


// =====================================================
// LOADING
// =====================================================

function setLoading(isLoading) {

    if (isLoading) {

        loading.style.display =
            "flex";

        generateButton.disabled =
            true;

        generateButton.textContent =
            "⏳ Generating...";

    }
    else {

        loading.style.display =
            "none";

        generateButton.disabled =
            false;

        generateButton.textContent =
            "✨ Generate Answer";
    }
}


// =====================================================
// ERROR
// =====================================================

function showError(message) {

    errorBox.textContent =
        message;

    errorBox.style.display =
        "block";
}


function hideError() {

    errorBox.textContent =
        "";

    errorBox.style.display =
        "none";
}


// =====================================================
// CLEAR
// =====================================================

function clearAll() {

    questionInput.value =
        "";

    resultSection.style.display =
        "none";

    studyNotes.style.display =
        "none";

    studyNotes.textContent =
        "";

    hideError();

    questionInput.focus();
}


// =====================================================
// COPY ANSWER
// =====================================================

copyAnswerButton.addEventListener(
    "click",
    async function() {

        const text =
            answer.textContent;

        if (!text) {
            return;
        }


        try {

            await navigator.clipboard
                .writeText(text);

            copyAnswerButton.textContent =
                "Copied!";


            setTimeout(
                function() {

                    copyAnswerButton.textContent =
                        "Copy";

                },
                1500
            );

        }
        catch (error) {

            console.error(error);
        }
    }
);


// =====================================================
// COPY CODE
// =====================================================

copyCodeButton.addEventListener(
    "click",
    async function() {

        const text =
            code.textContent;

        if (!text) {
            return;
        }


        try {

            await navigator.clipboard
                .writeText(text);

            copyCodeButton.textContent =
                "Copied!";


            setTimeout(
                function() {

                    copyCodeButton.textContent =
                        "Copy";

                },
                1500
            );

        }
        catch (error) {

            console.error(error);
        }
    }
);


// =====================================================
// GENERATE STUDY NOTES
// =====================================================

studyNotesButton.addEventListener(
    "click",
    async function() {

        const content =
            answer.textContent;


        if (!content) {

            showError(
                "Generate an answer first."
            );

            return;
        }


        studyNotesButton.disabled =
            true;

        studyNotesButton.textContent =
            "Generating...";


        try {

            const response =
                await fetch(
                    "/api/study-notes",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({

                            question: content

                        })
                    }
                );


            const data =
                await response.json();


            if (!response.ok) {

                throw new Error(
                    data.detail ||
                    "Unable to generate notes."
                );
            }


            studyNotes.style.display =
                "block";

            studyNotes.textContent =
                data.answer || "";

        }
        catch (error) {

            showError(
                error.message
            );

        }
        finally {

            studyNotesButton.disabled =
                false;

            studyNotesButton.textContent =
                "Generate Study Notes";
        }
    }
);


// =====================================================
// FILE UPLOAD
// =====================================================

uploadButton.addEventListener(
    "click",
    async function() {

        const file =
            fileInput.files[0];


        if (!file) {

            uploadStatus.textContent =
                "Please select a file.";

            uploadStatus.style.color =
                "#dc3545";

            return;
        }


        const formData =
            new FormData();

        formData.append(
            "file",
            file
        );


        uploadButton.disabled =
            true;

        uploadButton.textContent =
            "Uploading...";


        try {

            const response =
                await fetch(
                    "/api/upload",
                    {
                        method: "POST",

                        body: formData
                    }
                );


            const data =
                await response.json();


            if (!response.ok) {

                throw new Error(
                    data.detail ||
                    "Upload failed."
                );
            }


            questionInput.value =
                data.text || "";


            uploadStatus.style.color =
                "#198754";

            uploadStatus.textContent =
                "✓ File uploaded and text extracted.";


        }
        catch (error) {

            uploadStatus.style.color =
                "#dc3545";

            uploadStatus.textContent =
                error.message;
        }
        finally {

            uploadButton.disabled =
                false;

            uploadButton.textContent =
                "📤 Upload";
        }
    }
);


// =====================================================
// BUTTON EVENTS
// =====================================================

generateButton.addEventListener(
    "click",
    generateAnswer
);


clearButton.addEventListener(
    "click",
    clearAll
);


// =====================================================
// CTRL + ENTER
// =====================================================

questionInput.addEventListener(
    "keydown",
    function(event) {

        if (
            event.ctrlKey &&
            event.key === "Enter"
        ) {

            event.preventDefault();

            generateAnswer();
        }
    }
);


// =====================================================
// START
// =====================================================

checkHealth();

setInterval(
    checkHealth,
    10000
);