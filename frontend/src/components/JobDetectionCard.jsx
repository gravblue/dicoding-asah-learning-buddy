import { useState } from "react";
import { Backend } from "../lib/backend";

export default function JobDetectionCard({ onDetect, onClose }) {
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(1); // 1: input, 2: confirmation, 3: assessment, 4: results
  const [detectedData, setDetectedData] = useState(null);
  const [assessment, setAssessment] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [assessmentResults, setAssessmentResults] = useState(null);

  const examples = [
    "Saya tertarik membuat aplikasi web interaktif dengan React dan ingin mendalami frontend development",
    "Saya ingin belajar machine learning dan AI untuk membuat model prediktif",
    "Saya suka menganalisis data dan membuat visualisasi untuk business insights",
    "Saya tertarik dengan cloud computing dan deployment aplikasi di AWS/GCP"
  ];

  // Step 1: Detect Job & Skills
  const handleDetect = async () => {
    if (!description.trim()) {
      setError("Mohon isi deskripsi minat Anda!");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = await Backend.detectJobAndSkills(description, 6);
      setDetectedData(data);
      setStep(2); // Go to confirmation step
    } catch (err) {
      console.error('Detection error:', err);
      setError(err.message || "Gagal mendeteksi job role. Coba lagi!");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Start Assessment
  const handleStartAssessment = async () => {
    setLoading(true);
    setError("");

    try {
      const assessmentData = await Backend.generateAssessment(detectedData.skills, 18);
      setAssessment(assessmentData);
      setStep(3); // Go to assessment
    } catch (err) {
      console.error('Assessment generation error:', err);
      setError(err.message || "Gagal membuat assessment. Coba lagi!");
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Handle Answer
  const handleAnswer = (answer) => {
    const skills = Object.keys(assessment.assessment);
    const currentSkillIdx = Math.floor(currentQuestion / 3);
    const currentSkill = skills[currentSkillIdx];
    const questionIdx = currentQuestion % 3;
    
    console.log(`Answer for ${currentSkill} Q${questionIdx}: ${answer}`);
    
    setAnswers(prev => ({
      ...prev,
      [`${currentSkill}_${questionIdx}`]: answer
    }));

    // Next question
    const totalQuestions = Object.values(assessment.assessment).flat().length;
    if (currentQuestion < totalQuestions - 1) {
      setCurrentQuestion(prev => prev + 1);
    } else {
      // Finish assessment
      submitAssessment();
    }
  };

  // Step 4: Submit Assessment
  const submitAssessment = async () => {
    setLoading(true);
    try {
      const formattedAnswers = {};
      
      Object.keys(assessment.assessment).forEach((skill) => {
        const skillQuestions = assessment.assessment[skill];
        formattedAnswers[skill] = [];
        
        skillQuestions.forEach((q, qIdx) => {
          const userAnswer = answers[`${skill}_${qIdx}`] || "A";
          const correctAnswer = q.answer || "A";
          
          formattedAnswers[skill].push({
            question: q.question,
            user_answer: userAnswer,
            correct_answer: correctAnswer,
            is_correct: userAnswer === correctAnswer
          });
        });
      });

      console.log("Submitting answers:", JSON.stringify(formattedAnswers, null, 2));
      
      const results = await Backend.submitAssessmentAdvanced(formattedAnswers);
      console.log("Assessment results:", results);
      
      setAssessmentResults(results);
      setStep(4);
    } catch (err) {
      console.error("Submit error:", err);
      setError("Gagal submit assessment: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 5: Get Course Recommendations
  const handleGetCourses = async () => {
    setLoading(true);
    try {
      const courses = await Backend.recommendCoursesST(
        detectedData.job_role,
        assessmentResults.aggregate_level,
        10
      );
      
      // Send to chat
      onDetect({
        job_role: detectedData.job_role,
        skills: detectedData.skills,
        level: assessmentResults.aggregate_level,
        results: assessmentResults.results,
        courses: courses
      });
      
      onClose();
    } catch (err) {
      setError("Gagal mendapatkan rekomendasi: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Render current question
  const renderCurrentQuestion = () => {
    if (!assessment) return null;

    const skills = Object.keys(assessment.assessment);
    const currentSkillIdx = Math.floor(currentQuestion / 3);
    const currentSkill = skills[currentSkillIdx];
    const questionIdx = currentQuestion % 3;
    const question = assessment.assessment[currentSkill][questionIdx];
    const totalQuestions = Object.values(assessment.assessment).flat().length;

    return (
      <div className="question-container">
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${((currentQuestion + 1) / totalQuestions) * 100}%` }}
          />
        </div>
        
        <div className="question-header">
          <span className="skill-badge">{currentSkill}</span>
          <span className="question-number">
            Pertanyaan {currentQuestion + 1} dari {totalQuestions}
          </span>
        </div>

        <h3 className="question-text">{question.question}</h3>

        <div className="options-grid">
          {question.options.map((opt, idx) => (
            <button
              key={idx}
              className="option-btn"
              onClick={() => handleAnswer(opt[0])}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
      <style>{`
        .job-detection-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.3s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .job-detection-card {
          background: white;
          border-radius: 20px;
          width: 90%;
          max-width: 700px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          animation: slideUp 0.4s ease-out;
        }

        .detection-header {
          padding: 24px 28px;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
          border-radius: 20px 20px 0 0;
        }

        .detection-title {
          font-size: 22px;
          font-weight: 700;
          color: #1e293b;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .close-btn {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          border: none;
          background: white;
          color: #64748b;
          font-size: 20px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .close-btn:hover {
          background: #fee2e2;
          color: #dc2626;
        }

        .detection-body {
          padding: 28px;
        }

        .detection-description {
          font-size: 15px;
          color: #64748b;
          margin-bottom: 24px;
          line-height: 1.6;
        }

        .error-message {
          background: #fee2e2;
          border: 1px solid #fecaca;
          border-radius: 12px;
          padding: 14px 16px;
          color: #dc2626;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .input-section {
          margin-bottom: 20px;
        }

        .input-label {
          display: block;
          font-size: 14px;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 10px;
        }

        .description-textarea {
          width: 100%;
          padding: 14px 16px;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          font-size: 15px;
          font-family: inherit;
          resize: vertical;
          min-height: 120px;
          transition: all 0.3s;
        }

        .description-textarea:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
        }

        .examples-section {
          margin-bottom: 24px;
        }

        .examples-title {
          font-size: 13px;
          font-weight: 600;
          color: #64748b;
          margin-bottom: 10px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .example-chips {
          display: grid;
          gap: 8px;
        }

        .example-chip {
          padding: 12px 14px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          font-size: 13px;
          color: #475569;
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
        }

        .example-chip:hover {
          background: #eff6ff;
          border-color: #93c5fd;
          color: #2563eb;
        }

        .action-buttons {
          display: flex;
          gap: 12px;
          margin-top: 24px;
        }

        .btn {
          flex: 1;
          padding: 14px 20px;
          border: none;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .btn-primary {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }

        .btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(16, 185, 129, 0.4);
        }

        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-secondary {
          background: #f1f5f9;
          color: #475569;
        }

        .btn-secondary:hover {
          background: #e2e8f0;
        }

        /* Confirmation Step Styles */
        .confirmation-container {
          animation: slideUp 0.4s ease-out;
        }

        .confirmation-banner {
          background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
          border: 2px solid #86efac;
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 24px;
          text-align: center;
        }

        .confirmation-icon {
          font-size: 48px;
          margin-bottom: 12px;
        }

        .confirmation-job-role {
          font-size: 28px;
          font-weight: 700;
          color: #166534;
          margin-bottom: 8px;
        }

        .confirmation-subtitle {
          font-size: 15px;
          color: #15803d;
        }

        .skills-preview {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 20px;
          margin-bottom: 24px;
        }

        .skills-preview-title {
          font-size: 16px;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .skills-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          gap: 10px;
        }

        .skill-chip {
          background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
          border: 1px solid #93c5fd;
          border-radius: 10px;
          padding: 10px 14px;
          font-size: 14px;
          font-weight: 500;
          color: #1e40af;
          text-align: center;
        }

        .info-box {
          background: #fef3c7;
          border: 1px solid #fde047;
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 24px;
          display: flex;
          align-items: start;
          gap: 12px;
        }

        .info-box-icon {
          font-size: 20px;
          flex-shrink: 0;
        }

        .info-box-text {
          font-size: 14px;
          color: #854d0e;
          line-height: 1.5;
        }

        /* Assessment Styles */
        .progress-bar {
          height: 6px;
          background: #e2e8f0;
          border-radius: 3px;
          margin-bottom: 24px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #10b981 0%, #059669 100%);
          transition: width 0.3s ease;
        }

        .question-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }

        .skill-badge {
          background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
          color: #1e40af;
          padding: 6px 14px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
        }

        .question-number {
          font-size: 13px;
          color: #64748b;
          font-weight: 500;
        }

        .question-text {
          font-size: 18px;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 24px;
          line-height: 1.5;
        }

        .options-grid {
          display: grid;
          gap: 12px;
        }

        .option-btn {
          padding: 16px 18px;
          background: white;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          font-size: 15px;
          color: #1e293b;
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
          font-weight: 500;
        }

        .option-btn:hover {
          border-color: #3b82f6;
          background: #eff6ff;
          transform: translateX(4px);
        }

        /* Results Styles */
        .results-container {
          animation: slideUp 0.4s ease-out;
        }

        .results-summary {
          background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
          border: 2px solid #86efac;
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 24px;
          text-align: center;
        }

        .results-level {
          font-size: 32px;
          font-weight: 700;
          color: #166534;
          margin-bottom: 8px;
        }

        .results-desc {
          font-size: 15px;
          color: #15803d;
        }

        .skills-results {
          display: grid;
          gap: 12px;
          margin-bottom: 24px;
        }

        .skill-result-card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 16px 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .skill-result-name {
          font-size: 15px;
          font-weight: 600;
          color: #1e293b;
        }

        .skill-result-score {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .skill-result-text {
          font-size: 14px;
          color: #64748b;
        }

        .skill-result-badge {
          padding: 4px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
        }

        .badge-beginner {
          background: #fee2e2;
          color: #dc2626;
        }

        .badge-intermediate {
          background: #fef3c7;
          color: #d97706;
        }

        .badge-advanced {
          background: #d1fae5;
          color: #059669;
        }

        .loading-spinner {
          width: 24px;
          height: 24px;
          border: 3px solid #e2e8f0;
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .job-detection-card::-webkit-scrollbar {
          width: 6px;
        }

        .job-detection-card::-webkit-scrollbar-track {
          background: transparent;
        }

        .job-detection-card::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 3px;
        }

        .job-detection-card::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>

      <div className="job-detection-overlay" onClick={onClose}>
        <div className="job-detection-card" onClick={(e) => e.stopPropagation()}>
          <div className="detection-header">
            <div className="detection-title">
              🎯 {step === 1 ? "Deteksi Job Role & Skills" : step === 2 ? "Konfirmasi Job Role" : step === 3 ? "Assessment" : "Hasil Assessment"}
            </div>
            <button className="close-btn" onClick={onClose}>×</button>
          </div>

          <div className="detection-body">
            {error && (
              <div className="error-message">
                ⚠️ {error}
              </div>
            )}

            {/* Step 1: Input Description */}
            {step === 1 && (
              <>
                <p className="detection-description">
                  Ceritakan minat dan tujuan belajar Anda, dan kami akan mendeteksi job role yang cocok beserta skills yang perlu dikuasai!
                </p>

                <div className="input-section">
                  <label className="input-label">Deskripsi Minat & Tujuan Belajar</label>
                  <textarea
                    className="description-textarea"
                    placeholder="Contoh: saya suka web development dan ingin membuat website interaktif..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                <div className="examples-section">
                  <div className="examples-title">
                    💡 Atau pilih contoh:
                  </div>
                  <div className="example-chips">
                    {examples.map((ex, idx) => (
                      <button
                        key={idx}
                        className="example-chip"
                        onClick={() => setDescription(ex)}
                      >
                        {ex}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="action-buttons">
                  <button className="btn btn-secondary" onClick={onClose}>
                    Batal
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={handleDetect}
                    disabled={loading || !description.trim()}
                  >
                    {loading ? (
                      <>
                        <div className="loading-spinner" />
                        Mendeteksi...
                      </>
                    ) : (
                      <>
                        🔍 Deteksi Sekarang
                      </>
                    )}
                  </button>
                </div>
              </>
            )}

            {/* Step 2: Confirmation */}
            {step === 2 && detectedData && (
              <div className="confirmation-container">
                <div className="confirmation-banner">
                  <div className="confirmation-icon">🎉</div>
                  <div className="confirmation-job-role">{detectedData.job_role}</div>
                  <div className="confirmation-subtitle">
                    Job role yang cocok untuk Anda!
                  </div>
                </div>

                <div className="skills-preview">
                  <div className="skills-preview-title">
                    📚 Skills yang Akan Diuji ({detectedData.skills.length})
                  </div>
                  <div className="skills-grid">
                    {detectedData.skills.map((skill, idx) => (
                      <div key={idx} className="skill-chip">
                        {skill}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="info-box">
                  <div className="info-box-icon">💡</div>
                  <div className="info-box-text">
                    <strong>Apa selanjutnya?</strong><br/>
                    Anda akan mengikuti assessment untuk mengetahui level kemampuan Anda di setiap skill. 
                    Assessment terdiri dari {detectedData.skills.length * 3} pertanyaan pilihan ganda.
                  </div>
                </div>

                <div className="action-buttons">
                  <button className="btn btn-secondary" onClick={() => setStep(1)}>
                    ← Ubah Deskripsi
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={handleStartAssessment}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <div className="loading-spinner" />
                        Memuat...
                      </>
                    ) : (
                      <>
                        ✅ Lanjut Assessment
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Assessment */}
            {step === 3 && assessment && (
              <>
                <p className="detection-description">
                  Jawab {Object.values(assessment.assessment).flat().length} pertanyaan untuk mengetahui level kemampuan Anda di setiap skill.
                </p>
                {renderCurrentQuestion()}
              </>
            )}

            {/* Step 4: Results */}
            {step === 4 && assessmentResults && (
              <div className="results-container">
                <div className="results-summary">
                  <div className="results-level">{assessmentResults.aggregate_level}</div>
                  <div className="results-desc">
                    Level kemampuan Anda secara keseluruhan
                  </div>
                </div>

                <div className="skills-results">
                  {Object.entries(assessmentResults.results).map(([skill, data]) => (
                    <div key={skill} className="skill-result-card">
                      <div className="skill-result-name">{skill}</div>
                      <div className="skill-result-score">
                        <span className="skill-result-text">
                          {data.correct}/{data.total}
                        </span>
                        <span className={`skill-result-badge badge-${data.level.toLowerCase()}`}>
                          {data.level}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="action-buttons">
                  <button className="btn btn-secondary" onClick={onClose}>
                    Tutup
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={handleGetCourses}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <div className="loading-spinner" />
                        Memuat...
                      </>
                    ) : (
                      <>
                        📚 Lihat Rekomendasi Course
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}