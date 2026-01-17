import { useState } from "react";
import api from "../services/api";

export default function Query() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState(null);
  const [chunks, setChunks] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleAsk = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;

    try {
      setLoading(true);
      setAnswer(null);
      setChunks([]);

      const res = await api.post("/query", { question });

      setAnswer(res.data.answer);
      setChunks(res.data.contextChunks || []);
    } catch (err) {
      console.error(err);
      setAnswer(
        err.response?.data?.error || "Something went wrong. Try again."
      );
    } finally {
      setLoading(false);
    }
  };

    return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">
        Ask Your Notes
      </h1>

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

          <p className="text-gray-900 leading-relaxed whitespace-pre-wrap">
            {answer}
          </p>
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
                        Similarity: {chunk.score.toFixed(2)}
                      </span>
                    </div>

                    <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                      {chunk.metadata?.text}
                    </p>
                  </div>
              ))}
            </div>
        </details>
      )}
    </div>
  );
}
