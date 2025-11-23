import { useState } from "react";
import api, { setToken } from "../services/api";
import { Link } from "react-router-dom";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  const registerUser = async (e) => {
    e.preventDefault();

    try {
      const res = await api.post("/auth/register", { email, password });

      const token = res.data.token;
      localStorage.setItem("token", token);
      setToken(token);

      setMsg("Registration successful! Redirecting...");
      setTimeout(() => (window.location.href = "/upload"), 800);
    } catch (err) {
      console.error(err);
      setMsg("Registration failed. Email may already exist.");
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 mt-10">
      <h1 className="text-2xl font-bold mb-5 text-center">Register</h1>

      <form onSubmit={registerUser} className="space-y-4">
        <input
          type="email"
          className="w-full border p-2 rounded"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          className="w-full border p-2 rounded"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700">
          Register
        </button>
      </form>

      {msg && <p className="mt-4 text-center text-red-600">{msg}</p>}

      <p className="mt-4 text-center">
        Already have an account?{" "}
        <Link to="/" className="text-blue-600 underline">Login</Link>

      </p>
    </div>
  );
}
