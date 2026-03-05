function Navbar() {

  return (
    <nav className="navbar">

      <div className="logo">
        SmartHire
      </div>

      <ul className="nav-links">
        <li>Home</li>
        <li>Features</li>
        <li>Pricing</li>
      </ul>

      <button className="login-btn">
        Login
      </button>

    </nav>
  );

}

export default Navbar;