import { useNavigate } from "react-router-dom";
import "../styles/Dashboard.css";

function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className="dashboard">

      <h2>Welcome back 👋</h2>
      <p>Manage your hiring process easily</p>

      <div className="dashboard-cards">

        <div
          className="dashboard-card"
          onClick={() => navigate("/job")}
        >
          <img
            src="https://images.unsplash.com/photo-1507679799987-c73779587ccf"
            alt="create job"
          />
          <div className="card-text">
            <h3>Create Job</h3>
            <p>Create a new job with required skills and details</p>
          </div>
        </div>

        <div
          className="dashboard-card"
          onClick={() => navigate("/list")}
        >
          <img
            src="https://images.unsplash.com/photo-1454165804606-c3d57bc86b40"
            alt="jobs"
          />
          <div className="card-text">
            <h3>My Jobs</h3>
            <p>View all jobs you have created</p>
          </div>
        </div>

        <div
          className="dashboard-card"
          onClick={() => navigate("/job")}
        >
          <img
            src="https://images.unsplash.com/photo-1551288049-bebda4e38f71"
            alt="upload"
          />
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