import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import api from "../api/auth";
import "../styles/Upload.css";

function Upload() {
  const { id: jobId } = useParams();
  const [files, setFiles] = useState([]);
  const [resumes, setResumes] = useState([]);

  const [currentPage, setCurrentPage] = useState(1);
  const resumesPerPage = 3; // 🔥 adjust if needed

  const BASE_URL = "http://127.0.0.1:8000"; // for PDF fix

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
      setCurrentPage(1); // reset page
      fetchResumes();
    } catch (err) {
      alert("Upload failed");
    }
  };

  // ✅ SORT FIRST
  const sortedResumes = [...resumes].sort(
    (a, b) => (b.score ?? -1) - (a.score ?? -1)
  );

  // ✅ PAGINATION LOGIC
  const totalPages = Math.ceil(sortedResumes.length / resumesPerPage);
  const indexOfLast = currentPage * resumesPerPage;
  const indexOfFirst = indexOfLast - resumesPerPage;
  const currentResumes = sortedResumes.slice(indexOfFirst, indexOfLast);

  return (
    <div className="upload-page">

      {/* HEADER */}
      <div className="page-header">
        <h1>Resume Ranking Dashboard</h1>
        <p>Upload resumes and track AI-based scoring</p>
      </div>

      {/* UPLOAD */}
      <div className="upload-box">
        <h2>📤 Upload Resumes</h2>

        <label className="drop-zone">
          <input type="file" multiple onChange={handleFileChange} />
          <p>Drag & drop or click to select files</p>
        </label>

        {files.length > 0 && (
          <div className="file-list">
            {files.map((f, i) => (
              <span key={i} className="file-chip">{f.name}</span>
            ))}
          </div>
        )}

        <button className="upload-btn" onClick={handleUpload}>
          Upload & Process
        </button>
      </div>

      {/* RESUMES */}
      <div className="resume-section">
        <h2>🏆 Ranked Resumes</h2>

        {sortedResumes.length === 0 ? (
          <div className="empty-state">No resumes processed yet</div>
        ) : (
          <>
            <div className="resume-grid">
              {currentResumes.map((r, index) => {
                const rank = indexOfFirst + index + 1;

                return (
                  <div key={r.id} className="resume-card">

                    <div className="rank-badge">#{rank}</div>

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
                      <a
                        href={
                          r.resume_file.startsWith("http")
                            ? r.resume_file
                            : `${BASE_URL}${r.resume_file}`
                        }
                        target="_blank"
                        rel="noreferrer"
                      >
                        View Resume →
                      </a>
                    )}

                  </div>
                );
              })}
            </div>

            {/* ✅ PAGINATION (only if needed) */}
            {sortedResumes.length > resumesPerPage && (
              <div className="pagination">

                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                >
                  ←
                </button>

                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    className={currentPage === i + 1 ? "active" : ""}
                    onClick={() => setCurrentPage(i + 1)}
                  >
                    {i + 1}
                  </button>
                ))}

                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                >
                  →
                </button>

              </div>
            )}
          </>
        )}
      </div>

    </div>
  );
}

export default Upload;