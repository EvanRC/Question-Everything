
const categoryMapping = {
    api1: 9,  // General Knowledge
    api2: 21, // Sports
    api3: 23, // History
    api4: 27, // Animals
    api5: 15, // Video Games
    api6: 26, // Celebrities
};

document.addEventListener('DOMContentLoaded', function () {
    questionListContainer = document.getElementById('questionList2');

    if (questionListContainer) {
        questionListContainer.addEventListener('click', function (event) {
            const button = event.target;
            if (button.tagName === 'BUTTON') {
                const selectedAnswer = button.getAttribute('data-answer');
                handleAnswerClick(selectedAnswer);
                resetTimer();
            }
        });
    }
});

let template = ({ question, shuffled_answers }) => `
<div id="question-template">
    <div class="question">
        <p>${question}</p>
        <ul>
            ${shuffled_answers.map(answer => `<li><button data-answer="${answer}">${answer}</button></li>`).join('')}
        </ul>
    </div>
</div>
`

let timerTemplate = (timeLeft) => `
<div id="timerDisplay">
    Time left: ${timeLeft} seconds
</div>
`

let currentQuestionIndex = 0;
let questionListContainer;
let data;
let score = 0;
let gameOver = false;

socket = io()

function startGame() {
    // Reset game state 
    currentQuestionIndex = 0;
    score = 0;
    gameOver = false;

    // Fetch Questions
    searchQuestions();

   // emit 'startGame' event to server
   socket.emit('startGame', { 
    category: selectedCategory,
    difficulty: selectedDifficulty,
   });
}

    function searchQuestions() {
        const timerDisplay = document.getElementById('timerDisplay')
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
                data = apiData;
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

document.getElementById('startGameButton').addEventListener('click', startGame);


// When a user selects a difficulty and starts the game
const selectedDifficulty = document.getElementById('difficultyDropdown')

socket.emit('startGame', { difficulty: selectedDifficulty });

function renderQuestion(index, data) {
    const question = data.results[index];
    question.question = decodeEntities(question.question);
    question.correct_answer = decodeEntities(question.correct_answer);
    question.incorrect_answers = question.incorrect_answers.map(decodeEntities);

    const allAnswers = [question.correct_answer, ...question.incorrect_answers];

    shuffleArray(allAnswers);

    question.shuffled_answers = allAnswers;

    const html = template(question);
    questionListContainer.innerHTML = html;

    // Send the current wuestion to the server
    const currentQuestionDara = data.results[index];
    socket.emit('updateCurrentQuestion', currenQuestionData);

    startTimer();


}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

let timer;
let remainingTime;

function startTimer() {
    if (gameOver) {
        return;
    }

    clearInterval(timer);

    const timeLimitInSeconds = 20;
    remainingTime = timeLimitInSeconds;
    updateTimerDisplay();

    timer = setInterval(() => {
        remainingTime--;
        console.log("Decrementing Time: ", remainingTime);
        updateTimerDisplay();

        if (remainingTime <= 0) {
            scrollQuestions(1);
        }
    }, 2000);
}

function updateTimerDisplay() {
    const timerElement = document.getElementById('timerDisplay');
    if (timerElement) {
        timerElement.textContent = 'Time Remaining: ' + remainingTime + ' seconds';
    }
}

function resetTimer() {
    clearTimeout(timer);

    startTimer();
}

function scrollQuestions(direction) {
    if (gameOver || !data) {
        console.error('Game Over or Data is not available.');
        return;
    }

    const totalQuestions = data.results.length;

    currentQuestionIndex += direction;

    if (currentQuestionIndex < 0 || currentQuestionIndex >= totalQuestions) {
        stopTimer(); // Stop the timer when the game is over
        displayGameOverMessage(); // Display Game Over message
        return;
    }

    renderQuestion(currentQuestionIndex, data);
    startTimer();
}

function displayGameOverMessage() {
    if (!gameOver) {
        gameOver = true;
        alert('Game Over');
    }
}

function stopTimer() {
    clearInterval(timer);
}

function handleAnswerClick(selectedAnswer) {
    checkAnswer(selectedAnswer); // This will update the score
    scrollQuestions(1); // Move to the next question
}


function checkAnswer(selectedAnswer) {
    const currentQuestion = data.results[currentQuestionIndex];
    const correctAnswer = currentQuestion.correct_answer;

    if (selectedAnswer === correctAnswer) {
        score++; // Increment score if the answer is correct
        console.log('Correct! Current Score:', score);
    } else {
        console.log('Incorrect. Current Score:', score);
    }

    updateScoreDisplay(); // Update the score display after each question
}

function updateScoreDisplay() {
    const scoreElement = document.getElementById('scoreDisplay');
    if (scoreElement) {
        scoreElement.textContent = 'Score: ' + score;
    }
}

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

// Socket.IO client side implementation 
function sendBoadcast(message) {
    socket.emit('broadcast message', message);
}

socket.on('recieveBroadcast', (message) => {
    console.log('Broadcast recieved:', message);
})

function handleAnswerClick(selectedAnswer) {
    const currentQuestion = data.results[currentQuestionIndex];
    const correctAnswer = currentQuestion.correct_answer;

    // Send the selected answer and the correct answer to the server
    socket.emit('submitAnswer', {
        userId: userId,
        questionId: currentQuestionIndex,
        selectedAnswer: selectedAnswer,
        correctAnswer: correctAnswer
    });

    // Move to the next question
    scrollQuestions(1);

}



function sendScoreToServer(score, category, difficulty) {
    // Make a POST request to the server's '/submit-score' endpoint.
    fetch('/submit-score', {
        method: 'POST', // Specifies the HTTP method, POST, for sending data to the server.
        headers: {
            // Include header to indcate the type of content being sent (JSON)
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            // Convert the score data into a JSON string to send as the request body.
            score: score, // Include the score from the function's argument.
            category: category, // Include the category from the function's argument.
            difficulty: difficulty, // Include the difficulty from the functions argument.
            // userID: 
        }),
    })
        .then(response => response.json()) // Convert response into JSON 
        .then(data => console.log('Score submitted!:', data)) // Log success message and the response data.
        .catch(error => {
            // Catch and log any errors that occur during the fetch request
            console.error('Thee was an error submitting the score:', error)
        });
}


