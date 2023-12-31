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
    let data;
    let gameOver = false;
    let score = 0;

    const express = require('express');
    const exphbs = require('express-handlebars');
    const path = require('path');
    
    const app = express();
    const port = 3000;

    app.engine('handlebars', exphbs());
    app.set('view engine', 'handlebars');
    app.set('views', path.join(__dirname, 'views'));

    // Register Handlebars partials directory
    exphbs.registerPartials(path.join(__dirname, 'views', 'partials'));

    // Define a route to render the quiz page
    app.get('/quiz', (req, res) => {
        // Retrieve quiz data (questions, options, etc.) and pass it to the template
        const quizData = /* Your logic to retrieve quiz data */
        res.render('quiz', { quizData });
    });

    // Start the server
    app.listen(port, () => {
        console.log(`Server listening at http://localhost:${port}`);
    });
    
    // function searchQuestions() {
    //     const timerDisplay = document.getElementById('timerDisplay')
    //     const categoryDropdown = document.getElementById('categoryDropdown');
    //     const selectedCategory = categoryMapping[categoryDropdown.value];

    //     const difficultyDropdown = document.getElementById('difficultyDropdown');
    //     const selectedDifficulty = difficultyDropdown.value;

    //     if (!selectedCategory || !selectedDifficulty) {
    //         alert('Please select both category and difficulty.');
    //         return;
    //     }

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
            updateTimerDisplay();
    
            if (remainingTime <= 0) {
                scrollQuestions(1);
            }
        }, 1000);
    }

    function updateTimerDisplay() {
        const source = document.getElementById('timer-template').innerHTML;
        const template = Handlebars.compile(source);

        const timerData = {
            timeLeft: remainingTime,
        };

        const html = template(timerData);
        document.getElementById('timerDisplay').innerHTML = html;
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

    function handleAnswerClick(selectedAnswer) {
        // Check the selected answer and update the score
        checkAnswer(selectedAnswer);
        // Move to the next question
        scrollQuestions(1);
    }

    function checkAnswer(selectedAnswer) {
        const currentQuestion = data.results[currentQuestionIndex];
        const correctAnswer = currentQuestion.correct_answer;

        if (selectedAnswer === correctAnswer) {
            score++;
            console.log('Correct! Current Score:', score);
        } else {
            console.log('Incorrect. Current Score:', score);
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

    //Function to send the players's score to the server.
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

    // Other functions or setup can go here

