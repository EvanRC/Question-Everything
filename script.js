const categoryMapping = {
    api1: 9,  // General Knowledge
    api2: 21, // Sports
    api3: 23, // History
    api4: 27, // Animals
    api5: 15, // Video Games
    api6: 26, // Celebrities
};

let currentQuestionIndex = 0;
let questionListContainer;
let data; // Declare data at a broader scope

function searchQuestions() {
    const categoryDropdown = document.getElementById('categoryDropdown');
    const selectedCategory = categoryMapping[categoryDropdown.value];

    const difficultyDropdown = document.getElementById('difficultyDropdown');
    const selectedDifficulty = difficultyDropdown.value;

    if (!selectedCategory || !selectedDifficulty) {
        alert('Please select both category and difficulty.');
        return;
    }

    const apiEndpoint = `https://opentdb.com/api.php?amount=10&category=${selectedCategory}&difficulty=${selectedDifficulty}`;

    fetch(apiEndpoint)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(apiData => {
            data = apiData; // Assign the fetched data to the global variable
            console.log(data);

            if (data.results && Array.isArray(data.results)) {
                questionListContainer.innerHTML = '';
                renderQuestion(currentQuestionIndex, data);
            } else {
                console.error('Invalid data structure:', data);
            }
        })
        .catch(error => {
            console.error('Fetch error:', error);
        });
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function renderQuestion(index, data) {
    const source = document.getElementById('question-template').innerHTML;
    const template = Handlebars.compile(source);

    const question = data.results[index];
    question.question = decodeEntities(question.question);
    question.correct_answer = decodeEntities(question.correct_answer);
    question.incorrect_answers = question.incorrect_answers.map(decodeEntities);

    const allAnswers = [question.correct_answer, ...question.incorrect_answers];

    shuffleArray(allAnswers);

    question.shuffled_answers = allAnswers;

    const html = template(question);
    questionListContainer.innerHTML = html;
}

function scrollQuestions(direction) {
    if (!data) {
        console.error('Data is not available.');
        return;
    }

    const totalQuestions = data.results.length;

    currentQuestionIndex += direction;

    if (currentQuestionIndex < 0) {
        currentQuestionIndex = 0;
    } else if (currentQuestionIndex >= totalQuestions) {
        currentQuestionIndex = totalQuestions - 1;
    }

    renderQuestion(currentQuestionIndex, data);
}

document.addEventListener('DOMContentLoaded', function () {
    questionListContainer = document.getElementById('questionList2');

    if (questionListContainer) {
        questionListContainer.addEventListener('click', function (event) {
            const button = event.target;
            if (button.tagName === 'BUTTON') {
                const answer = button.getAttribute('data-answer');
                handleAnswerClick(answer);
            }
        });
    }
});

function decodeEntities(encodedString) {
    const parser = new DOMParser();
    const dom = parser.parseFromString(`<!doctype html><body>${encodedString}`, 'text/html');
    let decodedString = dom.body.textContent;

    decodedString = decodedString.replace(/&quot;/g, '"');
    decodedString = decodedString.replace(/&amp;/g, '&');
    decodedString = decodedString.replace(/&lt;/g, '<');
    decodedString = decodedString.replace(/&gt;/g, '>');
    decodedString = decodedString.replace(/&#039;/g, "'");
    decodedString = decodedString.replace(/&lsquo;/g, "'");
    decodedString = decodedString.replace(/&rsquo;/g, "'");
    decodedString = decodedString.replace(/&ldquo;/g, '"');
    decodedString = decodedString.replace(/&rdquo;/g, '"');

    return decodedString;
}