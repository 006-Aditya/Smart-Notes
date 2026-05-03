import { useState, useEffect } from "react";
import api from "../services/api";
import ReactMarkdown from "react-markdown";

export default function Query() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState(null);
  const [chunks, setChunks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [docQuestions, setDocQuestions] = useState([]);

  const handleAsk = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;

    try {
      setLoading(true);
      setAnswer(null);
      setChunks([]);

      const res = await api.post("/query", { question });

      setAnswer(res.data.answer);
      setChunks(res.data.sources || []);
    } catch (err) {
        console.error(err);
        setAnswer(
          err.response?.data?.error || "Something went wrong. Try again."
        );
      } finally {
        setLoading(false);
      }
    };

    useEffect(() => {
      const savedQuestion = localStorage.getItem("selectedQuestion");

      if (!savedQuestion) return;

      setQuestion(savedQuestion);
      localStorage.removeItem("selectedQuestion");

      // call API directly
      const fetchAnswer = async () => {
        try {
          setLoading(true);
          setAnswer(null);
          setChunks([]);

          const res = await api.post("/query", { question: savedQuestion });

          setAnswer(res.data.answer);
          setChunks(res.data.sources || []);
        } catch (err) {
          console.error(err);
          setAnswer(
            err.response?.data?.error || "Something went wrong. Try again."
          );
        } finally {
          setLoading(false);
        }
      };

      fetchAnswer();
    }, []);

    useEffect(() => {
      const fetchDocs = async () => {
        try {
          const res = await api.get("/upload");
          setDocuments(res.data);
        } catch (err) {
          console.error(err);
        }
      };

      fetchDocs();
    }, []);
    
    const handleDocClick = (doc) => {
      setSelectedDoc(doc.id);
      setDocQuestions(doc.expectedQuestions || []);
    };

    return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">
        Ask Your Notes
      </h1>

      {documents.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">
            📂 Your Documents
          </h2>

          <ul className="space-y-2">
            {documents.map((doc) => (
              <li
                key={doc.id}
                onClick={() => handleDocClick(doc)}
                className={`p-2 rounded cursor-pointer ${
                  selectedDoc === doc.id
                    ? "bg-blue-200"
                    : "bg-gray-100 hover:bg-blue-100"
                }`}
              >
                📄 {doc.filename}
              </li>
            ))}
          </ul>
        </div>
      )}

      {docQuestions.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">
            📚 Questions from Document
          </h2>

          <ul className="space-y-2">
            {docQuestions.map((q, i) => (
              <li
                key={i}
                className="bg-gray-100 p-2 rounded cursor-pointer hover:bg-blue-100"
                onClick={() => {
                  setQuestion(q);
                  setTimeout(() => handleAsk({ preventDefault: () => {} }), 200);
                }}
              >
                {q}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Question Input */}
      <form
        onSubmit={handleAsk}
        className="bg-white shadow-md rounded-lg p-5 mb-8"
      >
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Your Question
        </label>

        <textarea
          className="w-full border border-gray-300 p-3 rounded-md mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Ask a question based on your uploaded PDFs..."
          rows={3}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2.5 rounded-md font-medium hover:bg-blue-700 transition disabled:bg-gray-400"
          disabled={loading || !question.trim()}
        >
          {loading ? "Thinking..." : "Ask Question"}
        </button>
      </form>

      {/* AI Answer */}
      {answer && (
        <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
          <h2 className="text-lg font-semibold mb-2 text-gray-800">
            🤖 Answer
          </h2>

          <div className="bg-white border rounded-lg p-6 shadow-sm">
            <div className="prose max-w-none">
              <ReactMarkdown>{answer}</ReactMarkdown>
            </div>
          </div>
        </div>
      )}


      {/* Retrieved Context */}
      {chunks.length > 0 && (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-medium text-blue-600">
            View supporting evidence from notes
          </summary>

          <div className="mt-4 space-y-3">
            {chunks.map((chunk, idx) => (
                  <div
                    key={idx}
                    className="bg-gray-50 border border-gray-200 rounded-md p-3"
                  >
                    <div className="flex justify-between mb-1">
                      <span className="text-xs font-semibold text-gray-600">
                        Source {idx + 1}
                      </span>

                      <span className="text-xs text-gray-500">
                        Similarity: {chunk?.score ? chunk.score.toFixed(2) : "N/A"}
                      </span>
                    </div>

                    <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                      {chunk.text}
                    </p>
                  </div>
              ))}
            </div>
        </details>
      )}
    </div>
  );
}
