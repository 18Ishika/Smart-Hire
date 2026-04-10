import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import api from "../api/auth";
import "../styles/Upload.css";

function Upload() {
  const { id: jobId } = useParams();
  const [files, setFiles] = useState([]);
  const [resumes, setResumes] = useState([]);

  const fetchResumes = async () => {
    try {
      const res = await api.get(`/api/resumes/rankings/${jobId}/`);
      setResumes(res.data.rankings || []);
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    if (jobId) fetchResumes();
  }, [jobId]);

  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files));
  };

  const handleUpload = async () => {
    if (!files.length) return alert("Please select files");

    const formData = new FormData();
    formData.append("job", jobId);
    files.forEach((file) => formData.append("resume_file", file));

    try {
      await api.post("/api/resumes/upload/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setFiles([]);
      fetchResumes();
    } catch (err) {
      alert("Upload failed");
    }
  };

  const sortedResumes = [...resumes].sort(
    (a, b) => (b.score ?? -1) - (a.score ?? -1)
  );

  return (
    <div className="upload-page">

      {/* HEADER */}
      <div className="page-header">
        <h1>Resume Ranking Dashboard</h1>
        <p>Upload resumes and track AI-based scoring</p>
      </div>

      {/* UPLOAD CARD */}
      <div className="upload-box">
        <h2>📤 Upload Resumes</h2>

        <label className="drop-zone">
          <input type="file" multiple onChange={handleFileChange} />
          <p>Drag & drop or click to select files</p>
        </label>

        {files.length > 0 && (
          <div className="file-list">
            {files.map((f, i) => (
              <span key={i} className="file-chip">
                {f.name}
              </span>
            ))}
          </div>
        )}

        <button className="upload-btn" onClick={handleUpload}>
          Upload & Process
        </button>
      </div>

      {/* RESUME LIST */}
      <div className="resume-section">
        <h2>🏆 Ranked Resumes</h2>

        {sortedResumes.length === 0 ? (
          <div className="empty-state">
            No resumes processed yet
          </div>
        ) : (
          <div className="resume-grid">
            {sortedResumes.map((r, index) => (
              <div key={r.id} className="resume-card">

                <div className="rank-badge">
                  #{index + 1}
                </div>

                <h3>{r.actual_resume_file_name}</h3>

                <div className="score">
                  ⭐ {r.score !== null ? r.score : "Processing..."}
                </div>

                <div className={`status ${r.status?.toLowerCase()}`}>
                  {r.status === "Processed"
                    ? "✔ Processed"
                    : r.status === "Pending"
                    ? "⏳ Pending"
                    : r.status}
                </div>

                {r.resume_file && (
                  <a href={r.resume_file} target="_blank">
                    View Resume →
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

export default Upload;