
function getQuestions() {
    const dropdown = document.getElementById('categoryDropdown');
    const selectedCategory = dropdown.value;
    const questionListContainer = document.getElementById('questionList');

    const apiEndpoints = {
        api1: 'https://opentdb.com/api.php?amount=10&category=9',
        api2: 'https://opentdb.com/api.php?amount=10&category=21',
        api3: 'https://opentdb.com/api.php?amount=10&category=23',
        api4: 'https://opentdb.com/api.php?amount=10&category=27',
        api5: 'https://opentdb.com/api.php?amount=10&category=15',
        api6: 'https://opentdb.com/api.php?amount=10&category=26',
    };

    fetch(apiEndpoints[selectedCategory])
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log(data)
            if (data.results && Array.isArray(data.results)) {
                questionListContainer.innerHTML = '';

                data.results.forEach((question, index) => {
                    const questionElement = document.createElement('div');
                    questionElement.innerHTML = question.question;

                    const correctAnswerButton = document.createElement('button');
                    correctAnswerButton.textContent = `Correct Answer: ${question.correct_answer}`;
                    correctAnswerButton.addEventListener('click', () => handleAnswerClick(question.correct_answer));
                    questionElement.appendChild(correctAnswerButton);

                    question.incorrect_answers.forEach((incorrectAnswer, i) => {
                        const incorrectAnswerButton = document.createElement('button');
                        incorrectAnswerButton.textContent = `Incorrect Answer ${i + 1}: ${incorrectAnswer}`;
                        incorrectAnswerButton.addEventListener('click', () => handleAnswerClick(incorrectAnswer));
                        questionElement.appendChild(incorrectAnswerButton);
                    });

                    questionListContainer.appendChild(questionElement);
                });
            } else {
                console.error('Invalid data structure:', data);
            }
        })
        .catch(error => {
            console.error('Fetch error:', error);
        });
}

function handleAnswerClick(answer) {
    console.log(`Clicked on answer: ${answer}`);
}

function decodeEntities(encodedString) {
    const parser = new DOMParser();
    const dom = parser.parseFromString(`<!doctype html><body>${encodedString}`, 'text/html');
    let decodedString = dom.body.textContent;

    decodedString = decodedString.replace(/&quot;/g, '"');
    decodedString = decodedString.replace(/&amp;/g, '&');
    decodedString = decodedString.replace(/&lt;/g, '<');
    decodedString = decodedString.replace(/&gt;/g, '>');

    return decodedString;
}