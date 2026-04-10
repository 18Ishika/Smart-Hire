import { useNavigate } from "react-router-dom";
import "../styles/Navbar.css";

function Navbar() {
  const navigate = useNavigate();
  const token = localStorage.getItem("access");

  const handleLogout = () => {
    localStorage.removeItem("access");
    navigate("/login");
  };

  return (
    <nav className="navbar">

      <div className="logo" onClick={() => navigate("/")}>
        HireAI
      </div>

      <ul className="nav-links">
        {token && (
          <>
            <li onClick={() => navigate("/")}>Dashboard</li>
            <li onClick={() => navigate("/job")}>Create Job</li>
            <li onClick={() => navigate("/list")}>My Jobs</li>
            <li onClick={() => navigate("/profile")}>Profile</li>
          </>
        )}
      </ul>

      <div className="nav-actions">
        {token ? (
          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        ) : (
          <>
            <button
              className="login-btn"
              onClick={() => navigate("/login")}
            >
              Login
            </button>

            <button
              className="signup-btn"
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