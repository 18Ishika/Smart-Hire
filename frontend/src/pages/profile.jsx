import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getProfile } from "../api/auth";

function Profile() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await getProfile();
        setUser(res.data);
      } catch (err) {
        console.log(err);
        alert("Not authorized");
        navigate("/login");
      }
    };

    fetchProfile();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    navigate("/login");
    window.location.reload();
  };

  if (!user) return <h2>Loading...</h2>;

  return (
    <div style={{ padding: "40px" }}>

      <h1>Profile</h1>

      <div style={{
        border: "1px solid #ccc",
        padding: "20px",
        width: "300px",
        borderRadius: "10px"
      }}>
        <p><strong>Username:</strong> {user.username}</p>
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>Role:</strong> {user.is_staff ? "Admin" : "User"}</p>

        <button
          style={{ marginTop: "20px" }}
          onClick={handleLogout}
        >
          Logout
        </button>
      </div>

    </div>
  );
}

export default Profile;