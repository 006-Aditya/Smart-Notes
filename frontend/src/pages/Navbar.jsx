import { Link, useLocation } from "react-router-dom";

export default function Navbar() {
  const location = useLocation();
  const token = localStorage.getItem("token");

  const logout = () => {
    localStorage.removeItem("token");
    window.location.href = "/";
  };
 
  const navLink = (path, label) => (
    <Link
      to={path}
      className={`hover:text-blue-400 transition-colors ${
        location.pathname === path ? "text-blue-400" : ""
      }`}
    >
      {label}
    </Link>
  );
 

  return (
    <nav className="w-full bg-gray-900 text-white p-4 mb-6 shadow">
      <div className="max-w-5xl mx-auto flex justify-between items-center">

        {/* Logo */}
        <Link to={token ? "/upload" : "/"} className="text-xl font-bold">
          SmartNotes
        </Link>

        {/* Nav Links */}
        <div className="flex space-x-6 items-center">

          {!token ? (
            <>
              <Link
                className={`hover:text-blue-400 ${
                  location.pathname === "/" ? "text-blue-400" : ""
                }`}
                to="/"
              >
                Login
              </Link>

              <Link
                className={`hover:text-blue-400 ${
                  location.pathname === "/register" ? "text-blue-400" : ""
                }`}
                to="/register"
              >
                Register
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/upload"
                className={`hover:text-blue-400 ${
                  location.pathname === "/upload" ? "text-blue-400" : ""
                }`}
              >
                Upload
              </Link>

              <Link
                to="/query"
                className={`hover:text-blue-400 ${
                  location.pathname === "/query" ? "text-blue-400" : ""
                }`}
              >
                Ask
              </Link>

              <Link
                to="/study-plan"
                className={`hover:text-blue-400 ${
                  location.pathname === "/study-plan" ? "text-blue-400" : ""
                }`}
              >
                Study Plan
              </Link>

              {/* Logout Button */}
              <button
                onClick={logout}
                className="bg-red-600 px-3 py-1 rounded hover:bg-red-700"
              >
                Logout
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
