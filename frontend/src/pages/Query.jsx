import { useState, useEffect } from "react";
import api from "../services/api";

export default function Query() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState(null);
  const [chunks, setChunks] = useState([]);
  const [loading, setLoading] = useState(false);

  // Restore token after page refresh
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  }, []);

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
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4 text-center">Ask Your Notes</h1>

      <form onSubmit={handleAsk} className="mb-6">
        <textarea
          className="w-full border p-3 rounded mb-3"
          placeholder="Ask a question about your uploaded notes..."
          rows={3}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
          disabled={loading || !question.trim()}
        >
          {loading ? "Thinking..." : "Ask"}
        </button>
      </form>

      {/* Answer Section */}
      {answer && (
        <div className="bg-white shadow p-4 rounded mb-6">
          <h2 className="text-xl font-semibold mb-2">AI Answer</h2>
          <p className="whitespace-pre-wrap">{answer}</p>
        </div>
      )}

      {/* Context Chunks */}
      {chunks.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-2">Matched Context</h3>

          <div className="space-y-3">
            {chunks.map((chunk, idx) => (
              <div key={idx} className="bg-gray-100 border p-3 rounded text-sm">
                <p>{chunk.text}</p>
                <p className="mt-1 text-xs text-gray-500">
                  Score: {chunk.score?.toFixed(3)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

