import { useState } from "react";
import api, { setToken } from "../services/api";
import { Link } from "react-router-dom";


export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  const loginUser = async (e) => {
    e.preventDefault();

    try {
      const res = await api.post("/auth/login", { email, password });

      const token = res.data.token;
      localStorage.setItem("token", token);
      setToken(token);

      setMsg("Login successful! Redirecting...");
      setTimeout(() => (window.location.href = "/upload"), 800);
    } catch (err) {
      console.error(err);
      setMsg("Invalid email or password");
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 mt-10">
      <h1 className="text-2xl font-bold mb-5 text-center">Login</h1>

      <form onSubmit={loginUser} className="space-y-4">
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

        <button className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
          Login
        </button>
      </form>

      {msg && <p className="mt-4 text-center text-red-600">{msg}</p>}

      <p className="mt-4 text-center">
        Don't have an account?{" "}
        <Link to="/register" className="text-blue-600 underline">Register</Link>
      </p>
    </div>
  );
}
