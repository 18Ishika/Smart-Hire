import { useNavigate } from "react-router-dom";

function Navbar() {

  const navigate = useNavigate();

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
        <button
          className="login-btn"
          onClick={() => navigate("/login")}
        >
          Login
        </button>

        <button
          className="login-btn"
          style={{marginLeft:"10px"}}
          onClick={() => navigate("/signup")}
        >
          Signup
        </button>
      </div>

    </nav>
  );

}

export default Navbar;