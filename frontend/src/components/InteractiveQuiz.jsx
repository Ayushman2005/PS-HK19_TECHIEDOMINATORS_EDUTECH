import { useState } from "react";
import { motion } from "framer-motion";

export default function InteractiveQuiz({ quizData }) {
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const handleSelect = (qIndex, oIndex) => {
    if (!submitted) {
      setAnswers({ ...answers, [qIndex]: oIndex });
    }
  };

  const score = Object.keys(answers).reduce((acc, qIndex) => {
    return acc + (answers[qIndex] === quizData[qIndex].answer ? 1 : 0);
  }, 0);

  return (
    <div className="interactive-quiz">
      {quizData.map((q, i) => (
        <motion.div 
          key={i} 
          className="quiz-card"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
        >
          <h4 className="quiz-question">{i + 1}. {q.question}</h4>
          <div className="quiz-options">
            {q.options.map((opt, j) => {
              const isSelected = answers[i] === j;
              const isCorrect = submitted && q.answer === j;
              const isWrong = submitted && isSelected && q.answer !== j;
              
              let btnClass = "quiz-opt-btn";
              if (isSelected) btnClass += " selected";
              if (isCorrect) btnClass += " correct";
              if (isWrong) btnClass += " wrong";

              return (
                <button 
                  key={j} 
                  className={btnClass}
                  onClick={() => handleSelect(i, j)}
                  disabled={submitted}
                >
                  <span className="opt-letter">{["A", "B", "C", "D"][j]}</span>
                  {opt}
                </button>
              );
            })}
          </div>
          {submitted && (
            <motion.div 
              className="quiz-explanation"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
            >
              {q.explanation}
            </motion.div>
          )}
        </motion.div>
      ))}
      
      {!submitted ? (
        <button 
          className="quiz-submit-btn" 
          onClick={() => setSubmitted(true)}
          disabled={Object.keys(answers).length < quizData.length}
        >
          Submit Answers
        </button>
      ) : (
        <motion.div 
          className="quiz-score-display"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          Final Score: {score} / {quizData.length}
        </motion.div>
      )}
    </div>
  );
}