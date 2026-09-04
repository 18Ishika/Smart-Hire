import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import "../styles/Dashboard.css";
import api from "../api/auth";

function Dashboard() {
  const navigate = useNavigate();
  const [resumeCount, setResumeCount] = useState(0);

  useEffect(() => {
    const fetchResumes = async () => {
      try {
        const res = await api.get("/api/resumes/total-resumes/");
        setResumeCount(res.data.total_resumes);
      } catch (err) {
        console.log("Error fetching resume count:", err);
      }
    };

    fetchResumes();
  }, []);

  return (
    <div className="dashboard">

      <div className="dashboard-header">
        <h2>Welcome back 👋</h2>
        <p>Manage your hiring process easily</p>
      </div>

      <div className="stats-row">
        <div className="stat-pill">
          <div className="stat-icon">📄</div>
          <div>
            <div className="stat-label">Total resumes</div>
            <div className="stat-value">{resumeCount}</div>
          </div>
        </div>
      </div>

      <div className="dashboard-cards">

        <div className="dashboard-card" onClick={() => navigate("/job")}>
          <img src="https://images.unsplash.com/photo-1507679799987-c73779587ccf" />
          <div className="card-text">
            <h3>Create Job</h3>
            <p>Create a new job with required skills and details</p>
          </div>
        </div>

        <div className="dashboard-card" onClick={() => navigate("/list")}>
          <img src="https://images.unsplash.com/photo-1454165804606-c3d57bc86b40" />
          <div className="card-text">
            <h3>My Jobs</h3>
            <p>View all jobs you have created</p>
          </div>
        </div>

        <div className="dashboard-card" onClick={() => navigate("/list")}>
          <img src="https://images.unsplash.com/photo-1551288049-bebda4e38f71" />
          <div className="card-text">
            <h3>Upload Resumes</h3>
            <p>Upload resumes and analyze candidates</p>
          </div>
        </div>

      </div>

    </div>
  );
}

export default Dashboard;