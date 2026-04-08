import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";

function Navbar() {
  const navigate = useNavigate();

  // ✅ state to track login
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // ✅ check token when component loads
  useEffect(() => {
    const token = localStorage.getItem("access");
    setIsLoggedIn(!!token);
  }, []);

  // ✅ logout function
  const handleLogout = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");

    setIsLoggedIn(false); // update UI
    navigate("/login");
  };

  return (
    <nav className="navbar">

      <div className="logo">
        SmartHire
      </div>

      <ul className="nav-links">
        <li onClick={() => navigate("/")}>Home</li>
        <li>Features</li>
        <li>Pricing</li>
      </ul>

      <div>
        {isLoggedIn ? (
          <>
            {/* 👤 profile icon */}
            <span
              style={{ marginRight: "15px", cursor: "pointer" }}
              onClick={() => navigate("/profile")}
            >
              👤
            </span>

            {/* 🚪 logout button */}
            <button onClick={handleLogout}>
              Logout
            </button>
          </>
        ) : (
          <>
            <button
              className="login-btn"
              onClick={() => navigate("/login")}
            >
              Login
            </button>

            <button
              className="login-btn"
              style={{ marginLeft: "10px" }}
              onClick={() => navigate("/signup")}
            >
              Signup
            </button>
          </>
        )}
      </div>

    </nav>
  );
}

export default Navbar;