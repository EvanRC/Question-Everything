
const categoryMapping = {
    api1: 9,  // General Knowledge
    api2: 21, // Sports
    api3: 23, // History
    api4: 27, // Animals
    api5: 15, // Video Games
    api6: 26, // Celebrities
};


const socket = io();
let selectedCategory;
let selectedDifficulty;
let userId = localStorage.getItem('userId');

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
    selectedCategory = categoryMapping[categoryDropdown.value];

    const difficultyDropdown = document.getElementById('difficultyDropdown');
    selectedDifficulty = difficultyDropdown.value;

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


// // When a user selects a difficulty and starts the game
// const selectedDifficulty = document.getElementById('difficultyDropdown')
// socket.emit('startGame', { difficulty: selectedDifficulty });

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

    // Send the current Question to the server
    const currentQuestionData = data.results[index];
    socket.emit('updateCurrentQuestion', currentQuestionData);

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

    const timeLimitInSeconds = 10;
    remainingTime = timeLimitInSeconds;
    updateTimerDisplay();

    timer = setInterval(() => {
        remainingTime--;
        console.log("Decrementing Time: ", remainingTime);
        updateTimerDisplay();

        if (remainingTime <= 0) {
            scrollQuestions(1);
        }
    }, 1000);
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

function updateScoreDisplay(newScore) {
    console.log("Updating score display to:", newScore);
    const scoreElement = document.getElementById('scoreDisplay');
    if (scoreElement) {
        scoreElement.textContent = 'Score: ' + newScore;
    }
}

socket.on('updateScore', (data) => {
    console.log("Received score update:", data.newScore);
    updateScoreDisplay(data.newScore);
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

// Socket.IO client side implementation 
function sendBoadcast(message) {
    socket.emit('broadcast message', message);


    socket.on('recieveBroadcast', (message) => {
        console.log('Broadcast recieved:', message);
    })
}

function loginUser(username, password) {
    fetch('/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
    })

    .then(response => response.json())
    .then(data => {
        if (data.message === 'Login successful') {
            // Store the userId 
            userId = data.userId;
            localStorage.setItem('userId', data.userId);

            // handle successful login
            console.log('Login successful, userId:', userId);
            // Redirect to another page or update the UI
        } else {
            // Handle login error
            console.error('Login failed:', data.message);
        }
    })
    .catch(error => {
        console.error('Login error:', error);
        // Show error message to user
    });
}


// Function to create a new game room
function createGame() {
    socket.emit('createGame');
}

function joinGame(roomId) {
    socket.emit('joinGame', roomId);
}

// Event listeners for game creation and joining 
document.getElementById('createRoomButton').addEventListener('click', createGame);
document.getElementById('joinRoomButton').addEventListener('click', () => {
    const roomId = document.getElementById('joinRoomButton').value;
    joinGame(roomId);
});



// Socket event listeners 
socket.on('gameCreated', (roomId) => {
    console.log('Game created with ID:', roomId);
    alert(`Game created! Room ID: ${roomId}`);
});

function handleAnswerClick(selectedAnswer) {
    const currentQuestion = data.results[currentQuestionIndex];
    const correctAnswer = currentQuestion.correct_answer;

    // Send the selected answer and the correct answer to the server
    socket.emit('submitAnswer', {
        userId: userId,
        questionId: currentQuestionIndex,
        selectedAnswer: selectedAnswer,
        correctAnswer: correctAnswer,
        category: selectedCategory,
        difficulty: selectedDifficulty
    });


    setTimeout(() => {
        scrollQuestions(1); // Move to the next question

    }, 1000); // delay by 1 second



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

        }),
    })
        .then(response => response.json()) // Convert response into JSON 
        .then(data => console.log('Score submitted!:', data)) // Log success message and the response data.
        .catch(error => {
            // Catch and log any errors that occur during the fetch request
            console.error('Thee was an error submitting the score:', error)
        });
}

const logOutBtn = document.getElementById('logOutBtn');

document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm'); 
    loginForm.addEventListener('submit', function(event) {
        event.preventDefault(); // Prevents the default form submission 

        const username = document.getElementById('username2').value;
        const password = document.getElementById('password2').value;

        loginUser(username, password);
    });
});



logOutBtn.addEventListener('click', () => {
    fetch('/logout', {
        method: 'POST'
    })
        .then(response => {
            if (response.ok) {
                localStorage.removeItem('userId'); // Remove userId from local storage
                // Handle successful logout (e.g., redirect or display a message)
                window.location.href = '/'; // Redirect to the home page as an example
            } else {
                // Handle logout error (e.g., display an error message)
                console.error('Logout failed:', response.statusText);
            }
        })
        .catch(error => {
            console.error('Logout error:', error);
        });
});
