import { useState } from "react";
import api from "../services/api";

export default function Upload() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState([]);

  const handleUpload = async (e) => {
    e.preventDefault();
    setQuestions([]);
    setStatus("");

    if (!file) {
      setStatus("Please select a PDF file.");
      return;
    }
    try {
      setLoading(true);
      setStatus("Uploading & processing...");

      const formData = new FormData();
      formData.append("file", file);

      const res = await api.post("/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setStatus(`Uploaded! Processed chunks: ${res.data.chunks}`);
      setQuestions(res.data.questions || []);
      localStorage.setItem(
        "allQuestions",
        JSON.stringify(res.data.questions || [])
      );
    } catch (err) {
      console.error(err);
      setStatus("Upload failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Upload Document</h1>

      <form onSubmit={handleUpload} className="space-y-4">
        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => setFile(e.target.files[0])}
          className="w-full border p-2 rounded"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? "Processing..." : "Upload"}
        </button>
      </form>

      {status && <p className="mt-4 text-lg">{status}</p>}

       {loading && (
          <p className="text-blue-600 mt-2">Generating questions...</p>
        )}

      {questions.length > 0 && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-2 text-gray-800">
            📚 Expected Questions
          </h2>

          <ul className="space-y-2">
            {questions.map((q, i) => (
              <li
                key={i}
                className="bg-gray-100 p-3 rounded cursor-pointer hover:bg-blue-100"
                onClick={() => {
                  localStorage.setItem("selectedQuestion", q);
                  window.location.href = "/query";
                }}
              >
                {q}
              </li>
            ))}
          </ul>
          <button
            className="mt-4 w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
            onClick={() => (window.location.href = "/query")}
          >
            Go to Chat →
          </button>
         
        </div>
      )}
    </div>
  );
}
