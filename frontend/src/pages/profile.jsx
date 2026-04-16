import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getProfile } from "../api/auth";
import api from "../api/auth";
import "../styles/Profile.css";

function Profile() {
  const [user, setUser] = useState(null);
  const [jobCount, setJobCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // profile
        const res = await getProfile();
        setUser(res.data);

        // jobs
        const jobRes = await api.get("api/jobs/list/");
        setJobCount(jobRes.data.length);

      } catch (err) {
        console.log(err);
        alert("Not authorized");
        navigate("/login");
      }
    };

    fetchData();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    navigate("/login");
    window.location.reload();
  };

  if (!user) return <h2 className="loading">Loading...</h2>;

  return (
    <div className="profile-container">

      <h1 className="profile-title">Profile</h1>

      <div className="profile-card">

        {/* OPTIONAL IMAGE */}
        <img
          src="https://i.pravatar.cc/150"
          alt="profile"
          className="profile-avatar"
        />

        {/* USER INFO */}
        <div className="profile-info">
          <p><span>Username</span><strong>{user.username}</strong></p>
          <p><span>Email</span><strong>{user.email}</strong></p>
          <p><span>Role</span>
            <strong>{user.is_staff ? "Admin" : "User"}</strong>
          </p>
        </div>

        {/* STATS */}
        <div className="profile-stats">

          <div
            className="stat-box"
            onClick={() => navigate("/view")}
          >
            <h3>{jobCount}</h3>
            <p>Jobs Created</p>
          </div>

        </div>

        {/* ACTIONS */}
        <div className="profile-actions">

          

          <button
            className="logout-btn"
            onClick={handleLogout}
          >
            Logout
          </button>

        </div>

      </div>
    </div>
  );
}

export default Profile;